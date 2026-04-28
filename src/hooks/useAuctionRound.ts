import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export interface AuctionRound {
  id: string;
  room_id: string;
  round_number: number;
  status: 'PENDING' | 'RUNNING' | 'SELECTION' | 'FINISHED';
  player_order: string[];
  current_index: number;
}

export interface RoundPlayer {
  player_id: string;
  status: 'PENDING' | 'SOLD' | 'UNSOLD';
  winning_team_id: string | null;
  winning_bid: number | null;
  player_details?: any; // To store joined player data
}

export function useAuctionRound(roundId: string) {
  const [round, setRound] = useState<AuctionRound | null>(null);
  const [players, setPlayers] = useState<Record<string, RoundPlayer>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roundId) return;

    const fetchInitialData = async () => {
      setLoading(true);
      // Fetch round
      const { data: roundData } = await supabase
        .from('auction_rounds')
        .select('*')
        .eq('id', roundId)
        .single();
      
      if (roundData) setRound(roundData as AuctionRound);

      // Fetch players for this round
      const { data: playersData } = await supabase
        .from('auction_round_players')
        .select(`
          player_id,
          status,
          winning_team_id,
          winning_bid,
          players (*)
        `)
        .eq('round_id', roundId);

      if (playersData) {
        const playersMap: Record<string, RoundPlayer> = {};
        playersData.forEach((p: any) => {
          playersMap[p.player_id] = {
            player_id: p.player_id,
            status: p.status,
            winning_team_id: p.winning_team_id,
            winning_bid: p.winning_bid,
            player_details: p.players
          };
        });
        setPlayers(playersMap);
      }
      setLoading(false);
    };

    fetchInitialData();

    // Subscribe to round changes
    const roundSub = supabase
      .channel(`round_${roundId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'auction_rounds', filter: `id=eq.${roundId}` },
        (payload: any) => {
          setRound(payload.new as AuctionRound);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'auction_round_players', filter: `round_id=eq.${roundId}` },
        (payload: any) => {
          const updatedPlayer = payload.new as any;
          setPlayers(prev => ({
            ...prev,
            [updatedPlayer.player_id]: {
              ...prev[updatedPlayer.player_id],
              status: updatedPlayer.status,
              winning_team_id: updatedPlayer.winning_team_id,
              winning_bid: updatedPlayer.winning_bid,
            }
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(roundSub);
    };
  }, [roundId]);

  const currentPlayerId = round?.player_order?.[round?.current_index ?? 0];
  const currentPlayer = currentPlayerId ? players[currentPlayerId] : null;
  const remainingCount = round?.player_order ? round.player_order.length - (round.current_index ?? 0) : 0;

  const nextPlayer = async (previousStatus: 'SOLD' | 'UNSOLD') => {
    if (!round || !currentPlayerId) return;

    // 1. Update previous player status
    await supabase
      .from('auction_round_players')
      .update({ status: previousStatus })
      .eq('round_id', roundId)
      .eq('player_id', currentPlayerId);

    // 2. Increment index
    if (round.current_index + 1 < (round.player_order?.length || 0)) {
      await supabase
        .from('auction_rounds')
        .update({ current_index: round.current_index + 1 })
        .eq('id', roundId);
    } else {
      // Round is complete
      await supabase
        .from('auction_rounds')
        .update({ status: 'FINISHED' })
        .eq('id', roundId);
    }
  };

  return {
    roundStatus: round?.status,
    currentPlayer,
    remainingCount,
    nextPlayer,
    loading
  };
}
