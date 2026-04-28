const fs = require('fs');
const path = require('path');

// Ensure we are in the supabase directory context
const supabaseDir = __dirname;
const playersPath = path.join(supabaseDir, 'players.json');
const outputPath = path.join(supabaseDir, 'supabase_players.sql');

const players = JSON.parse(fs.readFileSync(playersPath, 'utf8'));

let sql = 'DROP TABLE IF EXISTS public.players CASCADE;\n\n';
sql += 'CREATE TABLE public.players (\n';
sql += '  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,\n';
sql += '  player_id INTEGER UNIQUE NOT NULL,\n';
sql += '  name TEXT NOT NULL,\n';
sql += '  team TEXT NOT NULL,\n';
sql += '  role TEXT NOT NULL,\n';
sql += '  base_price INTEGER NOT NULL,\n';
sql += '  avatar_initials TEXT NOT NULL,\n';
sql += '  country TEXT DEFAULT \'India\',\n';
sql += '  city TEXT DEFAULT \'Unknown\',\n';
sql += '  batting_style TEXT DEFAULT \'Right Handed Bat\',\n';
sql += '  bowling_style TEXT DEFAULT \'Right-arm medium\',\n';
sql += '  image_url TEXT,\n';
sql += '  stats JSONB DEFAULT \'{}\'::jsonb\n';
sql += ');\n\n';

sql += '-- Enable RLS\n';
sql += 'ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;\n\n';

sql += '-- Create a policy to allow anyone to read players\n';
sql += 'DROP POLICY IF EXISTS "Allow public read access to players" ON public.players;\n';
sql += 'CREATE POLICY "Allow public read access to players" ON public.players FOR SELECT USING (true);\n\n';

sql += '-- Insert players\n';
sql += 'INSERT INTO public.players (player_id, name, team, role, base_price, avatar_initials, country, city, batting_style, bowling_style, image_url, stats) VALUES \n';

const values = players.map(p => {
  const name = p.name.replace(/'/g, "''");
  const country = (p.country || 'India').replace(/'/g, "''");
  const city = (p.city || 'Unknown').replace(/'/g, "''");
  const bat = (p.battingStyle || 'Right Handed Bat').replace(/'/g, "''");
  const bowl = (p.bowlingStyle || 'Right-arm medium').replace(/'/g, "''");
  const imageUrl = p.imageUrl ? `'${p.imageUrl}'` : 'NULL';
  const stats = p.stats ? `'${JSON.stringify(p.stats)}'::jsonb` : "'{}'::jsonb";
  
  return `(${p.id}, '${name}', '${p.team}', '${p.role}', ${p.basePrice}, '${p.avatarInitials}', '${country}', '${city}', '${bat}', '${bowl}', ${imageUrl}, ${stats})`;
});

sql += values.join(',\n') + ';\n';

fs.writeFileSync(outputPath, sql);
console.log('Successfully regenerated supabase_players.sql with all columns and data.');
