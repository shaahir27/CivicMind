import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Import shared design system CSS
import '../../shared/src/design-system/tokens.css';
import '../../shared/src/design-system/components.css';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
