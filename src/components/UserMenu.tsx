import { useContext, useState } from 'react';
import { AuthContext } from '../App';
import { ChevronDown } from 'lucide-react';

const UserMenu = () => {
  const { user, setUser } = useContext(AuthContext);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleSignOut = () => {
    setUser(null);
  };

  const initial = user?.name ? user.name.charAt(0).toUpperCase() : 'U';

  return (
    <div style={{ position: 'relative' }}>
      <div 
        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', color: 'var(--text-secondary)' }}
        onClick={() => setIsProfileOpen(!isProfileOpen)}
      >
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, flexShrink: 0 }}>
          {initial}
        </div>
        <span style={{ fontSize: '0.875rem', whiteSpace: 'nowrap' }}>{user?.name || 'User'}</span>
        <ChevronDown size={14} />
      </div>

      {isProfileOpen && (
        <div className="usermenu-dropdown" style={{ 
          position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem',
          background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '8px',
          padding: '0.5rem', boxShadow: 'var(--shadow-md)', minWidth: '150px', zIndex: 50
        }}>
          <button 
            style={{ 
              width: '100%', background: 'transparent', border: 'none', color: 'var(--text-secondary)',
              padding: '0.75rem 1rem', textAlign: 'left', cursor: 'pointer', borderRadius: '4px', fontSize: '0.875rem'
            }}
            className="hover-white"
            onClick={handleSignOut}
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
