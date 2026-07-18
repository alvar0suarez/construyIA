import { Suspense, lazy, useEffect, useState } from 'react';
import { evaluar } from '../engine/cumplimiento';
import { getNormativa } from '../normativa/registry';
import { useStore } from '../state/store';
import { Cabecera } from './Cabecera';
import { Cobertura } from './Cobertura';
import { PanelCumplimiento } from './PanelCumplimiento';
import { PanelLateral } from './PanelLateral';
import { PlanoEditor } from './PlanoEditor';

const Vista3D = lazy(() =>
  import('./Vista3D').then((m) => ({ default: m.Vista3D })),
);

export type Pagina = 'diseno' | 'cobertura';

export function App() {
  const proyecto = useStore((s) => s.proyecto);
  const personalizada = useStore((s) => s.normativaPersonalizada);
  const normativa = getNormativa(proyecto.normativaId, personalizada);

  const [pagina, setPagina] = useState<Pagina>('diseno');
  const [vista, setVista] = useState<'plano' | '3d'>('plano');

  useEffect(() => {
    const onTecla = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.target instanceof HTMLInputElement) return;
      const s = useStore.getState();
      if (e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        s.deshacer();
      } else if (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey)) {
        e.preventDefault();
        s.rehacer();
      }
    };
    window.addEventListener('keydown', onTecla);
    return () => window.removeEventListener('keydown', onTecla);
  }, []);

  const evaluacion = evaluar(proyecto, normativa);

  return (
    <div className="app">
      <Cabecera pagina={pagina} setPagina={setPagina} />
      {pagina === 'cobertura' ? (
        <div className="cuerpo cuerpo-scroll">
          <Cobertura />
        </div>
      ) : (
        <div className="cuerpo">
          <PanelLateral normativa={normativa} />
          <main className="lienzo">
            <div className="selector-vista">
              <button
                className={vista === 'plano' ? 'activa' : ''}
                onClick={() => setVista('plano')}
              >
                📐 Plano 2D
              </button>
              <button
                className={vista === '3d' ? 'activa' : ''}
                onClick={() => setVista('3d')}
              >
                🧊 Vista 3D
              </button>
            </div>
            {vista === 'plano' ? (
              <PlanoEditor normativa={normativa} />
            ) : (
              <Suspense fallback={<div className="cargando">Cargando vista 3D…</div>}>
                <Vista3D normativa={normativa} />
              </Suspense>
            )}
          </main>
          <PanelCumplimiento evaluacion={evaluacion} normativa={normativa} />
        </div>
      )}
      <footer className="pie">
        ⚠️ Herramienta orientativa y <strong>no vinculante</strong>. Verifica
        siempre la normativa con el ayuntamiento y con tu arquitecto/a.
      </footer>
    </div>
  );
}
