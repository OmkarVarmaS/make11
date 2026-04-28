import { useEffect, useState } from 'react';
import { useRoom } from '../hooks/useRoom';
import { supabase } from '../supabaseClient';
// If using react-router-dom:
// import { useParams } from 'react-router-dom';

export function MultiplayerRoom({ roomId }: { roomId: string }) {
  // If using React Router: const { roomId } = useParams<{ roomId: string }>();
  const [userId, setUserId] = useState('');
  
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setUserId(data.user.id);
    });
  }, []);

  const { room, players, isAdmin, loading } = useRoom(roomId, userId);

  if (loading) {
    return <div className="p-8 text-white">Loading room data...</div>;
  }

  if (!room) {
    return <div className="p-8 text-red-500">Room not found</div>;
  }

  return (
    <div className="p-8 bg-gray-900 min-h-screen text-white font-sans">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-8 shadow-xl">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-amber-500 mb-2">{room.name}</h1>
              <span className="bg-gray-700 text-xs px-2 py-1 rounded tracking-widest text-gray-300">
                CODE: {room.code}
              </span>
            </div>
            <div className="text-right">
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${room.status === 'LOBBY' ? 'bg-blue-900 text-blue-300' : 'bg-green-900 text-green-300'}`}>
                {room.status}
              </span>
            </div>
          </div>
          
          <div className="bg-gray-900 rounded p-4 border border-gray-700">
            <h2 className="text-lg font-semibold mb-3 border-b border-gray-700 pb-2">Connected Teams ({players.length})</h2>
            <div className="flex flex-wrap gap-3">
              {players.map(p => (
                <div key={p.user_id} className="bg-gray-800 px-4 py-2 rounded-lg border border-gray-600 flex items-center gap-2">
                  <span className="font-bold text-amber-500">{p.team_code}</span>
                  {p.role === 'ADMIN' && <span className="text-[10px] bg-red-900 text-red-300 px-1.5 rounded">ADMIN</span>}
                  {p.user_id === userId && <span className="text-[10px] bg-gray-700 text-gray-300 px-1.5 rounded">YOU</span>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {isAdmin && room.status === 'LOBBY' && (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 shadow-xl text-center">
            <h2 className="text-xl mb-4 text-white">Admin Controls</h2>
            <button className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 px-8 rounded-lg shadow-lg transition-transform transform hover:scale-105">
              Start Auction
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
