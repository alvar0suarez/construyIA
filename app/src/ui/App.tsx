import { evaluar } from '../engine/cumplimiento';
import { getNormativa } from '../normativa/registry';
import { useStore } from '../state/store';
import { Cabecera } from './Cabecera';
import { PanelCumplimiento } from './PanelCumplimiento';
import { PanelLateral } from './PanelLateral';
import { PlanoEditor } from './PlanoEditor';

export function App() {
  const proyecto = useStore((s) => s.proyecto);
  const personalizada = useStore((s) => s.normativaPersonalizada);
  const normativa = getNormativa(proyecto.normativaId, personalizada);

  const evaluacion = evaluar(proyecto, normativa);

  return (
    <div className="app">
      <Cabecera />
      <div className="cuerpo">
        <PanelLateral normativa={normativa} />
        <main className="lienzo">
          <PlanoEditor normativa={normativa} />
        </main>
        <PanelCumplimiento evaluacion={evaluacion} normativa={normativa} />
      </div>
      <footer className="pie">
        ⚠️ Herramienta orientativa y <strong>no vinculante</strong>. Verifica
        siempre la normativa con el ayuntamiento y con tu arquitecto/a.
      </footer>
    </div>
  );
}
