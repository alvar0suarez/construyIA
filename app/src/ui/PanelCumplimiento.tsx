import type { Evaluacion, ResultadoRegla } from '../engine/cumplimiento';
import type { NormativaMunicipal } from '../normativa/schema';

const ICONO: Record<ResultadoRegla['nivel'], string> = {
  ok: '✅',
  aviso: '⚠️',
  error: '❌',
};

function Fila({ r }: { r: ResultadoRegla }) {
  return (
    <li className={`regla ${r.nivel}`}>
      <span className="regla-icono">{ICONO[r.nivel]}</span>
      <div>
        <div>{r.mensaje}</div>
        {(r.valor || r.limite) && (
          <div className="regla-datos">
            {r.valor && <span>{r.valor}</span>}
            {r.valor && r.limite && ' · '}
            {r.limite && <span>límite: {r.limite}</span>}
          </div>
        )}
      </div>
    </li>
  );
}

export function PanelCumplimiento({
  evaluacion,
  normativa,
}: {
  evaluacion: Evaluacion;
  normativa: NormativaMunicipal;
}) {
  const { metricas: m, normativa: reglas, recomendaciones } = evaluacion;
  const errores = reglas.filter((r) => r.nivel === 'error').length;

  const f = (n: number, dec = 1) =>
    n.toLocaleString('es-ES', { maximumFractionDigits: dec });

  return (
    <aside className="panel-cumplimiento">
      <section>
        <h3>📊 Resumen</h3>
        <table className="metricas">
          <tbody>
            <tr><td>Parcela</td><td>{f(m.areaParcela, 0)} m²</td></tr>
            <tr><td>Ocupación</td><td>{f(m.areaOcupada, 0)} m² ({f(m.ocupacionPct)} %)</td></tr>
            <tr><td>Sup. computable</td><td>{f(m.superficieComputable, 0)} m²</td></tr>
            <tr><td>Edificabilidad</td><td>{f(m.edificabilidad, 2)} / {f(normativa.edificabilidadMaxima, 2)} m²/m²</td></tr>
            <tr><td>Altura</td><td>{f(m.alturaEdificacion)} / {f(normativa.alturaMaxima)} m</td></tr>
            <tr><td>Sup. útil aprox.</td><td>{f(m.superficieUtilAprox, 0)} m²</td></tr>
            <tr><td>Dormitorios / baños</td><td>{m.numDormitorios} / {m.numBanyos}</td></tr>
          </tbody>
        </table>
      </section>

      <section>
        <h3>
          📜 Normativa{' '}
          <span className={errores === 0 ? 'chip ok' : 'chip error'}>
            {errores === 0 ? 'CUMPLE' : `${errores} incumplimiento(s)`}
          </span>
        </h3>
        <ul className="lista-reglas">
          {reglas.map((r, i) => (
            <Fila key={i} r={r} />
          ))}
        </ul>
      </section>

      {recomendaciones.length > 0 && (
        <section>
          <h3>💡 Recomendaciones</h3>
          <ul className="lista-reglas">
            {recomendaciones.map((r, i) => (
              <Fila key={i} r={r} />
            ))}
          </ul>
        </section>
      )}
    </aside>
  );
}
