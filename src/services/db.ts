// ─── Supabase-backed Room DB ──────────────────────────────────────────────────
// All room state is stored in the `auction_rooms` table in Supabase.
// This makes every operation cross-device and real-time across phones, tablets, laptops, etc.

import { supabase } from '../supabaseClient';

export let PLAYERS: any[] = [];

export const initPlayers = async () => {
  if (PLAYERS.length > 0) return;
  try {
    const { data, error } = await supabase.from('players').select('*').order('player_id');
    if (error) throw error;
    if (data) {
      PLAYERS = data.map((p: any) => ({
        id: p.id,
        player_id: p.player_id,
        name: p.name,
        team: p.team,
        role: p.role,
        basePrice: p.base_price,
        initials: p.avatar_initials,
        country: p.country,
        city: p.city,
        bat: p.batting_style,
        bowl: p.bowling_style,
        imageUrl: p.image_url,
        stats: p.stats || {}
      }));
    }
  } catch (err) {
    console.error('Failed to load players from Supabase:', err);
    PLAYERS = [
      { name: 'Ruturaj Gaikwad', role: 'BATTER', basePrice: 150, initials: 'RG', country: 'India', city: 'Pune', bat: 'Right Handed Bat', bowl: 'Right-arm offbreak' }
    ];
  }
};

export const TEAM_COLORS: Record<string, string> = {
  'Chennai Super Kings': '#FFFF00',
  'CSK': '#FFFF00',
  'Mumbai Indians': '#ADD8E6',
  'MI': '#ADD8E6',
  'Royal Challengers Bengaluru': '#FF0000',
  'RCB': '#FF0000',
  'Kolkata Knight Riders': '#800080',
  'KKR': '#800080',
  'Delhi Capitals': '#00008B',
  'DC': '#00008B',
  'Punjab Kings': '#FF6666',
  'PBKS': '#FF6666',
  'Gujarat Titans': '#000080',
  'GT': '#000080',
  'Sunrisers Hyderabad': '#FFA500',
  'SRH': '#FFA500',
  'Lucknow Super Giants': '#FF1493',
  'LSG': '#FF1493',
  'Rajasthan Royals': '#FFB6C1',
  'RR': '#FFB6C1',
};

// ─── Supabase helpers ─────────────────────────────────────────────────────────

/** Read a room's full data blob from Supabase */
async function readRoom(code: string): Promise<any | null> {
  const { data, error } = await supabase
    .from('auction_rooms')
    .select('data')
    .eq('code', code)
    .maybeSingle();
  if (error) { console.error('readRoom error:', error); return null; }
  return data?.data ?? null;
}

/** Overwrite a room's full data blob in Supabase (upsert) */
async function writeRoom(code: string, roomData: any): Promise<void> {
  const { error } = await supabase
    .from('auction_rooms')
    .upsert({ code, data: roomData }, { onConflict: 'code' });
  if (error) console.error('writeRoom error:', error);
}

const SOLD_OVERLAY_MS   = 3500;
const UNSOLD_OVERLAY_MS = 2500;

// ─── Shuffle ─────────────────────────────────────────────────────────────────
function shuffleArray<T>(array: T[]): T[] {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

export function buildPlayerOrder(
  players: any[],
  orderType: "RANDOM" | "CATEGORY"
): string[] {
  if (orderType === "RANDOM") {
    return shuffleArray(players).map(p => p.id);
  } else {
    const batters      = players.filter(p => p.role === 'BATTER');
    const bowlers      = players.filter(p => p.role === 'BOWLER');
    const allRounders  = players.filter(p => p.role === 'ALL_ROUNDER');
    const wkKeepers    = players.filter(p => p.role === 'WICKETKEEPER');
    const others       = players.filter(p => !['BATTER','BOWLER','ALL_ROUNDER','WICKETKEEPER'].includes(p.role));
    return [
      ...shuffleArray(batters).map(p => p.id),
      ...shuffleArray(bowlers).map(p => p.id),
      ...shuffleArray(allRounders).map(p => p.id),
      ...shuffleArray(wkKeepers).map(p => p.id),
      ...shuffleArray(others).map(p => p.id),
    ];
  }
}

// ─── Internal conclude helper ─────────────────────────────────────────────────
function concludeRoundInternal(room: any) {
  if (!room || room.saleProcessed) return;
  room.saleProcessed = true;

  const playerIdx = room.currentPlayerIndex ?? 0;
  const playerId  = room.playerOrder ? room.playerOrder[playerIdx] : null;
  const player    = playerId
    ? PLAYERS.find(p => p.id === playerId)
    : (PLAYERS[playerIdx] ?? PLAYERS[0]);

  let overlayMs: number;
  if (room.currentBid > 0 && room.leadingUserId) {
    const wi = room.participants.findIndex((p: any) => p.userId === room.leadingUserId);
    if (wi >= 0) {
      room.participants[wi].purse     = (room.participants[wi].purse     ?? 15000) - room.currentBid;
      room.participants[wi].slotsUsed = (room.participants[wi].slotsUsed ?? 0)     + 1;
      if (!room.participants[wi].roster) room.participants[wi].roster = [];
      room.participants[wi].roster.push({ 
        ...player, 
        soldFor: room.currentBid, 
        bidCount: room.totalBids || 1 
      });
    }
    overlayMs = SOLD_OVERLAY_MS;
    room.lastSold = {
      player, team: room.leadingTeam, userId: room.leadingUserId,
      amount: room.currentBid, unsold: false,
      bidCount: room.totalBids || 1,
      soldAt: Date.now(), expiresAt: Date.now() + overlayMs,
    };
  } else {
    overlayMs = UNSOLD_OVERLAY_MS;
    room.lastSold = {
      player, unsold: true,
      soldAt: Date.now(), expiresAt: Date.now() + overlayMs,
    };
  }

  room.currentPlayerIndex = playerIdx + 1;
  room.currentBid         = 0;
  room.leadingTeam        = null;
  room.leadingUserId      = null;
  room.bidHistory         = [];
  room.withdrawnTeams     = [];

  const totalPlayers = room.playerOrder ? room.playerOrder.length : PLAYERS.length;
  if (room.currentPlayerIndex >= totalPlayers) {
    room.status        = 'ended';
    room.bidDeadline   = 0;
    room.saleProcessed = true;
  } else {
    room.status        = 'bidding';
    room.bidDeadline   = Date.now() + overlayMs + (room.timer || 15) * 1000;
    room.saleProcessed = false;
  }
}

// ─── Public dbService — all backed by Supabase ───────────────────────────────
export const dbService = {

  async checkRoomExists(code: string): Promise<boolean> {
    const { count, error } = await supabase
      .from('auction_rooms')
      .select('code', { count: 'exact', head: true })
      .eq('code', code);
    if (error) return false;
    return (count ?? 0) > 0;
  },

  cleanupStalePublicRooms(): void {
    // Fire-and-forget: fetch all public rooms and delete any that are stale.
    // Rule 1 — Not started within 30 minutes of creation.
    // Rule 2 — All participants have been inactive (lastSeen) for 20+ minutes.
    const NOT_STARTED_TTL = 30 * 60 * 1000;  // 30 min
    const INACTIVE_TTL    = 20 * 60 * 1000;  // 20 min

    this.listPublicRooms().then(async (rooms) => {
      const now = Date.now();
      for (const [code, room] of Object.entries(rooms) as [string, any][]) {
        if (!room.isPublic) continue;

        // Rule 1: created more than 30 min ago and auction never started
        if (!room.auctionStarted && room.createdAt && (now - room.createdAt) > NOT_STARTED_TTL) {
          await supabase.from('auction_rooms').delete().eq('code', code);
          continue;
        }

        // Rule 2: every active participant's lastSeen is older than 20 min
        const participants: any[] = room.participants || [];
        if (participants.length === 0) {
          // Empty room — remove immediately if it's been around for > 5 min
          if (room.createdAt && (now - room.createdAt) > 5 * 60 * 1000) {
            await supabase.from('auction_rooms').delete().eq('code', code);
          }
          continue;
        }
        const allInactive = participants.every(
          (p: any) => !p.lastSeen || (now - p.lastSeen) > INACTIVE_TTL
        );
        if (allInactive) {
          await supabase.from('auction_rooms').delete().eq('code', code);
        }
      }
    }).catch(err => console.warn('cleanupStalePublicRooms error:', err));
  },

  async deleteRoom(code: string): Promise<void> {
    const { error } = await supabase.from('auction_rooms').delete().eq('code', code);
    if (error) console.error('deleteRoom error:', error);
  },

  async createRoom(code: string, roomData: any, adminUser: any): Promise<void> {
    const room = {
      ...roomData,
      id:        code,
      capacity:  12,
      createdAt: Date.now(),          // used for the 30-min not-started expiry
      participants: [{
        userId:    adminUser?.userId || 'admin_id',
        name:      roomData.teamName || adminUser?.name || 'Admin',
        role:      'ADMIN',
        purse:     (roomData.budget || 100) * 100,
        slotsUsed: 0,
        roster:    [],
        lastSeen:  Date.now(),
      }],
    };
    await writeRoom(code, room);
  },

  async getRoom(code: string): Promise<any> {
    const room = await readRoom(code);
    if (!room) return null;

    // Admin inactivity transfer (keep same logic as before)
    if (room && !room.auctionStarted) {
      if (!room.adminAssignedAt && room.participants && room.participants.length > 0) {
        room.adminAssignedAt = Date.now();
        await writeRoom(code, room);
      } else if (room.adminAssignedAt && Date.now() - room.adminAssignedAt > 5 * 60 * 1000) {
        const currentAdmin = room.participants.find((p: any) => p.role === 'ADMIN');
        if (currentAdmin) {
          const others = room.participants.filter((p: any) => p.userId !== currentAdmin.userId);
          if (others.length > 0) {
            room.participants.forEach((p: any) => (p.role = 'USER'));
            const randIdx = Math.floor(Math.random() * others.length);
            others[randIdx].role = 'ADMIN';
            room.adminAssignedAt = Date.now();
            await writeRoom(code, room);
          }
        }
      }
    }
    return room;
  },

  async joinRoom(code: string, user: any, customTeamName = ''): Promise<string | false> {
    const room = await readRoom(code);
    if (!room) return false;

    const targetName = customTeamName || user?.name || 'Guest';

    // Restore if they had left mid-auction
    const savedSlot = room.leftParticipants?.find(
      (p: any) => p.name.toLowerCase() === targetName.toLowerCase()
    );
    if (savedSlot) {
      if (room.participants.length >= room.capacity) { alert('Room is full (max 12)'); return false; }
      room.participants.push({ ...savedSlot, lastSeen: Date.now() });
      room.leftParticipants = room.leftParticipants.filter(
        (p: any) => p.name.toLowerCase() !== targetName.toLowerCase()
      );
      await writeRoom(code, room);
      return savedSlot.userId;
    }

    if (room.participants.length >= room.capacity) { alert('Room is full (max 12)'); return false; }
    const nameTaken = room.participants.find((p: any) => p.name.toLowerCase() === targetName.toLowerCase());
    if (nameTaken) return false;

    const newUserId = 'u_' + Math.random().toString(36).slice(2, 10);
    const startingPurse = (room.budget || 100) * 100;
    room.participants.push({
      userId:    newUserId,
      name:      targetName,
      role:      'USER',
      purse:     startingPurse,
      slotsUsed: 0,
      roster:    [],
      lastSeen:  Date.now(),
    });
    await writeRoom(code, room);
    return newUserId;
  },

  async removeParticipant(code: string, userId: string): Promise<void> {
    const room = await readRoom(code);
    if (!room) return;

    const removedUser = room.participants.find((p: any) => p.userId === userId);
    const wasAdmin    = removedUser?.role === 'ADMIN';

    room.participants = room.participants.filter((p: any) => p.userId !== userId);

    if (!room.kickedUsers) room.kickedUsers = [];
    if (!room.kickedUsers.includes(userId)) room.kickedUsers.push(userId);

    if (room.isPublic && room.participants.length === 0) room.emptyAt = Date.now();

    if (wasAdmin) {
      if (!room.formerAdmins) room.formerAdmins = [];
      if (!room.formerAdmins.includes(userId)) room.formerAdmins.push(userId);
    }

    if (wasAdmin && room.participants.length > 0) {
      const randIdx = Math.floor(Math.random() * room.participants.length);
      room.participants[randIdx].role = 'ADMIN';
      room.adminAssignedAt = Date.now();
    }

    await writeRoom(code, room);
  },

  async leaveAuction(code: string, userId: string): Promise<void> {
    const room = await readRoom(code);
    if (!room) return;
    const participant = room.participants.find((p: any) => p.userId === userId);
    if (!participant) return;

    if (!room.leftParticipants) room.leftParticipants = [];
    room.leftParticipants = room.leftParticipants.filter(
      (p: any) => p.name.toLowerCase() !== participant.name.toLowerCase()
    );
    room.leftParticipants.push({ ...participant, role: 'USER' });
    room.participants = room.participants.filter((p: any) => p.userId !== userId);

    if (room.isPublic && room.participants.length === 0) room.emptyAt = Date.now();

    const wasAdmin = participant.role === 'ADMIN';
    if (wasAdmin) {
      if (!room.formerAdmins) room.formerAdmins = [];
      if (!room.formerAdmins.includes(userId)) room.formerAdmins.push(userId);
      if (room.participants.length > 0) {
        const randIdx = Math.floor(Math.random() * room.participants.length);
        room.participants[randIdx].role = 'ADMIN';
        room.adminAssignedAt = Date.now();
      }
    }

    await writeRoom(code, room);
  },

  async updatePresence(code: string, userId: string): Promise<void> {
    // Read just the data, update lastSeen for this user, write back
    const room = await readRoom(code);
    if (!room) return;
    const p = room.participants?.find((part: any) => part.userId === userId);
    if (p) {
      p.lastSeen = Date.now();
      await writeRoom(code, room);
    }
  },

  async startAuction(code: string): Promise<void> {
    const room = await readRoom(code);
    if (!room) return;

    const orderType       = room.orderType || 'CATEGORY';
    const selectedPlayers = room.selectedPlayers || PLAYERS.map(p => p.id);
    const playersToAuction = PLAYERS.filter(p => selectedPlayers.includes(p.id));
    const playerOrder     = buildPlayerOrder(playersToAuction, orderType);

    room.participants = room.participants.map((p: any) => ({
      ...p,
      purse:     p.purse     ?? ((room.budget || 100) * 100),
      slotsUsed: p.slotsUsed ?? 0,
      roster:    p.roster    ?? [],
    }));
    Object.assign(room, {
      auctionStarted:     true,
      status:             'bidding',
      round:              1,
      currentPlayerIndex: 0,
      playerOrder,
      currentBid:         0,
      leadingTeam:        null,
      leadingUserId:      null,
      bidHistory:         [],
      withdrawnTeams:     [],
      bidDeadline:        Date.now() + (room.timer || 15) * 1000,
      saleProcessed:      false,
      lastSold:           null,
    });
    await writeRoom(code, room);
  },

  async placeBid(code: string, amount: number, teamName: string, userId: string, forPlayerIndex?: number): Promise<void> {
    const room = await readRoom(code);
    if (!room) return;
    if (forPlayerIndex !== undefined && room.currentPlayerIndex !== forPlayerIndex) return;
    if (room.saleProcessed) return;

    room.currentBid    = amount;
    room.leadingTeam   = teamName;
    room.leadingUserId = userId;
    room.bidDeadline   = Date.now() + (room.timer || 15) * 1000;
    room.totalBids     = (room.totalBids || 0) + 1;
    if (!room.bidHistory) room.bidHistory = [];
    room.bidHistory.unshift({ team: teamName, userId, amount, ts: Date.now() });
    room.bidHistory = room.bidHistory.slice(0, 20);

    if (room.withdrawnTeams?.includes(userId)) {
      room.withdrawnTeams = room.withdrawnTeams.filter((id: string) => id !== userId);
    }

    await writeRoom(code, room);
  },

  async withdrawFromBid(code: string, userId: string): Promise<void> {
    const room = await readRoom(code);
    if (!room) return;
    if (!room.withdrawnTeams) room.withdrawnTeams = [];
    if (!room.withdrawnTeams.includes(userId)) room.withdrawnTeams.push(userId);

    const activeBidders = room.participants.filter(
      (p: any) => !room.withdrawnTeams.includes(p.userId)
    );
    
    if ((room.currentBid || 0) > 0) {
      if (activeBidders.length <= 1) concludeRoundInternal(room);
    } else {
      if (activeBidders.length === 0) concludeRoundInternal(room);
    }

    await writeRoom(code, room);
  },

  async concludeRound(code: string, forPlayerIndex?: number): Promise<void> {
    const room = await readRoom(code);
    if (!room) return;
    if (forPlayerIndex !== undefined && room.currentPlayerIndex !== forPlayerIndex) return;
    const prevSold = room.lastSold;
    if (prevSold && Date.now() < prevSold.expiresAt) return;
    concludeRoundInternal(room);
    await writeRoom(code, room);
  },

  async togglePause(code: string): Promise<void> {
    const room = await readRoom(code);
    if (!room) return;
    if (room.status === 'paused') {
      room.status      = 'bidding';
      room.bidDeadline = Date.now() + (room.pausedRemaining || (room.timer || 15) * 1000);
    } else {
      room.status          = 'paused';
      const remaining      = room.bidDeadline - Date.now();
      const maxRemaining   = (room.timer || 15) * 1000;
      room.pausedRemaining = Math.max(0, remaining > maxRemaining ? maxRemaining : remaining);
    }
    await writeRoom(code, room);
  },

  async endRound(code: string): Promise<void> {
    const room = await readRoom(code);
    if (!room) return;

    room.status        = 'round2_selection';
    room.bidDeadline   = 0;
    room.saleProcessed = true;
    room.lastSold      = null;

    const soldPlayerIds = new Set<string>();
    if (room.participants) {
      room.participants.forEach((p: any) => {
        if (p.roster) p.roster.forEach((r: any) => soldPlayerIds.add(r.id));
      });
    }

    const unsoldPlayers = (room.playerOrder || PLAYERS.map(p => p.id))
      .filter((id: string) => !soldPlayerIds.has(id))
      .map((id: string) => PLAYERS.find(p => p.id === id))
      .filter((p: any) => p);

    room.unsoldPlayers     = unsoldPlayers;
    room.round2Selections  = {};
    room.round2Ready       = [];
    room.round2Deadline    = Date.now() + (3 * 60 + 41) * 1000;

    await writeRoom(code, room);
  },

  async toggleRound2Selection(code: string, userId: string, playerId: string): Promise<void> {
    const room = await readRoom(code);
    if (!room) return;
    if (!room.round2Selections) room.round2Selections = {};
    if (!room.round2Selections[userId]) room.round2Selections[userId] = [];

    const selections = room.round2Selections[userId];
    const index      = selections.indexOf(playerId);
    if (index > -1) selections.splice(index, 1);
    else            selections.push(playerId);

    await writeRoom(code, room);
  },

  async confirmRound2Selection(code: string, userId: string): Promise<void> {
    const room = await readRoom(code);
    if (!room) return;
    if (!room.round2Ready) room.round2Ready = [];
    if (!room.round2Ready.includes(userId)) room.round2Ready.push(userId);
    await writeRoom(code, room);
  },

  async startRound2(code: string): Promise<void> {
    const room = await readRoom(code);
    if (!room) return;

    const selectedPlayerIds = new Set<string>();
    if (room.round2Selections) {
      Object.values(room.round2Selections).forEach((selections: any) => {
        selections.forEach((id: string) => selectedPlayerIds.add(id));
      });
    }

    const playersToAuction = Array.from(selectedPlayerIds)
      .map(id => PLAYERS.find(p => p.id === id))
      .filter(p => p);

    if (playersToAuction.length === 0) {
      room.status = 'ended';
      await writeRoom(code, room);
      return;
    }

    const orderType   = room.orderType || 'CATEGORY';
    const playerOrder = buildPlayerOrder(playersToAuction, orderType);

    Object.assign(room, {
      status:             'bidding',
      round:              2,
      currentPlayerIndex: 0,
      playerOrder,
      currentBid:         0,
      leadingTeam:        null,
      leadingUserId:      null,
      bidHistory:         [],
      withdrawnTeams:     [],
      bidDeadline:        Date.now() + (room.timer || 15) * 1000,
      saleProcessed:      false,
      lastSold:           null,
    });

    await writeRoom(code, room);
  },

  async updateRoomSettings(code: string, settings: any): Promise<void> {
    const room = await readRoom(code);
    if (!room) return;
    Object.assign(room, settings);
    if (!room.auctionStarted && settings.budget) {
      room.participants = room.participants.map((p: any) => ({
        ...p, purse: settings.budget * 100,
      }));
    }
    await writeRoom(code, room);
  },

  sendReaction(code: string, emoji: string): void {
    // Fire-and-forget reaction write (non-blocking)
    readRoom(code).then(room => {
      if (!room) return;
      if (!room.reactions) room.reactions = [];
      const now = Date.now();
      room.reactions = room.reactions.filter((r: any) => now - r.ts < 5000);
      room.reactions.push({
        id:    Math.random().toString(36).slice(2, 9),
        emoji, ts: now,
        x:     10 + Math.random() * 80,
        delay: Math.random() * 0.4,
      });
      writeRoom(code, room);
    });
  },

  /** List all public rooms (for the Home page lobby) */
  async listPublicRooms(): Promise<Record<string, any>> {
    const { data, error } = await supabase
      .from('auction_rooms')
      .select('code, data')
      .filter('data->>isPublic', 'eq', 'true')
      .order('updated_at', { ascending: false })
      .limit(20);
    if (error) return {};
    const result: Record<string, any> = {};
    for (const row of data || []) {
      result[row.code] = row.data;
    }
    return result;
  },

  /** List rooms the current user participated in (by checking all rooms) */
  async listMyRooms(userId: string): Promise<Array<{ code: string; room: any }>> {
    const { data, error } = await supabase
      .from('auction_rooms')
      .select('code, data')
      .order('updated_at', { ascending: false })
      .limit(100);
    if (error) return [];
    return (data || [])
      .filter(row => {
        const r = row.data;
        const inParticipants = r.participants?.some((p: any) => p.userId === userId);
        const inLeft = r.leftParticipants?.some((p: any) => p.userId === userId);
        return inParticipants || inLeft;
      })
      .map(row => ({ code: row.code, room: row.data }));
  },
  /**
   * Upload / accumulate fantasy points for players in a room.
   *
   * `incoming` is a map of  { playerName: pointsToAdd }
   * For each name, the value is ADDED to whatever is already stored.
   * First upload: existing value is 0, so the result equals the uploaded value.
   * Subsequent uploads: points accumulate (last + new).
   */
  async updatePlayerPoints(code: string, incoming: Record<string, number>): Promise<void> {
    const room = await readRoom(code);
    if (!room) return;
    if (!room.playerPoints) room.playerPoints = {};

    for (const [name, pts] of Object.entries(incoming)) {
      room.playerPoints[name] = (room.playerPoints[name] ?? 0) + pts;
    }

    await writeRoom(code, room);
  },

  /** Read the current cumulative points map for a room (name → total pts). */
  async getPlayerPoints(code: string): Promise<Record<string, number>> {
    const room = await readRoom(code);
    return room?.playerPoints ?? {};
  },
};

// ─── Utility ──────────────────────────────────────────────────────────────────
export function generateRandomCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let result  = '';
  for (let i = 0; i < 6; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
}
