import { Suspense, lazy, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { evaluar } from '../engine/cumplimiento';
import { getNormativa, type AjustesNormativa } from '../normativa/registry';
import { useStore } from '../state/store';
import { Asistente } from './Asistente';
import { Cabecera } from './Cabecera';
import { Cobertura } from './Cobertura';
import { Inicio } from './Inicio';
import { PanelCumplimiento } from './PanelCumplimiento';
import { PanelLateral } from './PanelLateral';
import { Pasos, PasosNav, type Paso } from './Pasos';
import { PlanoEditor } from './PlanoEditor';

const Vista3D = lazy(() =>
  import('./Vista3D').then((m) => ({ default: m.Vista3D })),
);

export type Pagina = 'inicio' | 'diseno' | 'cobertura';

export function App() {
  const proyecto = useStore((s) => s.proyecto);
  const personalizada = useStore((s) => s.normativaPersonalizada);
  const normativa = getNormativa(
    proyecto.normativaId,
    personalizada,
    proyecto.ajustesNormativa?.[proyecto.normativaId] as AjustesNormativa | undefined,
  );

  // La landing solo se muestra como puerta de entrada la primera vez; si ya
  // hay un proyecto empezado, el usuario aterriza directamente en su diseño.
  const [pagina, setPagina] = useState<Pagina>(() =>
    Object.values(useStore.getState().proyecto.plantas).some((p) => p.length > 0)
      ? 'diseno'
      : 'inicio',
  );
  const [paso, setPaso] = useState<Paso>(() =>
    Object.values(useStore.getState().proyecto.plantas).some((p) => p.length > 0)
      ? 'habitaciones'
      : 'parcela',
  );

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

  // La evaluación se difiere para que el arrastre de estancias siga fluido
  // en dispositivos lentos: el plano responde al momento y el panel de
  // cumplimiento se actualiza un instante después.
  const proyectoDiferido = useDeferredValue(proyecto);
  const normativaDiferida = useDeferredValue(normativa);
  const evaluacion = useMemo(
    () => evaluar(proyectoDiferido, normativaDiferida),
    [proyectoDiferido, normativaDiferida],
  );

  return (
    <div className="app">
      <Cabecera pagina={pagina} setPagina={setPagina} />
      {pagina === 'inicio' ? (
        <div className="cuerpo cuerpo-scroll">
          <Inicio irA={setPagina} />
        </div>
      ) : pagina === 'cobertura' ? (
        <div className="cuerpo cuerpo-scroll">
          <Cobertura />
        </div>
      ) : (
        <>
          <Pasos paso={paso} setPaso={setPaso} />
          <div className="cuerpo">
            {paso === 'parcela' && (
              <>
                <PanelLateral normativa={normativa} seccion="parcela" />
                <main className="lienzo">
                  <PlanoEditor normativa={normativa} />
                  <PasosNav paso={paso} setPaso={setPaso} />
                </main>
              </>
            )}
            {paso === 'habitaciones' && (
              <>
                <PanelLateral normativa={normativa} seccion="distribucion" />
                <main className="lienzo">
                  <PlanoEditor normativa={normativa} />
                  <PasosNav paso={paso} setPaso={setPaso} />
                </main>
                <PanelCumplimiento
                  evaluacion={evaluacion}
                  normativa={normativa}
                  conAsistente={false}
                />
              </>
            )}
            {paso === '3d' && (
              <main className="lienzo">
                <Suspense fallback={<div className="cargando">Cargando vista 3D…</div>}>
                  <Vista3D normativa={normativa} />
                </Suspense>
                <PasosNav paso={paso} setPaso={setPaso} />
              </main>
            )}
            {paso === 'asistente' && (
              <>
                <main className="lienzo">
                  <PlanoEditor normativa={normativa} />
                  <PasosNav paso={paso} setPaso={setPaso} />
                </main>
                <aside className="panel-cumplimiento">
                  <Asistente normativa={normativa} />
                </aside>
              </>
            )}
          </div>
        </>
      )}
      <footer className="pie">
        ⚠️ Herramienta orientativa y <strong>no vinculante</strong>. Verifica
        siempre la normativa con el ayuntamiento y con tu arquitecto/a.
      </footer>
    </div>
  );
}
