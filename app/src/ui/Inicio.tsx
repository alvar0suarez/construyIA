import { NORMATIVAS } from '../normativa/registry';
import type { Pagina } from './App';

const PASOS = [
  {
    icono: '📍',
    titulo: 'Elige tu municipio',
    texto:
      'Carga la normativa urbanística de tu zona, con fuentes oficiales citadas y nivel de confianza visible. ¿No está? Introduce tú los parámetros de tu ficha urbanística.',
  },
  {
    icono: '📐',
    titulo: 'Dibuja parcela y vivienda',
    texto:
      'Define los lados y el frente de tu parcela y boceta las estancias por plantas: se pegan solas borde con borde, con ventanas y puertas donde tú quieras.',
  },
  {
    icono: '✅',
    titulo: 'Valida al instante',
    texto:
      'Retranqueos, ocupación, edificabilidad, altura… cada cambio se comprueba contra la normativa en tiempo real, con recomendaciones de diseño y habitabilidad.',
  },
  {
    icono: '🧊',
    titulo: 'Vívela antes de construirla',
    texto:
      'Recorre tu casa en 3D y por dentro en primera persona, con el sol real de tu parcela según el día y la hora. Exporta el boceto y compártelo con quien quieras.',
  },
];

const RASGOS = [
  { icono: '📜', texto: 'Normativa con fuentes oficiales y niveles de confianza — nunca te diremos que algo está "verificado" sin decirte por quién.' },
  { icono: '☀️', texto: 'Sol de verdad: amanecer, anochecer, horas de luz y sombras de tu futura casa en cualquier fecha.' },
  { icono: '🚶', texto: 'Paseo interior en primera persona, también desde el móvil.' },
  { icono: '💡', texto: 'Recomendaciones que evitan disgustos: luz natural, baños, garaje, distribución.' },
  { icono: '💾', texto: 'Tus bocetos son tuyos: se guardan en tu navegador y se comparten por fichero.' },
  { icono: '🗺', texto: 'Registro de cobertura público y auditable, municipio a municipio.' },
];

export function Inicio({ irA }: { irA: (p: Pagina) => void }) {
  const municipios = new Set(NORMATIVAS.map((n) => n.municipio)).size;

  return (
    <div className="inicio">
      <section className="hero">
        <div className="hero-texto">
          <p className="hero-kicker">Urbanismo sin sustos, bocetos con criterio</p>
          <h1>
            Diseña tu casa <em>dentro de la normativa</em>
          </h1>
          <p className="hero-sub">
            Comprar parcela y soñar tu vivienda no debería exigir un máster en
            urbanismo. ConstruyIA carga la normativa de tu municipio, te deja
            bocetar en 2D y 3D, y te avisa al momento de lo que cumple y lo
            que no. Gratis, en tu navegador.
          </p>
          <div className="hero-cta">
            <button className="btn-primario" onClick={() => irA('diseno')}>
              ✏️ Empezar a diseñar
            </button>
            <button className="btn-secundario" onClick={() => irA('cobertura')}>
              🗺 Ver cobertura de municipios
            </button>
          </div>
          <div className="hero-stats">
            <span><strong>{municipios}</strong> municipios cargados</span>
            <span><strong>{NORMATIVAS.length}</strong> zonas y grados</span>
            <span><strong>0 €</strong> y sin registro</span>
          </div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          {/* Mini boceto ilustrativo: parcela, envolvente y casa con sol */}
          <svg viewBox="0 0 320 260">
            <defs>
              <linearGradient id="cielo" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#fdf4df" />
                <stop offset="1" stopColor="#f3ede2" />
              </linearGradient>
            </defs>
            <rect x="0" y="0" width="320" height="260" rx="18" fill="url(#cielo)" />
            <circle cx="264" cy="52" r="26" fill="#f4b942" opacity="0.9" />
            <path d="M264 52 L180 200" stroke="#f4b942" strokeDasharray="4 6" strokeWidth="2" opacity="0.5" />
            <rect x="36" y="96" width="212" height="132" rx="8" fill="#dcead2" stroke="#7a8a6f" strokeWidth="2" />
            <rect x="58" y="114" width="168" height="96" rx="4" fill="none" stroke="#2e7d5b" strokeWidth="2" strokeDasharray="7 5" />
            <rect x="78" y="132" width="76" height="60" rx="3" fill="#fffdf9" stroke="#5d574d" strokeWidth="2.5" />
            <polygon points="78,132 116,108 154,132" fill="#c2703d" stroke="#5d574d" strokeWidth="2.5" strokeLinejoin="round" />
            <rect x="90" y="150" width="18" height="18" rx="2" fill="#bfe0f5" stroke="#5d574d" strokeWidth="2" />
            <rect x="126" y="150" width="16" height="42" rx="2" fill="#8d6e63" stroke="#5d574d" strokeWidth="2" />
            <rect x="168" y="150" width="44" height="30" rx="15" fill="#9ad4f0" stroke="#5d574d" strokeWidth="2" />
            <path d="M78 200 Q120 236 248 210" stroke="#7a8a6f" strokeWidth="2" fill="none" strokeDasharray="2 5" />
            <g fontSize="11" fill="#1f5c46" fontFamily="system-ui">
              <text x="60" y="110">envolvente edificable</text>
              <text x="222" y="94" textAnchor="end" fill="#b26a00">☀ 14:30</text>
            </g>
            <g fontSize="11" fill="#c04a3a" fontFamily="system-ui">
              <text x="42" y="226">↔ retranqueos</text>
            </g>
          </svg>
        </div>
      </section>

      <section className="pasos">
        <h2>De la parcela al paseo por tu salón, en cuatro pasos</h2>
        <div className="pasos-grid">
          {PASOS.map((p, i) => (
            <article key={p.titulo} className="paso">
              <div className="paso-num">{i + 1}</div>
              <div className="paso-icono">{p.icono}</div>
              <h3>{p.titulo}</h3>
              <p>{p.texto}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rasgos">
        <h2>Pensada para decidir mejor</h2>
        <div className="rasgos-grid">
          {RASGOS.map((r) => (
            <div key={r.texto} className="rasgo">
              <span className="rasgo-icono">{r.icono}</span>
              <p>{r.texto}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="banda-honesta">
        <h2>⚠️ Una herramienta honesta</h2>
        <p>
          ConstruyIA es una ayuda para pensar y comparar, <strong>no un
          proyecto técnico ni una validación oficial</strong>. La
          interpretación vinculante de la normativa corresponde siempre al
          ayuntamiento, y tu arquitecto/a es quien convierte el boceto en
          casa. Cada dato del registro indica su fuente y su nivel de
          confianza — y si detectas un error, puedes corregir cualquier
          parámetro tú mismo.
        </p>
        <button className="btn-primario" onClick={() => irA('diseno')}>
          Empezar ahora →
        </button>
      </section>
    </div>
  );
}
