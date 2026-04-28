-- Drop existing tables if they exist to apply new schema
DROP TABLE IF EXISTS room_players CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;

CREATE TABLE rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  is_public boolean not null default true,
  order_type text not null default 'RANDOM' check (order_type in ('RANDOM','CATEGORY')),
  status text not null default 'LOBBY' check (status in ('LOBBY','RUNNING','FINISHED')),
  admin_id uuid references auth.users(id) not null,
  created_at timestamptz default now() not null
);

CREATE TABLE room_players (
  room_id uuid references rooms(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  team_code text not null,
  role text not null default 'PLAYER' check (role in ('ADMIN','PLAYER')),
  joined_at timestamptz default now() not null,
  primary key (room_id, user_id)
);

-- Enable RLS
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_players ENABLE ROW LEVEL SECURITY;

-- Rooms policies
CREATE POLICY "Anyone can view public rooms or rooms they joined" ON rooms
FOR SELECT USING (
  is_public = true OR 
  id IN (SELECT room_id FROM room_players WHERE user_id = auth.uid()) OR
  admin_id = auth.uid()
);

CREATE POLICY "Admin can update their rooms" ON rooms
FOR UPDATE USING (admin_id = auth.uid());

CREATE POLICY "Admin can delete their rooms" ON rooms
FOR DELETE USING (admin_id = auth.uid());

CREATE POLICY "Authenticated users can create rooms" ON rooms
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Room Players policies
CREATE POLICY "Anyone can view room players" ON room_players
FOR SELECT USING (true);

CREATE POLICY "Users can join rooms" ON room_players
FOR INSERT WITH CHECK (
  auth.uid() = user_id AND 
  EXISTS (SELECT 1 FROM rooms WHERE id = room_id AND status = 'LOBBY')
);

CREATE POLICY "Users can leave rooms" ON room_players
FOR DELETE USING (auth.uid() = user_id);
