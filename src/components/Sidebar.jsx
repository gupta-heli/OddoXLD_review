import React from 'react';
import { 
  LayoutDashboard, 
  Map, 
  Compass, 
  Calendar, 
  DollarSign, 
  Users, 
  Sparkles, 
  User, 
  Settings, 
  BookOpen,
  LogOut,
  Globe,
  Menu,
  ChevronLeft,
  ShieldCheck
} from 'lucide-react';
import VoyaraLogo from './VoyaraLogo';

export default function Sidebar({ 
  currentScreen, 
  onNavigate, 
  activeUser, 
  onSignOut,
  isDarkMode,
  onToggleTheme,
  isCollapsed,
  onToggleCollapse
}) {
  const baseMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'my-trips', label: 'My Trips', icon: Map },
    { id: 'itinerary-builder', label: 'Itinerary', icon: BookOpen },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'explore-cities', label: 'Explore', icon: Compass },
    { id: 'budget', label: 'Budget', icon: DollarSign },
    { id: 'community', label: 'Community', icon: Users },
    { id: 'travel-assistant', label: 'Travel Assistant', icon: Sparkles },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  if (activeUser?.is_admin) {
    baseMenuItems.unshift({ id: 'admin', label: 'Admin', icon: ShieldCheck });
  }

  const menuItems = baseMenuItems;

  return (
    <aside className={`sidebar ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Top Header Logo & Navigation Container */}
      <div className="sidebar-top-container">
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          marginBottom: '10px', 
          borderBottom: '1px solid var(--border)', 
          paddingBottom: '8px',
          marginRight: isCollapsed ? 0 : '-4px'
        }}>
          {/* Header Row: Title and Button */}
          <div style={{ 
            display: 'flex', 
            justifyContent: isCollapsed ? 'center' : 'space-between', 
            alignItems: 'center',
            width: '100%',
            flexDirection: isCollapsed ? 'column' : 'row',
            gap: isCollapsed ? '8px' : '0px'
          }}>
            {!isCollapsed ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <VoyaraLogo size={26} />
                <h1 style={{ 
                  fontFamily: 'var(--font-serif)', 
                  fontSize: '1.35rem', 
                  fontWeight: 800, 
                  color: 'var(--off-white)', 
                  letterSpacing: '0.05em', 
                  lineHeight: '1.1',
                  whiteSpace: 'nowrap',
                  margin: 0
                }}>
                  VOYARA
                </h1>
              </div>
            ) : (
              <VoyaraLogo size={26} />
            )}
            <button className="sidebar-toggle-btn" onClick={onToggleCollapse} aria-label="Toggle Sidebar" style={{ flexShrink: 0 }}>
              {isCollapsed ? <Menu size={18} /> : <ChevronLeft size={18} />}
            </button>
          </div>

          {/* Subtitle Row */}
          {!isCollapsed && (
            <p style={{ 
              fontFamily: 'var(--font-sans)', 
              fontSize: '0.65rem', 
              color: 'var(--magenta)', 
              letterSpacing: '0.05em', 
              marginTop: '4px',
              margin: 0
            }}>
              Your journey, your way.
            </p>
          )}
        </div>

        {/* Navigation Items */}
        <nav>
          <ul className="nav-links">
            {menuItems.map(item => {
              const Icon = item.icon;
              const isActive = currentScreen === item.id || 
                               (item.id === 'itinerary-builder' && currentScreen === 'itinerary-view') ||
                               (item.id === 'explore-cities' && currentScreen === 'explore-activities');
              
              return (
                <li key={item.id}>
                  <a 
                    className={`nav-link ${isActive ? 'active' : ''}`}
                    onClick={() => onNavigate(item.id)}
                  >
                    <Icon />
                    <span>{item.label}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {/* Sidebar Bottom Section */}
      <div className="sidebar-footer">
        {/* User profile widget */}
        <a className="profile-widget" onClick={() => onNavigate('profile')}>
          <img 
            src={activeUser?.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80"} 
            alt={activeUser?.full_name} 
          />
          <div className="profile-info">
            <h4>{activeUser?.full_name || 'Alex Johnson'}</h4>
            <p>View Profile</p>
          </div>
        </a>

        {/* Theme Toggle row */}
        <div className="theme-toggle-row">
          <label>JOURNAL_DARK</label>
          <label className="toggle-switch">
            <input 
              type="checkbox" 
              checked={isDarkMode} 
              onChange={onToggleTheme} 
            />
            <span className="slider"></span>
          </label>
        </div>

        {/* Sign out link */}
        <button 
          onClick={onSignOut}
          style={{
            background: 'none',
            border: 'none',
            color: '#A8A2A8',
            fontSize: '0.8rem',
            fontFamily: "'Space Mono', monospace",
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            padding: '8px 12px',
            width: '100%',
            textAlign: 'left'
          }}
          onMouseEnter={(e) => e.target.style.color = '#E87970'}
          onMouseLeave={(e) => e.target.style.color = '#A8A2A8'}
        >
          <LogOut size={14} />
          <span>SIGN_OUT</span>
        </button>
      </div>
    </aside>
  );
}
