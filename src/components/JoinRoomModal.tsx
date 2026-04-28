import React, { useState } from 'react';
import { dbService } from '../services/db';

interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoin: (code: string, teamName: string, existingUserId?: string) => void;
  initialRoomCode?: string;
}

const JoinRoomModal: React.FC<JoinRoomModalProps> = ({ isOpen, onClose, onJoin, initialRoomCode }) => {
  const [step, setStep] = useState<'code' | 'team'>('code');
  const [roomCode, setRoomCode] = useState('');
  const [teamName, setTeamName] = useState('');
  const [roomInfo, setRoomInfo] = useState<any>(null);
  const [roomParticipants, setRoomParticipants] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isDuplicateName = teamName.trim().length > 0 &&
    roomParticipants.some(name => name.toLowerCase() === teamName.trim().toLowerCase());

  React.useEffect(() => {
    if (isOpen && initialRoomCode) {
      setRoomCode(initialRoomCode);
      const init = async () => {
        setLoading(true);
        const room = await dbService.getRoom(initialRoomCode);
        if (room) {
          const mySessionId = localStorage.getItem('ipl_my_uid') || '';
          const me = room?.participants?.find((p: any) => p.userId === mySessionId);
          if (me) {
            onJoin(initialRoomCode, me.name, me.userId);
            return;
          }
          setRoomInfo({ code: initialRoomCode, name: room.roomName || initialRoomCode });
          setRoomParticipants((room.participants || []).map((p: any) => p.name));
          setStep('team');
        } else {
          setError('Room not found.');
        }
        setLoading(false);
      };
      init();
    } else if (isOpen && !initialRoomCode) {
      setStep('code');
      setRoomCode('');
      setTeamName('');
      setRoomInfo(null);
      setError('');
    }
  }, [isOpen, initialRoomCode]);

  if (!isOpen) return null;

  const handleClose = () => {
    // Reset on close
    setStep('code');
    setRoomCode('');
    setTeamName('');
    setRoomInfo(null);
    setRoomParticipants([]);
    setError('');
    onClose();
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const sanitized = roomCode.trim().toUpperCase().replace(/\s/g, '');
    if (!sanitized) return;

    setLoading(true);
    setError('');
    const exists = await dbService.checkRoomExists(sanitized);
    if (!exists) {
      setError('Room not found. Please check the code.');
      setLoading(false);
      return;
    }
    const room = await dbService.getRoom(sanitized);
    
    // Check if user is already in this room
    const mySessionId = localStorage.getItem('ipl_my_uid') || '';
    const me = room?.participants?.find((p: any) => p.userId === mySessionId);
    if (me) {
      onJoin(sanitized, me.name, me.userId);
      setLoading(false);
      return;
    }

    if (room && room.participants?.length >= room.capacity) {
      setError('This room is full.');
      setLoading(false);
      return;
    }
    setRoomInfo({ code: sanitized, name: room?.roomName || sanitized });
    setRoomParticipants((room?.participants || []).map((p: any) => p.name));
    setStep('team');
    setLoading(false);
  };

  const handleTeamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim() || isDuplicateName) return;
    onJoin(roomInfo.code, teamName.trim());
    handleClose();
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0, 0, 0, 0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '1rem'
    }}>
      <div className="card glass-panel modal-card animate-fade-in" style={{
        width: '100%', maxWidth: '450px', background: 'var(--bg-secondary)', border: 'none',
        boxShadow: '0 20px 40px rgba(0,0,0,0.8)'
      }}>

        {step === 'code' ? (
          <>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
              <div style={{ width: '24px', height: '2px', backgroundColor: 'var(--accent-primary)' }}></div>
              <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'white' }}>Join Room</h2>
            </div>

            <form onSubmit={handleCodeSubmit}>
              <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                <label className="input-label" style={{ color: 'var(--text-secondary)' }}>Room Code</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="ROOM CODE"
                  value={roomCode}
                  onChange={(e) => { setRoomCode(e.target.value); setError(''); }}
                  maxLength={6}
                  required
                  autoFocus
                  style={{
                    textTransform: 'uppercase',
                    letterSpacing: '0.25em',
                    textAlign: 'center',
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    borderColor: error ? 'var(--danger)' : 'var(--accent-primary)',
                    background: 'transparent'
                  }}
                />
                {error && (
                  <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '0.5rem' }}>{error}</div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={handleClose}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={!roomCode.trim() || loading}>
                  {loading ? 'Checking...' : 'Next →'}
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            {/* Step 2: Team Name */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ 
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                color: 'var(--text-secondary)', fontSize: '0.75rem', letterSpacing: '0.1em',
                textTransform: 'uppercase', marginBottom: '0.5rem'
              }}>
                Room Code
                <span style={{ 
                  color: 'var(--accent-primary)', fontWeight: 700, fontSize: '0.875rem', 
                  letterSpacing: '0.2em', marginLeft: '0.5rem'
                }}>
                  {roomInfo?.code}
                </span>
              </div>
              <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'white' }}>{roomInfo?.name}</h2>
            </div>

            <div style={{ width: '100%', height: '1px', background: 'var(--border-highlight)', marginBottom: '1.5rem' }}></div>

            <form onSubmit={handleTeamSubmit}>
              <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                <label className="input-label" style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Enter Your Team Name
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Your team name"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  required
                  autoFocus
                  style={{
                    borderColor: isDuplicateName ? 'var(--danger)' : teamName ? 'var(--accent-primary)' : 'var(--border-highlight)',
                    background: 'transparent'
                  }}
                />

                {isDuplicateName && (
                  <div style={{
                    marginTop: '0.75rem',
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    borderRadius: '8px',
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.6rem'
                  }}>
                    <span style={{ fontSize: '1rem', flexShrink: 0 }}>⚠️</span>
                    <span style={{ color: 'var(--danger)', fontSize: '0.875rem', lineHeight: 1.4 }}>
                      This team name is already taken. Please choose a different name.
                    </span>
                  </div>
                )}
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1rem', fontWeight: 700 }} disabled={!teamName.trim() || isDuplicateName}>
                Join Room
              </button>

              <button 
                type="button" 
                onClick={() => {
                  if (initialRoomCode) handleClose();
                  else { setStep('code'); setError(''); }
                }}
                style={{ 
                  marginTop: '1rem', background: 'transparent', border: 'none', 
                  color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.875rem',
                  width: '100%', textAlign: 'center'
                }}
              >
                ← Back to Home
              </button>
            </form>
          </>
        )}

      </div>
    </div>
  );
};

export default JoinRoomModal;
