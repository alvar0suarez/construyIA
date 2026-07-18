import type { Lado, PlantaId } from '../domain/types';
import { PLANTAS } from '../domain/types';
import { CATALOGO } from '../engine/catalogo';
import type { NormativaMunicipal } from '../normativa/schema';
import { NORMATIVAS, PERSONALIZADA_ID } from '../normativa/registry';
import { useStore } from '../state/store';
import { InspectorEstancia } from './InspectorEstancia';

const LADOS: { id: Lado; nombre: string }[] = [
  { id: 'norte', nombre: 'Norte (arriba)' },
  { id: 'sur', nombre: 'Sur (abajo)' },
  { id: 'este', nombre: 'Este (derecha)' },
  { id: 'oeste', nombre: 'Oeste (izquierda)' },
];

const ETIQUETA_VERIFICACION: Record<NormativaMunicipal['verificacion'], string> = {
  contrastada: '📗 contrastada con el documento oficial (no es validación oficial)',
  borrador: '⚠️ borrador — pendiente de cotejo con el documento oficial',
  'interpretada-ia': '🤖 interpretada por IA — pendiente de revisión humana',
  personalizada: '✏️ personalizada',
};

export function PanelLateral({ normativa }: { normativa: NormativaMunicipal }) {
  const parcela = useStore((s) => s.proyecto.parcela);
  const normativaId = useStore((s) => s.proyecto.normativaId);
  const ajustes = useStore((s) => s.proyecto.ajustesNormativa?.[s.proyecto.normativaId]);
  const alturaPorPlanta = useStore((s) => s.proyecto.alturaPorPlanta);
  const plantaActiva = useStore((s) => s.plantaActiva);
  const setParcela = useStore((s) => s.setParcela);
  const setNormativaId = useStore((s) => s.setNormativaId);
  const setPersonalizada = useStore((s) => s.setPersonalizada);
  const setAjusteNormativa = useStore((s) => s.setAjusteNormativa);
  const resetAjustesNormativa = useStore((s) => s.resetAjustesNormativa);
  const setAlturaPorPlanta = useStore((s) => s.setAlturaPorPlanta);
  const setPlantaActiva = useStore((s) => s.setPlantaActiva);
  const addEstancia = useStore((s) => s.addEstancia);

  const esPersonalizada = normativaId === PERSONALIZADA_ID;
  const hayAjustes = !!ajustes && Object.keys(ajustes).length > 0;
  // En la personalizada se edita la plantilla; en las demás, los cambios se
  // guardan como ajustes del usuario sobre la fuente.
  const editar = esPersonalizada ? setPersonalizada : setAjusteNormativa;

  const numero = (v: number, fn: (n: number) => void) => ({
    type: 'number' as const,
    value: Number.isFinite(v) ? v : 0,
    min: 0,
    step: 0.5,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      fn(parseFloat(e.target.value) || 0),
  });

  return (
    <aside className="panel-lateral">
      <section>
        <h3>📜 Normativa</h3>
        <select
          value={normativaId}
          onChange={(e) => setNormativaId(e.target.value)}
        >
          {NORMATIVAS.map((n) => (
            <option key={n.id} value={n.id}>
              {n.municipio} — {n.zona}
            </option>
          ))}
          <option value={PERSONALIZADA_ID}>Personalizada…</option>
        </select>
        <p className="verificacion">
          Estado: {ETIQUETA_VERIFICACION[normativa.verificacion]}
        </p>
        {hayAjustes && (
          <p className="aviso-ajustes">
            ✏️ Has modificado parámetros de esta normativa.
            <button onClick={resetAjustesNormativa}>↺ Restaurar fuente</button>
          </p>
        )}
        <div className="grid-normativa">
          <label>Retr. frente (m)<input {...numero(normativa.retranqueos.frente, (n) => editar({ retranqueos: { ...normativa.retranqueos, frente: n } }))} /></label>
          <label>Retr. fondo (m)<input {...numero(normativa.retranqueos.fondo, (n) => editar({ retranqueos: { ...normativa.retranqueos, fondo: n } }))} /></label>
          <label>Retr. lateral (m)<input {...numero(normativa.retranqueos.lateral, (n) => editar({ retranqueos: { ...normativa.retranqueos, lateral: n } }))} /></label>
          <label>Ocupación máx. (%)<input {...numero(normativa.ocupacionMaxima, (n) => editar({ ocupacionMaxima: n }))} /></label>
          <label>Edificab. (m²/m²)<input {...numero(normativa.edificabilidadMaxima, (n) => editar({ edificabilidadMaxima: n }))} step={0.05} /></label>
          <label>Altura máx. (m)<input {...numero(normativa.alturaMaxima, (n) => editar({ alturaMaxima: n }))} /></label>
          <label>Plantas máx.<input {...numero(normativa.plantasMaximas, (n) => editar({ plantasMaximas: Math.round(n) }))} step={1} /></label>
          <label>Parcela mín. (m²)<input {...numero(normativa.parcelaMinima ?? 0, (n) => editar({ parcelaMinima: n || undefined }))} step={50} /></label>
          <label>Retr. piscina (m)<input {...numero(normativa.retranqueoPiscina ?? 0, (n) => editar({ retranqueoPiscina: n || undefined }))} /></label>
        </div>
        {!esPersonalizada && (
          <details>
            <summary>Notas y fuentes oficiales</summary>
            {normativa.notas && <p className="notas">{normativa.notas}</p>}
            {normativa.fuentes.length > 0 && (
              <ul className="fuentes">
                {normativa.fuentes.map((f) => (
                  <li key={f.titulo}>
                    {f.url ? <a href={f.url} target="_blank" rel="noreferrer">{f.titulo}</a> : f.titulo}
                  </li>
                ))}
              </ul>
            )}
          </details>
        )}
      </section>

      <section>
        <h3>📐 Parcela</h3>
        <div className="grid-normativa">
          <label>Lado norte (m)<input {...numero(parcela.norte, (n) => setParcela({ norte: n }))} /></label>
          <label>Lado sur (m)<input {...numero(parcela.sur, (n) => setParcela({ sur: n }))} /></label>
          <label>Lado este (m)<input {...numero(parcela.este, (n) => setParcela({ este: n }))} /></label>
          <label>Lado oeste (m)<input {...numero(parcela.oeste, (n) => setParcela({ oeste: n }))} /></label>
        </div>
        <label className="fila">
          Frente / acceso:
          <select
            value={parcela.frente}
            onChange={(e) => setParcela({ frente: e.target.value as Lado })}
          >
            {LADOS.map((l) => (
              <option key={l.id} value={l.id}>{l.nombre}</option>
            ))}
          </select>
        </label>
        <label className="fila">
          Altura por planta (m):
          <input {...numero(alturaPorPlanta, setAlturaPorPlanta)} step={0.1} />
        </label>
      </section>

      <section>
        <h3>🏗 Planta</h3>
        <div className="selector-planta">
          {PLANTAS.map((p) => (
            <button
              key={p.id}
              className={plantaActiva === p.id ? 'activa' : ''}
              onClick={() => setPlantaActiva(p.id as PlantaId)}
            >
              {p.nombre}
            </button>
          ))}
        </div>
      </section>

      <InspectorEstancia />

      <section>
        <h3>➕ Añadir estancia</h3>
        <div className="paleta">
          {CATALOGO.map((t) => (
            <button
              key={t.id}
              title={t.minArea ? `${t.nombre} (mín. ${t.minArea} m²)` : t.nombre}
              onClick={() => addEstancia(t.id)}
            >
              <span className="icono">{t.icono}</span>
              <span>{t.nombre}</span>
            </button>
          ))}
        </div>
      </section>
    </aside>
  );
}
