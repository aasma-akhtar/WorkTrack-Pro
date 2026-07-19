import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  CalendarCheck, 
  CalendarRange, 
  Clock, 
  Settings as SettingsIcon, 
  LogOut, 
  User,
  Menu,
  X
} from 'lucide-react';
import { logout } from './features/auth/authSlice';

// Import Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Attendance from './pages/Attendance';
import Leaves from './pages/Leaves';
import Shifts from './pages/Shifts';
import AdminSettings from './pages/AdminSettings';

// Developer Simulator Component
import DeveloperSimulator from './components/DeveloperSimulator';

export default function App() {
  const dispatch = useDispatch();
  const { token, user } = useSelector((state) => state.auth);
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    dispatch(logout());
    window.location.href = '#/login';
  };

  // Helper to check role rights
  const hasAccess = (allowedRoles) => {
    return user && allowedRoles.includes(user.role);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {token && <DeveloperSimulator />}
      
      <Routes>
          {/* Public Login Route */}
          <Route 
            path="/login" 
            element={
              token ? <Navigate to="/dashboard" replace /> : <Login />
            } 
          />

          {/* Secure Layout Wrap */}
          <Route 
            path="/*" 
            element={
              !token ? <Navigate to="/login" replace /> : (
                <div className="app-layout">
                  
                  {/* Left Sidebar Navigation */}
                  <aside className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`} style={{
                    transform: window.innerWidth <= 768 && !isMobileMenuOpen ? 'translateX(-100%)' : 'translateX(0)',
                    transition: 'transform 0.3s ease'
                  }}>
                    {/* Header Logo */}
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px', 
                      marginBottom: '36px',
                      padding: '0 8px'
                    }}>
                      <div style={{
                        background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                        padding: '10px',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white'
                      }}>
                        <Clock size={20} />
                      </div>
                      <span className="logo-text" style={{ 
                        fontFamily: 'var(--font-display)', 
                        fontWeight: '800', 
                        fontSize: '18px',
                        background: 'linear-gradient(to right, #6366f1, #a855f7)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                      }}>
                        WorkTrack Pro
                      </span>
                    </div>

                    {/* Navigation Items */}
                    <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                      <Link to="/dashboard" onClick={() => setIsMobileMenuOpen(false)} style={linkStyle('/dashboard', location.pathname)}>
                        <LayoutDashboard size={20} />
                        <span className="nav-text">Dashboard</span>
                      </Link>
                      
                      <Link to="/attendance" onClick={() => setIsMobileMenuOpen(false)} style={linkStyle('/attendance', location.pathname)}>
                        <CalendarCheck size={20} />
                        <span className="nav-text">Attendance</span>
                      </Link>
                      
                      <Link to="/leaves" onClick={() => setIsMobileMenuOpen(false)} style={linkStyle('/leaves', location.pathname)}>
                        <CalendarRange size={20} />
                        <span className="nav-text">Leaves</span>
                      </Link>
                      
                      {hasAccess(['admin', 'manager']) && (
                        <Link to="/shifts" onClick={() => setIsMobileMenuOpen(false)} style={linkStyle('/shifts', location.pathname)}>
                          <Clock size={20} />
                          <span className="nav-text">Shifts & Schedule</span>
                        </Link>
                      )}

                      {hasAccess(['admin']) && (
                        <Link to="/settings" onClick={() => setIsMobileMenuOpen(false)} style={linkStyle('/settings', location.pathname)}>
                          <SettingsIcon size={20} />
                          <span className="nav-text">Admin Settings</span>
                        </Link>
                      )}
                    </nav>

                    {/* Bottom User Profile card & Logout */}
                    <div style={{ 
                      marginTop: 'auto', 
                      borderTop: '1px solid var(--glass-border)', 
                      paddingTop: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 8px' }}>
                        <div style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          borderRadius: '50px',
                          width: '40px',
                          height: '40px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid var(--glass-border)'
                        }}>
                          <User size={18} color="#a855f7" />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '13px', fontWeight: '700' }}>{user.name}</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                            {user.role}
                          </span>
                        </div>
                      </div>
                      
                      <button 
                        onClick={handleLogout} 
                        className="btn-secondary"
                        style={{ width: '100%', justifyContent: 'flex-start', padding: '10px 14px' }}
                      >
                        <LogOut size={16} />
                        <span>Log Out</span>
                      </button>
                    </div>
                  </aside>

                  {/* Main Work Area */}
                  <main className="main-content">
                    {/* Header bar */}
                    <header style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: '40px',
                      paddingBottom: '20px',
                      borderBottom: '1px solid var(--glass-border)'
                    }}>
                      <div>
                        <h1 style={{ fontSize: '28px' }}>Welcome back, {user.name.split(' ')[0]}</h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
                          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                      </div>
                      
                      {/* Mobile menu toggle */}
                      <button 
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        style={{
                          display: window.innerWidth <= 768 ? 'block' : 'none',
                          background: 'none',
                          border: 'none',
                          color: 'white',
                          cursor: 'pointer'
                        }}
                      >
                        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                      </button>
                    </header>

                    {/* Routing Pages content */}
                    <div style={{ flex: 1 }}>
                      <Routes>
                        <Route path="/dashboard" element={<Dashboard user={user} token={token} />} />
                        <Route path="/attendance" element={<Attendance user={user} token={token} />} />
                        <Route path="/leaves" element={<Leaves user={user} token={token} />} />
                        
                        {hasAccess(['admin', 'manager']) && (
                          <Route path="/shifts" element={<Shifts user={user} token={token} />} />
                        )}
                        
                        {hasAccess(['admin']) && (
                          <Route path="/settings" element={<AdminSettings user={user} token={token} />} />
                        )}
                        
                        {/* Default Fallback */}
                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                      </Routes>
                    </div>
                  </main>
                </div>
              )
            } 
          />
        </Routes>
      </div>
  );
}

// Sidebar links active checking
const linkStyle = (path, currentPath) => {
  const normalizedCurrentPath = currentPath || window.location.hash.substring(1);
  const isActive = normalizedCurrentPath.startsWith(path);
  return {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: '10px',
    textDecoration: 'none',
    color: isActive ? 'white' : 'var(--text-muted)',
    background: isActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
    border: isActive ? '1px solid rgba(99, 102, 241, 0.25)' : '1px solid transparent',
    fontWeight: isActive ? '600' : '400',
    transition: 'all 0.2s ease',
  };
};
