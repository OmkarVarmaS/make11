import { supabase } from '../supabaseClient';

export interface RoomSummary {
  id: string;
  code: string;
  name: string;
  order_type: 'RANDOM' | 'CATEGORY';
  status: 'LOBBY' | 'RUNNING' | 'FINISHED';
  player_count?: number;
}

/**
 * Generates a random uppercase string of specified length.
 * Excludes confusable characters like O, 0, I, 1.
 */
export function generateRoomCode(length = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Creates a new room and sets the creator as ADMIN.
 * Retries generating code on conflict.
 */
export async function createRoom(params: {
  name: string;
  orderType: "RANDOM" | "CATEGORY";
  isPublic: boolean;
  teamCode: string;
  userId: string;
}): Promise<{ roomId: string; code: string }> {
  const { name, orderType, isPublic, teamCode, userId } = params;
  let code = generateRoomCode();
  let roomId = '';

  // Retry up to 3 times to ensure unique code
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: roomData, error: roomError } = await supabase
      .from('rooms')
      .insert({
        code,
        name,
        is_public: isPublic,
        order_type: orderType,
        status: 'LOBBY',
        admin_id: userId
      })
      .select('id, code')
      .single();

    if (roomError) {
      if (roomError.code === '23505') { // Unique constraint violation
        code = generateRoomCode();
        continue;
      }
      throw new Error(`Failed to create room: ${roomError.message}`);
    }

    if (roomData) {
      roomId = roomData.id;
      code = roomData.code;
      break;
    }
  }

  if (!roomId) {
    throw new Error('Failed to generate a unique room code. Try again.');
  }

  // Insert the creator into room_players as ADMIN
  const { error: playerError } = await supabase
    .from('room_players')
    .insert({
      room_id: roomId,
      user_id: userId,
      team_code: teamCode,
      role: 'ADMIN'
    });

  if (playerError) {
    // Attempt to rollback if joining fails
    await supabase.from('rooms').delete().eq('id', roomId);
    throw new Error(`Failed to join room as admin: ${playerError.message}`);
  }

  return { roomId, code };
}

/**
 * Joins a room by 6-character code.
 */
export async function joinRoom(params: {
  code: string;
  teamCode: string;
  userId: string;
}): Promise<{ roomId: string }> {
  const { code, teamCode, userId } = params;

  // Find room by code
  const { data: roomData, error: roomError } = await supabase
    .from('rooms')
    .select('id, status')
    .eq('code', code.toUpperCase())
    .single();

  if (roomError || !roomData) {
    throw new Error('Room not found. Please check the code.');
  }

  if (roomData.status !== 'LOBBY') {
    throw new Error('This room is already in progress or finished.');
  }

  const roomId = roomData.id;

  // Check if user is already in the room
  const { data: existingPlayer } = await supabase
    .from('room_players')
    .select('user_id')
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .single();

  if (existingPlayer) {
    return { roomId }; // Already in room, return success
  }

  // Join room
  const { error: joinError } = await supabase
    .from('room_players')
    .insert({
      room_id: roomId,
      user_id: userId,
      team_code: teamCode,
      role: 'PLAYER'
    });

  if (joinError) {
    throw new Error(`Failed to join room: ${joinError.message}`);
  }

  return { roomId };
}

/**
 * Lists public rooms that are in LOBBY status.
 */
export async function listPublicRooms(): Promise<RoomSummary[]> {
  const { data: rooms, error } = await supabase
    .from('rooms')
    .select(`
      id, code, name, order_type, status,
      room_players ( count )
    `)
    .eq('is_public', true)
    .eq('status', 'LOBBY');

  if (error) {
    throw new Error(`Failed to fetch public rooms: ${error.message}`);
  }

  return (rooms || []).map((r: any) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    order_type: r.order_type,
    status: r.status,
    player_count: r.room_players?.[0]?.count || 0
  }));
}
