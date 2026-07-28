export type Paso = 'parcela' | 'habitaciones' | '3d' | 'asistente';

export const PASOS: { id: Paso; n: number; nombre: string; icono: string }[] = [
  { id: 'parcela', n: 1, nombre: 'Parcela', icono: '📐' },
  { id: 'habitaciones', n: 2, nombre: 'Habitaciones', icono: '🛋️' },
  { id: '3d', n: 3, nombre: 'Ver en 3D', icono: '🏠' },
  { id: 'asistente', n: 4, nombre: 'Asistente', icono: '✨' },
];

/** Barra de pasos: guía el diseño de principio a fin (parcela → 3D). */
export function Pasos({ paso, setPaso }: { paso: Paso; setPaso: (p: Paso) => void }) {
  const activo = PASOS.findIndex((p) => p.id === paso);
  return (
    <nav className="pasos" aria-label="Pasos del diseño">
      {PASOS.map((p, i) => (
        <button
          key={p.id}
          className={`paso${p.id === paso ? ' activo' : ''}${i < activo ? ' hecho' : ''}`}
          onClick={() => setPaso(p.id)}
        >
          <span className="paso-num">{i < activo ? '✓' : p.n}</span>
          <span className="paso-nombre">
            <span className="paso-icono">{p.icono}</span>
            {p.nombre}
          </span>
        </button>
      ))}
    </nav>
  );
}

/** Botones anterior / siguiente al pie de cada paso. */
export function PasosNav({ paso, setPaso }: { paso: Paso; setPaso: (p: Paso) => void }) {
  const i = PASOS.findIndex((p) => p.id === paso);
  const anterior = PASOS[i - 1];
  const siguiente = PASOS[i + 1];
  return (
    <div className="pasos-nav">
      {anterior ? (
        <button className="paso-btn" onClick={() => setPaso(anterior.id)}>
          ← {anterior.nombre}
        </button>
      ) : (
        <span />
      )}
      {siguiente && (
        <button className="paso-btn primario" onClick={() => setPaso(siguiente.id)}>
          Siguiente: {siguiente.nombre} →
        </button>
      )}
    </div>
  );
}
