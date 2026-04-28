import React, { useContext, useState } from 'react';
import { AuthContext } from '../App';
import { Lock, Mail, KeyRound } from 'lucide-react';
import { supabase } from '../supabaseClient';

const Auth = () => {
  const { setUser } = useContext(AuthContext);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Fallback unique userId logic if Supabase isn't configured
  const getOrCreateUserId = () => {
    let uid = localStorage.getItem('ipl_my_uid');
    if (!uid) {
      uid = 'u_' + Math.random().toString(36).slice(2, 10);
      localStorage.setItem('ipl_my_uid', uid);
    }
    return uid;
  };

  const setFallbackUser = () => {
    const uid = getOrCreateUserId();
    const displayName = !isLogin && name ? name : (email.split('@')[0] || 'Player');
    setUser({ userId: uid, name: displayName, email: email || 'user@gmail.com' });
  };

  const handleGoogleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
      if (error) throw error;
      // Note: Page refesh will happen for OAuth, App.tsx will catch the session
    } catch (err: any) {
      console.warn("Supabase not configured or error:", err);
      // Fallback
      setFallbackUser();
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!isLogin) {
      // EXACT rule: must end with @gmail.com exactly, block disponsable/others
      if (!email.toLowerCase().endsWith('@gmail.com')) {
        setError('Only valid @gmail.com addresses are allowed for signup. Temporary or other domains are blocked.');
        return;
      }
    }

    setLoading(true);
    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) {
          setUser({ userId: data.user.id, name: data.user.email?.split('@')[0] || 'Player', email: data.user.email });
        }
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
        if (error) throw error;
        
        // After successful signup (if email verification is required, session will be null)
        if (data.user && !data.session) {
          setSuccessMessage('Your account has been created. Please check your email and verify your address before logging in.');
          // Pre-fill email by NOT clearing it
          setPassword('');
          setName('');
          setIsLogin(true); // Switch to Sign In view
        } else if (data.user) {
          setUser({ userId: data.user.id, name: name || data.user.email?.split('@')[0], email: data.user.email });
        }
      }
    } catch (err: any) {
      console.warn("Auth error:", err);
      // Fallback for demo without real Supabase env setup
      if (err.message?.includes('URL') || err.message?.includes('key')) {
         setFallbackUser();
      } else {
         setError(err.message || 'Authentication failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container flex-center" style={{ minHeight: '100vh', flexDirection: 'column' }}>
      <div className="animate-fade-in" style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        
        {/* Horizontal Bar */}
        <div style={{ width: '40px', height: '2px', backgroundColor: '#3b82f6', marginBottom: '1.5rem' }} />

        {/* Brand Name */}
        <h1 style={{ color: '#3b82f6', fontSize: '2.5rem', fontWeight: 700, marginBottom: '0.75rem', letterSpacing: '-0.02em', textAlign: 'center' }}>
          Makeyour11.com
        </h1>

        <p style={{ color: 'rgba(148,163,184,0.6)', fontSize: '0.65rem', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '2.5rem', fontWeight: 600, textAlign: 'center' }}>
          Fantasy Cricket Platform
        </p>

        {/* Custom Auth Card */}
        <div className="card glass-panel" style={{ width: '100%', padding: '2rem' }}>
          
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
              width: '100%', padding: '0.875rem', backgroundColor: '#1e293b', color: '#f8fafc',
              border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', fontSize: '0.95rem',
              fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', transition: 'background-color 0.2s',
              marginBottom: '1.5rem', opacity: loading ? 0.7 : 1
            }}
            onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = '#334155')}
            onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = '#1e293b')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>

          <div style={{ display: 'flex', alignItems: 'center', margin: '1rem 0', color: 'var(--text-secondary)' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }} />
            <span style={{ padding: '0 1rem', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>or</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }} />
          </div>

          {error && <div style={{ backgroundColor: 'var(--danger-dim)', color: 'var(--danger)', padding: '0.75rem', borderRadius: '4px', fontSize: '0.85rem', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}
          {successMessage && <div style={{ backgroundColor: 'rgba(34,197,94,0.1)', color: '#4ade80', padding: '0.875rem', borderRadius: '8px', fontSize: '0.875rem', marginBottom: '1.5rem', textAlign: 'center', border: '1px solid rgba(34,197,94,0.2)', fontWeight: 500 }}>{successMessage}</div>}

          <form onSubmit={handleEmailAuth} className="space-y-4">
            {!isLogin && (
              <div className="input-group">
                <label className="input-label">Full Name</label>
                <div style={{ position: 'relative' }}>
                  <input type="text" className="input-field" placeholder="Virat Kohli" value={name} onChange={(e) => setName(e.target.value)} required style={{ width: '100%' }} />
                </div>
              </div>
            )}
            <div className="input-group">
              <label className="input-label">Email Address</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Mail size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '1rem' }} />
                <input type="email" className="input-field" placeholder="player@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: '100%', paddingLeft: '2.5rem' }} />
              </div>
            </div>
            
            <div className="input-group">
              <label className="input-label">Password</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <KeyRound size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '1rem' }} />
                <input type="password" className="input-field" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} style={{ width: '100%', paddingLeft: '2.5rem' }} />
              </div>
            </div>

            <button type="submit" disabled={loading} style={{ width: '100%', marginTop: '1.5rem', backgroundColor: '#3b82f6', color: 'white', padding: '0.875rem', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
              {isLogin ? 'Sign In via Email' : 'Create Account'}
            </button>
          </form>

          <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <button className="btn btn-secondary" style={{ fontSize: '0.875rem', padding: '0.5rem 1rem', width: '100%' }} onClick={() => { setIsLogin(!isLogin); setError(''); }}>
              {isLogin ? "Need an account? Sign Up" : 'Already have an account? Sign In'}
            </button>
          </div>

        </div>

        {/* Security Note */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(148,163,184,0.4)', fontSize: '0.75rem', marginTop: '1.5rem' }}>
          <Lock size={12} />
          <span>Secure authentication via Supabase</span>
        </div>

      </div>
    </div>
  );
};

export default Auth;
