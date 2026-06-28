import React, { useState } from 'react';
import { UserRole } from '../types/index.js';

export interface AppSwitcherProps {
  userRole?: UserRole;
  currentApp: 'citizen' | 'authority' | 'admin' | 'landing';
}

/**
 * Global App Switcher
 * Displays links to other subdomains based on the user's role.
 */
export const AppSwitcher: React.FC<AppSwitcherProps> = ({ userRole, currentApp }) => {
  const [isOpen, setIsOpen] = useState(false);

  // If the user doesn't have elevated privileges and is just a citizen, 
  // maybe we don't show the switcher at all, or just a back to home button.
  if (!userRole || userRole === UserRole.Citizen) {
    if (currentApp !== 'citizen') {
      return (
        <a href="http://localhost:5173" className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}>
          Back to Citizen App
        </a>
      );
    }
    return null;
  }

  return (
    <div className="app-switcher" style={{ position: 'relative', display: 'inline-block' }}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="btn btn-secondary"
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '6px 12px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#0f172a', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', cursor: 'pointer', fontWeight: 500, fontSize: '14px' }}
        aria-label="Switch Applications"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7"></rect>
          <rect x="14" y="3" width="7" height="7"></rect>
          <rect x="14" y="14" width="7" height="7"></rect>
          <rect x="3" y="14" width="7" height="7"></rect>
        </svg>
        <span style={{ display: 'inline-block' }}>Apps</span>
      </button>

      {isOpen && (
        <div 
          className="app-switcher-menu" 
          style={{ 
            position: 'absolute', 
            top: '100%', 
            right: 0, 
            marginTop: '0.5rem', 
            background: 'white', 
            border: '1px solid #e2e8f0', 
            borderRadius: '8px', 
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
            zIndex: 1000,
            minWidth: '220px',
            overflow: 'hidden'
          }}
        >
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Switch App</span>
          </div>
          
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {currentApp !== 'citizen' && (
              <li>
                <a 
                  href={(import.meta as any).env.VITE_CITIZEN_APP_URL || 'http://localhost:5173'} 
                  style={{ display: 'block', padding: '0.75rem 1rem', textDecoration: 'none', color: '#0f172a', borderBottom: '1px solid #f1f5f9', fontWeight: 500 }}
                >
                  🏙️ Citizen App
                </a>
              </li>
            )}
            
            {(userRole === UserRole.Authority || userRole === UserRole.Admin) && currentApp !== 'authority' && (
              <li>
                <a 
                  href={(import.meta as any).env.VITE_AUTHORITY_APP_URL || 'http://localhost:5174'} 
                  style={{ display: 'block', padding: '0.75rem 1rem', textDecoration: 'none', color: '#0f172a', borderBottom: '1px solid #f1f5f9', fontWeight: 500 }}
                >
                  🛡️ Authority Portal
                </a>
              </li>
            )}

            {userRole === UserRole.Admin && currentApp !== 'admin' && (
              <li>
                <a 
                  href={(import.meta as any).env.VITE_ADMIN_CONSOLE_URL || 'http://localhost:5175'} 
                  style={{ display: 'block', padding: '0.75rem 1rem', textDecoration: 'none', color: '#0f172a', fontWeight: 500 }}
                >
                  ⚙️ Admin Console
                </a>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};
