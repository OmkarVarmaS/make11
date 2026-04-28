-- ─────────────────────────────────────────────────────────────────────────────
-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New query)
-- This creates the cross-device room storage table.
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop old tables if they exist (safe to run multiple times)
DROP TABLE IF EXISTS auction_rooms CASCADE;

-- Main room table: uses a single JSONB 'data' column so the full room state
-- (participants, bids, roster, reactions, etc.) is stored atomically.
CREATE TABLE IF NOT EXISTS auction_rooms (
  code        TEXT PRIMARY KEY,          -- 6-char room code e.g. "AB3X7Z"
  data        JSONB NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for faster public room queries
CREATE INDEX IF NOT EXISTS idx_auction_rooms_is_public
  ON auction_rooms ((data->>'isPublic'));

-- Auto-update updated_at on every write
CREATE OR REPLACE FUNCTION update_auction_room_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auction_rooms_updated_at ON auction_rooms;
CREATE TRIGGER trg_auction_rooms_updated_at
  BEFORE UPDATE ON auction_rooms
  FOR EACH ROW EXECUTE FUNCTION update_auction_room_timestamp();

-- ── Row-Level Security ────────────────────────────────────────────────────────
ALTER TABLE auction_rooms ENABLE ROW LEVEL SECURITY;

-- Allow anyone (including anonymous/unauthenticated users) to read rooms.
-- This is needed because users may not be logged in yet when browsing public rooms.
CREATE POLICY "allow_read_all" ON auction_rooms
  FOR SELECT USING (true);

-- Allow anyone to create a new room
CREATE POLICY "allow_insert_all" ON auction_rooms
  FOR INSERT WITH CHECK (true);

-- Allow anyone to update a room (auction bids happen from all participants)
CREATE POLICY "allow_update_all" ON auction_rooms
  FOR UPDATE USING (true);

-- Allow anyone to delete a room (admin cleanup)
CREATE POLICY "allow_delete_all" ON auction_rooms
  FOR DELETE USING (true);
