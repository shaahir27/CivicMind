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
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', background: 'transparent', border: '1px solid var(--color-border)' }}
        aria-label="Switch Applications"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7"></rect>
          <rect x="14" y="3" width="7" height="7"></rect>
          <rect x="14" y="14" width="7" height="7"></rect>
          <rect x="3" y="14" width="7" height="7"></rect>
        </svg>
      </button>

      {isOpen && (
        <div 
          className="app-switcher-menu" 
          style={{ 
            position: 'absolute', 
            top: '100%', 
            right: 0, 
            marginTop: '0.5rem', 
            background: 'var(--color-surface)', 
            border: '1px solid var(--color-border)', 
            borderRadius: 'var(--border-radius-md)', 
            boxShadow: 'var(--shadow-md)',
            zIndex: 1000,
            minWidth: '200px',
            overflow: 'hidden'
          }}
        >
          <div style={{ padding: '0.75rem', borderBottom: '1px solid var(--color-border)', background: 'var(--color-background)' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-light)', textTransform: 'uppercase' }}>Switch App</span>
          </div>
          
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {currentApp !== 'citizen' && (
              <li>
                <a 
                  href="http://localhost:5173" 
                  style={{ display: 'block', padding: '0.75rem 1rem', textDecoration: 'none', color: 'var(--color-text)', borderBottom: '1px solid var(--color-border)' }}
                >
                  Citizen App
                </a>
              </li>
            )}
            
            {(userRole === UserRole.Authority || userRole === UserRole.Admin) && currentApp !== 'authority' && (
              <li>
                <a 
                  href="http://localhost:5174" 
                  style={{ display: 'block', padding: '0.75rem 1rem', textDecoration: 'none', color: 'var(--color-text)', borderBottom: '1px solid var(--color-border)' }}
                >
                  Authority Portal
                </a>
              </li>
            )}

            {userRole === UserRole.Admin && currentApp !== 'admin' && (
              <li>
                <a 
                  href="http://localhost:5175" 
                  style={{ display: 'block', padding: '0.75rem 1rem', textDecoration: 'none', color: 'var(--color-text)' }}
                >
                  Admin Console
                </a>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};
