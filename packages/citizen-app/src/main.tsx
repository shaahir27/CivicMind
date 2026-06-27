import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.js';

// Import shared design system CSS
import '../../shared/src/design-system/tokens.css';
import '../../shared/src/design-system/components.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
