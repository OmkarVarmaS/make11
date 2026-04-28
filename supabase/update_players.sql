-- Update script for specific 50 players with real stats and images
-- Run this in your Supabase SQL Editor after running the main supabase_players.sql

-- RCB Players
UPDATE public.players SET 
  image_url = 'https://ipl-stats-sports-mechanic.s3.ap-south-1.amazonaws.com/ipl/playerimages/Virat%20Kohli.png',
  stats = '{"matches": 237, "runs": 7263, "sr": 130.0}'
WHERE player_id = 53; -- Virat Kohli

UPDATE public.players SET 
  image_url = 'https://ipl-stats-sports-mechanic.s3.ap-south-1.amazonaws.com/ipl/playerimages/Tim%20David.png',
  stats = '{"matches": 25, "runs": 418, "sr": 177.9}'
WHERE player_id = 59; -- Tim David

UPDATE public.players SET 
  image_url = 'https://ipl-stats-sports-mechanic.s3.ap-south-1.amazonaws.com/ipl/playerimages/Rajat%20Patidar.png',
  stats = '{"matches": 12, "runs": 404, "sr": 144.3}'
WHERE player_id = 52; -- Rajat Patidar

UPDATE public.players SET 
  image_url = 'https://ipl-stats-sports-mechanic.s3.ap-south-1.amazonaws.com/ipl/playerimages/Bhuvneshwar%20Kumar.png',
  stats = '{"matches": 160, "wickets": 170, "economy": 7.39}'
WHERE player_id = 65; -- Bhuvneshwar Kumar

UPDATE public.players SET 
  image_url = 'https://ipl-stats-sports-mechanic.s3.ap-south-1.amazonaws.com/ipl/playerimages/Josh%20Hazlewood.png',
  stats = '{"matches": 27, "wickets": 35, "economy": 8.02}'
WHERE player_id = 66; -- Josh Hazlewood

-- PBKS Players
UPDATE public.players SET 
  image_url = 'https://ipl-stats-sports-mechanic.s3.ap-south-1.amazonaws.com/ipl/playerimages/Shreyas%20Iyer.png',
  stats = '{"matches": 101, "runs": 2776, "sr": 125.3}'
WHERE player_id = 1; -- Shreyas Iyer

UPDATE public.players SET 
  image_url = 'https://ipl-stats-sports-mechanic.s3.ap-south-1.amazonaws.com/ipl/playerimages/Yuzvendra%20Chahal.png',
  stats = '{"matches": 145, "wickets": 187, "economy": 7.67}'
WHERE player_id = 16; -- Yuzvendra Chahal

UPDATE public.players SET 
  image_url = 'https://ipl-stats-sports-mechanic.s3.ap-south-1.amazonaws.com/ipl/playerimages/Arshdeep%20Singh.png',
  stats = '{"matches": 51, "wickets": 57, "economy": 8.74}'
WHERE player_id = 15; -- Arshdeep Singh

UPDATE public.players SET 
  image_url = 'https://ipl-stats-sports-mechanic.s3.ap-south-1.amazonaws.com/ipl/playerimages/Prabhsimran%20Singh.png',
  stats = '{"matches": 20, "runs": 422, "sr": 139.3}'
WHERE player_id = 2; -- Prabhsimran Singh

UPDATE public.players SET 
  image_url = 'https://ipl-stats-sports-mechanic.s3.ap-south-1.amazonaws.com/ipl/playerimages/Marcus%20Stoinis.png',
  stats = '{"matches": 82, "runs": 1478, "wickets": 34}'
WHERE player_id = 8; -- Marcus Stoinis

-- CSK Players
UPDATE public.players SET 
  image_url = 'https://ipl-stats-sports-mechanic.s3.ap-south-1.amazonaws.com/ipl/playerimages/MS%20Dhoni.png',
  stats = '{"matches": 250, "runs": 5082, "sr": 135.9}'
WHERE player_id = 80; -- MS Dhoni

UPDATE public.players SET 
  image_url = 'https://ipl-stats-sports-mechanic.s3.ap-south-1.amazonaws.com/ipl/playerimages/Sanju%20Samson.png',
  stats = '{"matches": 152, "runs": 3888, "sr": 137.2}'
WHERE player_id = 81; -- Sanju Samson

UPDATE public.players SET 
  image_url = 'https://ipl-stats-sports-mechanic.s3.ap-south-1.amazonaws.com/ipl/playerimages/Ruturaj%20Gaikwad.png',
  stats = '{"matches": 52, "runs": 1797, "sr": 135.5}'
WHERE player_id = 76; -- Ruturaj Gaikwad

UPDATE public.players SET 
  image_url = 'https://ipl-stats-sports-mechanic.s3.ap-south-1.amazonaws.com/ipl/playerimages/Noor%20Ahmad.png',
  stats = '{"matches": 13, "wickets": 16, "economy": 7.82}'
WHERE player_id = 90; -- Noor Ahmad

UPDATE public.players SET 
  image_url = 'https://ipl-stats-sports-mechanic.s3.ap-south-1.amazonaws.com/ipl/playerimages/Dewald%20Brevis.png',
  stats = '{"matches": 7, "runs": 161, "sr": 142.5}'
WHERE player_id = 77; -- Dewald Brevis

-- SRH Players
UPDATE public.players SET 
  image_url = 'https://ipl-stats-sports-mechanic.s3.ap-south-1.amazonaws.com/ipl/playerimages/Abhishek%20Sharma.png',
  stats = '{"matches": 47, "runs": 893, "wickets": 9}'
WHERE player_id = 107; -- Abhishek Sharma

UPDATE public.players SET 
  image_url = 'https://ipl-stats-sports-mechanic.s3.ap-south-1.amazonaws.com/ipl/playerimages/Heinrich%20Klaasen.png',
  stats = '{"matches": 19, "runs": 514, "sr": 165.8}'
WHERE player_id = 101; -- Heinrich Klaasen

UPDATE public.players SET 
  image_url = 'https://ipl-stats-sports-mechanic.s3.ap-south-1.amazonaws.com/ipl/playerimages/Ishan%20Kishan.png',
  stats = '{"matches": 91, "runs": 2324, "sr": 134.2}'
WHERE player_id = 102; -- Ishan Kishan

UPDATE public.players SET 
  image_url = 'https://ipl-stats-sports-mechanic.s3.ap-south-1.amazonaws.com/ipl/playerimages/Pat%20Cummins.png',
  stats = '{"matches": 42, "wickets": 45, "economy": 8.54}'
WHERE player_id = 113; -- Pat Cummins

UPDATE public.players SET 
  image_url = 'https://ipl-stats-sports-mechanic.s3.ap-south-1.amazonaws.com/ipl/playerimages/Harshal%20Patel.png',
  stats = '{"matches": 91, "wickets": 111, "economy": 8.59}'
WHERE player_id = 114; -- Harshal Patel

-- MI Players
UPDATE public.players SET 
  image_url = 'https://ipl-stats-sports-mechanic.s3.ap-south-1.amazonaws.com/ipl/playerimages/Surya%20Kumar%20Yadav.png',
  stats = '{"matches": 139, "runs": 3249, "sr": 143.3}'
WHERE player_id = 223; -- Suryakumar Yadav

UPDATE public.players SET 
  image_url = 'https://ipl-stats-sports-mechanic.s3.ap-south-1.amazonaws.com/ipl/playerimages/Rohit%20Sharma.png',
  stats = '{"matches": 243, "runs": 6211, "sr": 130.1}'
WHERE player_id = 222; -- Rohit Sharma

UPDATE public.players SET 
  image_url = 'https://bcciplayerimages.s3.ap-south-1.amazonaws.com/ipl/IPLHeadshot2023/1124.png',
  stats = '{"matches": 120, "wickets": 145, "economy": 7.39}'
WHERE player_id = 228; -- Jasprit Bumrah

UPDATE public.players SET 
  image_url = 'https://ipl-stats-sports-mechanic.s3.ap-south-1.amazonaws.com/ipl/playerimages/Trent%20Boult.png',
  stats = '{"matches": 88, "wickets": 105, "economy": 8.29}'
WHERE player_id = 227; -- Trent Boult

-- Hardik Pandya (Missing in original insert, adding now)
INSERT INTO public.players (player_id, name, team, role, base_price, avatar_initials, country, city, batting_style, bowling_style, image_url, stats)
VALUES (239, 'Hardik Pandya', 'MI', 'ALL-ROUNDER', 150, 'HP', 'India', 'Choryasi', 'Right Handed Bat', 'Right-arm medium-fast', 'https://ipl-stats-sports-mechanic.s3.ap-south-1.amazonaws.com/ipl/playerimages/Hardik%20Pandya.png', '{"matches": 123, "runs": 2309, "wickets": 53}');

-- GT Players
UPDATE public.players SET 
  image_url = 'https://ipl-stats-sports-mechanic.s3.ap-south-1.amazonaws.com/ipl/playerimages/Shubman%20Gill.png',
  stats = '{"matches": 91, "runs": 2790, "sr": 134.1}'
WHERE player_id = 123; -- Shubman Gill

UPDATE public.players SET 
  image_url = 'https://ipl-stats-sports-mechanic.s3.ap-south-1.amazonaws.com/ipl/playerimages/Jos%20Buttler.png',
  stats = '{"matches": 96, "runs": 3223, "sr": 148.3}'
WHERE player_id = 124; -- Jos Buttler

UPDATE public.players SET 
  image_url = 'https://ipl-stats-sports-mechanic.s3.ap-south-1.amazonaws.com/ipl/playerimages/Rashid%20Khan.png',
  stats = '{"matches": 109, "runs": 445, "wickets": 139}'
WHERE player_id = 131; -- Rashid Khan

UPDATE public.players SET 
  image_url = 'https://ipl-stats-sports-mechanic.s3.ap-south-1.amazonaws.com/ipl/playerimages/Kagiso%20Rabada.png',
  stats = '{"matches": 69, "wickets": 106, "economy": 8.42}'
WHERE player_id = 139; -- Kagiso Rabada

UPDATE public.players SET 
  image_url = 'https://ipl-stats-sports-mechanic.s3.ap-south-1.amazonaws.com/ipl/playerimages/Mohammed%20Siraj.png',
  stats = '{"matches": 79, "wickets": 78, "economy": 8.62}'
WHERE player_id = 138; -- Mohammed Siraj

-- KKR Players
UPDATE public.players SET 
  image_url = 'https://ipl-stats-sports-mechanic.s3.ap-south-1.amazonaws.com/ipl/playerimages/Rinku%20Singh.png',
  stats = '{"matches": 31, "runs": 725, "sr": 142.1}'
WHERE player_id = 199; -- Rinku Singh

UPDATE public.players SET 
  image_url = 'https://ipl-stats-sports-mechanic.s3.ap-south-1.amazonaws.com/ipl/playerimages/Sunil%20Narine.png',
  stats = '{"matches": 162, "runs": 1046, "wickets": 163}'
WHERE player_id = 207; -- Sunil Narine

UPDATE public.players SET 
  image_url = 'https://ipl-stats-sports-mechanic.s3.ap-south-1.amazonaws.com/ipl/playerimages/Ajinkya%20Rahane.png',
  stats = '{"matches": 172, "runs": 4400, "sr": 123.4}'
WHERE player_id = 206; -- Ajinkya Rahane

UPDATE public.players SET 
  image_url = 'https://ipl-stats-sports-mechanic.s3.ap-south-1.amazonaws.com/ipl/playerimages/Cameron%20Green.png',
  stats = '{"matches": 16, "runs": 452, "wickets": 6}'
WHERE player_id = 208; -- Cameron Green

UPDATE public.players SET 
  image_url = 'https://ipl-stats-sports-mechanic.s3.ap-south-1.amazonaws.com/ipl/playerimages/Varun%20Chakravarthy.png',
  stats = '{"matches": 56, "wickets": 62, "economy": 7.45}'
WHERE player_id = 213; -- Varun Chakravarthy

-- RR Players
UPDATE public.players SET 
  image_url = 'https://ipl-stats-sports-mechanic.s3.ap-south-1.amazonaws.com/ipl/playerimages/Jofra%20Archer.png',
  stats = '{"matches": 40, "wickets": 48, "economy": 7.43}'
WHERE player_id = 43; -- Jofra Archer

UPDATE public.players SET 
  image_url = 'https://ipl-stats-sports-mechanic.s3.ap-south-1.amazonaws.com/ipl/playerimages/Ravindra%20Jadeja.png',
  stats = '{"matches": 226, "runs": 2692, "wickets": 152}'
WHERE player_id = 35; -- Ravindra Jadeja

UPDATE public.players SET 
  image_url = 'https://ipl-stats-sports-mechanic.s3.ap-south-1.amazonaws.com/ipl/playerimages/Yashasvi%20Jaiswal.png',
  stats = '{"matches": 37, "runs": 1172, "sr": 148.7}'
WHERE player_id = 30; -- Yashasvi Jaiswal

UPDATE public.players SET 
  image_url = 'https://ipl-stats-sports-mechanic.s3.ap-south-1.amazonaws.com/ipl/playerimages/Ravi%20Bishnoi.png',
  stats = '{"matches": 52, "wickets": 56, "economy": 7.53}'
WHERE player_id = 45; -- Ravi Bishnoi

UPDATE public.players SET 
  image_url = 'https://ipl-stats-sports-mechanic.s3.ap-south-1.amazonaws.com/ipl/playerimages/Riyan%20Parag.png',
  stats = '{"matches": 54, "runs": 600, "wickets": 4}'
WHERE player_id = 36; -- Riyan Parag

-- DC Players
UPDATE public.players SET 
  image_url = 'https://ipl-stats-sports-mechanic.s3.ap-south-1.amazonaws.com/ipl/playerimages/KL%20Rahul.png',
  stats = '{"matches": 118, "runs": 4163, "sr": 134.4}'
WHERE player_id = 172; -- KL Rahul

UPDATE public.players SET 
  image_url = 'https://ipl-stats-sports-mechanic.s3.ap-south-1.amazonaws.com/ipl/playerimages/Axar%20Patel.png',
  stats = '{"matches": 136, "runs": 1418, "wickets": 112}'
WHERE player_id = 182; -- Axar Patel

UPDATE public.players SET 
  image_url = 'https://ipl-stats-sports-mechanic.s3.ap-south-1.amazonaws.com/ipl/playerimages/Kuldeep%20Yadav.png',
  stats = '{"matches": 73, "wickets": 71, "economy": 8.13}'
WHERE player_id = 186; -- Kuldeep Yadav

UPDATE public.players SET 
  image_url = 'https://ipl-stats-sports-mechanic.s3.ap-south-1.amazonaws.com/ipl/playerimages/Mitchell%20Starc.png',
  stats = '{"matches": 27, "wickets": 34, "economy": 7.17}'
WHERE player_id = 187; -- Mitchell Starc

UPDATE public.players SET 
  image_url = 'https://ipl-stats-sports-mechanic.s3.ap-south-1.amazonaws.com/ipl/playerimages/David%20Miller.png',
  stats = '{"matches": 121, "runs": 2714, "sr": 138.4}'
WHERE player_id = 176; -- David Miller

-- LSG Players
UPDATE public.players SET 
  image_url = 'https://ipl-stats-sports-mechanic.s3.ap-south-1.amazonaws.com/ipl/playerimages/Mitchell%20Marsh.png',
  stats = '{"matches": 38, "runs": 605, "wickets": 36}'
WHERE player_id = 157; -- Mitchell Marsh

UPDATE public.players SET 
  image_url = 'https://ipl-stats-sports-mechanic.s3.ap-south-1.amazonaws.com/ipl/playerimages/Mohammed%20Shami.png',
  stats = '{"matches": 110, "wickets": 127, "economy": 8.44}'
WHERE player_id = 161; -- Mohammed Shami

UPDATE public.players SET 
  image_url = 'https://ipl-stats-sports-mechanic.s3.ap-south-1.amazonaws.com/ipl/playerimages/Nicholas%20Pooran.png',
  stats = '{"matches": 62, "runs": 1270, "sr": 156.8}'
WHERE player_id = 148; -- Nicholas Pooran

UPDATE public.players SET 
  image_url = 'https://ipl-stats-sports-mechanic.s3.ap-south-1.amazonaws.com/ipl/playerimages/Rishabh%20Pant.png',
  stats = '{"matches": 98, "runs": 2838, "sr": 147.9}'
WHERE player_id = 147; -- Rishabh Pant

UPDATE public.players SET 
  image_url = 'https://ipl-stats-sports-mechanic.s3.ap-south-1.amazonaws.com/ipl/playerimages/Aiden%20Markram.png',
  stats = '{"matches": 33, "runs": 775, "sr": 131.4}'
WHERE player_id = 151; -- Aiden Markram
