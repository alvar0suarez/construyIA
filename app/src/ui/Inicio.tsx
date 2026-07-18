import { NORMATIVAS } from '../normativa/registry';
import type { Pagina } from './App';

const BASE = './';

const PASOS = [
  { icono: '📍', titulo: 'Elige municipio', texto: 'Normativa cargada con fuentes oficiales.' },
  { icono: '📐', titulo: 'Boceta tu casa', texto: 'Parcela, estancias, ventanas y puertas.' },
  { icono: '✅', titulo: 'Cumple sin sustos', texto: 'Retranqueos, ocupación y altura, en vivo.' },
  { icono: '🚶', titulo: 'Recórrela en 3D', texto: 'Con el sol real de tu parcela. Compártela.' },
];

export function Inicio({ irA }: { irA: (p: Pagina) => void }) {
  const municipios = new Set(NORMATIVAS.map((n) => n.municipio)).size;

  return (
    <div className="inicio">
      <section className="hero">
        <p className="hero-kicker">Boceta · Valida · Recorre</p>
        <h1>
          Tu casa, <em>dentro de la normativa</em>
        </h1>
        <p className="hero-sub">
          Dibuja tu vivienda sobre tu parcela real y comprueba al instante qué
          permite la normativa de tu municipio.
        </p>
        <button className="btn-primario btn-hero" onClick={() => irA('diseno')}>
          Diseñar mi casa
        </button>
        <p className="hero-nota">
          Gratis · Sin registro · {municipios} municipios en el{' '}
          <button className="enlace" onClick={() => irA('cobertura')}>
            registro público
          </button>
        </p>
        <figure className="marco-navegador">
          <div className="marco-barra"><i /><i /><i /></div>
          <img
            src={`${BASE}landing-3d.png`}
            alt="Vista 3D de un boceto en ConstruyIA: la casa dentro de la envolvente edificable, con el sol y sus sombras"
            loading="eager"
          />
        </figure>
      </section>

      <section className="pasos">
        <div className="pasos-grid">
          {PASOS.map((p, i) => (
            <article key={p.titulo} className="paso">
              <span className="paso-icono">{p.icono}</span>
              <div>
                <h3>{i + 1}. {p.titulo}</h3>
                <p>{p.texto}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="dos-columnas">
        <figure className="marco-navegador">
          <div className="marco-barra"><i /><i /><i /></div>
          <img
            src={`${BASE}landing-plano.png`}
            alt="Editor 2D de ConstruyIA con el plano de una vivienda y el panel de cumplimiento normativo"
            loading="lazy"
          />
        </figure>
        <div className="dos-columnas-texto">
          <h2>El plano se corrige solo… avisándote a ti</h2>
          <p>
            Cada estancia que mueves se comprueba contra los retranqueos, la
            ocupación y la edificabilidad de tu ordenanza. Y si un dato de la
            normativa no te cuadra, lo corriges tú: cada parámetro es editable
            y cada fuente está citada.
          </p>
          <button className="btn-secundario" onClick={() => irA('diseno')}>
            Probar el editor →
          </button>
        </div>
      </section>

      <section className="banda-honesta">
        <p>
          <strong>Herramienta orientativa, nunca vinculante.</strong> La
          normativa la interpreta tu ayuntamiento y la casa la firma tu
          arquitecto/a — ConstruyIA te ayuda a llegar a ambos con las ideas
          claras.
        </p>
        <button className="btn-primario" onClick={() => irA('diseno')}>
          Empezar ahora
        </button>
      </section>
    </div>
  );
}
