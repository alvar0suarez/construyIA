import type { Lado } from '../domain/types';
import { tipoEstancia } from '../engine/catalogo';
import { useStore } from '../state/store';

const LADOS: { id: Lado; nombre: string }[] = [
  { id: 'norte', nombre: 'Norte' },
  { id: 'sur', nombre: 'Sur' },
  { id: 'este', nombre: 'Este' },
  { id: 'oeste', nombre: 'Oeste' },
];

export function InspectorEstancia() {
  const proyecto = useStore((s) => s.proyecto);
  const plantaActiva = useStore((s) => s.plantaActiva);
  const seleccionId = useStore((s) => s.seleccionId);
  const seleccionHuecoId = useStore((s) => s.seleccionHuecoId);
  const setSeleccionHueco = useStore((s) => s.setSeleccionHueco);
  const updateEstancia = useStore((s) => s.updateEstancia);
  const duplicarEstancia = useStore((s) => s.duplicarEstancia);
  const marcarHistoria = useStore((s) => s.marcarHistoria);
  const addHueco = useStore((s) => s.addHueco);
  const updateHueco = useStore((s) => s.updateHueco);
  const removeHueco = useStore((s) => s.removeHueco);

  const estancia = (proyecto.plantas[plantaActiva] ?? []).find(
    (e) => e.id === seleccionId,
  );
  if (!estancia) return null;
  const def = tipoEstancia(estancia.tipo);
  const huecos = estancia.huecos ?? [];

  const numero = (
    valor: number,
    fn: (n: number) => void,
    step = 0.1,
  ) => ({
    type: 'number' as const,
    value: Math.round(valor * 100) / 100,
    step,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      marcarHistoria();
      fn(parseFloat(e.target.value) || 0);
    },
  });

  const longitudPared = (lado: Lado) =>
    lado === 'norte' || lado === 'sur' ? estancia.ancho : estancia.fondo;

  return (
    <section className="inspector">
      <h3>
        {def.icono} {def.nombre}
        <span className="inspector-area">
          {(estancia.ancho * estancia.fondo).toFixed(1)} m²
          <button
            className="duplicar"
            title="Duplicar estancia (con sus huecos)"
            onClick={() => duplicarEstancia(estancia.id)}
          >
            ⧉
          </button>
        </span>
      </h3>
      <div className="grid-normativa">
        <label>Ancho (m)<input {...numero(estancia.ancho, (n) => updateEstancia(estancia.id, { ancho: Math.max(0.5, n) }))} /></label>
        <label>Fondo (m)<input {...numero(estancia.fondo, (n) => updateEstancia(estancia.id, { fondo: Math.max(0.5, n) }))} /></label>
        <label>X (m)<input {...numero(estancia.x, (n) => updateEstancia(estancia.id, { x: Math.max(0, n) }))} /></label>
        <label>Y (m)<input {...numero(estancia.y, (n) => updateEstancia(estancia.id, { y: Math.max(0, n) }))} /></label>
      </div>

      <div className="inspector-huecos-cab">
        <h4>Ventanas y puertas</h4>
        <div>
          <button onClick={() => addHueco(estancia.id, 'ventana')}>+ Ventana</button>
          <button onClick={() => addHueco(estancia.id, 'puerta')}>+ Puerta</button>
        </div>
      </div>
      {huecos.length === 0 && (
        <p className="inspector-vacio">
          Sin huecos. Las ventanas dan luz (y avisos bioclimáticos) y se ven
          en la vista 3D e interior.
        </p>
      )}
      {huecos.map((h) => (
        <div
          key={h.id}
          className={`hueco-ficha${h.id === seleccionHuecoId ? ' seleccionada' : ''}`}
          onClick={() => setSeleccionHueco(h.id)}
        >
          <div className="hueco-titulo">
            {h.tipo === 'ventana' ? '🪟 Ventana' : '🚪 Puerta'}
            <button
              className="borrar"
              onClick={(ev) => {
                ev.stopPropagation();
                removeHueco(estancia.id, h.id);
              }}
            >
              🗑
            </button>
          </div>
          <div className="grid-normativa">
            <label>
              Pared
              <select
                value={h.lado}
                onChange={(e) => {
                  marcarHistoria();
                  const lado = e.target.value as Lado;
                  updateHueco(estancia.id, h.id, {
                    lado,
                    offset: Math.min(h.offset, Math.max(0, longitudPared(lado) - h.ancho)),
                  });
                }}
              >
                {LADOS.map((l) => (
                  <option key={l.id} value={l.id}>{l.nombre}</option>
                ))}
              </select>
            </label>
            <label>Posición (m)<input {...numero(h.offset, (n) => updateHueco(estancia.id, h.id, { offset: Math.min(Math.max(0, n), Math.max(0, longitudPared(h.lado) - h.ancho)) }))} /></label>
            <label>Ancho (m)<input {...numero(h.ancho, (n) => updateHueco(estancia.id, h.id, { ancho: Math.max(0.3, n) }))} /></label>
            <label>Alto (m)<input {...numero(h.alto, (n) => updateHueco(estancia.id, h.id, { alto: Math.max(0.3, n) }))} /></label>
            {h.tipo === 'ventana' && (
              <label>Antepecho (m)<input {...numero(h.antepecho, (n) => updateHueco(estancia.id, h.id, { antepecho: Math.max(0, n) }))} /></label>
            )}
          </div>
        </div>
      ))}
    </section>
  );
}
