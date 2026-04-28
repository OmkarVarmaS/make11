import { useState, useEffect } from 'react';
import { createRoom, joinRoom, listPublicRooms, type RoomSummary } from '../services/roomService';
import { supabase } from '../supabaseClient';
// If using react-router-dom, uncomment this and adjust navigation:
// import { useNavigate } from 'react-router-dom';

export function MultiplayerLobby() {
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [joinCode, setJoinCode] = useState('');
  const [teamCode, setTeamCode] = useState('MI');
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }: any) => {
      if (data?.user) setUserId(data.user.id);
    });
    
    loadRooms();
  }, []);

  const loadRooms = async () => {
    try {
      const publicRooms = await listPublicRooms();
      setRooms(publicRooms);
    } catch (e: any) {
      console.error('Failed to load public rooms', e);
    }
  };

  const handleCreateRoom = async () => {
    if (!userId) {
      setError('You must be logged in to create a room');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { roomId } = await createRoom({
        name: `${teamCode}'s Public Auction`,
        orderType: 'RANDOM',
        isPublic: true,
        teamCode,
        userId
      });
      alert(`Created Room successfully! Code: ${roomId}. Now navigate to your room view.`);
      // navigate(`/multiplayer-room/${roomId}`);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  const handleJoinByCode = async () => {
    if (!userId) {
      setError('You must be logged in to join a room');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { roomId } = await joinRoom({
        code: joinCode,
        teamCode,
        userId
      });
      alert(`Joined Room successfully! Now navigate to /multiplayer-room/${roomId}`);
      // navigate(`/multiplayer-room/${roomId}`);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  return (
    <div className="p-8 bg-gray-900 min-h-screen text-white font-sans">
      <h1 className="text-4xl font-bold text-amber-500 mb-8">Auction Lobby</h1>
      
      {error && <div className="bg-red-500 text-white p-3 rounded mb-6">{error}</div>}
      
      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
          <h2 className="text-2xl font-semibold mb-4 text-white">Join or Create Room</h2>
          
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-1">Your Team Code</label>
            <input 
              type="text" 
              value={teamCode} 
              onChange={e => setTeamCode(e.target.value.toUpperCase())}
              className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white outline-none focus:border-amber-500"
              maxLength={4}
            />
          </div>

          <button 
            onClick={handleCreateRoom}
            disabled={loading}
            className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded mb-6 transition-colors"
          >
            {loading ? 'Processing...' : 'Create Public Room'}
          </button>
          
          <hr className="border-gray-700 mb-6" />

          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-1">Join with Code</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                placeholder="6-CHAR CODE"
                className="flex-1 bg-gray-900 border border-gray-600 rounded p-2 text-white outline-none focus:border-amber-500 uppercase"
                maxLength={6}
              />
              <button 
                onClick={handleJoinByCode}
                disabled={loading || joinCode.length < 6}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded disabled:opacity-50 transition-colors"
              >
                Join
              </button>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-white">Public Rooms</h2>
            <button onClick={loadRooms} className="text-amber-500 hover:text-amber-400 text-sm">Refresh</button>
          </div>
          
          <div className="space-y-3">
            {rooms.length === 0 && (
              <p className="text-gray-400 italic">No public rooms available right now.</p>
            )}
            
            {rooms.map(room => (
              <div key={room.id} className="bg-gray-900 border border-gray-700 rounded p-4 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-lg text-amber-500">{room.name}</h3>
                  <p className="text-xs text-gray-400">Players: {room.player_count || 0} • {room.order_type}</p>
                </div>
                <button 
                  onClick={() => setJoinCode(room.code)}
                  className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded font-semibold transition-colors"
                >
                  Select
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
