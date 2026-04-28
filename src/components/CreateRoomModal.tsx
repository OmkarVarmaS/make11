import React, { useState } from 'react';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (roomData: any) => void;
  initialPublic?: boolean;
}

const CreateRoomModal: React.FC<CreateRoomModalProps> = ({ isOpen, onClose, onCreate, initialPublic = false }) => {
  const [roomData, setRoomData] = useState({
    roomName: '',
    teamName: '',
    isPublic: initialPublic,
    teamSize: '15',
    budget: '100'
  });

  // Re-sync if initialPublic changes (e.g. different open trigger)
  React.useEffect(() => {
    if (isOpen) setRoomData(d => ({ ...d, isPublic: initialPublic }));
  }, [isOpen, initialPublic]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomData.roomName.trim() || !roomData.teamName.trim()) return;
    
    // We pass settings, picking teamSize and budget from the user's dropdown choices
    onCreate({
      ...roomData,
      budget: parseInt(roomData.budget),
      teamSize: parseInt(roomData.teamSize),
      timer: 15,
      order: 'random'
    });
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '1rem'
    }}>
      <div className="card glass-panel modal-card animate-fade-in" style={{
        width: '100%', maxWidth: '450px', background: 'var(--bg-secondary)', border: 'none',
        boxShadow: '0 20px 40px rgba(0,0,0,0.8)'
      }}>
        
        {/* Header with accent line */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
          <div style={{ width: '24px', height: '2px', backgroundColor: 'var(--accent-primary)' }}></div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'white' }}>Create Room</h2>
        </div>

        <form onSubmit={handleSubmit}>
          
          <div className="input-group" style={{ marginBottom: '1.5rem' }}>
            <label className="input-label" style={{ color: 'var(--text-secondary)' }}>Room Name</label>
            <input
              type="text"
              className="input-field"
              placeholder="Friday Draft Night"
              value={roomData.roomName}
              onChange={(e) => setRoomData({...roomData, roomName: e.target.value})}
              required
              style={{
                borderColor: roomData.roomName ? 'var(--accent-primary)' : 'var(--border-highlight)',
                background: 'transparent'
              }}
            />
          </div>

          <div className="input-group" style={{ marginBottom: '1.5rem' }}>
            <label className="input-label" style={{ color: 'var(--text-secondary)' }}>Your Team Name</label>
            <input
              type="text"
              className="input-field"
              placeholder="Blue Squad"
              value={roomData.teamName}
              onChange={(e) => setRoomData({...roomData, teamName: e.target.value})}
              required
              style={{
                borderColor: roomData.teamName ? 'var(--accent-primary)' : 'var(--border-highlight)',
                background: 'transparent'
              }}
            />
          </div>


          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem' }}>
            {/* simple custom toggle switch */}
            <div 
              style={{ 
                width: '40px', height: '20px', 
                background: roomData.isPublic ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)', 
                borderRadius: '20px', 
                position: 'relative', cursor: 'pointer', transition: '0.2s'
              }}
              onClick={() => setRoomData({...roomData, isPublic: !roomData.isPublic})}
            >
              <div style={{ 
                width: '16px', height: '16px', background: 'white', borderRadius: '50%',
                position: 'absolute', top: '2px', 
                left: roomData.isPublic ? '22px' : '2px', transition: '0.2s'
              }}></div>
            </div>
            <div>
              <div style={{ fontWeight: 600, color: 'white', fontSize: '0.9rem' }}>Make this room public</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Anyone can discover and join</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={!roomData.roomName.trim() || !roomData.teamName.trim()}>
              Create
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default CreateRoomModal;
