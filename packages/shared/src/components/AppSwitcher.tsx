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
        <a href="http://localhost:5173" className="btn btn--secondary btn--sm">
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
        className="btn btn--secondary"
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
            marginTop: 'var(--space-2)', 
            background: 'var(--glass-bg-light)', 
            backdropFilter: 'var(--glass-blur)',
            WebkitBackdropFilter: 'var(--glass-blur)',
            border: '1px solid var(--glass-border-light)', 
            borderRadius: 'var(--radius-xl)', 
            boxShadow: 'var(--shadow-xl)',
            zIndex: 'var(--z-dropdown)',
            minWidth: '220px',
            overflow: 'hidden'
          }}
        >
          <div style={{ padding: 'var(--space-3) var(--space-4)', borderBottom: '1px solid var(--color-border-subtle)', background: 'var(--color-bg-secondary)' }}>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Switch App</span>
          </div>
          
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {currentApp !== 'citizen' && (
              <li>
                <a 
                  href={(import.meta as any).env.VITE_CITIZEN_APP_URL || 'http://localhost:5173'} 
                  style={{ display: 'block', padding: 'var(--space-3) var(--space-4)', textDecoration: 'none', color: 'var(--color-text-primary)', borderBottom: '1px solid var(--color-border-subtle)', fontWeight: 'var(--font-medium)' }}
                >
                  🏙️ Citizen App
                </a>
              </li>
            )}
            
            {(userRole === UserRole.Authority || userRole === UserRole.Admin) && currentApp !== 'authority' && (
              <li>
                <a 
                  href={(import.meta as any).env.VITE_AUTHORITY_APP_URL || 'http://localhost:5174'} 
                  style={{ display: 'block', padding: 'var(--space-3) var(--space-4)', textDecoration: 'none', color: 'var(--color-text-primary)', borderBottom: '1px solid var(--color-border-subtle)', fontWeight: 'var(--font-medium)' }}
                >
                  🛡️ Authority Portal
                </a>
              </li>
            )}

            {userRole === UserRole.Admin && currentApp !== 'admin' && (
              <li>
                <a 
                  href={(import.meta as any).env.VITE_ADMIN_CONSOLE_URL || 'http://localhost:5175'} 
                  style={{ display: 'block', padding: 'var(--space-3) var(--space-4)', textDecoration: 'none', color: 'var(--color-text-primary)', fontWeight: 'var(--font-medium)' }}
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
