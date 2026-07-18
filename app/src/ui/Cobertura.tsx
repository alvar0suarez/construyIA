import { NORMATIVAS } from '../normativa/registry';
import type { NormativaMunicipal } from '../normativa/schema';
import { MAPA_VIEWBOX, PROVINCIAS, proyectar } from './mapa/espanaProvincias';

const ETIQUETA: Record<NormativaMunicipal['verificacion'], { texto: string; clase: string }> = {
  contrastada: { texto: '📗 Contrastada', clase: 'ok' },
  borrador: { texto: '⚠️ Borrador', clase: 'aviso' },
  'interpretada-ia': { texto: '🤖 Interpretada por IA', clase: 'aviso' },
  personalizada: { texto: '✏️ Personalizada', clase: '' },
};

const REPO_URL = 'https://github.com/alvar0suarez/construyIA';

export function Cobertura() {
  const municipios = [...new Set(NORMATIVAS.map((n) => n.municipio))];
  const contrastadas = new Set(
    NORMATIVAS.filter((n) => n.verificacion === 'contrastada').map((n) => n.municipio),
  ).size;
  // Un punto por municipio en el mapa (verde si alguna de sus normativas
  // está contrastada), aunque tenga varias zonas/grados cargados.
  const puntos = municipios
    .map((m) => {
      const deEste = NORMATIVAS.filter((n) => n.municipio === m && n.ubicacion);
      if (deEste.length === 0) return null;
      return {
        municipio: m,
        ubicacion: deEste[0].ubicacion!,
        contrastada: deEste.some((n) => n.verificacion === 'contrastada'),
        zonas: NORMATIVAS.filter((n) => n.municipio === m).length,
      };
    })
    .filter(Boolean) as {
    municipio: string;
    ubicacion: { lat: number; lng: number };
    contrastada: boolean;
    zonas: number;
  }[];

  return (
    <div className="cobertura">
      <section className="cobertura-intro">
        <h2>🗺 Cobertura de normativa municipal</h2>
        <p>
          Registro público y auditable de las normativas urbanísticas cargadas
          en ConstruyIA: qué municipios están cubiertos, con qué nivel de
          verificación, cuándo se revisaron por última vez y de qué fuentes
          oficiales proceden. El objetivo: <strong>toda España en verde</strong>.
        </p>
        <div className="cobertura-stats">
          <div className="stat">
            <div className="stat-num">{municipios.length}</div>
            <div className="stat-label">municipios cargados ({NORMATIVAS.length} zonas/grados)</div>
          </div>
          <div className="stat">
            <div className="stat-num">{contrastadas}</div>
            <div className="stat-label">contrastados con doc. oficial</div>
          </div>
          <div className="stat">
            <div className="stat-num">8.131</div>
            <div className="stat-label">municipios en España</div>
          </div>
        </div>
      </section>

      <section className="cobertura-mapa">
        <svg viewBox={MAPA_VIEWBOX} role="img" aria-label="Mapa de cobertura de España">
          {PROVINCIAS.map((p) => (
            <path key={p.n} d={p.d} className="mapa-provincia">
              <title>{p.n}</title>
            </path>
          ))}
          {puntos.map((p, i) => {
            const pt = proyectar(p.ubicacion.lat, p.ubicacion.lng);
            // Alterna la posición de la etiqueta para que municipios
            // cercanos no se pisen entre sí.
            const dy = i % 2 === 0 ? -12 : 22;
            return (
              <g key={p.municipio}>
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={7}
                  className={p.contrastada ? 'mapa-punto ok' : 'mapa-punto aviso'}
                >
                  <title>{`${p.municipio} — ${p.zonas} zona(s)/grado(s)`}</title>
                </circle>
                <text x={pt.x + 10} y={pt.y + dy} className="mapa-etiqueta">
                  {p.municipio}
                </text>
              </g>
            );
          })}
        </svg>
        <div className="mapa-leyenda">
          <span><i className="dot ok" /> contrastada con el documento oficial</span>
          <span><i className="dot aviso" /> borrador / IA pendiente de revisión</span>
        </div>
        <p className="mapa-nota">
          <strong>Qué significan los estados</strong>: «contrastada» indica que
          una persona del proyecto ha cotejado cada parámetro con el documento
          oficial citado, en la fecha indicada. <strong>Ningún estado implica
          validación por el ayuntamiento ni por organismo oficial alguno</strong>;
          la interpretación vinculante de la normativa corresponde siempre al
          ayuntamiento.
        </p>
      </section>

      <section>
        <h3>📋 Tabla de auditoría</h3>
        <table className="tabla-auditoria">
          <thead>
            <tr>
              <th>Municipio</th>
              <th>Zona / ordenanza</th>
              <th>Estado</th>
              <th>Última revisión</th>
              <th>Fuentes oficiales</th>
            </tr>
          </thead>
          <tbody>
            {NORMATIVAS.map((n) => (
              <tr key={n.id}>
                <td>{n.municipio} <span className="provincia">({n.provincia})</span></td>
                <td>{n.zona}</td>
                <td><span className={`chip ${ETIQUETA[n.verificacion].clase}`}>{ETIQUETA[n.verificacion].texto}</span></td>
                <td>{n.fechaRevision || '—'}</td>
                <td>
                  {n.fuentes.map((fu, i) => (
                    <span key={fu.titulo}>
                      {i > 0 && ' · '}
                      {fu.url ? (
                        <a href={fu.url} target="_blank" rel="noreferrer">{fu.titulo}</a>
                      ) : (
                        fu.titulo
                      )}
                    </span>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="cobertura-cta">
        <h3>➕ ¿Falta tu municipio?</h3>
        <p>
          Puedes usar la <strong>normativa personalizada</strong> en la pestaña
          de diseño introduciendo los parámetros de tu ficha urbanística. Y si
          quieres que lo incorporemos al registro público, abre una petición
          con el PDF de la normativa en{' '}
          <a href={`${REPO_URL}/issues/new`} target="_blank" rel="noreferrer">
            el repositorio del proyecto
          </a>
          . En la hoja de ruta: subida de PDF con interpretación asistida por
          IA y revisión humana antes de marcarse como contrastada.
        </p>
      </section>
    </div>
  );
}
