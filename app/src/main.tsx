import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './ui/App';
import './ui/estilos.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// PWA: registrar el service worker solo en producción. La ruta es relativa
// para que funcione bajo la subruta de GitHub Pages.
if ((import.meta as { env?: { PROD?: boolean } }).env?.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {
      /* sin conexión o no soportado: la app sigue funcionando online */
    });
  });
}
