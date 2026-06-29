import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, Link, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.js';

import LoginScreen from './screens/LoginScreen.js';
import SlaConfigScreen from './screens/SlaConfigScreen.js';
import JurisdictionScreen from './screens/JurisdictionScreen.js';
import PredictiveReviewScreen from './screens/PredictiveReviewScreen.js';
import ImpactReportsScreen from './screens/ImpactReportsScreen.js';
import AuditLogScreen from './screens/AuditLogScreen.js';
import UserManagementScreen from './screens/UserManagementScreen.js';

import '../../shared/src/design-system/tokens.css';
import '../../shared/src/design-system/components.css';
import './app.css';

const NAV_ITEMS = [
  { path: '/sla-config',        label: 'SLA Configuration',     icon: '⏱️' },
  { path: '/jurisdiction',      label: 'Jurisdiction Mapping',  icon: '🗺️' },
  { path: '/predictive-review', label: 'Predictive Review',     icon: '🔮' },
  { path: '/impact-reports',    label: 'Impact Reports',        icon: '📊' },
  { path: '/audit-log',         label: 'Audit Log',             icon: '📋' },
  { path: '/users',             label: 'User Management',       icon: '👥' },
];

function Sidebar({ isOpen, setIsOpen }: { isOpen: boolean; setIsOpen: (val: boolean) => void }) {
  const location = useLocation();
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  return (
    <>
      <div
        className={`admin-sidebar-overlay ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(false)}
      />
      <aside className={`admin-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="admin-sidebar-header">
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--color-brand-500)', display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '-0.5px' }}>
            <span>⚙️</span> CivicSense <span style={{ fontSize: '0.9rem', fontFamily: 'var(--font-sans)', color: 'white', marginLeft: '6px', fontWeight: 600 }}>Admin Console</span>
          </h2>
        </div>
        <nav className="admin-sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`admin-nav-item ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => setIsOpen(false)}
            >
              <span>{item.icon}</span> {item.label}
            </Link>
          ))}
        </nav>
        <div style={{ padding: 'var(--space-4)', borderTop: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #818cf8, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '14px' }}>
              {user?.name ? user.name.charAt(0).toUpperCase() : (user?.email ? user.email.charAt(0).toUpperCase() : 'A')}
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>
                {user?.name || (user?.email ? user.email.split('@')[0].replace(/\./g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Administrator')}
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                {user?.role === 'admin' ? 'System Administrator' : 'Authorized User'}
              </div>
            </div>
          </div>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#e2e8f0', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
            onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
          >
            <span style={{ fontSize: '16px' }}>🚪</span> Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}

/** Page title derived from current path */
function pageTitle(path: string): string {
  return NAV_ITEMS.find((n) => n.path === path)?.label ?? 'System Configuration';
}

import { AppSwitcher } from '../../shared/src/components/AppSwitcher.js';
import { UserRole } from '@civicmind/shared';

function AdminLayout({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  if (!token) return <Navigate to="/login" replace />;

  return (
    <div className="admin-layout">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <main className="admin-main">
        <header className="admin-header">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button className="hamburger-btn" onClick={() => setSidebarOpen(true)}>
              ☰
            </button>
            <div style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>
              {pageTitle(location.pathname)}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="hide-on-mobile" style={{ fontSize: '14px', fontWeight: 500, marginRight: '16px' }}>
              System Status: <span style={{ color: 'var(--color-success)' }}>Active</span>
            </span>
            <AppSwitcher currentApp="admin" userRole={user?.role as UserRole} />
          </div>
        </header>
        <div className="admin-content">
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
          <Route path="/sla-config"        element={<AdminLayout><SlaConfigScreen /></AdminLayout>} />
          <Route path="/jurisdiction"      element={<AdminLayout><JurisdictionScreen /></AdminLayout>} />
          <Route path="/predictive-review" element={<AdminLayout><PredictiveReviewScreen /></AdminLayout>} />
          <Route path="/impact-reports"    element={<AdminLayout><ImpactReportsScreen /></AdminLayout>} />
          <Route path="/audit-log"         element={<AdminLayout><AuditLogScreen /></AdminLayout>} />
          <Route path="/users"             element={<AdminLayout><UserManagementScreen /></AdminLayout>} />
          <Route path="*"                  element={<Navigate to="/sla-config" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
