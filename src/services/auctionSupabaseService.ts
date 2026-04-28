import { supabase } from '../supabaseClient';

export interface Player {
  id: string; // uuid
  name: string;
  team: string;
  role: 'BATTER' | 'BOWLER' | 'ALL_ROUNDER' | 'WICKETKEEPER';
  basePrice: number;
  avatarInitials: string;
}

export interface Room {
  id: string; // uuid
  code: string;
  order_type: 'RANDOM' | 'CATEGORY';
  admin_id: string;
  player_order: string[] | null;
  current_index: number;
  created_at?: string;
}

// Utility function for Fisher-Yates shuffle
function shuffleArray<T>(array: T[]): T[] {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

/**
 * Generates the player order for a given room and updates the room in Supabase.
 * @param roomId The UUID of the room
 * @returns The generated array of player UUIDs
 */
export async function generatePlayerOrder(roomId: string): Promise<string[]> {
  // 1. Load the room row to get order_type
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('order_type')
    .eq('id', roomId)
    .single();

  if (roomError) throw new Error(`Failed to fetch room: ${roomError.message}`);
  if (!room) throw new Error('Room not found');

  // 2. Load all players for that room via room_players join
  const { data: playersData, error: playersError } = await supabase
    .from('room_players')
    .select(`
      player_id,
      players!inner(id, role)
    `)
    .eq('room_id', roomId);

  if (playersError) throw new Error(`Failed to fetch players: ${playersError.message}`);

  interface PlayerMin {
    id: string;
    role: string;
  }

  const players: PlayerMin[] = (playersData || []).map((rp: any) => ({
    id: rp.player_id,
    role: rp.players.role
  }));

  let playerOrder: string[] = [];

  if (room.order_type === 'RANDOM') {
    // Shuffle the list of players
    playerOrder = shuffleArray(players).map(p => p.id);
  } else if (room.order_type === 'CATEGORY') {
    // Split players into groups
    const batters = players.filter(p => p.role === 'BATTER');
    const bowlers = players.filter(p => p.role === 'BOWLER');
    const allRounders = players.filter(p => p.role === 'ALL_ROUNDER');
    const wicketKeepers = players.filter(p => p.role === 'WICKETKEEPER');

    // Shuffle within each group separately and concatenate in fixed role order
    playerOrder = [
      ...shuffleArray(batters).map(p => p.id),
      ...shuffleArray(bowlers).map(p => p.id),
      ...shuffleArray(allRounders).map(p => p.id),
      ...shuffleArray(wicketKeepers).map(p => p.id),
    ];
  }

  // 3. Store the array of player_id as player_order in the rooms table and reset current_index to 0
  const { error: updateError } = await supabase
    .from('rooms')
    .update({ 
      player_order: playerOrder,
      current_index: 0 
    })
    .eq('id', roomId);

  if (updateError) throw new Error(`Failed to update room order: ${updateError.message}`);
  
  return playerOrder;
}

/**
 * Example of an API Route or Serverless Function to call generatePlayerOrder(roomId)
 * when the admin clicks "Start Auction".
 * 
 * In a real Next.js API route (/pages/api/startAuction.ts) or Supabase Edge Function:
 */
export async function apiStartAuction(req: any, res: any) {
  try {
    const { roomId } = req.body;
    
    if (!roomId) {
      return res.status(400).json({ error: 'Missing roomId' });
    }

    // Optional: Verify admin permissions here using adminId or auth token

    const playerOrder = await generatePlayerOrder(roomId);

    return res.status(200).json({ 
      success: true, 
      message: 'Auction started successfully',
      playerOrderCount: playerOrder.length 
    });
  } catch (error: any) {
    console.error('Error starting auction:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Ends Round 1 and prepares Round 2 by creating it and adding unsold players.
 */
export async function endRound1(roomId: string): Promise<void> {
  // 1. Find the current round for that room
  const { data: round1, error: round1Error } = await supabase
    .from('auction_rounds')
    .select('id')
    .eq('room_id', roomId)
    .eq('round_number', 1)
    .eq('status', 'RUNNING')
    .single();

  if (round1Error || !round1) throw new Error(`Round 1 not found or not running: ${round1Error?.message}`);

  const round1Id = round1.id;

  // 2. Set status = 'UNSOLD' for pending players
  const { error: updatePlayersError } = await supabase
    .from('auction_round_players')
    .update({ status: 'UNSOLD' })
    .eq('round_id', round1Id)
    .eq('status', 'PENDING');
    
  if (updatePlayersError) throw new Error(`Failed to update players to UNSOLD: ${updatePlayersError.message}`);

  // 3. Mark Round 1 as FINISHED
  const { error: finishRoundError } = await supabase
    .from('auction_rounds')
    .update({ status: 'FINISHED' })
    .eq('id', round1Id);

  if (finishRoundError) throw new Error(`Failed to finish Round 1: ${finishRoundError.message}`);

  // 4. Create Round 2
  const { data: round2, error: createRound2Error } = await supabase
    .from('auction_rounds')
    .insert({
      room_id: roomId,
      round_number: 2,
      status: 'SELECTION',
      player_order: [],
      current_index: 0
    })
    .select('id')
    .single();

  if (createRound2Error || !round2) throw new Error(`Failed to create Round 2: ${createRound2Error?.message}`);

  const round2Id = round2.id;

  // 5. Get all UNSOLD players from Round 1 and copy to Round 2
  const { data: unsoldPlayers, error: unsoldError } = await supabase
    .from('auction_round_players')
    .select('player_id')
    .eq('round_id', round1Id)
    .eq('status', 'UNSOLD');

  if (unsoldError) throw new Error(`Failed to fetch unsold players: ${unsoldError.message}`);

  if (unsoldPlayers && unsoldPlayers.length > 0) {
    const round2Players = unsoldPlayers.map((p: any) => ({
      round_id: round2Id,
      player_id: p.player_id,
      status: 'PENDING',
      winning_team_id: null,
      winning_bid: null
    }));

    const { error: insertRound2PlayersError } = await supabase
      .from('auction_round_players')
      .insert(round2Players);

    if (insertRound2PlayersError) throw new Error(`Failed to insert players for Round 2: ${insertRound2PlayersError.message}`);
  }
}

/**
 * Saves a team's interest for Round 2 players.
 */
export async function confirmRound2Interest(
  round2Id: string,
  teamId: string,
  selectedPlayerIds: string[]
): Promise<void> {
  // 1. Remove any existing interest rows
  const { error: deleteError } = await supabase
    .from('round_interest')
    .delete()
    .eq('round_id', round2Id)
    .eq('team_id', teamId);

  if (deleteError) throw new Error(`Failed to remove existing interests: ${deleteError.message}`);

  // 2. Insert one row for each selected player
  if (selectedPlayerIds.length > 0) {
    const interestRows = selectedPlayerIds.map(playerId => ({
      round_id: round2Id,
      player_id: playerId,
      team_id: teamId
    }));

    const { error: insertError } = await supabase
      .from('round_interest')
      .insert(interestRows);

    if (insertError) throw new Error(`Failed to save interests: ${insertError.message}`);
  }
}

/**
 * Starts Round 2 with selected players.
 */
export async function startRound2(
  round2Id: string,
  orderType: "RANDOM" | "CATEGORY"
): Promise<void> {
  // 1. Get all players from round_interest
  const { data: interests, error: interestError } = await supabase
    .from('round_interest')
    .select('player_id')
    .eq('round_id', round2Id);

  if (interestError) throw new Error(`Failed to fetch interests: ${interestError.message}`);

  // Get unique player IDs
  const uniquePlayerIds = Array.from(new Set((interests || []).map((i: any) => i.player_id)));

  let playerOrder: string[] = [];

  // 2. Fetch these players' details
  if (uniquePlayerIds.length > 0) {
    const { data: playersData, error: playersError } = await supabase
      .from('players')
      .select('id, role')
      .in('id', uniquePlayerIds);

    if (playersError) throw new Error(`Failed to fetch player details: ${playersError.message}`);

    const players = playersData || [];

    if (orderType === 'RANDOM') {
      playerOrder = shuffleArray(players).map((p: any) => p.id);
    } else if (orderType === 'CATEGORY') {
      const batters = players.filter((p: any) => p.role === 'BATTER');
      const bowlers = players.filter((p: any) => p.role === 'BOWLER');
      const allRounders = players.filter((p: any) => p.role === 'ALL_ROUNDER');
      const wicketKeepers = players.filter((p: any) => p.role === 'WICKETKEEPER');

      playerOrder = [
        ...shuffleArray(batters).map((p: any) => p.id),
        ...shuffleArray(bowlers).map((p: any) => p.id),
        ...shuffleArray(allRounders).map((p: any) => p.id),
        ...shuffleArray(wicketKeepers).map((p: any) => p.id),
      ];
    }
  }

  // 3. Update auction_rounds
  const { error: updateError } = await supabase
    .from('auction_rounds')
    .update({
      player_order: playerOrder,
      current_index: 0,
      status: 'RUNNING'
    })
    .eq('id', round2Id);

  if (updateError) throw new Error(`Failed to start Round 2: ${updateError.message}`);
}
