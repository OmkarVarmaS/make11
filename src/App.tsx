import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Auth from './pages/Auth';
import Home from './pages/Home';
import Lobby from './pages/Lobby';
import Auction from './pages/Auction';
import Landing from './pages/Landing';
import Results from './pages/Results';
import './index.css';
import './App.css';
import { supabase } from './supabaseClient';
import { initPlayers } from './services/db';

// Simple mock auth state for UI testing
export const AuthContext = React.createContext({
  user: null as any,
  setUser: (_user: any) => {},
});

const ZoomController = () => {
  const location = useLocation();
  React.useEffect(() => {
    const root = document.getElementById('root');
    if (root) {
      const isMobile = window.innerWidth <= 768;
      if (location.pathname.startsWith('/auction') || isMobile) {
        root.style.zoom = '1';
      } else {
        root.style.zoom = '0.78';
      }
    }
  }, [location.pathname]);

  // Also listen to resize to re-apply zoom correctly
  React.useEffect(() => {
    const onResize = () => {
      const root = document.getElementById('root');
      if (root) {
        const isMobile = window.innerWidth <= 768;
        if (location.pathname.startsWith('/auction') || isMobile) {
          root.style.zoom = '1';
        } else {
          root.style.zoom = '0.78';
        }
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [location.pathname]);

  return null;
};

function App() {
  const [user, setUserState] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // Determine the user session
    const checkSession = async () => {
      let activeUser = null;
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          activeUser = {
            userId: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0],
          };
        }
      } catch (e) {
        console.warn("Supabase session check failed, using local storage fallback", e);
      }

      // Local storage fallback
      if (!activeUser) {
        const saved = localStorage.getItem('ipl_user');
        if (saved) activeUser = JSON.parse(saved);
      }

      // Fetch the full players list from Supabase before hiding the loading screen
      await initPlayers();

      setUserState(activeUser);
      setLoading(false);
    };

    checkSession();

    // Listener for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      if (session?.user) {
        const newUser = {
          userId: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0],
        };
        localStorage.setItem('ipl_user', JSON.stringify(newUser));
        setUserState(newUser);
      } else {
        localStorage.removeItem('ipl_user');
        setUserState(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const setUser = (newUser: any) => {
    if (newUser) {
      localStorage.setItem('ipl_user', JSON.stringify(newUser));
    } else {
      localStorage.removeItem('ipl_user');
      // Attempt to sign out of supabase as well if they trigger explicit logout
      supabase.auth.signOut().catch(console.warn);
    }
    setUserState(newUser);
  };

  if (loading) {
    return <div className="flex-center" style={{ minHeight: '100vh', background: '#020617', color: 'rgba(255,255,255,0.5)' }}>Loading session...</div>;
  }

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      <BrowserRouter>
        <ZoomController />
        <div className="app-container">
          <Routes>
            {/* Landing: shown to guests; authenticated users skip straight to /home */}
            <Route path="/" element={user ? <Navigate to="/home" replace /> : <Landing />} />

            {/* Auth: guests only; authenticated bounce to /home */}
            <Route path="/login" element={!user ? <Auth /> : <Navigate to="/home" replace />} />

            {/* Main app routes — require authentication */}
            <Route path="/home"            element={user ? <Home />    : <Navigate to="/login" replace />} />
            <Route path="/lobby/:roomId"   element={user ? <Lobby />   : <Navigate to="/login" replace />} />
            <Route path="/auction/:roomId" element={user ? <Auction /> : <Navigate to="/login" replace />} />
            <Route path="/results/:roomId" element={user ? <Results /> : <Navigate to="/login" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}

export default App;
