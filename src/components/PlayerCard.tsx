import React from 'react';
import { User } from 'lucide-react';

interface PlayerCardProps {
  player: {
    name: string;
    role: string;
    basePrice: number;
    team: string;
    stats: {
      matches: number;
      runs?: number;
      wickets?: number;
      strikeRate?: number;
      economy?: number;
    };
  } | null;
}

const PlayerCard: React.FC<PlayerCardProps> = ({ player }) => {
  if (!player) return null;

  return (
    <div className="card glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Player Header / Image area */}
      <div style={{ 
        height: '250px', 
        background: 'linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        position: 'relative'
      }}>
        <User size={120} color="var(--accent-primary)" style={{ opacity: 0.8 }} />
        <div style={{ 
          position: 'absolute', top: '1rem', right: '1rem', 
          background: 'rgba(255,255,255,0.1)', padding: '0.25rem 0.75rem', 
          borderRadius: 'var(--radius-full)', fontSize: '0.875rem', fontWeight: 600
        }}>
          {player.role}
        </div>
      </div>

      {/* Player Info */}
      <div style={{ padding: '1.5rem' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>{player.name}</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontWeight: 500 }}>
          {player.team} • Base Price: <span style={{ color: 'white' }}>{player.basePrice} Cr</span>
        </p>

        {/* Stats Grid */}
        <div style={{ 
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem',
          background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: 'var(--radius-sm)'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Matches</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{player.stats.matches}</div>
          </div>
          {(player.role === 'Batsman' || player.role === 'All-Rounder') && (
            <>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Runs</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{player.stats.runs}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>SR</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{player.stats.strikeRate}</div>
              </div>
            </>
          )}
          {(player.role === 'Bowler' || player.role === 'All-Rounder') && (
            <>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Wickets</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{player.stats.wickets}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Economy</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{player.stats.economy}</div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerCard;
