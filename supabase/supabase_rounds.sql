-- supabase_rounds.sql
CREATE TABLE auction_rounds (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  round_number integer not null default 1,
  status text not null check (status in ('PENDING', 'RUNNING', 'SELECTION', 'FINISHED')) default 'PENDING',
  player_order uuid[] null,
  current_index integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

CREATE TABLE auction_round_players (
  round_id uuid references auction_rounds(id) on delete cascade,
  player_id uuid references players(id) on delete cascade,
  status text not null check (status in ('PENDING', 'SOLD', 'UNSOLD')) default 'PENDING',
  winning_team_id uuid null,
  winning_bid numeric null,
  primary key (round_id, player_id)
);

CREATE TABLE round_interest (
  round_id uuid references auction_rounds(id) on delete cascade,
  player_id uuid references players(id) on delete cascade,
  team_id uuid not null,
  primary key (round_id, player_id, team_id)
);
