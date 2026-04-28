import React from 'react';
import { X, Zap, Circle, Shield } from 'lucide-react';

interface PointsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Data ──────────────────────────────────────────────────────────────────────
const BATTING_MAIN = [
  { action: 'Run scored',     pts: 1  },
  { action: 'Boundary (4s)', pts: 1  },
  { action: 'Six',            pts: 2  },
  { action: 'Duck',           pts: -2 },
  { action: '30 runs bonus',  pts: 4  },
  { action: '50 runs bonus',  pts: 4  },
  { action: '100 runs bonus', pts: 8  },
];
const BATTING_SR = [
  { action: '< 50',          pts: -6 },
  { action: '50 – 59.99',    pts: -4 },
  { action: '60 – 70',       pts: -2 },
  { action: '70 – 130',      pts: 0  },
  { action: '130 – 150',     pts: 2  },
  { action: '150.01 – 170',  pts: 4  },
  { action: '> 170',         pts: 6  },
];

const BOWLING_MAIN = [
  { action: 'Dot ball',        pts: 1  },
  { action: 'Maiden over',     pts: 12 },
  { action: 'Wicket',          pts: 20 },
  { action: 'Wide',            pts: -1 },
  { action: 'No ball',         pts: -2 },
  { action: '3 wickets bonus', pts: 4  },
  { action: '4 wickets bonus', pts: 8  },
  { action: '5+ wickets bonus',pts: 16 },
];
const BOWLING_ER = [
  { action: '< 5',        pts: 6  },
  { action: '5 – 5.99',   pts: 4  },
  { action: '6 – 7',      pts: 2  },
  { action: '7 – 10',     pts: 0  },
  { action: '10 – 11',    pts: -2 },
  { action: '11.01 – 12', pts: -4 },
  { action: '> 12',       pts: -6 },
];

const FIELDING_MAIN = [
  { action: 'Catch',            pts: 8 },
  { action: '3+ catches bonus', pts: 4 },
  { action: 'Run out',          pts: 6 },
  { action: 'Stumping',         pts: 6 },
];

// ─── Sub-components ────────────────────────────────────────────────────────────
const ptColor = (pts: number) =>
  pts > 0 ? '#4ade80' : pts < 0 ? '#f87171' : 'rgba(255,255,255,0.25)';

const ptLabel = (pts: number) =>
  pts === 0 ? '0' : pts > 0 ? `+${pts}` : `${pts}`;

const Row = ({ action, pts, alt }: { action: string; pts: number; alt: boolean }) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '0.65rem 1rem',
    background: alt ? 'rgba(255,255,255,0.025)' : 'transparent',
    borderRadius: '6px',
  }}>
    <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.82)' }}>{action}</span>
    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: ptColor(pts), minWidth: '36px', textAlign: 'right' }}>
      {ptLabel(pts)}
    </span>
  </div>
);

const SubHeader = ({ label }: { label: string }) => (
  <div style={{
    padding: '0.75rem 1rem 0.4rem',
    fontSize: '0.68rem', fontWeight: 700,
    letterSpacing: '0.12em', color: 'rgba(255,255,255,0.3)',
    textTransform: 'uppercase',
  }}>
    {label}
  </div>
);

const SectionHeader = ({
  icon, label,
}: { icon: React.ReactNode; label: string }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: '0.6rem',
    padding: '0.9rem 1rem 0.5rem',
    borderTop: '1px solid rgba(255,255,255,0.07)',
    marginTop: '0.25rem',
  }}>
    {icon}
    <span style={{ fontWeight: 800, fontSize: '0.95rem', letterSpacing: '0.08em', color: 'white' }}>
      {label}
    </span>
  </div>
);

// ─── Main Modal ────────────────────────────────────────────────────────────────
const PointsModal: React.FC<PointsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 600,
        background: 'rgba(0,0,0,0.88)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
        overflowY: 'auto',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#111318',
          borderRadius: '16px',
          width: '100%', maxWidth: '520px',
          maxHeight: '90vh',
          display: 'flex', flexDirection: 'column',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
          overflow: 'hidden',
          fontFamily: 'Inter, sans-serif',
        }}
        onClick={e => e.stopPropagation()}
      >

        {/* ── Header ── */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '20px', height: '3px', background: 'var(--accent-primary)', borderRadius: '2px' }} />
            <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'white' }}>
              How Points Are Calculated
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.07)', border: 'none', color: 'rgba(255,255,255,0.7)',
              padding: '0.4rem', borderRadius: '8px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: '0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.13)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '0.5rem 0.5rem 0' }}>

          {/* Info banner */}
          <div style={{
            margin: '0.75rem 0.75rem 0',
            padding: '0.85rem 1rem',
            borderRadius: '8px',
            border: '1px solid rgba(235,208,92,0.25)',
            background: 'rgba(235,208,92,0.05)',
            fontSize: '0.82rem',
            color: 'rgba(255,255,255,0.72)',
            lineHeight: 1.55,
          }}>
            <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>How it works: </span>
            Points are based on real player performances in scheduled matches.
            Your leaderboard updates automatically as results are processed.
          </div>

          {/* ────── BATTING ────── */}
          <SectionHeader
            icon={<Zap size={16} color="var(--accent-primary)" fill="var(--accent-primary)" />}
            label="BATTING"
          />
          <div style={{ padding: '0 0.5rem' }}>
            {BATTING_MAIN.map((r, i) => <Row key={r.action} action={r.action} pts={r.pts} alt={i % 2 === 1} />)}
            <SubHeader label="Strike Rate" />
            {BATTING_SR.map((r, i) => <Row key={r.action} action={r.action} pts={r.pts} alt={i % 2 === 1} />)}
          </div>

          {/* ────── BOWLING ────── */}
          <SectionHeader
            icon={<Circle size={16} color="var(--accent-primary)" fill="none" strokeWidth={2.5} />}
            label="BOWLING"
          />
          <div style={{ padding: '0 0.5rem' }}>
            {BOWLING_MAIN.map((r, i) => <Row key={r.action} action={r.action} pts={r.pts} alt={i % 2 === 1} />)}
            <SubHeader label="Economy Rate" />
            {BOWLING_ER.map((r, i) => <Row key={r.action} action={r.action} pts={r.pts} alt={i % 2 === 1} />)}
          </div>

          {/* ────── FIELDING ────── */}
          <SectionHeader
            icon={<Shield size={16} color="var(--accent-primary)" fill="none" strokeWidth={2.5} />}
            label="FIELDING"
          />
          <div style={{ padding: '0 0.5rem' }}>
            {FIELDING_MAIN.map((r, i) => <Row key={r.action} action={r.action} pts={r.pts} alt={i % 2 === 1} />)}
          </div>

          {/* Note banner */}
          <div style={{
            margin: '1.25rem 0.75rem',
            padding: '0.85rem 1rem',
            borderRadius: '8px',
            border: '1px solid rgba(235,208,92,0.2)',
            background: 'rgba(235,208,92,0.04)',
            fontSize: '0.82rem',
            color: 'rgba(255,255,255,0.65)',
            lineHeight: 1.55,
          }}>
            <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>Note: </span>
            Only the top 11 fantasy scorers from your squad count towards your team total.
            Remaining players are reserves.
          </div>
        </div>

        {/* ── Footer close button ── */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          flexShrink: 0,
        }}>
          <button
            onClick={onClose}
            style={{
              width: '100%', padding: '0.85rem',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.7)',
              borderRadius: '10px', cursor: 'pointer',
              fontSize: '0.95rem', fontWeight: 600,
              transition: '0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.07)';
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PointsModal;
