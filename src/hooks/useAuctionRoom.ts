import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import type { Room, Player } from '../services/auctionSupabaseService';

/**
 * A React hook that subscribes to Supabase Realtime on the rooms row 
 * (for player_order and current_index) and exposes the current player.
 * 
 * @param roomId The UUID of the room
 * @param allPlayers A record (dictionary) of all players mapped by their UUID
 */
export function useAuctionRoom(roomId: string | undefined, allPlayers: Record<string, Player>) {
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!roomId) return;

    let isMounted = true;

    // Initial fetch of the room data
    const fetchRoom = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('rooms')
          .select('*')
          .eq('id', roomId)
          .single();
        
        if (fetchError) throw fetchError;
        if (isMounted && data) {
          setRoom(data as Room);
        }
      } catch (err: any) {
        console.error('Error fetching room:', err);
        if (isMounted) setError(err);
      }
    };
    
    fetchRoom();

    // Subscribe to changes on the rooms row via Supabase Realtime
    const subscription = supabase
      .channel(`room-${roomId}`)
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'rooms', 
          filter: `id=eq.${roomId}` 
        },
        (payload) => {
          if (isMounted) {
            setRoom(payload.new as Room);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to room updates for ${roomId}`);
        }
      });

    return () => {
      isMounted = false;
      supabase.removeChannel(subscription);
    };
  }, [roomId]);

  // Compute the current player based on room's player_order and current_index
  const currentPlayer = useMemo(() => {
    if (room && room.player_order && room.player_order.length > 0) {
      const playerId = room.player_order[room.current_index];
      if (playerId && allPlayers[playerId]) {
        return allPlayers[playerId];
      }
    }
    return null;
  }, [room, allPlayers]);

  // Expose function to increment current_index safely
  const nextPlayer = async () => {
    if (!roomId || !room || !room.player_order) return;
    
    if (room.current_index < room.player_order.length - 1) {
      const newIndex = room.current_index + 1;
      
      // Optimistic UI update
      setRoom({ ...room, current_index: newIndex });
      
      // Update in Supabase
      const { error: updateError } = await supabase
        .from('rooms')
        .update({ current_index: newIndex })
        .eq('id', roomId);
        
      if (updateError) {
        console.error('Error updating to next player:', updateError);
        // Revert optimistic update on failure by re-fetching
        const { data } = await supabase.from('rooms').select('*').eq('id', roomId).single();
        if (data) setRoom(data as Room);
      }
    }
  };

  // Expose function to decrement current_index safely
  const prevPlayer = async () => {
    if (!roomId || !room || !room.player_order) return;
    
    if (room.current_index > 0) {
      const newIndex = room.current_index - 1;
      
      // Optimistic UI update
      setRoom({ ...room, current_index: newIndex });
      
      // Update in Supabase
      const { error: updateError } = await supabase
        .from('rooms')
        .update({ current_index: newIndex })
        .eq('id', roomId);
        
      if (updateError) {
        console.error('Error updating to previous player:', updateError);
        // Revert optimistic update on failure by re-fetching
        const { data } = await supabase.from('rooms').select('*').eq('id', roomId).single();
        if (data) setRoom(data as Room);
      }
    }
  };

  return { 
    room, 
    currentPlayer, 
    nextPlayer, 
    prevPlayer,
    error 
  };
}
