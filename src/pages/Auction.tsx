import React, { useContext, useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import { ChevronDown, Clock } from 'lucide-react';
import UserMenu from '../components/UserMenu';
import { dbService, PLAYERS, TEAM_COLORS } from '../services/db';

// ─── Amount formatters ────────────────────────────────────────────────────────
const fmt = (l: number) => {
  if (l >= 100) {
    const cr = l / 100;
    return `₹${cr % 1 === 0 ? cr.toFixed(0) : cr.toFixed(2)}Cr`;
  }
  return `₹${l}L`;
};
const fmtPurse = (l: number) => {
  if (l >= 100) {
    const cr = l / 100;
    return `${cr % 1 === 0 ? cr.toFixed(0) : cr.toFixed(1)}`;
  }
  return `${l}L`;
};

const normalizeRole = (r: string) => {
  if (!r) return '';
  const norm = r.toUpperCase().replace(/[-_ ]/g, '');
  if (norm === 'BATSMAN' || norm === 'BATTER') return 'BATTER';
  if (norm === 'ALLROUNDER') return 'ALL_ROUNDER';
  if (norm === 'WICKETKEEPER' || norm === 'WK') return 'WICKETKEEPER';
  return norm;
};

const getRoleColor = (r: string) => {
  const norm = normalizeRole(r);
  if (norm === 'BATTER') return '#fbbf24'; // Yellow/Orange
  if (norm === 'BOWLER') return '#60a5fa'; // Blue
  if (norm === 'ALL_ROUNDER') return '#4ade80'; // Green
  if (norm === 'WICKETKEEPER') return '#a78bfa'; // Purple
  return '#888';
};

const Auction = () => {
  const { roomId }       = useParams();
  const [searchParams]   = useSearchParams();
  const { user }         = useContext(AuthContext);
  const navigate         = useNavigate();

  // ── Stable per-tab identity (localStorage = unique per user, shared across tabs) ──
  // Always prefer the room-scoped session ID (ipl_my_uid) — this is what was stored
  // in the room's participants array when the user joined. The Supabase auth userId
  // is a different UUID and won't match any participant, causing myTeam = undefined.
  const myUserId = localStorage.getItem('ipl_my_uid') || user?.userId || '';

  // ── DB-synced state ────────────────────────────────────────────────────────
  const [teams,               setTeams]               = useState<any[]>([]);
  const [currentBid,          setCurrentBid]          = useState<number>(0);
  const [leadingTeam,         setLeadingTeam]         = useState<string | null>(null);
  const [leadingUserId,       setLeadingUserId]       = useState<string | null>(null);
  const [bidHistory,          setBidHistory]          = useState<any[]>([]);
  const [,                    setBidDeadline]         = useState<number>(0);
  const [withdrawnTeams,      setWithdrawnTeams]      = useState<string[]>([]);
  const [currentPlayerIndex,  setCurrentPlayerIndex]  = useState<number>(0);
  const [playerOrder,         setPlayerOrder]         = useState<string[]>([]);
  const [lastSold,            setLastSold]            = useState<any>(null);
  const [auctionStatus,       setAuctionStatus]       = useState<string>('bidding');
  const [countdown,           setCountdown]           = useState<number>(15);
  const [expandedTeam,        setExpandedTeam]        = useState<string | null>(null);
  const [roomSettings,        setRoomSettings]        = useState<any>({ budget: 100, teamSize: 15, timer: 15 });
  const [pausedRemaining,     setPausedRemaining]     = useState<number>(0);
  const [isKicked,            setIsKicked]            = useState(false);
  const [kickRedirectSecs,    setKickRedirectSecs]    = useState(3);
  const [liveReactions,       setLiveReactions]       = useState<any[]>([]);
  const [unsoldPlayers,       setUnsoldPlayers]       = useState<any[]>([]);
  const [round2Selections,    setRound2Selections]    = useState<any>({});
  const [round2Ready,         setRound2Ready]         = useState<string[]>([]);
  const [round2Deadline,      setRound2Deadline]      = useState<number>(0);
  const [searchTerm,          setSearchTerm]          = useState('');
  const [roleFilter,          setRoleFilter]          = useState('ALL');
  const [teamFilter,          setTeamFilter]          = useState('ALL');
  const [currentRound,        setCurrentRound]        = useState<number>(1);
  const [orderType,           setOrderType]           = useState<string>('RANDOM');

  // Track which reaction ids we've already spawned so we don't duplicate
  const seenReactionIds = useRef<Set<string>>(new Set());

  // Prevent duplicate concludeRound calls from the same client's timer
  const concludingRef = useRef(false);
  const lastR2UpdateRef = useRef<number>(0);
  const lastActionTimeRef = useRef<number>(0);

  // Refs for the countdown — avoids re-creating the interval on every state change
  const bidDeadlineRef    = useRef<number>(0);
  const auctionStatusRef  = useRef<string>('bidding');
  const lastSoldRef       = useRef<any>(null);
  const currentPlayerIndexRef = useRef<number>(0);
  const roomIdRef         = useRef<string | undefined>(roomId);
  const timerRef          = useRef<number>(15);
  const currentBidRef     = useRef<number>(0);
  const withdrawnTeamsRef = useRef<string[]>([]);
  const isAdminRef        = useRef<boolean>(false);

  // ── Strict back navigation protection ─────────────────────────────────────
  const isAuctionRunningRef = useRef(auctionStatus !== 'ended');
  useEffect(() => {
    isAuctionRunningRef.current = (auctionStatus !== 'ended');
  }, [auctionStatus]);

  useEffect(() => {
    // Push a dummy state so the very first back press doesn't immediately leave
    window.history.pushState({ auctionTrap: true }, '', window.location.href);

    const handlePopState = () => {
      if (isAuctionRunningRef.current) {
        // Re-push so the next back gesture is also trapped
        window.history.pushState({ auctionTrap: true }, '', window.location.href);
        // Send user to home (they stay in the room — not kicked)
        navigate('/home');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [navigate]);

  // ── Derived values ────────────────────────────────────────────────────────
  const myTeam        = teams.find(t => t.userId === myUserId);
  const myTeamName    = myTeam?.name || '';
  const isAdmin       = myTeam ? myTeam.role === 'ADMIN' : (searchParams.get('admin') === 'true');
  const isLeading     = currentBid > 0 && leadingUserId === myUserId;
  const hasWithdrawn  = withdrawnTeams.includes(myUserId);
  const currentPlayerId = playerOrder[currentPlayerIndex];
  const currentPlayer = currentPlayerId ? PLAYERS.find((p: any) => p.id === currentPlayerId) : (PLAYERS[currentPlayerIndex] ?? PLAYERS[PLAYERS.length - 1]);
  const basePrice     = currentPlayer?.basePrice ?? 25;
  const totalPlayers  = playerOrder.length > 0 ? playerOrder.length : PLAYERS.length;

  useEffect(() => {
    isAdminRef.current = isAdmin;
  }, [isAdmin]);

  // Show SOLD overlay while lastSold.expiresAt is in the future
  const showSoldOverlay = !!(lastSold && Date.now() < lastSold.expiresAt);

  // ── Poll DB every 800 ms ──────────────────────────────────────────────────
  useEffect(() => {
    const poll = async () => {
      if (!roomId) return;
      if (myUserId) await dbService.updatePresence(roomId, myUserId);
      const room = await dbService.getRoom(roomId);
      if (!room) return;

      // ── Kicked detection ────────────────────────────────────────────────
      if (myUserId && (room.kickedUsers || []).includes(myUserId)) {
        setIsKicked(true);
        return;  // stop processing further state updates
      }

      const enriched = (room.participants || []).map((p: any) => ({
        ...p,
        isMe: p.userId === myUserId,
        isOnline: p.userId === myUserId ? true : (Date.now() - (p.lastSeen || 0) < 5000),
        hasLeft: false,
      }));

      // ── Merge left participants so they stay visible with a LEFT badge ──
      const leftEnriched = (room.leftParticipants || []).map((p: any) => ({
        ...p,
        isMe: false,
        isOnline: false,
        hasLeft: true,
      }));
      // ── Identity Sync ───────────────────────────────────────────────────
      // If current session ID doesn't match any team, but the authenticated
      // user DOES have a team in this room, auto-recover it.
      if (user?.userId && !enriched.some((p: any) => p.isMe)) {
        const actualMe = enriched.find((p: any) => p.userId === user.userId);
        if (actualMe) {
          localStorage.setItem('ipl_my_uid', user.userId);
          // Next poll cycle will pick up the new ID
        }
      }

      setTeams([...enriched, ...leftEnriched]);
      setPlayerOrder(room.playerOrder        ?? []);
      const serverRound = room.round ?? 1;
      const serverIndex = room.currentPlayerIndex ?? 0;
      const serverStatus = room.status ?? 'bidding';

      // ── Optimistic Sync ────────────────────────────────────────────────
      const now = Date.now();
      // 3-second optimistic window — enough time for the Supabase write to propagate
      let isFreshAction = now - lastActionTimeRef.current < 3000;

      // Break optimistic lock immediately if the server advanced the game state
      if (
        serverRound > currentRound ||
        serverIndex > currentPlayerIndexRef.current ||
        serverStatus === 'ended' ||
        (serverStatus === 'round2_selection' && auctionStatusRef.current !== 'round2_selection')
      ) {
        isFreshAction = false;
        lastActionTimeRef.current = 0;
      }

      setCurrentPlayerIndex(() => {
        currentPlayerIndexRef.current = serverIndex;
        return serverIndex;
      });
      setLastSold(() => {
        const newSold = room.lastSold ?? null;
        lastSoldRef.current = newSold;
        return newSold;
      });

      if (!isFreshAction) {
        setAuctionStatus(serverStatus);
        auctionStatusRef.current = serverStatus;
      }
      setUnsoldPlayers(room.unsoldPlayers    ?? []);
      if (Date.now() - lastR2UpdateRef.current > 1500) {
        setRound2Selections(room.round2Selections ?? {});
        setRound2Ready(room.round2Ready        ?? []);
      }
      
      // Only overwrite current bid if the server has a HIGHER bid or the optimistic window has expired
      if (!isFreshAction || (room.currentBid ?? 0) > currentBidRef.current) {
        setCurrentBid(room.currentBid          ?? 0);
        currentBidRef.current = room.currentBid ?? 0;
        setLeadingTeam(room.leadingTeam        ?? null);
        setLeadingUserId(room.leadingUserId    ?? null);
        setBidHistory(room.bidHistory          ?? []);
      }

      if (!isFreshAction || (room.withdrawnTeams || []).length >= withdrawnTeamsRef.current.length) {
        setWithdrawnTeams(room.withdrawnTeams  ?? []);
        withdrawnTeamsRef.current = room.withdrawnTeams ?? [];
      }

      // Only update bidDeadline from server if NOT in fresh action window
      // (otherwise the new server deadline would restart our local countdown)
      const serverDeadline = room.bidDeadline ?? 0;
      if (!isFreshAction || serverDeadline > bidDeadlineRef.current) {
        setBidDeadline(serverDeadline);
        bidDeadlineRef.current = serverDeadline;
      }

      setRound2Deadline(room.round2Deadline  ?? 0);
      setCurrentRound(room.round             ?? 1);
      setOrderType(room.orderType            ?? 'RANDOM');
      setRoomSettings(() => {
        const next = {
          budget: room.budget || 100,
          teamSize: room.teamSize || 15,
          timer: room.timer || 15,
        };
        timerRef.current = next.timer;
        return next;
      });
      setPausedRemaining(room.pausedRemaining ?? 0);

      // ── Sync live emoji reactions ────────────────────────────────────────
      const incoming = (room.reactions || []).filter(
        (r: any) => !seenReactionIds.current.has(r.id) && (Date.now() - r.ts) < 3500
      );
      if (incoming.length > 0) {
        incoming.forEach((r: any) => seenReactionIds.current.add(r.id));
        setLiveReactions(prev => {
          const next = [...prev, ...incoming];
          return next.slice(-20); // cap at 20 simultaneous
        });
        // Auto-remove each after 3.5s
        incoming.forEach((r: any) => {
          setTimeout(() => {
            setLiveReactions(prev => prev.filter(x => x.id !== r.id));
          }, 3500);
        });
      }
    };

    poll();
    const id = setInterval(poll, 800);
    return () => clearInterval(id);
  }, [roomId, myUserId]);

  // ── Countdown timer (100 ms tick) ─────────────────────────────────────────
  // Uses refs instead of state deps so the interval is created ONCE and never
  // restarted mid-count — this prevents the "stuck at 15" freeze.
  useEffect(() => {
    const tick = () => {
      const status   = auctionStatusRef.current;
      const deadline = bidDeadlineRef.current;
      const sold     = lastSoldRef.current;
      const pidx     = currentPlayerIndexRef.current;
      const rid      = roomIdRef.current;

      if (status === 'paused') return;
      if (deadline <= 0) { setCountdown(15); return; }

      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setCountdown(remaining);

      // Guards before allowing a client to conclude the round:
      //  1. Timer has actually expired
      //  2. This tab hasn't already fired conclude (concludingRef debounce)
      //  3. Auction is in bidding state (not paused / ended)
      //  4. No sold/unsold overlay is currently showing
      const overlayActive = !!(sold && Date.now() < sold.expiresAt);
      if (
        isAdminRef.current &&
        Date.now() >= deadline &&
        !concludingRef.current &&
        status === 'bidding' &&
        !overlayActive &&
        rid
      ) {
        concludingRef.current = true;
        dbService.concludeRound(rid, pidx).finally(() => {
          // Reset ref after 4 s (>= overlay duration) so it's ready for the next round
          setTimeout(() => { concludingRef.current = false; }, 4000);
        });
      }
    };

    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, []); // empty deps — runs once; reads live values through refs

  // ── Place a bid ───────────────────────────────────────────────────────────
  const placeBid = async (additionalAmount: number) => {
    if (!roomId || !myTeamName || !myUserId || isLeading) return;
    const newBid = currentBid === 0 ? basePrice : currentBid + additionalAmount;
    if (newBid > (myTeam?.purse ?? 0)) return;
    if ((myTeam?.slotsUsed ?? 0) >= roomSettings.teamSize) return;

    lastActionTimeRef.current = Date.now();

    const snapIndex = currentPlayerIndex;  // capture before async gap

    // Optimistic: extend deadline locally so timer doesn't expire mid-bid
    const optimisticDeadline = Date.now() + timerRef.current * 1000;
    bidDeadlineRef.current = optimisticDeadline;
    setBidDeadline(optimisticDeadline);

    // Optimistic local update for instant UI response
    setCurrentBid(newBid);
    currentBidRef.current = newBid;
    setLeadingTeam(myTeamName);
    setLeadingUserId(myUserId);
    setBidHistory(prev =>
      [{ team: myTeamName, userId: myUserId, amount: newBid, ts: Date.now() }, ...prev].slice(0, 20)
    );
    // Pass the snap-shotted player index so the DB rejects the write if the
    // round already advanced while the user was clicking.
    await dbService.placeBid(roomId, newBid, myTeamName, myUserId, snapIndex);
  };

  // ── Withdraw from current round ───────────────────────────────────────────
  // Skip (no bids yet) = don't open the bidding on this player → allowed anytime.
  // Withdraw (bidding in progress) = fold the current bid. Not allowed if you
  // are the current leading bidder (you cannot withdraw your own winning bid).
  const handleWithdraw = async () => {
    if (!roomId || !myUserId || hasWithdrawn) return;
    // When bidding is in progress, block if this user is the current leader
    if (currentBid > 0 && isLeading) return;
    lastActionTimeRef.current = Date.now();
    setWithdrawnTeams(prev => {
      const next = prev.includes(myUserId) ? prev : [...prev, myUserId];
      withdrawnTeamsRef.current = next;
      return next;
    });  // optimistic
    await dbService.withdrawFromBid(roomId, myUserId);
  };

  // ── Admin Actions ─────────────────────────────────────────────────────────
  const handleTogglePause = async () => {
    if (!roomId) return;
    // Optimistic UI: immediately flip status so the button responds instantly
    const nextStatus = auctionStatus === 'paused' ? 'bidding' : 'paused';
    setAuctionStatus(nextStatus);
    auctionStatusRef.current = nextStatus;
    lastActionTimeRef.current = Date.now();
    if (nextStatus === 'bidding') {
      // Restore deadline from paused remaining
      const restored = Date.now() + (pausedRemaining || 15000);
      setBidDeadline(restored);
      bidDeadlineRef.current = restored;
    }
    await dbService.togglePause(roomId);
  };

  const handleEndRound = async () => {
    if (!roomId) return;
    if (window.confirm('Are you sure you want to end Round 1 completely? Unsold players will go to Round 2 selection.')) {
      // Optimistic: immediately switch to round2_selection so UI responds
      setAuctionStatus('round2_selection');
      auctionStatusRef.current = 'round2_selection';
      setRound2Deadline(Date.now() + (3 * 60 + 41) * 1000);
      lastActionTimeRef.current = Date.now();
      await dbService.endRound(roomId);
    }
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

  // ── Round 2 Selection Screen ───────────────────────────────────────────────
  if (auctionStatus === 'round2_selection') {
    const r2Time = Math.max(0, Math.ceil((round2Deadline - Date.now()) / 1000));
    const mins = Math.floor(r2Time / 60);
    const secs = (r2Time % 60).toString().padStart(2, '0');
    
    const activeTeams = teams.filter(t => !t.hasLeft).length;
    const allReady = activeTeams > 0 && round2Ready.length >= activeTeams;
    
    // Auto-start when timer reaches 0 or everyone is ready (but ensure deadline is valid)
    if (((r2Time <= 0 && round2Deadline > 0) || allReady) && isAdmin && roomId && !concludingRef.current) {
      concludingRef.current = true;
      dbService.startRound2(roomId).finally(() => {
        setTimeout(() => { concludingRef.current = false; }, 3000);
      });
    }

    const mySelections = round2Selections[myUserId] || [];
    const isReady = round2Ready.includes(myUserId);

    const handleTogglePlayer = (playerId: string) => {
      if (isReady || !roomId || !myUserId) return;
      lastR2UpdateRef.current = Date.now();
      
      // Optimistic update
      setRound2Selections((prev: any) => {
        const mySels = prev[myUserId] || [];
        const newSels = mySels.includes(playerId)
          ? mySels.filter((id: string) => id !== playerId)
          : [...mySels, playerId];
        return { ...prev, [myUserId]: newSels };
      });
      
      dbService.toggleRound2Selection(roomId, myUserId, playerId);
    };

    const handleConfirmSelection = () => {
      if (isReady || !roomId || !myUserId) return;
      lastR2UpdateRef.current = Date.now();
      
      // Optimistic update
      setRound2Ready(prev => {
        if (!prev.includes(myUserId)) return [...prev, myUserId];
        return prev;
      });
      
      dbService.confirmRound2Selection(roomId, myUserId);
    };

    // Filter unsold players
    const filteredPlayers = unsoldPlayers.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter === 'ALL' || normalizeRole(p.role) === normalizeRole(roleFilter);
      const matchesTeam = teamFilter === 'ALL' || p.team === teamFilter;
      return matchesSearch && matchesRole && matchesTeam;
    });

    const roles = ['ALL', 'BATTER', 'BOWLER', 'ALL_ROUNDER', 'WICKETKEEPER'];
    const teamNames = ['ALL', ...Array.from(new Set(unsoldPlayers.map(p => p.team))).sort()];

    return (
      <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', color: 'white', fontFamily: 'Inter, sans-serif', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ maxWidth: '900px', width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h1 style={{ color: 'var(--accent-primary)', fontSize: '2rem', marginBottom: '0.5rem', fontWeight: 800 }}>
              Unsold Players — Round 2 Selection
            </h1>
            <p style={{ color: '#888', fontSize: '1rem' }}>
              Pick the players you'd like re-auctioned<br/>
              <span style={{ color: 'var(--accent-primary)' }}>{round2Ready.length} of {teams.length} teams ready</span>
            </p>
          </div>

          {/* Timer Banner */}
          <div className="r2-timer-banner" style={{ background: '#141414', padding: '1.25rem 2rem', borderRadius: '12px', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #222', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
            <span style={{ color: '#666', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.1em' }}>ROUND 2 STARTS IN</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flex: 1, margin: '0 2rem' }}>
              <div style={{ height: '6px', background: '#222', flex: 1, borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${(r2Time / (3 * 60 + 41)) * 100}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent-primary), #0891b2)', borderRadius: '3px', transition: 'width 1s linear' }} />
              </div>
            </div>
            <span style={{ fontSize: '2rem', fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: 'var(--accent-primary)' }}>
              {mins}:{secs}
            </span>
          </div>

          {/* Search Bar */}
          <div style={{ marginBottom: '1.5rem' }}>
            <input 
              type="text" 
              placeholder="Search player name..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ width: '100%', background: '#141414', border: '1px solid #333', borderRadius: '8px', padding: '1rem', color: 'white', fontSize: '1rem', outline: 'none', transition: 'border-color 0.2s' }}
              onFocus={e => e.target.style.borderColor = '#fbbf24'}
              onBlur={e => e.target.style.borderColor = '#333'}
            />
          </div>

          {/* Role Filters */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            {roles.map(role => (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                style={{
                  background: roleFilter === role ? 'var(--accent-primary)' : '#141414',
                  color: roleFilter === role ? '#000' : '#888',
                  border: `1px solid ${roleFilter === role ? 'var(--accent-primary)' : '#333'}`,
                  borderRadius: '6px',
                  padding: '0.5rem 1rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  transition: '0.2s'
                }}
              >
                {role.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Team Filters */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
            {teamNames.map(team => (
              <button
                key={team}
                onClick={() => setTeamFilter(team)}
                style={{
                  background: teamFilter === team ? 'rgba(6, 182, 212, 0.1)' : 'transparent',
                  color: teamFilter === team ? 'var(--accent-primary)' : '#666',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.4rem 0.8rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: '0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: team === 'ALL' ? 'var(--accent-primary)' : (TEAM_COLORS[team] || '#666') }} />
                {team}
              </button>
            ))}
          </div>

          <div style={{ background: '#141414', borderRadius: '12px', border: '1px solid #222', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
            <div style={{ maxHeight: '55vh', overflowY: 'auto', paddingRight: '4px' }} className="custom-scrollbar">
              {filteredPlayers.map((p, i) => {
                const isSelected = mySelections.includes(p.id);
                return (
                  <div 
                    key={p.id} 
                    onClick={() => handleTogglePlayer(p.id)} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      padding: '1.25rem 1.5rem', 
                      borderBottom: i < filteredPlayers.length - 1 ? '1px solid #222' : 'none', 
                      cursor: isReady ? 'default' : 'pointer', 
                      background: isSelected ? 'rgba(251, 191, 36, 0.03)' : 'transparent', 
                      opacity: isReady ? 0.6 : 1,
                      transition: 'background 0.2s'
                    }}
                  >
                    <div style={{ width: '28px', height: '28px', border: `2px solid ${isSelected ? 'var(--accent-primary)' : '#333'}`, borderRadius: '6px', marginRight: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isSelected ? 'var(--accent-primary)' : 'transparent', transition: '0.2s' }}>
                      {isSelected && <span style={{ color: '#000', fontSize: '16px', fontWeight: '900' }}>✓</span>}
                    </div>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#1a1a1a', border: '1px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontSize: '1rem', fontWeight: 800, marginRight: '1.25rem' }}>
                      {p.initials}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.3rem', color: isSelected ? 'var(--accent-primary)' : 'white' }}>{p.name}</div>
                      <div style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        <span style={{ color: getRoleColor(p.role), fontWeight: 800, fontSize: '0.7rem', textTransform: 'uppercase' }}>{p.role}</span>
                        <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: TEAM_COLORS[p.team] || '#444' }} />
                        <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{p.team}</span>
                        <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: TEAM_COLORS[p.team] || '#444' }} />
                        <span style={{ color: '#888' }}>₹{p.basePrice}L</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredPlayers.length === 0 && (
                <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#555' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔍</div>
                  No players found matching your criteria.
                </div>
              )}
            </div>
          </div>

          <div style={{ marginTop: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <button
              disabled={isReady}
              onClick={handleConfirmSelection}
              style={{ 
                width: '100%', 
                background: isReady ? '#222' : 'var(--accent-primary)', 
                color: isReady ? '#666' : '#000', 
                padding: '1.25rem', 
                borderRadius: '10px', 
                fontSize: '1.1rem', 
                fontWeight: 800, 
                border: 'none', 
                cursor: isReady ? 'not-allowed' : 'pointer', 
                transition: 'all 0.3s ease',
                boxShadow: isReady ? 'none' : '0 10px 20px rgba(6, 182, 212, 0.2)'
              }}
            >
              {isReady ? 'READY - WAITING FOR OTHERS' : 'CONFIRM SELECTION'}
            </button>
            {isAdmin && (
              <button
                onClick={() => roomId && dbService.startRound2(roomId)}
                style={{ width: '100%', background: 'transparent', border: '1px solid #333', color: '#666', padding: '0.9rem', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', transition: '0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.color = 'var(--accent-primary)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#666'; }}
              >
                ADMIN: FORCE START ROUND 2
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Auction ended screen ──────────────────────────────────────────────────
  if (auctionStatus === 'ended') {
    return (
      <div style={{ backgroundColor: 'var(--bg-primary)', minHeight: '100vh', color: 'white', fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', padding: '2rem' }}>
        <div style={{ fontSize: '4rem' }}>🏆</div>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0 }}>Auction Complete!</h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>All players have been auctioned.</p>
        
        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
          <button 
            className="btn btn-primary hover-scale"
            onClick={() => navigate(`/results/${roomId}`)}
            style={{ padding: '0.75rem 2rem', fontSize: '1rem', cursor: 'pointer' }}
          >
            View Match Results
          </button>
          <button 
            className="btn btn-secondary hover-scale"
            onClick={() => navigate('/home')}
            style={{ padding: '0.75rem 2rem', fontSize: '1rem', cursor: 'pointer', background: 'rgba(255,255,255,0.1)' }}
          >
            Return to Homepage
          </button>
        </div>

        <div className="auction-ended-teams" style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '1rem' }}>
          {teams.map(t => (
            <div key={t.name} className="auction-ended-team-card" style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${t.isMe ? 'var(--accent-primary)' : 'var(--border-highlight)'}`, borderRadius: '16px', padding: '1.5rem', minWidth: '220px', maxWidth: '260px' }}>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.25rem' }}>
                {t.name} {t.isMe && <span style={{ color: 'var(--accent-primary)', fontSize: '0.75rem' }}>(you)</span>}
              </div>
              <div style={{ color: 'var(--accent-primary)', fontWeight: 700, fontSize: '1.5rem' }}>{fmtPurse(t.purse ?? 15000)} Cr left</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '1rem' }}>{t.slotsUsed ?? 0} players bought</div>
              {(t.roster ?? []).map((r: any, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '0.2rem 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <span>{r.name}</span>
                  <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{fmt(r.soldFor)}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Countdown colour (green → amber → red) ────────────────────────────────
  const effectiveTime = auctionStatus === 'paused' ? Math.ceil(pausedRemaining / 1000) : countdown;
  const cdColor = effectiveTime <= 5 ? 'var(--danger)' : effectiveTime <= 10 ? '#f59e0b' : 'var(--accent-primary)';

  return (
    <div style={{ flex: 1, height: '100svh', overflow: 'hidden', color: 'white', fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column', position: 'relative' }}>

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
            Admin has removed you from the auction room.
          </p>
          <div style={{
            marginTop: '0.5rem',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            color: 'var(--text-secondary)', fontSize: '0.9rem',
          }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--danger)', animation: 'pulse 1s infinite' }} />
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

      {/* ════════════════ PAUSED OVERLAY ══════════════════════════════════ */}
      {auctionStatus === 'paused' && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 250,
          background: 'rgba(2,6,23,0.82)',
          backdropFilter: 'blur(5px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          animation: 'fadeIn 0.25s ease',
        }}>
          <div className="auction-paused-inner" style={{
            background: '#0f172a',
            border: '1px solid rgba(6,182,212,0.35)',
            borderRadius: '16px',
            padding: '3rem 4rem',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            boxShadow: '0 0 60px rgba(6,182,212,0.12), 0 24px 60px rgba(0,0,0,0.7)',
            minWidth: '400px'
          }}>
            <div style={{ width: '40px', height: '2px', background: 'var(--accent-primary)', marginBottom: '1.5rem', opacity: 0.9 }} />
            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0, color: 'var(--accent-primary)', letterSpacing: '0.05em' }}>
              AUCTION PAUSED
            </h2>
            <div style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', marginTop: '1rem', fontWeight: 600 }}>
              {Math.ceil(pausedRemaining / 1000)}s remaining
            </div>
            
            {isAdmin && (
              <button 
                onClick={handleTogglePause} 
                className="hover-opacity"
                style={{
                  marginTop: '2rem', background: 'var(--accent-primary)', color: 'black', border: 'none',
                  padding: '0.9rem 2rem', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 800, cursor: 'pointer',
                  boxShadow: '0 0 20px rgba(6,182,212,0.35)'
              }}>
                Resume Auction
              </button>
            )}
            <div style={{ height: '2px', width: '40px', background: 'var(--accent-primary)', opacity: 0.9, marginTop: '2rem' }} />
          </div>
        </div>
      )}

      {/* ════════════════ SOLD / UNSOLD OVERLAY ════════════════════════════ */}
      {showSoldOverlay && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: lastSold.unsold 
            ? 'radial-gradient(circle at center, rgba(239, 68, 68, 0.2) 0%, rgba(0,0,0,0.92) 70%)'
            : 'radial-gradient(circle at center, rgba(34, 197, 94, 0.2) 0%, rgba(0,0,0,0.92) 70%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: '0.75rem', animation: 'fadeIn 0.25s ease',
        }}>
          {lastSold.unsold ? (
            <>
              <div style={{ fontSize: '3.5rem' }}>❌</div>
              <div style={{ fontSize: '4rem', fontWeight: 900, color: 'var(--danger)', letterSpacing: '0.05em', textShadow: '0 0 40px rgba(239,68,68,0.5)', lineHeight: 1 }}>UNSOLD</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'white', marginTop: '0.5rem' }}>{lastSold.player?.name}</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: '3.5rem' }}>🔨</div>
              <div style={{ fontSize: '4rem', fontWeight: 900, color: '#4ade80', letterSpacing: '-0.02em', textShadow: '0 0 40px rgba(74,222,128,0.4)', lineHeight: 1 }}>SOLD!</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.5rem' }}>{lastSold.player?.name}</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--accent-primary)' }}>{fmt(lastSold.amount)}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
                to <span style={{ color: 'white', fontWeight: 700 }}>{lastSold.team}</span>
              </div>
            </>
          )}
          <div style={{ marginTop: '1.25rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem' }}>
            Next player coming up…
          </div>
        </div>
      )}

      {/* ════════════════ HEADER ════════════════════════════════════════════ */}
      <div className="auction-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.9rem 2rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ color: 'var(--accent-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--accent-primary)' }} />
            Round {currentRound}
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            {currentPlayerIndex + 1} / {totalPlayers}
          </div>
        </div>

        {/* ── Countdown timer ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          border: `1px solid ${cdColor}`, borderRadius: '8px',
          padding: '0.4rem 0.9rem',
          background: `${cdColor}20`,
          transition: 'all 0.3s ease',
        }}>
          <Clock size={14} color={cdColor} />
          <span style={{ color: cdColor, fontWeight: 700, fontSize: '1rem', fontVariantNumeric: 'tabular-nums', minWidth: '28px', textAlign: 'center' }}>
            {effectiveTime}s
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {isAdmin && (
            <>
              <button 
                onClick={handleTogglePause}
                style={{ background: auctionStatus === 'paused' ? 'var(--accent-primary)' : 'transparent', border: '1px solid var(--border-color)', color: auctionStatus === 'paused' ? 'black' : 'var(--text-secondary)', padding: '0.5rem 1rem', borderRadius: '4px', fontSize: '0.875rem', cursor: 'pointer', fontWeight: auctionStatus === 'paused' ? 600 : 400 }}
              >
                {auctionStatus === 'paused' ? 'Resume' : 'Pause'}
              </button>
              {currentRound === 1 && (
                <button 
                  onClick={handleEndRound}
                  style={{ background: 'transparent', border: '1px solid rgba(239, 68, 68, 0.4)', color: 'var(--danger)', padding: '0.5rem 1rem', borderRadius: '4px', fontSize: '0.875rem', cursor: 'pointer' }}
                >
                  End Round
                </button>
              )}
            </>
          )}
          <div style={{ width: '1px', height: '24px', background: 'var(--border-color)' }} />
          <UserMenu />
        </div>
      </div>

      {/* ════════════════ MAIN CONTENT ══════════════════════════════════════ */}
      <div className="auction-main-content" style={{ display: 'flex', flex: 1, padding: '2rem', gap: '1.5rem', maxWidth: '1400px', margin: '0 auto', width: '100%', minHeight: 0, overflowY: 'auto' }}>

        {/* ── Left: Player card + Bid arena ── */}
        <div className="auction-left-col" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 600, letterSpacing: '0.05em', flexShrink: 0 }}>
            <span style={{ color: 'var(--accent-primary)' }}>{currentPlayer?.role}S</span>
            <span style={{ color: 'var(--text-secondary)' }}>
              {' '}
              ({orderType === 'CATEGORY' 
                ? playerOrder.slice(currentPlayerIndex).filter(id => {
                    const p = PLAYERS.find(x => x.id === id);
                    return p?.role === currentPlayer?.role;
                  }).length 
                : totalPlayers - currentPlayerIndex
              } remaining)
            </span>
          </div>

          {/* Player Card */}
          <div className="auction-player-card" style={{ border: '1px solid var(--accent-dim)', borderRadius: '12px', padding: '1.5rem 2rem', background: 'rgba(255,255,255,0.02)', marginBottom: '1rem', borderLeft: '4px solid var(--accent-primary)' }}>
            <div className="auction-player-card-inner" style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem' }}>
              {currentPlayer.imageUrl ? (
                <img 
                  src={currentPlayer.imageUrl} 
                  alt={currentPlayer.name}
                  style={{ width: '80px', height: '80px', borderRadius: '12px', border: '2px solid var(--accent-primary)', objectFit: 'cover', flexShrink: 0 }}
                />
              ) : (
                <div style={{ width: '80px', height: '80px', borderRadius: '12px', border: '2px solid var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem', fontWeight: 700, color: 'var(--accent-primary)', flexShrink: 0, background: 'rgba(235, 208, 92, 0.05)' }}>
                  {currentPlayer.initials}
                </div>
              )}
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: '1.75rem', margin: '0 0 0.5rem 0' }}>{currentPlayer.name}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                  <span style={{ color: getRoleColor(currentPlayer.role), fontWeight: 600 }}>{currentPlayer.role}</span>
                  <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--text-secondary)' }} />
                    {currentPlayer.city}, {currentPlayer.country}
                  </span>
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  {currentPlayer.bat}
                  <span style={{ margin: '0 0.5rem', opacity: 0.4 }}>|</span>
                  {currentPlayer.bowl}
                </div>
              </div>

              {/* Stats Section */}
              <div style={{ display: 'flex', gap: '1.5rem', padding: '0.75rem 1.25rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                {currentPlayer.role === 'BOWLER' ? (
                  <>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.65rem', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Matches</div>
                      <div style={{ fontWeight: 700 }}>{currentPlayer.stats?.matches || '—'}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.65rem', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Wickets</div>
                      <div style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{currentPlayer.stats?.wickets || '—'}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.65rem', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Economy</div>
                      <div style={{ fontWeight: 700 }}>{currentPlayer.stats?.economy || '—'}</div>
                    </div>
                  </>
                ) : currentPlayer.role === 'ALL_ROUNDER' ? (
                  <>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.65rem', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Runs</div>
                      <div style={{ fontWeight: 700 }}>{currentPlayer.stats?.runs || '—'}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.65rem', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Wickets</div>
                      <div style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{currentPlayer.stats?.wickets || '—'}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.65rem', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Matches</div>
                      <div style={{ fontWeight: 700 }}>{currentPlayer.stats?.matches || '—'}</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.65rem', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Matches</div>
                      <div style={{ fontWeight: 700 }}>{currentPlayer.stats?.matches || '—'}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.65rem', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Runs</div>
                      <div style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{currentPlayer.stats?.runs || '—'}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.65rem', textTransform: 'uppercase', marginBottom: '0.25rem' }}>S/R</div>
                      <div style={{ fontWeight: 700 }}>{currentPlayer.stats?.sr || '—'}</div>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div style={{ marginTop: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.75rem', letterSpacing: '0.05em', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>BASE PRICE <span style={{ color: 'var(--accent-primary)', fontSize: '0.875rem', fontWeight: 600, marginLeft: '0.5rem' }}>{fmt(basePrice)}</span></span>
              {currentPlayer.stats?.matches && (
                <span style={{ opacity: 0.5, fontSize: '0.7rem' }}>Career Stats (IPL)</span>
              )}
            </div>
          </div>

          {/* Bid Arena */}
          <div style={{ border: '1px solid var(--border-highlight)', borderRadius: '12px', padding: '2rem', background: 'rgba(255,255,255,0.01)', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', minHeight: 0 }}>

            <div style={{ position: 'absolute', top: '1.5rem', left: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.75rem', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'uppercase' }}>
              <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--text-secondary)' }} />
              {currentBid > 0 ? 'CURRENT BID' : 'BASE PRICE'}
            </div>

            {currentBid > 0 && (
              <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                Base: {fmt(basePrice)}
              </div>
            )}

            {/* Big bid price */}
            <div className="auction-bid-price" style={{
              fontSize: '5rem', fontWeight: 800, marginBottom: '0.5rem', letterSpacing: '-0.02em',
              color: isLeading ? 'var(--accent-primary)' : 'white',
              textShadow: isLeading ? '0 0 24px rgba(235, 208, 92, 0.25)' : 'none',
              transition: 'all 0.3s ease',
            }}>
              {currentBid > 0 ? fmt(currentBid) : fmt(basePrice)}
            </div>

            {/* Status badge */}
            {currentBid === 0 ? (
              <div style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>No bids yet — be the first!</div>
            ) : isLeading ? (
              <div style={{ color: 'var(--success)', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(34, 197, 94, 0.1)', padding: '0.5rem 1.25rem', borderRadius: '20px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--success)' }} />
                You are leading!
              </div>
            ) : (
              <div style={{ color: '#f59e0b', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(245,158,11,0.1)', padding: '0.5rem 1.25rem', borderRadius: '20px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
                {leadingTeam} is leading
              </div>
            )}

            {/* Countdown ring in arena body */}
            <div style={{ marginTop: '2.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                border: `2px solid ${auctionStatus === 'paused' ? 'var(--text-secondary)' : cdColor}`,
                color: auctionStatus === 'paused' ? 'var(--text-secondary)' : cdColor,
                borderRadius: '12px',
                padding: '0.3rem 1rem',
                fontSize: '1.5rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: auctionStatus === 'paused' ? 'rgba(255,255,255,0.05)' : `${cdColor}18`,
                transition: 'all 0.3s ease',
                minWidth: '80px',
                justifyContent: 'center',
              }}>
                {auctionStatus === 'paused' ? 'PAUSED' : `${countdown}s`}
              </div>
              <div style={{ width: '260px', height: '3px', background: 'var(--border-color)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: auctionStatus === 'paused' ? '100%' : `${(countdown / 15) * 100}%`,
                  background: auctionStatus === 'paused' ? 'var(--text-secondary)' : cdColor,
                  transition: 'width 0.1s linear, background 0.3s ease',
                  borderRadius: '2px',
                }} />
              </div>
            </div>

            {/* Bid History Ticker */}
            {bidHistory.length > 0 && (
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                borderTop: '1px solid var(--border-highlight)',
                background: 'rgba(0,0,0,0.45)',
                borderRadius: '0 0 12px 12px',
                padding: '0.55rem 1rem',
                overflowX: 'auto',
                display: 'flex',
                alignItems: 'center',
                scrollbarWidth: 'none',
              }}>
                {bidHistory.map((entry: any, i: number) => {
                  const isTop = i === 0;
                  return (
                    <React.Fragment key={entry.ts}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '0.35rem',
                        flexShrink: 0,
                        padding: '0.2rem 0.55rem',
                        borderRadius: '20px',
                        background: isTop ? 'rgba(235,208,92,0.13)' : 'transparent',
                        border: isTop ? '1px solid var(--accent-primary)' : '1px solid transparent',
                        transition: 'all 0.3s ease',
                      }}>
                        {isTop && <span style={{ fontSize: '0.65rem' }}>👑</span>}
                        <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: isTop ? 'var(--accent-primary)' : 'var(--text-secondary)', flexShrink: 0 }} />
                        <span style={{ fontWeight: isTop ? 700 : 400, color: isTop ? 'var(--accent-primary)' : 'var(--text-secondary)', fontSize: '0.78rem', maxWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {entry.team}
                        </span>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', opacity: 0.65 }}>bid</span>
                        <span style={{ fontWeight: 700, color: isTop ? 'var(--accent-primary)' : 'white', fontSize: '0.82rem' }}>
                          {fmt(entry.amount)}
                        </span>
                      </div>
                      {i < bidHistory.length - 1 && (
                        <span style={{ color: 'var(--text-secondary)', opacity: 0.35, fontSize: '0.75rem', margin: '0 0.15rem', flexShrink: 0 }}>›</span>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Reactions Column ── */}
        <div className="auction-reactions-col" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: '0.75rem', paddingBottom: '1rem' }}>
          {['🔥','😱','💰','😂','🏏','💀'].map(e => (
            <button key={e}
              style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', transition: 'transform 0.15s' }}
              onMouseEnter={ev => (ev.currentTarget.style.transform = 'scale(1.3)')}
              onMouseLeave={ev => (ev.currentTarget.style.transform = 'scale(1)')}
              onClick={() => roomId && dbService.sendReaction(roomId, e)}
            >{e}</button>
          ))}
        </div>

        {/* ── Right: Purse + Teams Panel ── */}
        <div className="auction-right-col" style={{ width: '320px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {/* Your Purse */}
          {/* Your Purse */}
          <div style={{ 
            marginBottom: '1.25rem', 
            background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(0, 0, 0, 0.4) 100%)',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            borderRadius: '12px',
            padding: '1.25rem',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Subtle glow effect in the background */}
            <div style={{ position: 'absolute', top: '-50%', right: '-20%', width: '100px', height: '100px', background: 'var(--accent-primary)', filter: 'blur(60px)', opacity: 0.15, borderRadius: '50%' }} />

            <div style={{ color: 'var(--accent-primary)', opacity: 0.9, fontSize: '0.65rem', letterSpacing: '0.15em', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontWeight: 700 }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-primary)', boxShadow: '0 0 8px var(--accent-primary)' }} />
              YOUR PURSE
            </div>
            
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem', marginBottom: '0.75rem' }}>
              <span style={{ color: 'white', fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.03em', textShadow: '0 2px 10px rgba(6, 182, 212, 0.3)', lineHeight: 1 }}>
                {myTeam ? fmtPurse(myTeam.purse) : fmtPurse(roomSettings.budget * 100)}
              </span>
              <span style={{ color: 'var(--accent-primary)', fontSize: '1rem', fontWeight: 700 }}>Cr</span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ 
                  width: `${((myTeam?.slotsUsed ?? 0) / roomSettings.teamSize) * 100}%`, 
                  height: '100%', 
                  background: ((myTeam?.slotsUsed ?? 0) >= roomSettings.teamSize) ? 'var(--danger)' : 'var(--accent-primary)',
                  transition: 'width 0.3s ease, background 0.3s ease'
                }} />
              </div>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                {myTeam?.slotsUsed ?? 0} / {roomSettings.teamSize} slots
              </span>
            </div>
          </div>

          {/* Teams panel */}
          <div style={{ border: '1px solid var(--border-highlight)', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-highlight)', fontSize: '0.75rem', letterSpacing: '0.1em', color: 'var(--text-secondary)', fontWeight: 600 }}>
              TEAMS
            </div>

            <div style={{ overflowY: 'auto', flex: 1 }}>
              {teams.map(t => {
                const isExpanded = expandedTeam === t.name;
                const roster: any[] = t.roster ?? [];
                return (
                  <div key={t.name}>
                    {/* Team row */}
                    <div
                      onClick={() => setExpandedTeam(isExpanded ? null : t.name)}
                      style={{
                        padding: '0.9rem 1.5rem',
                        borderBottom: '1px solid var(--border-highlight)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        background: t.isMe ? 'rgba(255,255,255,0.04)' : 'transparent',
                        borderLeft: t.isMe ? '3px solid var(--accent-primary)' : '3px solid transparent',
                        cursor: t.hasLeft ? 'default' : 'pointer',
                        opacity: t.hasLeft ? 0.55 : 1,
                        transition: 'background 0.15s',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: t.hasLeft ? 'rgba(255,255,255,0.2)' : t.isOnline ? 'var(--success)' : 'var(--danger)', boxShadow: t.isOnline && !t.hasLeft ? '0 0 6px var(--success)' : 'none' }}></div>
                          <span style={{ fontWeight: 600, color: t.hasLeft ? 'var(--text-secondary)' : t.isOnline ? 'white' : 'var(--text-secondary)' }}>{t.name}</span>
                          {t.isMe && <span style={{ color: 'var(--text-secondary)', fontSize: '0.72rem' }}>(you)</span>}
                          {t.hasLeft && <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.6rem', border: '1px solid rgba(255,255,255,0.15)', padding: '0.1rem 0.35rem', borderRadius: '4px', fontWeight: 700 }}>LEFT</span>}
                          {!t.hasLeft && !t.isOnline && !t.isMe && <span style={{ color: 'var(--danger)', fontSize: '0.6rem', border: '1px solid rgba(239,68,68,0.5)', padding: '0.1rem 0.35rem', borderRadius: '4px', fontWeight: 700 }}>OFFLINE</span>}
                          {/* Leading badge — skip for left users */}
                          {!t.hasLeft && leadingUserId === t.userId && currentBid > 0 && (
                            <span style={{ fontSize: '0.6rem', background: 'var(--accent-primary)', color: 'black', padding: '0.1rem 0.35rem', borderRadius: '4px', fontWeight: 700 }}>LEADING</span>
                          )}
                          {/* Withdrew badge — skip for left users */}
                          {!t.hasLeft && withdrawnTeams.includes(t.userId) && (
                            <span style={{ fontSize: '0.6rem', border: '1px solid rgba(239,68,68,0.5)', color: 'var(--danger)', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>WITHDREW</span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem' }}>
                          <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>₹{fmtPurse(t.purse ?? 15000)}Cr</span>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.72rem' }}>{t.slotsUsed ?? 0}/{roomSettings.teamSize}</span>
                          {!t.hasLeft && t.role === 'ADMIN' && (
                            <span style={{ border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)', padding: '0.08rem 0.35rem', borderRadius: '4px', fontSize: '0.58rem', fontWeight: 600 }}>ADMIN</span>
                          )}
                        </div>
                      </div>
                      <div style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                        <ChevronDown size={16} color="var(--text-secondary)" />
                      </div>
                    </div>

                    {/* Expandable roster */}
                    {isExpanded && (
                      <div style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--border-highlight)', padding: '0.5rem 1.5rem' }}>
                        {roster.length === 0 ? (
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', padding: '0.4rem 0' }}>No players acquired yet</div>
                        ) : (
                          <>
                            {roster.map((r: any, ri: number) => (
                              <div key={ri} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', fontSize: '0.8rem', borderTop: ri > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: TEAM_COLORS[r.team] || 'var(--accent-primary)' }} />
                                  <span style={{ color: 'white' }}>{r.name}</span>
                                </div>
                                <span style={{ color: 'var(--text-secondary)' }}>{fmt(r.soldFor)}</span>
                              </div>
                            ))}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0 0.2rem', marginTop: '0.2rem', fontSize: '0.82rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                              <span style={{ color: 'var(--text-secondary)' }}>Total spent</span>
                              <span style={{ color: 'var(--accent-primary)', fontWeight: 800 }}>
                                {fmt(roster.reduce((sum, r) => sum + (r.soldFor || 0), 0))}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════ BOTTOM ACTION BAR ════════════════════════════════ */}
      {currentBid === 0 ? (
        /* No bids yet — show opening bid button */
        <div className="auction-bottom-bar" style={{ padding: '1rem 2rem', borderTop: '1px solid var(--border-highlight)', background: 'var(--bg-secondary)', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button
            disabled={(myTeam?.purse ?? 0) < basePrice || (myTeam?.slotsUsed ?? 0) >= roomSettings.teamSize}
            onClick={() => placeBid(0)}
            style={{ 
              flex: 1, 
              background: ((myTeam?.purse ?? 0) < basePrice || (myTeam?.slotsUsed ?? 0) >= roomSettings.teamSize) ? 'rgba(255,255,255,0.05)' : 'var(--accent-primary)', 
              border: ((myTeam?.purse ?? 0) < basePrice || (myTeam?.slotsUsed ?? 0) >= roomSettings.teamSize) ? '1px solid rgba(255,255,255,0.1)' : 'none', 
              color: ((myTeam?.purse ?? 0) < basePrice || (myTeam?.slotsUsed ?? 0) >= roomSettings.teamSize) ? 'var(--text-secondary)' : 'black', 
              padding: '1.25rem', borderRadius: '8px', fontSize: '1.125rem', fontWeight: 700, 
              cursor: ((myTeam?.purse ?? 0) < basePrice || (myTeam?.slotsUsed ?? 0) >= roomSettings.teamSize) ? 'not-allowed' : 'pointer', 
              transition: '0.2s', 
              boxShadow: ((myTeam?.purse ?? 0) < basePrice || (myTeam?.slotsUsed ?? 0) >= roomSettings.teamSize) ? 'none' : 'var(--shadow-glow)' 
            }}
          >
            {((myTeam?.slotsUsed ?? 0) >= roomSettings.teamSize) 
                ? 'Squad Full' 
                : ((myTeam?.purse ?? 0) < basePrice) 
                    ? 'Insufficient Funds' 
                    : `Bid ${fmt(basePrice)}`}
          </button>
          <button
            disabled={hasWithdrawn}
            onClick={handleWithdraw}
            style={{ background: 'transparent', border: `1px solid ${hasWithdrawn ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.3)'}`, color: hasWithdrawn ? 'rgba(239,68,68,0.3)' : 'var(--danger)', padding: '1.25rem 2rem', borderRadius: '8px', fontSize: '1rem', fontWeight: 600, cursor: hasWithdrawn ? 'not-allowed' : 'pointer', transition: '0.2s' }}
          >
            {hasWithdrawn ? 'Skipped' : 'Skip'}
          </button>
        </div>

      ) : (
        /* Bidding in progress */
        <div className="auction-bottom-bar" style={{ padding: '1rem 2rem', borderTop: '1px solid var(--border-highlight)', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {isLeading && (
            <div style={{ textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.15rem' }}>
              You're leading — wait for others to bid higher
            </div>
          )}
          {(!isLeading && ((myTeam?.slotsUsed ?? 0) >= roomSettings.teamSize)) && (
            <div style={{ textAlign: 'center', fontSize: '0.82rem', color: 'var(--danger)', marginBottom: '0.15rem' }}>
              Squad Limit Reached
            </div>
          )}
          <div className="auction-bid-buttons" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            {[50, 100, 300].map(amt => {
              const isDisabled = isLeading || ((myTeam?.slotsUsed ?? 0) >= roomSettings.teamSize) || ((myTeam?.purse ?? 0) < (currentBid + amt));
              return (
              <button
                key={amt}
                disabled={isDisabled}
                onClick={() => placeBid(amt)}
                style={{
                  flex: 1,
                  background: isDisabled ? 'rgba(255,255,255,0.04)' : 'var(--accent-primary)',
                  border: isDisabled ? '1px solid rgba(255,255,255,0.08)' : 'none',
                  color: isDisabled ? 'rgba(255,255,255,0.2)' : 'black',
                  padding: '1.25rem', borderRadius: '8px', fontSize: '1rem', fontWeight: 700,
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  transition: '0.2s',
                  boxShadow: isDisabled ? 'none' : 'var(--shadow-glow)',
                }}
              >
                +{fmt(amt)}
              </button>
            )})}  
            <button
              disabled={isLeading || hasWithdrawn}
              onClick={handleWithdraw}
              style={{
                padding: '1.25rem 1.75rem', borderRadius: '8px', fontSize: '1rem', fontWeight: 600,
                background: 'transparent',
                border: (isLeading || hasWithdrawn) ? '1px solid rgba(239,68,68,0.15)' : '1px solid rgba(239,68,68,0.35)',
                color: (isLeading || hasWithdrawn) ? 'rgba(239,68,68,0.25)' : 'var(--danger)',
                cursor: (isLeading || hasWithdrawn) ? 'not-allowed' : 'pointer', transition: '0.2s',
              }}
            >
              {hasWithdrawn ? 'Withdrawn' : 'Withdraw'}
            </button>
          </div>
        </div>
      )}

      {/* ════════════════ FLOATING EMOJI REACTIONS ═══════════════════════════ */}
      {liveReactions.map(r => (
        <span
          key={r.id}
          className="emoji-float"
          style={{
            left: `${r.x}%`,
            animationDelay: `${r.delay}s`,
          }}
        >
          {r.emoji}
        </span>
      ))}

    </div>
  );
};

export default Auction;
