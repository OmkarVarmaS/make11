import { useContext, useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../App';
import { LogOut } from 'lucide-react';
import { dbService, PLAYERS } from '../services/db';
import UserMenu from '../components/UserMenu';
import ChoosePlayersModal from '../components/ChoosePlayersModal';

const Lobby = () => {
  const { roomId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const roomData = location.state?.roomData;

  // ── Stable userId: same strategy as Auction.tsx ───────────────────────────
  const myUserId = localStorage.getItem('ipl_my_uid') || user?.userId || '';

  // State declarations must come before any derived values that reference them
  const [participants, setParticipants] = useState<any[]>([]);
  const [capacity, setCapacity] = useState(12);
  const [copied, setCopied] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isKicked, setIsKicked] = useState(false);
  const [kickRedirectSecs, setKickRedirectSecs] = useState(3);
  const [isPublic, setIsPublic] = useState(false);
  const [settings, setSettings] = useState({
    budget: 100,
    teamSize: 15,
    timer: 15,
    order: 'random',
    selectedPlayers: PLAYERS.map(p => p.id)
  });
  const [isChoosePlayersOpen, setIsChoosePlayersOpen] = useState(false);

  // Derived — safe to compute now that participants is declared above
  const myParticipant = participants.find(p => p.isMe);
  const isAdmin = myParticipant ? myParticipant.role === 'ADMIN' : (searchParams.get('admin') === 'true');

  const handleCopyCode = () => {
    if (roomId) {
      navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  useEffect(() => {
    // Poll the mock DB to simulate real-time updates
    const fetchRoom = async () => {
      if (!roomId) return;
      if (myUserId) {
        await dbService.updatePresence(roomId, myUserId);
      }
      const room = await dbService.getRoom(roomId);
      if (room) {
        // ── Kicked detection ─────────────────────────────────────────────────
        if (myUserId && (room.kickedUsers || []).includes(myUserId)) {
          setIsKicked(true);
          return;
        }

        const mappedParticipants = (room.participants || []).map((p: any) => ({
          ...p,
          isMe: p.userId === myUserId,
          isOnline: p.userId === myUserId ? true : (Date.now() - (p.lastSeen || 0) < 5000)
        }));

        // ── Identity Sync ───────────────────────────────────────────────────
        // If current session ID doesn't match any participant, but the 
        // authenticated user DOES have a slot in this room, auto-recover it.
        if (user?.userId && !mappedParticipants.some((p: any) => p.isMe)) {
          const actualMe = mappedParticipants.find((p: any) => p.userId === user.userId);
          if (actualMe) {
            localStorage.setItem('ipl_my_uid', user.userId);
          }
        }

        setParticipants(mappedParticipants);
        if (room.capacity) setCapacity(room.capacity);
        if (room.isPublic) setIsPublic(room.isPublic);

        // Compute actual admin state dynamically
        const currentIsAdmin = mappedParticipants.find((p: any) => p.isMe)?.role === 'ADMIN';

        // If admin has started the auction, redirect non-admin users automatically
        if (!currentIsAdmin && room.auctionStarted) {
          navigate(`/auction/${roomId}?admin=false`);
          return;
        }
        
        // Sync admin settings if needed
        if (!currentIsAdmin && room) {
          setSettings({
            budget: room.budget || 100,
            teamSize: room.teamSize || 15,
            timer: room.timer || 15,
            order: room.order || 'random',
            selectedPlayers: room.selectedPlayers || PLAYERS.map(p => p.id)
          });
        }
      }
    };
    
    fetchRoom();
    const interval = setInterval(fetchRoom, 1000);
    return () => clearInterval(interval);
  }, [roomId, isAdmin, myUserId]);

  const handleSettingChange = async (key: string, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    if (roomId && isAdmin) {
      await dbService.updateRoomSettings(roomId, { [key]: value });
    }
  };

  const handleStartAuction = async () => {
    if (roomId) {
      await dbService.startAuction(roomId);
    }
    navigate(`/auction/${roomId}?admin=${isAdmin}`);
  };

  const removeParticipant = async (id: string) => {
    if (roomId) {
      await dbService.removeParticipant(roomId, id);
    }
  };

  // ── Leave lobby (snapshot-preserving, same as Auction leave) ──────────────
  const handleLeave = async () => {
    if (roomId && myUserId) {
      await dbService.leaveAuction(roomId, myUserId);
      localStorage.removeItem('ipl_my_uid');
    }
    setIsLeaveModalOpen(false);
    navigate('/home');
  };

  // ── Kicked auto-redirect countdown ───────────────────────────────────────
  useEffect(() => {
    if (!isKicked) return;
    localStorage.removeItem('ipl_my_uid');
    let secs = 3;
    setKickRedirectSecs(secs);
    const t = setInterval(() => {
      secs -= 1;
      setKickRedirectSecs(secs);
      if (secs <= 0) {
        clearInterval(t);
        navigate('/home');
      }
    }, 1000);
    return () => clearInterval(t);
  }, [isKicked]);

  return (
    <div className="lobby-page" style={{ flex: 1, color: 'white', padding: '2rem 1.5rem', fontFamily: 'Inter, sans-serif' }}>

      {/* ════════════════ KICKED BY ADMIN OVERLAY ═══════════════════════════ */}
      {isKicked && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 400,
          background: 'rgba(0,0,0,0.92)',
          backdropFilter: 'blur(8px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: '1rem', animation: 'fadeIn 0.3s ease',
        }}>
          <div style={{ fontSize: '4rem' }}>🚫</div>
          <h2 style={{
            fontSize: '1.75rem', fontWeight: 900, color: 'var(--danger)',
            textShadow: '0 0 30px rgba(239,68,68,0.5)', margin: 0,
          }}>
            Removed from Room
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', margin: 0, textAlign: 'center', maxWidth: '340px', lineHeight: 1.6 }}>
            Admin has removed you from the room.
          </p>
          <div style={{
            marginTop: '0.5rem',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            color: 'var(--text-secondary)', fontSize: '0.9rem',
          }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--danger)' }} />
            Redirecting to home in <strong style={{ color: 'white', marginLeft: '0.2rem' }}>{kickRedirectSecs}s</strong>…
          </div>
          <button
            onClick={() => navigate('/home')}
            style={{
              marginTop: '1rem',
              padding: '0.75rem 2rem', borderRadius: '8px',
              background: 'rgba(239,68,68,0.15)',
              border: '1px solid rgba(239,68,68,0.5)',
              color: 'var(--danger)', fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
            }}
          >
            Go to Home Now
          </button>
        </div>
      )}

      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        
        {/* Top Nav */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div 
            style={{ color: 'var(--accent-primary)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}
            onClick={() => navigate('/home')}
          >
            ← Home
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <UserMenu />
            {/* Leave room button */}
            <button
              onClick={() => setIsLeaveModalOpen(true)}
              title="Leave Room"
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.35)',
                color: 'var(--danger)',
                padding: '0.45rem 0.9rem',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.18)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)'; }}
            >
              <LogOut size={14} />
              Leave
            </button>
          </div>
        </div>

        {/* Room Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <h1 style={{ color: 'var(--accent-primary)', fontSize: '2rem', fontWeight: 700, margin: 0 }}>
            {roomData?.roomName || roomId}
          </h1>
          {isPublic && (
            <span style={{ 
              background: 'rgba(235, 208, 92, 0.1)', border: '1px solid rgba(235, 208, 92, 0.2)', 
              color: 'var(--accent-primary)', padding: '0.2rem 0.6rem', borderRadius: '4px', 
              fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.05em' 
            }}>
              PUBLIC
            </span>
          )}
        </div>

        {/* Room Code Box */}
        <div style={{ 
          border: '1px solid var(--border-highlight)', borderRadius: '12px', padding: '1.5rem 2rem', 
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem',
          background: 'rgba(255,255,255,0.02)'
        }}>
          <div style={{ fontSize: '2rem', fontWeight: 600, letterSpacing: '0.5em', textTransform: 'uppercase' }}>
            {roomId?.split('').join(' ') || 'E R R O R'}
          </div>
          <button 
            onClick={handleCopyCode}
            style={{ 
            background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', 
            padding: '0.5rem 1rem', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', transition: '0.2s'
          }}>
            {copied ? 'Copied!' : 'Copy Code'}
          </button>
        </div>

        {/* Participants Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 600, letterSpacing: '0.05em' }}>
          <span>PARTICIPANTS</span>
          <span>{participants.length} / {capacity} joined</span>
        </div>

        {/* Participants List container matching image 1 */}
        <div style={{ 
          border: '1px solid var(--border-highlight)', borderRadius: '12px', 
          background: 'transparent', marginBottom: '2rem', overflow: 'hidden'
        }}>
          {participants.map((p, index) => (
            <div key={p.name} style={{ 
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '1rem 1.5rem',
              borderBottom: index !== participants.length - 1 ? '1px solid var(--border-highlight)' : 'none',
              borderLeft: p.isMe ? '4px solid var(--accent-primary)' : '4px solid transparent',
              background: 'transparent'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1rem' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: p.isOnline ? 'var(--success)' : 'var(--danger)', boxShadow: p.isOnline ? '0 0 8px var(--success)' : 'none' }}></div>
                <span style={{ fontWeight: 500, color: p.isOnline ? 'white' : 'var(--text-secondary)' }}>{p.name}</span>
                {p.isMe && <span style={{ color: 'var(--text-secondary)' }}>(you)</span>}
                {!p.isOnline && !p.isMe && <span style={{ color: 'var(--danger)', fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.35rem', border: '1px solid rgba(239,68,68,0.5)', borderRadius: '4px' }}>OFFLINE</span>}
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {p.role === 'ADMIN' && (
                  <div style={{ border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600 }}>
                    ADMIN
                  </div>
                )}
                {isAdmin && !p.isMe && (
                   <button 
                     onClick={() => removeParticipant(p.userId)}
                     style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                   >
                     ×
                   </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Settings Box (Visible to all, editable by Admin) */}
        <div className="lobby-settings-grid" style={{ 
          border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1.5rem', 
          marginBottom: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem'
        }}>
            
            {/* Purse */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
              <label style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', letterSpacing: '0.1em', textAlign: 'center' }}>PURSE</label>
              {isAdmin ? (
                <select 
                  style={{ 
                    width: '100%',
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', 
                    color: 'var(--accent-primary)', padding: '0.75rem', borderRadius: '6px', 
                    fontSize: '1rem', fontWeight: 600, textAlign: 'center', appearance: 'none', cursor: 'pointer'
                  }}
                  value={settings.budget}
                  onChange={e => handleSettingChange('budget', Number(e.target.value))}
                >
                  <option style={{ background: '#1a1a1a', color: 'var(--accent-primary)' }} value={100}>₹100 Cr</option>
                  <option style={{ background: '#1a1a1a', color: 'var(--accent-primary)' }} value={150}>₹150 Cr</option>
                  <option style={{ background: '#1a1a1a', color: 'var(--accent-primary)' }} value={200}>₹200 Cr</option>
                  <option style={{ background: '#1a1a1a', color: 'var(--accent-primary)' }} value={250}>₹250 Cr</option>
                </select>
              ) : (
                <div style={{ color: 'var(--accent-primary)', fontSize: '1.05rem', fontWeight: 700 }}>
                  ₹{settings.budget} Cr
                </div>
              )}
            </div>

            {/* Squad */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
              <label style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', letterSpacing: '0.1em', textAlign: 'center' }}>SQUAD</label>
              {isAdmin ? (
                <select 
                  style={{ 
                    width: '100%',
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', 
                    color: 'var(--accent-primary)', padding: '0.75rem', borderRadius: '6px', 
                    fontSize: '1rem', fontWeight: 600, textAlign: 'center', appearance: 'none', cursor: 'pointer'
                  }}
                  value={settings.teamSize}
                  onChange={e => handleSettingChange('teamSize', Number(e.target.value))}
                >
                  <option style={{ background: '#1a1a1a', color: 'var(--accent-primary)' }} value={10}>10 players</option>
                  <option style={{ background: '#1a1a1a', color: 'var(--accent-primary)' }} value={15}>15 players</option>
                  <option style={{ background: '#1a1a1a', color: 'var(--accent-primary)' }} value={20}>20 players</option>
                  <option style={{ background: '#1a1a1a', color: 'var(--accent-primary)' }} value={25}>25 players</option>
                </select>
              ) : (
                <div style={{ color: 'var(--accent-primary)', fontSize: '1.05rem', fontWeight: 700 }}>
                  {settings.teamSize} players
                </div>
              )}
            </div>

            {/* Timer */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
              <label style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', letterSpacing: '0.1em', textAlign: 'center' }}>TIMER</label>
              {isAdmin ? (
                <select 
                  style={{ 
                    width: '100%',
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', 
                    color: 'var(--accent-primary)', padding: '0.75rem', borderRadius: '6px', 
                    fontSize: '1rem', fontWeight: 600, textAlign: 'center', appearance: 'none', cursor: 'pointer'
                  }}
                  value={settings.timer}
                  onChange={e => handleSettingChange('timer', Number(e.target.value))}
                >
                  <option style={{ background: '#1a1a1a', color: 'var(--accent-primary)' }} value={15}>15s</option>
                  <option style={{ background: '#1a1a1a', color: 'var(--accent-primary)' }} value={30}>30s</option>
                  <option style={{ background: '#1a1a1a', color: 'var(--accent-primary)' }} value={60}>60s</option>
                </select>
              ) : (
                <div style={{ color: 'var(--accent-primary)', fontSize: '1.05rem', fontWeight: 700 }}>
                  {settings.timer}s
                </div>
              )}
            </div>

            {/* Order */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
              <label style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', letterSpacing: '0.1em', textAlign: 'center' }}>ORDER</label>
              {isAdmin ? (
                <select 
                  style={{ 
                    width: '100%',
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', 
                    color: 'var(--accent-primary)', padding: '0.75rem', borderRadius: '6px', 
                    fontSize: '1rem', fontWeight: 600, textAlign: 'center', appearance: 'none', cursor: 'pointer'
                  }}
                  value={settings.order}
                  onChange={e => handleSettingChange('order', e.target.value)}
                >
                  <option style={{ background: '#1a1a1a', color: 'var(--accent-primary)' }} value="random">Random</option>
                  <option style={{ background: '#1a1a1a', color: 'var(--accent-primary)' }} value="category">Category</option>
                </select>
              ) : (
                <div style={{ color: 'var(--accent-primary)', fontSize: '1.05rem', fontWeight: 700 }}>
                  {settings.order?.charAt(0).toUpperCase() + settings.order?.slice(1)}
                </div>
              )}
            </div>
          </div>

        {/* Bottom Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {isAdmin && (
            <button 
              onClick={() => setIsChoosePlayersOpen(true)}
              style={{ 
                background: 'var(--accent-dim)', border: '1px solid rgba(6, 182, 212, 0.4)', 
                color: 'var(--accent-primary)', padding: '1.25rem', borderRadius: '8px', 
                fontSize: '1rem', fontWeight: 700, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}
            >
              <span>Choose Players</span>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{settings.selectedPlayers.length} of {PLAYERS.length} selected</span>
            </button>
          )}

          {participants.length >= 2 ? (
            isAdmin ? (
              <button 
                onClick={handleStartAuction}
                style={{ 
                  background: 'var(--accent-primary)', border: 'none', color: 'black', 
                  padding: '1.25rem', borderRadius: '8px', fontSize: '1.125rem', fontWeight: 700, cursor: 'pointer',
                  boxShadow: 'var(--shadow-glow)'
                }}
              >
                Start Auction
              </button>
            ) : (
              <button style={{ 
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(6, 182, 212, 0.2)', color: 'var(--accent-primary)', 
                padding: '1.25rem', borderRadius: '8px', fontSize: '1rem', fontWeight: 600, cursor: 'not-allowed'
              }}>
                Waiting for admin to start...
              </button>
            )
          ) : (
            <button style={{ 
              background: 'rgba(255,255,255,0.02)', border: 'none', color: 'var(--text-secondary)', 
              padding: '1.25rem', borderRadius: '8px', fontSize: '1rem', fontWeight: 600, cursor: 'not-allowed'
            }}>
              Waiting for participants (minimum 2)...
            </button>
          )}

        </div>

      </div>

      {/* ════════════════ LEAVE CONFIRMATION MODAL ══════════════════════════ */}
      {isLeaveModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 300,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'fadeIn 0.2s ease',
        }}>
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '16px',
            padding: '2.5rem',
            maxWidth: '420px',
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 0 60px rgba(239,68,68,0.15)',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚪</div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>Leave Room?</h2>
            <p style={{ color: 'var(--text-secondary)', margin: '0 0 0.5rem 0', lineHeight: 1.6 }}>
              Your spot is <strong style={{ color: 'white' }}>saved</strong>. Rejoin anytime using the room code.
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: '0 0 2rem 0' }}>
              Room code: <strong style={{ color: 'var(--accent-primary)', letterSpacing: '0.1em' }}>{roomId}</strong>
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button
                onClick={() => setIsLeaveModalOpen(false)}
                style={{
                  flex: 1, padding: '0.85rem', borderRadius: '8px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid var(--border-color)',
                  color: 'white', fontSize: '1rem', fontWeight: 600, cursor: 'pointer',
                  transition: '0.2s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)'; }}
              >
                Stay
              </button>
              <button
                onClick={handleLeave}
                style={{
                  flex: 1, padding: '0.85rem', borderRadius: '8px',
                  background: 'rgba(239,68,68,0.15)',
                  border: '1px solid rgba(239,68,68,0.5)',
                  color: 'var(--danger)', fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
                  transition: '0.2s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.28)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.15)'; }}
              >
                Leave Room
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* ════════════════ CHOOSE PLAYERS MODAL ══════════════════════════ */}
      <ChoosePlayersModal 
        isOpen={isChoosePlayersOpen} 
        onClose={() => setIsChoosePlayersOpen(false)} 
        selectedIds={settings.selectedPlayers} 
        onChangeSelected={(newSelected) => handleSettingChange('selectedPlayers', newSelected)} 
      />
    </div>
  );
};

export default Lobby;
