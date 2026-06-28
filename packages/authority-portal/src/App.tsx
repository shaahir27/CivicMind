import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, Link, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.js';

import LoginScreen from './screens/LoginScreen.js';
import DashboardScreen from './screens/DashboardScreen.js';
import IssueDetailScreen from './screens/IssueDetailScreen.js';
import SlaComplianceScreen from './screens/SlaComplianceScreen.js';

import '../../shared/src/design-system/tokens.css';
import '../../shared/src/design-system/components.css';
import './app.css';

function Sidebar({ isOpen, setIsOpen }: { isOpen: boolean, setIsOpen: (val: boolean) => void }) {
  const location = useLocation();
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  return (
    <>
      <div 
        className={`portal-sidebar-overlay ${isOpen ? 'open' : ''}`} 
        onClick={() => setIsOpen(false)}
      />
      <aside className={`portal-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="portal-sidebar-header">
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-primary-700)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🛡️</span> CivicSense Authority
          </h2>
        </div>
        <nav className="portal-sidebar-nav">
          <Link to="/dashboard" className={`nav-item ${location.pathname === '/dashboard' ? 'active' : ''}`} onClick={() => setIsOpen(false)}>
            <span>📋</span> Active Queue
          </Link>
          <Link to="/sla" className={`nav-item ${location.pathname === '/sla' ? 'active' : ''}`} onClick={() => setIsOpen(false)}>
            <span>📊</span> SLA Compliance
          </Link>
        </nav>
        <div style={{ padding: 'var(--space-4)', borderTop: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-brand-500), var(--color-brand-700))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '14px' }}>
              {user?.name ? user.name.charAt(0).toUpperCase() : (user?.email ? user.email.charAt(0).toUpperCase() : 'O')}
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                {user?.name || (user?.email ? user.email.split('@')[0].replace(/\./g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Officer')}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                {user?.role === 'admin' ? 'Administrator' : 'Authority Agent'}
              </div>
            </div>
          </div>
          <button 
            onClick={() => { logout(); navigate('/login'); }}
            style={{ width: '100%', padding: '10px', background: 'var(--color-neutral-100)', border: '1px solid var(--color-neutral-200)', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            onMouseOver={(e) => (e.currentTarget.style.background = 'var(--color-neutral-200)')}
            onMouseOut={(e) => (e.currentTarget.style.background = 'var(--color-neutral-100)')}
          >
            <span style={{ fontSize: '16px' }}>🚪</span> Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}

import { AppSwitcher } from '../../shared/src/components/AppSwitcher.js';
import { UserRole } from '@civicmind/shared';

function PortalLayout({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  
  if (!token) return <Navigate to="/login" replace />;

  return (
    <div className="portal-layout">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <main className="portal-main">
        <header className="portal-header">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button className="hamburger-btn" onClick={() => setSidebarOpen(true)}>
              ☰
            </button>
            <div style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>Officer Portal</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="hide-on-mobile" style={{ fontSize: '14px', fontWeight: 500, marginRight: '16px' }}>System Status: <span style={{ color: 'var(--color-success)' }}>Active</span></span>
            <AppSwitcher currentApp="authority" userRole={user?.role as UserRole} />
          </div>
        </header>
        <div className="portal-content">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/dashboard" element={<PortalLayout><DashboardScreen /></PortalLayout>} />
          <Route path="/sla" element={<PortalLayout><SlaComplianceScreen /></PortalLayout>} />
          <Route path="/issue/:id" element={<PortalLayout><IssueDetailScreen /></PortalLayout>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
