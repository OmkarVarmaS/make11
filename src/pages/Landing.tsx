import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

/* ─── Minimal icons (inline SVG so no extra deps) ─────────────────────── */
const ShieldIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);
const BarChartIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/>
  </svg>
);
const UsersIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const InstagramIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
    <circle cx="12" cy="12" r="4"/>
    <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/>
  </svg>
);
const LinkedinIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
    <rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>
  </svg>
);
const MailIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
);

const FEATURES = [
  {
    Icon: ShieldIcon,
    title: 'No Real Money',
    desc: 'Every team gets a virtual purse with fantasy currency. No deposits, no withdrawals, no transactions — ever.',
  },
  {
    Icon: BarChartIcon,
    title: 'Live Performance Scoring',
    desc: 'After your auction, we track real match performances and update your leaderboard every game day throughout the season.',
  },
  {
    Icon: UsersIcon,
    title: 'Compete With Friends',
    desc: 'Build your dream XI, then see who picked the best squad as real matches unfold. Bragging rights are the only stakes.',
  },
];

const Landing = () => {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /* ── Particles ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let W = (canvas.width = window.innerWidth);
    let H = (canvas.height = window.innerHeight);
    const onResize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; };
    window.addEventListener('resize', onResize);
    const PALETTE = ['rgba(6,182,212,', 'rgba(139,92,246,', 'rgba(16,185,129,'];
    const DOTS = Array.from({ length: 65 }, () => {
      const col = PALETTE[Math.floor(Math.random() * PALETTE.length)];
      return { x: Math.random() * W, y: Math.random() * H, r: 0.5 + Math.random() * 1.3,
               vx: (Math.random() - 0.5) * 0.14, vy: (Math.random() - 0.5) * 0.14,
               a: 0.12 + Math.random() * 0.4, col };
    });
    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      DOTS.forEach(d => {
        d.x = (d.x + d.vx + W) % W;
        d.y = (d.y + d.vy + H) % H;
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `${d.col}${d.a})`; ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); };
  }, []);

  const accent = '#06b6d4';
  const violet = '#8b5cf6';
  const textSecondary = 'rgba(148,163,184,0.7)';
  const border = 'rgba(148,163,184,0.12)';

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: '#020617', color: '#f8fafc', overflowX: 'hidden' }}>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 1 — HERO
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="landing-hero" style={{
        position: 'relative', minHeight: '100vh',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', padding: '2rem',
        backgroundImage: `
          radial-gradient(circle at 15% 50%, rgba(6,182,212,0.09), transparent 42%),
          radial-gradient(circle at 85% 30%, rgba(139,92,246,0.09), transparent 42%),
          radial-gradient(circle at 50% 80%, rgba(6,182,212,0.05), transparent 40%)
        `,
      }}>
        <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, opacity: 0.55, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
                      background: `radial-gradient(ellipse 60% 48% at 50% 44%, rgba(6,182,212,0.07) 0%, transparent 70%)` }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '700px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* Decorative rule */}
          <div style={{ width: '56px', height: '2px', borderRadius: '2px', marginBottom: '1.8rem',
                        background: `linear-gradient(90deg, transparent, rgba(6,182,212,0.8), transparent)` }} />
          {/* Eyebrow */}
          <p style={{ fontSize: '0.7rem', letterSpacing: '0.3em', color: 'rgba(148,163,184,0.5)',
                      textTransform: 'uppercase', fontWeight: 600, margin: '0 0 1.8rem 0' }}>
            Fantasy Cricket Platform
          </p>
          {/* Headline */}
          <h1 style={{ fontSize: 'clamp(2.5rem, 6.5vw, 4.2rem)', fontWeight: 800, lineHeight: 1.12,
                       margin: '0 0 1.8rem 0', color: '#f8fafc', letterSpacing: '-0.03em' }}>
            Run your own{' '}
            <span style={{ background: `linear-gradient(135deg, ${accent} 0%, ${violet} 100%)`,
                           WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              cricket auctions
            </span>{' '}
            with friends,{' '}
            <span style={{ background: `linear-gradient(135deg, ${accent} 0%, ${violet} 100%)`,
                           WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              for free.
            </span>
          </h1>
          {/* Sub */}
          <p style={{ fontSize: '1.05rem', color: textSecondary, margin: '0 0 3rem 0', lineHeight: 1.7 }}>
            Create a room. Invite your friends. Compete all season.
          </p>
          {/* CTA */}
          <button
            id="enter-auction-btn"
            onClick={() => navigate('/login')}
            style={{ background: accent, color: '#000', border: 'none', borderRadius: '8px',
                     padding: '1.1rem 3.6rem', fontSize: '1.1rem', fontWeight: 700, cursor: 'pointer',
                     letterSpacing: '0.02em', transition: 'transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease',
                     marginBottom: '1.4rem', fontFamily: 'inherit' }}
            onMouseEnter={e => { const b = e.currentTarget; b.style.transform = 'translateY(-2px) scale(1.03)'; b.style.boxShadow = `0 8px 36px rgba(6,182,212,0.42)`; b.style.background = '#0891b2'; }}
            onMouseLeave={e => { const b = e.currentTarget; b.style.transform = 'none'; b.style.boxShadow = 'none'; b.style.background = accent; }}
          >
            Enter the Auction
          </button>
          <p style={{ fontSize: '0.8rem', color: 'rgba(148,163,184,0.35)', margin: 0, letterSpacing: '0.04em' }}>
            Currently in beta
          </p>
        </div>

        {/* Scroll hint */}
        <div style={{ position: 'absolute', bottom: '2rem', left: '50%', transform: 'translateX(-50%)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem',
                      color: 'rgba(148,163,184,0.3)', fontSize: '0.72rem', letterSpacing: '0.12em',
                      textTransform: 'uppercase', zIndex: 1, animation: 'scrollHint 2.2s ease-in-out infinite' }}>
          <span>Scroll</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 2 — FEATURES
      ══════════════════════════════════════════════════════════════════════ */}
      <section style={{
        padding: '6rem 2rem 7rem',
        background: '#020617',
        backgroundImage: `radial-gradient(circle at 80% 20%, rgba(139,92,246,0.07), transparent 50%),
                          radial-gradient(circle at 20% 80%, rgba(6,182,212,0.07), transparent 50%)`,
        textAlign: 'center',
      }}>
        {/* Eyebrow */}
        <p style={{ fontSize: '0.68rem', letterSpacing: '0.3em', color: accent,
                    textTransform: 'uppercase', fontWeight: 700, margin: '0 0 1.2rem 0' }}>
          100% Free · Zero Gambling
        </p>
        {/* Section rule */}
        <div style={{ width: '40px', height: '2px', borderRadius: '2px', margin: '0 auto 2rem',
                      background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />
        {/* Section headline */}
        <h2 style={{ fontSize: 'clamp(2rem, 4.5vw, 3.2rem)', fontWeight: 800, lineHeight: 1.15,
                     margin: '0 0 1.25rem 0', letterSpacing: '-0.025em' }}>
          Pure skill.{' '}
          <span style={{ background: `linear-gradient(135deg, ${accent} 0%, ${violet} 100%)`,
                         WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            No real money.
          </span>
        </h2>
        <p style={{ fontSize: '1rem', color: textSecondary, margin: '0 auto 4.5rem', lineHeight: 1.7, maxWidth: '520px' }}>
          This is a fantasy cricket simulator — you compete with strategy and cricket knowledge, not your wallet.
        </p>

        {/* Feature cards */}
        <div className="landing-features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                      gap: '1.25rem', maxWidth: '960px', margin: '0 auto', textAlign: 'left' }}>
          {FEATURES.map(({ Icon, title, desc }) => (
            <div key={title} style={{
              background: 'rgba(15,23,42,0.7)',
              border: `1px solid ${border}`,
              borderRadius: '16px',
              padding: '2rem 1.75rem',
              backdropFilter: 'blur(12px)',
              transition: 'border-color 0.25s ease, transform 0.25s ease',
            }}
              onMouseEnter={e => { const el = e.currentTarget; el.style.borderColor = 'rgba(6,182,212,0.35)'; el.style.transform = 'translateY(-4px)'; }}
              onMouseLeave={e => { const el = e.currentTarget; el.style.borderColor = border; el.style.transform = 'none'; }}
            >
              {/* Icon pill */}
              <div style={{
                width: '44px', height: '44px', borderRadius: '12px', marginBottom: '1.5rem',
                background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: accent,
              }}>
                <Icon />
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.85rem 0', color: '#f8fafc' }}>
                {title}
              </h3>
              <p style={{ fontSize: '0.88rem', color: textSecondary, lineHeight: 1.7, margin: 0 }}>
                {desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 3 — CREATOR NOTE + BIG BRAND FOOTER
      ══════════════════════════════════════════════════════════════════════ */}
      <section style={{
        position: 'relative', overflow: 'hidden',
        padding: '5rem 2rem 0',
        background: '#020617',
        borderTop: `1px solid ${border}`,
        textAlign: 'center',
      }}>
        {/* Subtle bottom violet glow */}
        <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
                      width: '80%', height: '320px', pointerEvents: 'none',
                      background: 'radial-gradient(ellipse at bottom, rgba(139,92,246,0.12) 0%, transparent 70%)' }} />

        {/* Note from creator */}
        <p style={{ fontSize: '0.62rem', letterSpacing: '0.28em', color: accent,
                    textTransform: 'uppercase', fontWeight: 700, margin: '0 0 1.6rem 0' }}>
          Note from the Creator
        </p>

        {/* Quote */}
        <blockquote style={{
          maxWidth: '540px', margin: '0 auto 1.5rem',
          fontSize: '0.95rem', color: textSecondary, lineHeight: 1.85,
          fontStyle: 'italic', position: 'relative', zIndex: 1,
          borderLeft: 'none', padding: 0,
        }}>
          "Hi, I’m a cricket fan building this as a small project to enjoy the game in a better way."
        </blockquote>

        <p style={{ fontSize: '0.85rem', color: 'rgba(148,163,184,0.5)', margin: '0 0 2.5rem 0', fontWeight: 500 }}>
          — OmkarVarma
        </p>

        {/* Social icons */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1.25rem', marginBottom: '4.5rem', position: 'relative', zIndex: 1 }}>
          {[
            { Icon: InstagramIcon, label: 'Instagram', url: 'https://www.instagram.com/ihxdevil' },
            { Icon: LinkedinIcon,  label: 'LinkedIn',  url: 'https://www.linkedin.com/in/omkar-varma-767ba1329' },
            { Icon: MailIcon,      label: 'Email',     url: 'mailto:omkarvarma2504@gmail.com' },
          ].map(({ Icon, label, url }) => (
            <a 
              key={label} 
              href={url}
              target={label === 'Email' ? undefined : "_blank"}
              rel="noopener noreferrer"
              title={label} 
              style={{
                background: 'rgba(255,255,255,0.05)', border: `1px solid ${border}`,
                borderRadius: '8px', width: '40px', height: '40px', cursor: 'pointer',
                color: textSecondary, display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'color 0.2s, border-color 0.2s',
                textDecoration: 'none'
              }}
              onMouseEnter={e => { const b = e.currentTarget; b.style.color = accent; b.style.borderColor = 'rgba(6,182,212,0.4)'; }}
              onMouseLeave={e => { const b = e.currentTarget; b.style.color = textSecondary; b.style.borderColor = border; }}
            >
              <Icon />
            </a>
          ))}
        </div>

        {/* Giant brand wordmark */}
        <div style={{ position: 'relative', zIndex: 1, userSelect: 'none', lineHeight: 1 }}>
          <p style={{
            fontSize: 'clamp(3.5rem, 12vw, 9rem)',
            fontWeight: 900,
            letterSpacing: '-0.04em',
            margin: 0,
            background: `linear-gradient(180deg, rgba(6,182,212,0.18) 0%, rgba(6,182,212,0.03) 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            // Stroke effect via text-shadow
            filter: 'drop-shadow(0 0 40px rgba(6,182,212,0.12))',
          }}>
            Makeyour11.com
          </p>
        </div>
      </section>

      {/* Scroll hint animation keyframe */}
      <style>{`
        @keyframes scrollHint {
          0%, 100% { opacity: 0.3; transform: translateX(-50%) translateY(0); }
          50%       { opacity: 0.7; transform: translateX(-50%) translateY(6px); }
        }
      `}</style>
    </div>
  );
};

export default Landing;
