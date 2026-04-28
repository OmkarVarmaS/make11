import React, { useState, useMemo } from 'react';
import { PLAYERS, TEAM_COLORS } from '../services/db';

interface ChoosePlayersModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIds: string[];
  onChangeSelected: (newSelected: string[]) => void;
}

const ROLES = ['ALL ROLES', 'BATSMAN', 'BOWLER', 'ALL-ROUNDER', 'WICKETKEEPER'];
const ROLE_LABELS: Record<string, string> = {
  'ALL ROLES': 'ALL ROLES',
  'BATTER': 'BATSMAN',
  'BATSMAN': 'BATSMAN',
  'BOWLER': 'BOWLER',
  'ALL_ROUNDER': 'ALL-ROUNDER',
  'ALL-ROUNDER': 'ALL-ROUNDER',
  'WICKETKEEPER': 'WICKETKEEPER'
};

const TEAMS = ['All Teams', 'Chennai Super Kings', 'Mumbai Indians', 'Royal Challengers Bengaluru', 'Kolkata Knight Riders', 'Delhi Capitals', 'Punjab Kings', 'Gujarat Titans', 'Sunrisers Hyderabad', 'Lucknow Super Giants', 'Rajasthan Royals'];
const TEAM_LABELS: Record<string, { label: string, color: string }> = {
  'All Teams': { label: 'All Teams', color: 'transparent' },
  'Chennai Super Kings': { label: 'Chennai', color: TEAM_COLORS['Chennai Super Kings'] || '#FFFF00' },
  'CSK': { label: 'Chennai', color: TEAM_COLORS['CSK'] || '#FFFF00' },
  'Mumbai Indians': { label: 'Mumbai', color: TEAM_COLORS['Mumbai Indians'] || '#ADD8E6' },
  'MI': { label: 'Mumbai', color: TEAM_COLORS['MI'] || '#ADD8E6' },
  'Royal Challengers Bengaluru': { label: 'Bengaluru', color: TEAM_COLORS['Royal Challengers Bengaluru'] || '#FF0000' },
  'RCB': { label: 'Bengaluru', color: TEAM_COLORS['RCB'] || '#FF0000' },
  'Kolkata Knight Riders': { label: 'Kolkata', color: TEAM_COLORS['Kolkata Knight Riders'] || '#800080' },
  'KKR': { label: 'Kolkata', color: TEAM_COLORS['KKR'] || '#800080' },
  'Delhi Capitals': { label: 'Delhi', color: TEAM_COLORS['Delhi Capitals'] || '#00008B' },
  'DC': { label: 'Delhi', color: TEAM_COLORS['DC'] || '#00008B' },
  'Punjab Kings': { label: 'Punjab', color: TEAM_COLORS['Punjab Kings'] || '#FF6666' },
  'PBKS': { label: 'Punjab', color: TEAM_COLORS['PBKS'] || '#FF6666' },
  'Gujarat Titans': { label: 'Gujarat', color: TEAM_COLORS['Gujarat Titans'] || '#000080' },
  'GT': { label: 'Gujarat', color: TEAM_COLORS['GT'] || '#000080' },
  'Sunrisers Hyderabad': { label: 'Hyderabad', color: TEAM_COLORS['Sunrisers Hyderabad'] || '#FFA500' },
  'SRH': { label: 'Hyderabad', color: TEAM_COLORS['SRH'] || '#FFA500' },
  'Lucknow Super Giants': { label: 'Lucknow', color: TEAM_COLORS['Lucknow Super Giants'] || '#FF1493' },
  'LSG': { label: 'Lucknow', color: TEAM_COLORS['LSG'] || '#FF1493' },
  'Rajasthan Royals': { label: 'Rajasthan', color: TEAM_COLORS['Rajasthan Royals'] || '#FFB6C1' },
  'RR': { label: 'Rajasthan', color: TEAM_COLORS['RR'] || '#FFB6C1' },
};

const getInitials = (name: string) => {
  if (!name) return '??';
  return name.split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase();
};

const fmt = (l: number) => {
  if (l >= 100) return `₹${(l / 100).toFixed(l % 100 === 0 ? 0 : 2)}Cr`;
  return `₹${l}L`;
};

const roleColor = (role: string) => {
  const r = role?.toUpperCase() || '';
  if (r === 'BATTER' || r === 'BATSMAN') return '#facc15';
  if (r === 'BOWLER') return '#60a5fa';
  if (r === 'ALL_ROUNDER' || r === 'ALL-ROUNDER') return '#4ade80';
  if (r === 'WICKETKEEPER') return '#c084fc';
  return 'white';
};

const ChoosePlayersModal: React.FC<ChoosePlayersModalProps> = ({ isOpen, onClose, selectedIds, onChangeSelected }) => {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL ROLES');
  const [teamFilter, setTeamFilter] = useState('All Teams');

  const filteredPlayers = useMemo(() => {
    return PLAYERS.filter((p: any) => {
      const name = p.name?.toLowerCase() || '';
      if (search && !name.includes(search.toLowerCase())) return false;
      if (roleFilter !== 'ALL ROLES') {
        const playerRoleLabel = ROLE_LABELS[p.role] || p.role;
        if (playerRoleLabel !== roleFilter) return false;
      }
      if (teamFilter !== 'All Teams') {
        const playerTeamLabel = TEAM_LABELS[p.team]?.label;
        const filterTeamLabel = TEAM_LABELS[teamFilter]?.label;
        if (playerTeamLabel !== filterTeamLabel) return false;
      }
      return true;
    });
  }, [search, roleFilter, teamFilter]);

  const handleSelectAll = () => {
    const toAdd = filteredPlayers.map((p: any) => p.id);
    const newSet = new Set([...selectedIds, ...toAdd]);
    onChangeSelected(Array.from(newSet));
  };

  const handleDeselectAll = () => {
    const toRemove = new Set(filteredPlayers.map((p: any) => p.id));
    const newSet = selectedIds.filter(id => !toRemove.has(id));
    onChangeSelected(newSet);
  };

  const togglePlayer = (id: string) => {
    if (selectedIds.includes(id)) {
      onChangeSelected(selectedIds.filter(x => x !== id));
    } else {
      onChangeSelected([...selectedIds, id]);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'var(--bg-primary)',
      color: 'white',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'Inter, sans-serif',
      overflow: 'hidden'
    }}>
      {/* Header Area */}
      <div style={{ padding: '2rem 2rem 0', maxWidth: '800px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column' }}>
        <div 
          onClick={onClose}
          style={{ color: 'var(--accent-primary)', fontSize: '0.9rem', cursor: 'pointer', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          ← Back to Lobby
        </div>
        <h1 style={{ color: 'var(--accent-primary)', fontSize: '2.5rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>Choose Players</h1>
        <p style={{ color: 'var(--text-secondary)', margin: '0 0 1.5rem 0', fontSize: '1.1rem' }}>Select the players to include in the auction</p>
        
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem' }}>
          <span>{selectedIds.length} of {PLAYERS.length} selected</span>
          <span>{filteredPlayers.length} shown</span>
        </div>

        {/* Search */}
        <input 
          type="text" 
          placeholder="Search player name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '8px', color: 'white', fontSize: '1rem', marginBottom: '1.5rem' }}
        />

        {/* Role Filters */}
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem', marginBottom: '0.5rem', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
          {ROLES.map(r => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              style={{
                background: roleFilter === r ? 'var(--accent-primary)' : 'transparent',
                color: roleFilter === r ? 'black' : 'var(--text-secondary)',
                border: roleFilter === r ? '1px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.1)',
                padding: '0.6rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap'
              }}
            >
              {ROLE_LABELS[r]}
            </button>
          ))}
        </div>

        {/* Team Filters */}
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem', marginBottom: '1.5rem', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
          {TEAMS.map(t => (
            <button
              key={t}
              onClick={() => setTeamFilter(t)}
              style={{
                background: teamFilter === t ? 'var(--accent-primary)' : 'transparent',
                color: teamFilter === t ? 'black' : 'var(--text-secondary)',
                border: teamFilter === t ? '1px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.1)',
                padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                display: 'flex', alignItems: 'center', gap: '0.5rem'
              }}
            >
              {t !== 'All Teams' && (
                <div style={{ 
                  width: '8px', height: '8px', borderRadius: '50%', 
                  background: TEAM_LABELS[t]?.color || 'var(--accent-primary)' 
                }} />
              )}
              {TEAM_LABELS[t]?.label || t}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          <button 
            onClick={handleSelectAll}
            style={{ background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--accent-primary)', padding: '0.5rem 1.5rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
          >Select All</button>
          <button 
            onClick={handleDeselectAll}
            style={{ background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '0.5rem 1.5rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
          >Deselect All</button>
        </div>
      </div>

      {/* List Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 2rem 6rem', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
        <div style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', overflow: 'hidden' }}>
          {filteredPlayers.map((p: any, i: number) => {
            const isSelected = selectedIds.includes(p.id);
            const teamInfo = TEAM_LABELS[p.team];
            return (
              <div 
                key={p.id}
                onClick={() => togglePlayer(p.id)}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', 
                  borderBottom: i < filteredPlayers.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  background: isSelected ? 'rgba(255,255,255,0.02)' : 'transparent',
                  cursor: 'pointer'
                }}
              >
                <div style={{ width: '20px', height: '20px', borderRadius: '4px', border: isSelected ? 'none' : '1px solid rgba(255,255,255,0.2)', background: isSelected ? 'var(--accent-primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {isSelected && <span style={{ color: 'black', fontSize: '0.8rem', fontWeight: 900 }}>✓</span>}
                </div>
                
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  {getInitials(p.name)}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'white', marginBottom: '0.35rem' }}>
                    {p.name || 'Unknown Player'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem', fontWeight: 600, flexWrap: 'wrap' }}>
                    {p.role && (
                      <span style={{ color: roleColor(p.role), background: `${roleColor(p.role)}25`, padding: '0.2rem 0.5rem', borderRadius: '4px', letterSpacing: '0.05em' }}>
                        {ROLE_LABELS[p.role] || p.role}
                      </span>
                    )}
                    {(teamInfo || p.city) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: teamInfo?.color || 'var(--accent-primary)' }} />
                        {p.city || teamInfo?.label || p.team}
                      </div>
                    )}
                    <span style={{ color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: '0.85rem' }}>{fmt(p.basePrice)}</span>
                    
                    {(p.isMarquee || String(p.player_id).startsWith('M')) && (
                      <span style={{ border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.65rem', letterSpacing: '0.05em' }}>
                        MARQUEE
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {filteredPlayers.length === 0 && (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No players match your filters.</div>
          )}
        </div>
      </div>

      {/* Footer Sticky Button */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '1.5rem 2rem', background: 'linear-gradient(to top, var(--bg-primary) 70%, transparent)', display: 'flex', justifyContent: 'center', zIndex: 10 }}>
        <button 
          onClick={() => {
            if (selectedIds.length === 0) {
              onChangeSelected(PLAYERS.map((p: any) => p.id));
            }
            onClose();
          }}
          style={{ maxWidth: '800px', width: '100%', background: 'var(--accent-primary)', color: 'black', border: 'none', padding: '1.25rem', borderRadius: '8px', fontSize: '1.25rem', fontWeight: 800, cursor: 'pointer', boxShadow: '0 0 30px rgba(235, 208, 92, 0.2)' }}
        >
          Done {selectedIds.length > 0 ? `(${selectedIds.length} selected)` : '(Auto-select All)'} — Return to Lobby
        </button>
      </div>
    </div>
  );
};

export default ChoosePlayersModal;
