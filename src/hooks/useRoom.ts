import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export interface RoomData {
  id: string;
  code: string;
  name: string;
  is_public: boolean;
  order_type: 'RANDOM' | 'CATEGORY';
  status: 'LOBBY' | 'RUNNING' | 'FINISHED';
  admin_id: string;
}

export interface RoomPlayer {
  user_id: string;
  team_code: string;
  role: 'ADMIN' | 'PLAYER';
}

export function useRoom(roomId: string, currentUserId?: string) {
  const [room, setRoom] = useState<RoomData | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId) return;

    let isMounted = true;

    async function loadInitialData() {
      setLoading(true);
      // Fetch Room
      const { data: roomData } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single();
      
      if (roomData && isMounted) {
        setRoom(roomData as RoomData);
      }

      // Fetch Players
      const { data: playersData } = await supabase
        .from('room_players')
        .select('user_id, team_code, role')
        .eq('room_id', roomId);
      
      if (playersData && isMounted) {
        setPlayers(playersData as RoomPlayer[]);
      }
      if (isMounted) setLoading(false);
    }

    loadInitialData();

    // Subscribe to Room changes
    const roomSub = supabase
      .channel(`room_${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        (payload: any) => {
          if (payload.new) {
            setRoom(payload.new as RoomData);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_players', filter: `room_id=eq.${roomId}` },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            setPlayers(prev => [...prev, payload.new as RoomPlayer]);
          } else if (payload.eventType === 'DELETE') {
            setPlayers(prev => prev.filter(p => p.user_id !== payload.old.user_id));
          } else if (payload.eventType === 'UPDATE') {
            setPlayers(prev => prev.map(p => p.user_id === payload.new.user_id ? payload.new as RoomPlayer : p));
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(roomSub);
    };
  }, [roomId]);

  const isAdmin = currentUserId ? room?.admin_id === currentUserId : false;
  const joinStatus = players.find(p => p.user_id === currentUserId) ? 'JOINED' : 'NOT_JOINED';

  return { room, players, isAdmin, joinStatus, loading };
}
