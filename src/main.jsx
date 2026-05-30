

import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';


function renderApp() {
  console.log('[main.jsx] renderApp aufgerufen');
  const rootElement = document.getElementById('root');
  console.log('[main.jsx] rootElement:', rootElement);
  if (rootElement) {
    try {
      console.log('[main.jsx] Starte React-Mount...');
      createRoot(rootElement).render(
        <StrictMode>
          <App />
        </StrictMode>
      );
      console.log('[main.jsx] React erfolgreich gemountet.');
    } catch (err) {
      console.error('[main.jsx] Fehler bei React-Initialisierung:', err);
    }
  } else {
    console.error('[main.jsx] Kein #root-Element gefunden!');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderApp);
} else {
  renderApp();
}
