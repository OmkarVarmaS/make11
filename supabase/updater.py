import re

with open('c:/Users/admin/Desktop/iplauction/supabase/supabase_players.sql', 'r', encoding='utf-8') as f:
    data = f.read()

city_map = {
    'PBKS': 'Punjab',
    'RCB': 'Bengaluru',
    'SRH': 'Hyderabad',
    'MI': 'Mumbai',
    'GT': 'Gujarat',
    'RR': 'Rajasthan',
    'LSG': 'Lucknow',
    'CSK': 'Chennai',
    'KKR': 'Kolkata',
    'DC': 'Delhi'
}

player_knowledge = {
    'Marcus Stoinis': ('Australia', 'Right Handed Bat', 'Right-arm medium'),
    'Marco Jansen': ('South Africa', 'Right Handed Bat', 'Left-arm fast'),
    'Azmatullah Omarzai': ('Afghanistan', 'Right Handed Bat', 'Right-arm fast-medium'),
    'Lockie Ferguson': ('New Zealand', 'Right Handed Bat', 'Right-arm fast'),
    'Xavier Bartlett': ('Australia', 'Right Handed Bat', 'Right-arm fast-medium'),
    'Ben Dwarshuis': ('Australia', 'Left Handed Bat', 'Left-arm fast-medium'),
    'Donovan Ferreira': ('South Africa', 'Right Handed Bat', 'Right-arm medium'),
    'Shimron Hetmyer': ('West Indies', 'Left Handed Bat', 'None'),
    'Dasun Shanaka': ('Sri Lanka', 'Right Handed Bat', 'Right-arm medium'),
    'Nandre Burger': ('South Africa', 'Left Handed Bat', 'Left-arm fast-medium'),
    'Adam Milne': ('New Zealand', 'Right Handed Bat', 'Right-arm fast'),
    'Kwena Maphaka': ('South Africa', 'Left Handed Bat', 'Left-arm fast'),
    'Phil Salt': ('England', 'Right Handed Bat', 'None'),
    'Tim David': ('Australia', 'Right Handed Bat', 'Right-arm offbreak'),
    'Romario Shepherd': ('West Indies', 'Right Handed Bat', 'Right-arm fast-medium'),
    'Josh Hazlewood': ('Australia', 'Left Handed Bat', 'Right-arm fast-medium'),
    'Nuwan Thushara': ('Sri Lanka', 'Right Handed Bat', 'Right-arm medium-fast'),
    'Dewald Brevis': ('South Africa', 'Right Handed Bat', 'Legbreak'),
    'Jamie Overton': ('England', 'Right Handed Bat', 'Right-arm fast'),
    'Matthew Short': ('Australia', 'Right Handed Bat', 'Right-arm offbreak'),
    'Noor Ahmad': ('Afghanistan', 'Right Handed Bat', 'Left-arm wrist-spin'),
    'Akeal Hosein': ('West Indies', 'Left Handed Bat', 'Slow left-arm orthodox'),
    'Matt Henry': ('New Zealand', 'Right Handed Bat', 'Right-arm fast-medium'),
    'Spencer Johnson': ('Australia', 'Left Handed Bat', 'Left-arm fast-medium'),
    'Heinrich Klaasen': ('South Africa', 'Right Handed Bat', 'Right-arm offbreak'),
    'Travis Head': ('Australia', 'Left Handed Bat', 'Right-arm offbreak'),
    'Liam Livingstone': ('England', 'Right Handed Bat', 'Legbreak'),
    'Kamindu Mendis': ('Sri Lanka', 'Left Handed Bat', 'Slow left-arm orthodox'),
    'Pat Cummins': ('Australia', 'Right Handed Bat', 'Right-arm fast'),
    'Jos Buttler': ('England', 'Right Handed Bat', 'None'),
    'Tom Banton': ('England', 'Right Handed Bat', 'None'),
    'Glenn Phillips': ('New Zealand', 'Right Handed Bat', 'Right-arm offbreak'),
    'Rashid Khan': ('Afghanistan', 'Right Handed Bat', 'Legbreak googly'),
    'Jason Holder': ('West Indies', 'Right Handed Bat', 'Right-arm medium-fast'),
    'Kagiso Rabada': ('South Africa', 'Left Handed Bat', 'Right-arm fast'),
    'Luke Wood': ('England', 'Left Handed Bat', 'Left-arm fast-medium'),
    'Nicholas Pooran': ('West Indies', 'Left Handed Bat', 'Right-arm offbreak'),
    'Josh Inglis': ('Australia', 'Right Handed Bat', 'None'),
    'Aiden Markram': ('South Africa', 'Right Handed Bat', 'Right-arm offbreak'),
    'Matthew Breetzke': ('South Africa', 'Right Handed Bat', 'None'),
    'George Linde': ('South Africa', 'Left Handed Bat', 'Slow left-arm orthodox'),
    'Anrich Nortje': ('South Africa', 'Right Handed Bat', 'Right-arm fast'),
    'Tristan Stubbs': ('South Africa', 'Right Handed Bat', 'Right-arm offbreak'),
    'Ben Duckett': ('England', 'Left Handed Bat', 'Right-arm offbreak'),
    'David Miller': ('South Africa', 'Left Handed Bat', 'Right-arm offbreak'),
    'Pathum Nissanka': ('Sri Lanka', 'Right Handed Bat', 'None'),
    'Mitchell Starc': ('Australia', 'Left Handed Bat', 'Left-arm fast'),
    'Dushmantha Chameera': ('Sri Lanka', 'Right Handed Bat', 'Right-arm fast'),
    'Lungi Ngidi': ('South Africa', 'Right Handed Bat', 'Right-arm fast-medium'),
    'Kyle Jamieson': ('New Zealand', 'Right Handed Bat', 'Right-arm fast-medium'),
    'Tim Seifert': ('New Zealand', 'Right Handed Bat', 'None'),
    'Rovman Powell': ('West Indies', 'Right Handed Bat', 'Right-arm medium-fast'),
    'Finn Allen': ('New Zealand', 'Right Handed Bat', 'None'),
    'Sunil Narine': ('West Indies', 'Left Handed Bat', 'Right-arm offbreak'),
    'Cameron Green': ('Australia', 'Right Handed Bat', 'Right-arm fast-medium'),
    'Rachin Ravindra': ('New Zealand', 'Left Handed Bat', 'Slow left-arm orthodox'),
    'Matheesha Pathirana': ('Sri Lanka', 'Right Handed Bat', 'Right-arm fast'),
    'Blessing Muzarabani': ('Zimbabwe', 'Right Handed Bat', 'Right-arm fast-medium'),
    'Ryan Rickelton': ('South Africa', 'Left Handed Bat', 'None'),
    'Trent Boult': ('New Zealand', 'Right Handed Bat', 'Left-arm fast-medium'),
    'Allah Ghazanfar': ('Afghanistan', 'Right Handed Bat', 'Right-arm offbreak'),
    'Sherfane Rutherford': ('West Indies', 'Left Handed Bat', 'Right-arm fast-medium'),
    'Quinton De Kock': ('South Africa', 'Left Handed Bat', 'None'),
    # Add a few major Indians
    'Shreyas Iyer': ('India', 'Right Handed Bat', 'Right-arm legbreak'),
    'Virat Kohli': ('India', 'Right Handed Bat', 'Right-arm medium'),
    'Rohit Sharma': ('India', 'Right Handed Bat', 'Right-arm offbreak'),
    'Jasprit Bumrah': ('India', 'Right Handed Bat', 'Right-arm fast'),
    'Ravindra Jadeja': ('India', 'Left Handed Bat', 'Slow left-arm orthodox'),
    'MS Dhoni': ('India', 'Right Handed Bat', 'Right-arm medium'),
    'Hardik Pandya': ('India', 'Right Handed Bat', 'Right-arm medium-fast'),
    'Rishabh Pant': ('India', 'Left Handed Bat', 'None'),
    'Shubman Gill': ('India', 'Right Handed Bat', 'Right-arm offbreak'),
    'Suryakumar Yadav': ('India', 'Right Handed Bat', 'Right-arm medium'),
    'Sanju Samson': ('India', 'Right Handed Bat', 'None'),
    'KL Rahul': ('India', 'Right Handed Bat', 'None'),
    'Ishan Kishan': ('India', 'Left Handed Bat', 'None'),
    'Yashasvi Jaiswal': ('India', 'Left Handed Bat', 'Legbreak'),
    'Axar Patel': ('India', 'Left Handed Bat', 'Slow left-arm orthodox'),
    'Rinku Singh': ('India', 'Left Handed Bat', 'Right-arm offbreak'),
    'Arshdeep Singh': ('India', 'Left Handed Bat', 'Left-arm medium-fast'),
    'Mohammed Siraj': ('India', 'Right Handed Bat', 'Right-arm fast-medium'),
    'Mohammed Shami': ('India', 'Right Handed Bat', 'Right-arm fast'),
    'Kuldeep Yadav': ('India', 'Left Handed Bat', 'Left-arm wrist-spin'),
    'Yuzvendra Chahal': ('India', 'Right Handed Bat', 'Legbreak googly'),
    'Ravi Bishnoi': ('India', 'Right Handed Bat', 'Legbreak googly'),
    'Washington Sundar': ('India', 'Left Handed Bat', 'Right-arm offbreak'),
    'Avesh Khan': ('India', 'Right Handed Bat', 'Right-arm fast-medium'),
    'Ruturaj Gaikwad': ('India', 'Right Handed Bat', 'Right-arm offbreak'),
    'Prithvi Shaw': ('India', 'Right Handed Bat', 'Right-arm offbreak'),
    'Krunal Pandya': ('India', 'Left Handed Bat', 'Slow left-arm orthodox'),
    'Rahul Chahar': ('India', 'Right Handed Bat', 'Legbreak googly'),
    'Varun Chakaravarthy': ('India', 'Right Handed Bat', 'Legbreak googly'),
    'T Natarajan': ('India', 'Left Handed Bat', 'Left-arm medium-fast'),
    'Harshal Patel': ('India', 'Right Handed Bat', 'Right-arm medium'),
    'Deepak Chahar': ('India', 'Right Handed Bat', 'Right-arm medium'),
    'Shivam Dube': ('India', 'Left Handed Bat', 'Right-arm medium')
}

def replacer(match):
    id_part = match.group(1)
    name = match.group(2)
    team = match.group(3)
    role = match.group(4)
    price = match.group(5)
    initials = match.group(6)
    
    city = city_map.get(team, 'Unknown')
    
    country = 'India'
    batting = 'Right Handed Bat'
    bowling = 'Right-arm medium'
    
    if name in player_knowledge:
        country, batting, bowling = player_knowledge[name]
        
    return f"({id_part}, '{name}', '{team}', '{role}', {price}, '{initials}', '{country}', '{city}', '{batting}', '{bowling}'"

pattern = re.compile(r"\((\d+),\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*(\d+),\s*'([^']+)',\s*'[^']+',\s*'[^']+',\s*'[^']+',\s*'[^']+'")

new_data = pattern.sub(replacer, data)

with open('c:/Users/admin/Desktop/iplauction/supabase/supabase_players.sql', 'w', encoding='utf-8') as f:
    f.write(new_data)
print('Done!')
