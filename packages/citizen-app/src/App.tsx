import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { I18nProvider, useI18n, SUPPORTED_LANGUAGES } from './context/I18nContext.js';

// Screens
import OnboardingScreen from './screens/OnboardingScreen.js';
import AuthScreen from './screens/AuthScreen.js';
import ProfileSetupScreen from './screens/ProfileSetupScreen.js';
import HomeScreen from './screens/HomeScreen.js';
import ReportCaptureScreen from './screens/ReportCaptureScreen.js';
import ClassificationReviewScreen from './screens/ClassificationReviewScreen.js';
import DuplicateCandidateScreen from './screens/DuplicateCandidateScreen.js';
import ConfirmationStatusScreen from './screens/ConfirmationStatusScreen.js';
import MyReportsScreen from './screens/MyReportsScreen.js';

import './app.css';

import { useState } from 'react';

// App Layout Component
function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;
  const { t, locale, setLocale } = useI18n();
  const { logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Don't show nav on report flows, auth, or onboarding screens
  if (path.startsWith('/report') || path === '/' || path === '/auth' || path === '/profile-setup') {
    return <div className="app-shell">{children}</div>;
  }

  const navLinks = [
    { to: '/home', icon: '📋', label: 'Report Logs' },
    { to: '/my-reports', icon: '👤', label: t('myReports') },
  ];

  return (
    <div className="app-layout">
      {/* Mobile Top Bar */}
      <header className="mobile-top-bar">
        <button className="hamburger-btn" onClick={() => setSidebarOpen(true)}>
          ☰
        </button>
        <h1 className="mobile-title" onClick={() => navigate('/home')} style={{ cursor: 'pointer' }}>CivicSense</h1>
        <div style={{ width: '40px' }} /> {/* Spacer for centering */}
      </header>

      {/* Sidebar Overlay (Mobile) */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo" onClick={() => { navigate('/home'); setSidebarOpen(false); }} style={{ cursor: 'pointer' }}>🏙️ CivicSense</div>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>✕</button>
        </div>
        
        <nav className="sidebar-nav">
          {navLinks.map((link) => (
            <Link 
              key={link.to}
              to={link.to} 
              className={`sidebar-link ${path === link.to ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="sidebar-icon">{link.icon}</span>
              <span className="sidebar-label">{link.label}</span>
            </Link>
          ))}
          <Link 
            to="/report" 
            className="sidebar-report-btn"
            onClick={() => setSidebarOpen(false)}
          >
            📸 Report an Issue
          </Link>
        </nav>

        <div className="sidebar-footer" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* User Profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: 'hsl(220 100% 98%)', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, hsl(220 87% 60%), hsl(220 87% 50%))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '15px' }}>
              C
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'hsl(220 20% 12%)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                Citizen
              </div>
              <div style={{ fontSize: '12px', color: 'hsl(220 20% 40%)' }}>
                Community Member
              </div>
            </div>
          </div>

          <div className="sidebar-link" style={{ padding: '0', background: 'transparent' }}>
            <span className="sidebar-icon" style={{ marginLeft: '12px' }}>🌐</span>
            <select
              value={locale}
              onChange={(e) => { setLocale(e.target.value as any); setSidebarOpen(false); }}
              style={{
                flex: 1, border: 'none', background: 'transparent',
                fontSize: '15px', fontWeight: 500, color: 'var(--color-text-secondary)',
                padding: '12px', outline: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)'
              }}
            >
              {SUPPORTED_LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code}>{lang.name}</option>
              ))}
            </select>
          </div>
          <button
            className="sidebar-link"
            style={{ color: 'var(--color-danger)' }}
            onClick={() => { logout(); navigate('/auth'); setSidebarOpen(false); }}
          >
            <span className="sidebar-icon">🚪</span>
            <span className="sidebar-label">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      {!( ['/report', '/auth', '/profile-setup'].some(p => location.pathname.startsWith(p)) ) && (
        <nav className="mobile-bottom-nav">
          <Link to="/home" className={`bottom-nav-item ${location.pathname === '/home' ? 'active' : ''}`}>
            <span className="bottom-nav-icon">🗺️</span>
            <span className="bottom-nav-label">Map</span>
          </Link>
          <div className="bottom-nav-report-wrapper">
            <Link to="/report" className="bottom-nav-report-btn">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'translateY(-1px)' }}>
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                <circle cx="12" cy="13" r="4"></circle>
              </svg>
            </Link>
          </div>
          <Link to="/my-reports" className={`bottom-nav-item ${location.pathname === '/my-reports' ? 'active' : ''}`}>
            <span className="bottom-nav-icon">👤</span>
            <span className="bottom-nav-label">Profile</span>
          </Link>
        </nav>
      )}
    </div>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AppLayout>
            <Routes>
              <Route path="/" element={<OnboardingScreen />} />
              <Route path="/auth" element={<AuthScreen />} />
              <Route path="/profile-setup" element={<ProfileSetupScreen />} />
              <Route path="/home" element={<HomeScreen />} />
              <Route path="/my-reports" element={<MyReportsScreen />} />
              
              {/* Report Flow */}
              <Route path="/report" element={<ReportCaptureScreen />} />
              <Route path="/report/classify" element={<ClassificationReviewScreen />} />
              <Route path="/report/duplicate" element={<DuplicateCandidateScreen />} />
              <Route path="/report/confirmation" element={<ConfirmationStatusScreen />} />
              
              {/* Issue Detail */}
              <Route path="/issue/:id" element={<ConfirmationStatusScreen />} />
              
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AppLayout>
        </BrowserRouter>
      </AuthProvider>
    </I18nProvider>
  );
}
