import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import { Info, Heart, ChevronRight, X, DollarSign } from 'lucide-react';
import CreateRoomModal from '../components/CreateRoomModal';
import JoinRoomModal from '../components/JoinRoomModal';
import UserMenu from '../components/UserMenu';
import PointsModal from '../components/PointsModal';
import { dbService, generateRandomCode } from '../services/db';

const Home = () => {
  const { user, setUser } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [joinModalCode, setJoinModalCode] = useState<string | undefined>();
  const [isCreatePublic, setIsCreatePublic] = useState(false);
  const [activeRooms, setActiveRooms] = useState<any[]>([]);
  const [publicRooms, setPublicRooms] = useState<any[]>([]);
  const [completedRooms, setCompletedRooms] = useState<any[]>([]);

  const [showAllPublic, setShowAllPublic] = useState(false);
  const [showPoints, setShowPoints] = useState(false);

  // Collect ALL user-id values this session might have.
  // An admin's room uses user.userId; a joined participant's room uses the
  // per-join userId minted by joinRoom() and stored as ipl_my_uid.
  // We check both so completed rooms show for every participant, not just admins.
  const myUserId    = user?.userId || localStorage.getItem('ipl_my_uid') || '';
  const mySessionId = localStorage.getItem('ipl_my_uid') || '';
  const myUserIds   = Array.from(new Set([myUserId, mySessionId].filter(Boolean)));



  React.useEffect(() => {
    let cancelled = false;
    let pollCount = 0;  // used to throttle cleanup (runs every 5th poll ≈ every 15s)

    const fetchRooms = async () => {
      try {
        // Fetch all public non-started rooms
        const allPublic = await dbService.listPublicRooms();
        if (cancelled) return;

        const pubActive: any[] = [];
        const myActive: any[]  = [];
        const completed: any[] = [];

        for (const [code, room] of Object.entries(allPublic) as [string, any][]) {
          const me = room.participants?.find((p: any) => myUserIds.includes(p.userId));
          const savedSlot = room.leftParticipants?.find((p: any) => myUserIds.includes(p.userId));

          if (room.status === 'ended') {
            completed.push({ code, room, me: me || savedSlot });
          } else {
            if (me) {
              myActive.push({ code, room, me });
              if (room.isPublic && !room.auctionStarted && room.participants.length < (room.capacity || 12)) {
                pubActive.push({ code, room, me });
              }
            } else if (savedSlot) {
              // room they previously left — skip from public list, they'll rejoin
            } else if (room.isPublic && !room.auctionStarted && room.participants.length < (room.capacity || 12)) {
              pubActive.push({ code, room });
            }
          }
        }

        // Also fetch rooms the user is in (non-public ones they created/joined)
        if (myUserId) {
          const myRooms = await dbService.listMyRooms(myUserId);
          if (cancelled) return;
          for (const { code, room } of myRooms) {
            const me = room.participants?.find((p: any) => myUserIds.includes(p.userId));
            const savedSlot = room.leftParticipants?.find((p: any) => myUserIds.includes(p.userId));
            const alreadyIn = myActive.some(r => r.code === code) || completed.some(r => r.code === code);
            if (alreadyIn) continue;

            if (room.status === 'ended') {
              if (me || savedSlot) completed.push({ code, room, me: me || savedSlot });
            } else if (me) {
              myActive.push({ code, room, me });
            }
          }
        }

        if (!cancelled) {
          setActiveRooms(myActive);
          setPublicRooms(pubActive);
          setCompletedRooms(completed);
        }

        // Cleanup stale public rooms every 5th poll (≈ every 15 s)
        pollCount++;
        if (pollCount % 5 === 0) {
          dbService.cleanupStalePublicRooms();
        }
      } catch (err) {
        console.error('fetchRooms error:', err);
      }
    };

    fetchRooms();
    const intervalId = setInterval(fetchRooms, 3000); // poll every 3s (Supabase is fast enough)
    return () => { cancelled = true; clearInterval(intervalId); };
  }, [myUserId]);

  const handleHideRoom = async (code: string, role: string) => {
    setActiveRooms(prev => prev.filter(r => r.code !== code));
    if (role === 'ADMIN') {
      await dbService.deleteRoom(code);
    } else {
      await dbService.leaveAuction(code, myUserId);
    }
  };


  const handleModalCreate = async (roomData: any) => {
    // Ensure uniqueness
    let code = generateRandomCode();
    let exists = await dbService.checkRoomExists(code);
    while (exists) {
      code = generateRandomCode();
      exists = await dbService.checkRoomExists(code);
    }
    // Save to database
    await dbService.createRoom(code, roomData, user);
    
    localStorage.setItem('ipl_my_uid', user?.userId || 'admin_id');
    setIsCreateModalOpen(false);
    navigate(`/lobby/${code}?admin=true`, { state: { roomData } });
  };

  const handleModalJoin = async (code: string, teamName: string, existingUserId?: string) => {
    if (existingUserId) {
      localStorage.setItem('ipl_my_uid', existingUserId);
      setIsJoinModalOpen(false);
      navigate(`/lobby/${code}?admin=false`);
      return;
    }

    // joinRoom now returns the freshly-minted userId stored in the DB,
    // or false on error. We stamp it onto this tab so isMe detection works.
    const assignedUserId = await dbService.joinRoom(code, user, teamName);
    if (!assignedUserId) {
      alert("That team name is already taken, the room is full, or the code is invalid.");
      return;
    }
    // Update this tab's identity to exactly match what's stored in the DB
    localStorage.setItem('ipl_my_uid', assignedUserId);
    setUser({ ...user, userId: assignedUserId });
    setIsJoinModalOpen(false);
    navigate(`/lobby/${code}?admin=false`);
  };

  return (
    <div className="home-page" style={{ padding: '0 1.5rem 3rem 1.5rem', width: '100%', maxWidth: '900px', margin: '0 auto' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 0', marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-primary)', letterSpacing: '0.05em' }}>
          Makeyour11<span style={{ color: 'var(--text-secondary)' }}>.com</span>
        </div>

        <UserMenu />
      </div>

      {/* Main Home Container */}
      <div className="container" style={{ paddingTop: '1rem', maxWidth: '800px', margin: '0 auto' }}>
        
        {/* Top Main Actions */}
        <div className="home-actions-row" style={{ display: 'flex', gap: '1rem', marginBottom: '2.5rem' }}>
          <button 
            className="btn btn-primary" 
            style={{ flex: 1, padding: '1.25rem', fontSize: '1.125rem', borderRadius: '12px' }} 
            onClick={() => setIsCreateModalOpen(true)}
          >
            Create Room
          </button>
          <button 
            className="btn btn-secondary" 
            style={{ flex: 1, padding: '1.25rem', fontSize: '1.125rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)' }} 
            onClick={() => { setJoinModalCode(undefined); setIsJoinModalOpen(true); }}
          >
            Join Room
          </button>
        </div>

      {/* Info Links */}
      <div className="flex-center" style={{ flexDirection: 'column', gap: '1.5rem', color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.9rem' }}>
        <div
          id="how-points-link"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', transition: 'color 0.2s' }}
          className="hover-white"
          onClick={() => setShowPoints(true)}
        >
          <Info size={16} /> How Points Are Calculated
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <Heart size={16} color="var(--danger)" fill="var(--danger)" /> Enjoying this? Consider supporting the project
        </div>
      </div>



      {/* Public Rooms Section */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
              <h3 style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.875rem', color: 'var(--accent-primary)' }}>Public Rooms</h3>
              <span style={{ background: 'var(--accent-primary)', color: 'black', fontSize: '0.7rem', fontWeight: 700, padding: '0.1rem 0.5rem', borderRadius: 'var(--radius-full)' }}>NEW</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Play with strangers</p>
          </div>
          <div style={{ color: 'var(--accent-primary)', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            onClick={() => setShowAllPublic(true)}
          >
            See all ({publicRooms.length}) <ChevronRight size={16} />
          </div>
        </div>

        <div className="home-public-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {publicRooms.length > 0 ? publicRooms.slice(0, 4).map(({ code, room, me }) => (
            <div key={code} className="glass-panel" style={{ padding: '1.25rem', border: '1px solid rgba(0, 240, 255, 0.15)', background: 'rgba(0, 240, 255, 0.02)' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.125rem' }}>{room.roomName || code}</h3>
              <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
                <span>{room.participants?.length || 0}/{room.capacity || 12} joined</span>
              </div>
              {me ? (
                <button
                  className="btn btn-secondary"
                  style={{ width: '100%', padding: '0.6rem' }}
                  onClick={() => {
                    localStorage.setItem('ipl_my_uid', me.userId);
                    navigate(`/lobby/${code}?admin=${me.role === 'ADMIN'}`);
                  }}
                >
                  Enter
                </button>
              ) : (
                <button
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '0.6rem' }}
                  onClick={() => { setJoinModalCode(code); setIsJoinModalOpen(true); }}
                >
                  Join
                </button>
              )}
            </div>
          )) : (
            /* Empty state — clickable card to create a public room */
            <div
              style={{
                gridColumn: '1 / -1', padding: '1.75rem 2rem',
                textAlign: 'center',
                border: '1px dashed rgba(6,182,212,0.2)',
                borderRadius: '12px',
                cursor: 'pointer',
                background: 'rgba(6,182,212,0.03)',
                transition: 'border-color 0.2s, background 0.2s',
              }}
              onClick={() => { setIsCreatePublic(true); setIsCreateModalOpen(true); }}
              onMouseEnter={e => { const el = e.currentTarget; el.style.borderColor = 'rgba(6,182,212,0.45)'; el.style.background = 'rgba(6,182,212,0.06)'; }}
              onMouseLeave={e => { const el = e.currentTarget; el.style.borderColor = 'rgba(6,182,212,0.2)'; el.style.background = 'rgba(6,182,212,0.03)'; }}
            >
              <div style={{ fontWeight: 700, color: 'white', fontSize: '0.95rem', marginBottom: '0.35rem' }}>
                Create a public room to play with strangers
              </div>
              <div style={{ color: 'var(--accent-primary)', fontSize: '0.8rem', fontWeight: 600 }}>
                Tap to create →
              </div>
            </div>
          )}
        </div>
        {publicRooms.length > 4 && (
          <div
            style={{ textAlign: 'center', marginTop: '0.75rem', color: 'var(--accent-primary)', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}
            onClick={() => setShowAllPublic(true)}
          >
            +{publicRooms.length - 4} more rooms — See all
          </div>
        )}
      </div>

      {/* 'or create your own public room' link */}
      <div style={{ textAlign: 'center', marginBottom: '2rem', marginTop: '-0.5rem' }}>
        <span
          style={{ color: 'var(--accent-primary)', fontSize: '0.875rem', cursor: 'pointer', fontWeight: 500 }}
          onClick={() => { setIsCreatePublic(true); setIsCreateModalOpen(true); }}
        >
          or create your own public room
        </span>
      </div>

      {/* Active Rooms Section */}
      {activeRooms.length > 0 && (
        <div style={{ marginBottom: '3rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Active</h3>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
          </div>

          {activeRooms.map(({ code, room, me }) => {
            const isLive = room.auctionStarted && room.status !== 'ended';
            const role = me?.role || 'USER';
            const isAdminNav = role === 'ADMIN';

            const handleCardClick = () => {
              localStorage.setItem('ipl_my_uid', me.userId);
              if (isLive) {
                navigate(`/auction/${code}?admin=${isAdminNav}`);
              } else {
                navigate(`/lobby/${code}?admin=${isAdminNav}`);
              }
            };

            return (
              <div
                key={code}
                className="glass-panel"
                onClick={handleCardClick}
                style={{
                  padding: '1.1rem 1.4rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem',
                  background: isLive
                    ? 'rgba(251,191,36,0.04)'
                    : 'var(--bg-panel)',
                  border: isLive
                    ? '1px solid rgba(251,191,36,0.2)'
                    : '1px solid rgba(255,255,255,0.06)',
                  marginBottom: '0.75rem',
                  cursor: 'pointer',
                  transition: 'background 0.2s, border-color 0.2s',
                }}
              >
                {/* Top row: name + badge + X */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      color: 'white',
                    }}
                  >
                    {room.roomName || code}
                  </h2>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    {/* Status badge */}
                    <div
                      style={{
                        background: isLive
                          ? 'rgba(251,191,36,0.15)'
                          : room.status === 'ended'
                          ? 'rgba(239,68,68,0.1)'
                          : 'var(--accent-dim)',
                        border: `1px solid ${
                          isLive
                            ? 'rgba(251,191,36,0.4)'
                            : room.status === 'ended'
                            ? 'rgba(239,68,68,0.3)'
                            : 'var(--accent-primary)'
                        }`,
                        color: isLive
                          ? '#fbbf24'
                          : room.status === 'ended'
                          ? 'var(--danger)'
                          : 'var(--accent-primary)',
                        padding: '0.28rem 0.75rem',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        letterSpacing: '0.06em',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                      }}
                    >
                      {isLive ? (
                        <>
                          <div
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: '#fbbf24',
                              animation: 'pulse 1.2s infinite',
                            }}
                          />
                          LIVE
                        </>
                      ) : room.status === 'ended' ? (
                        'ENDED'
                      ) : (
                        'WAITING'
                      )}
                    </div>

                    {/* Dismiss X — hidden for live auctions */}
                    {!isLive && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleHideRoom(code, role);
                        }}
                        style={{
                          background: 'var(--danger-dim)',
                          border: 'none',
                          padding: '0.35rem',
                          borderRadius: 'var(--radius-sm)',
                          cursor: 'pointer',
                          color: 'var(--danger)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: '0.2s',
                        }}
                        className="hover-opacity"
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Bottom row: CODE | ipl | N players  +  chevron */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    color: 'var(--text-secondary)',
                    fontSize: '0.82rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ letterSpacing: '0.1em', fontWeight: 600, color: 'rgba(255,255,255,0.55)', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      {code}
                    </span>
                    <span style={{ width: '1px', height: '10px', background: 'var(--border-color)' }} />
                    <span>ipl</span>
                    <span style={{ width: '1px', height: '10px', background: 'var(--border-color)' }} />
                    <span>
                      {room.participants?.length || 0}{' '}
                      {(room.participants?.length || 0) === 1 ? 'player' : 'players'}
                    </span>
                  </div>
                  <ChevronRight size={17} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Completed Rooms Section */}
      {completedRooms.length > 0 && (
        <div style={{ marginBottom: '3rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.875rem', color: 'rgba(255,255,255,0.4)' }}>Completed</h3>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }}></div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {completedRooms.map(({ code, room, me }) => {

              return (
                <div 
                  key={code}
                  className="glass-panel"
                  style={{ 
                    padding: '1.5rem', 
                    background: 'rgba(255,255,255,0.02)', 
                    border: '1px solid rgba(255,255,255,0.05)',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                    <div>
                      <h2 style={{ margin: '0 0 0.25rem 0', fontSize: '1.25rem', fontWeight: 800 }}>{room.roomName || 'Unnamed Room'}</h2>
                      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', fontFamily: 'monospace' }}>{code}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#4ade80', padding: '0.25rem 0.6rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.05em' }}>COMPLETED</div>
                    </div>
                  </div>

                  <div style={{ marginBottom: '1.25rem' }}></div>

                  <div 
                    onClick={() => {
                      if (me) localStorage.setItem('ipl_my_uid', me.userId);
                      navigate(`/results/${code}`);
                    }}
                    style={{ 
                      color: 'var(--accent-primary)', 
                      fontSize: '0.85rem', 
                      fontWeight: 600, 
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}
                    className="hover-underline"
                  >
                    View Results <ChevronRight size={14} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {activeRooms.length === 0 && completedRooms.length === 0 ? (
        <div style={{ padding: '3rem 2rem', textAlign: 'center', background: 'var(--bg-panel)', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '3rem', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <DollarSign size={20} color="rgba(255,255,255,0.3)" />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: 'white' }}>Ready to start your auction?</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5, margin: '0 0 2rem 0', maxWidth: '300px' }}>
            Create a room to host your own auction or join one with a room code from a friend.
          </p>
          <div style={{ display: 'flex', gap: '1rem', width: '100%', maxWidth: '320px' }}>
            <button 
              className="btn btn-primary" 
              style={{ flex: 1, padding: '0.875rem', fontSize: '1rem', borderRadius: '8px' }} 
              onClick={() => setIsCreateModalOpen(true)}
            >
              Create Room
            </button>
            <button 
              className="btn btn-secondary" 
              style={{ flex: 1, padding: '0.875rem', fontSize: '1rem', borderRadius: '8px', background: 'rgba(255,255,255,0.1)' }} 
              onClick={() => { setJoinModalCode(undefined); setIsJoinModalOpen(true); }}
            >
              Join Room
            </button>
          </div>
        </div>
      ) : null}



      <CreateRoomModal
        isOpen={isCreateModalOpen}
        onClose={() => { setIsCreateModalOpen(false); setIsCreatePublic(false); }}
        onCreate={handleModalCreate}
        initialPublic={isCreatePublic}
      />

      <JoinRoomModal
        isOpen={isJoinModalOpen}
        initialRoomCode={joinModalCode}
        onClose={() => setIsJoinModalOpen(false)}
        onJoin={handleModalJoin}
      />

      {/* ── See All Public Rooms Modal ── */}
      {showAllPublic && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 500,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1.5rem',
        }}
          onClick={() => setShowAllPublic(false)}
        >
          <div
            style={{
              background: 'var(--bg-secondary)', borderRadius: '24px',
              width: '100%', maxWidth: '600px', maxHeight: '85vh',
              display: 'flex', flexDirection: 'column',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.8)',
              overflow: 'hidden'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1.5rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ width: '20px', height: '2px', background: 'var(--accent-primary)', borderRadius: '2px' }} />
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'white', letterSpacing: '0.02em' }}>Public Rooms</h2>
            </div>

            {/* Modal body */}
            <div style={{ overflowY: 'auto', padding: '1.5rem 2rem', flex: 1 }}>
              {publicRooms.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🌐</div>
                  No public rooms available right now.<br/>
                  Be the first to create one!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                   {publicRooms.map(({ code, room, me }) => (
                    <div key={code} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '1.25rem 1.5rem',
                      borderRadius: '16px',
                      border: '1px solid rgba(255,255,255,0.06)',
                      background: 'rgba(255,255,255,0.02)',
                      transition: '0.2s',
                    }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.4rem', color: 'white' }}>{room.roomName || code}</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.8rem', alignItems: 'center' }}>
                          <span style={{ color: 'rgba(255,255,255,0.4)' }}>by {room.adminName || 'Admin'}</span>
                          <span style={{ width: '1px', height: '10px', background: 'rgba(255,255,255,0.1)' }} />
                          <span>{room.participants?.length || 0}/{room.capacity || 12} joined</span>
                          <span style={{ width: '1px', height: '10px', background: 'rgba(255,255,255,0.1)' }} />
                          <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>₹{room.budget || 100} Cr</span>
                        </div>
                      </div>
                      {me ? (
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '0.6rem 1.5rem', fontSize: '0.95rem', borderRadius: '8px' }}
                          onClick={() => { 
                            localStorage.setItem('ipl_my_uid', me.userId);
                            setShowAllPublic(false); 
                            navigate(`/lobby/${code}?admin=${me.role === 'ADMIN'}`); 
                          }}
                        >
                          Enter
                        </button>
                      ) : (
                        <button
                          className="btn btn-primary"
                          style={{ padding: '0.6rem 1.5rem', fontSize: '0.95rem', borderRadius: '8px', boxShadow: '0 4px 12px rgba(6, 182, 212, 0.2)' }}
                          onClick={() => { setShowAllPublic(false); setJoinModalCode(code); setIsJoinModalOpen(true); }}
                        >
                          Join
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div style={{ padding: '1.5rem 2rem', borderTop: '1px solid rgba(255,255,255,0.07)', background: 'rgba(0,0,0,0.1)' }}>
              <button
                onClick={() => setShowAllPublic(false)}
                style={{ 
                  width: '100%', 
                  background: 'rgba(255,255,255,0.05)', 
                  border: '1px solid rgba(255,255,255,0.1)', 
                  color: 'white', 
                  padding: '1rem', 
                  borderRadius: '12px', 
                  fontSize: '1rem',
                  fontWeight: 700, 
                  cursor: 'pointer',
                  transition: '0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <PointsModal isOpen={showPoints} onClose={() => setShowPoints(false)} />
      </div>
    </div>
  );
};

export default Home;
