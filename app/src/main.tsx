import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './ui/App';
import { LimiteError } from './ui/LimiteError';
import './ui/estilos.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LimiteError>
      <App />
    </LimiteError>
  </React.StrictMode>,
);

// Ya NO se registra ningún service worker: el SW de caché causó dos veces que
// la web saliera en blanco (servía un index.html cacheado apuntando a assets
// con hash ya inexistentes). El fichero public/sw.js ahora es un
// "autodestructor" que solo desregistra el SW antiguo en los navegadores que
// aún lo tuvieran. Si en el futuro se reintroduce PWA, hacerlo con una
// estrategia de red-primero para el HTML y verificándolo bien.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then((regs) => regs.forEach((r) => r.unregister()))
    .catch(() => {
      /* sin permisos o no soportado: nada que hacer */
    });
}
