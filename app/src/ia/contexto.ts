import { PLANTAS, type Proyecto } from '../domain/types';
import { tipoEstancia } from '../engine/catalogo';
import type { Evaluacion } from '../engine/cumplimiento';
import { dimensionesParcela, envolventeEdificable } from '../engine/geometria';
import type { NormativaMunicipal } from '../normativa/schema';

/**
 * Resumen en texto del proyecto y la normativa activa, para dar contexto al
 * asistente de IA. Es TS puro (testeable) y no incluye datos personales.
 */
export function resumenProyecto(
  proyecto: Proyecto,
  normativa: NormativaMunicipal,
  evaluacion: Evaluacion,
): string {
  const d = dimensionesParcela(proyecto.parcela);
  const m = evaluacion.metricas;
  const l: string[] = [];

  l.push(`NORMATIVA: ${normativa.municipio} — ${normativa.zona} (nivel: ${normativa.verificacion}).`);
  l.push(
    `Límites: retranqueos frente ${normativa.retranqueos.frente} m / fondo ${normativa.retranqueos.fondo} m / lateral ${normativa.retranqueos.lateral} m; ` +
      `ocupación máx ${normativa.ocupacionMaxima} %; edificabilidad máx ${normativa.edificabilidadMaxima} m²/m²; ` +
      `altura máx ${normativa.alturaMaxima} m a cornisa${normativa.alturaMaximaCumbrera ? ` y ${normativa.alturaMaximaCumbrera} m a cumbrera` : ''}; ` +
      `${normativa.plantasMaximas} plantas${normativa.parcelaMinima ? `; parcela mínima ${normativa.parcelaMinima} m²` : ''}.`,
  );
  if (normativa.pendienteCubierta) {
    l.push(`Cubierta inclinada obligatoria, pendiente ${normativa.pendienteCubierta.min}–${normativa.pendienteCubierta.max}°.`);
  }
  if (normativa.notas) l.push(`Notas de la ordenanza: ${normativa.notas}`);

  l.push('');
  l.push(`PARCELA: ${d.ancho.toFixed(1)} × ${d.fondo.toFixed(1)} m (${m.areaParcela.toFixed(0)} m²), frente al ${proyecto.parcela.frente}.`);
  const env = envolventeEdificable(proyecto.parcela, normativa);
  l.push(
    `ENVOLVENTE EDIFICABLE (donde puede ir la casa, ya descontados los retranqueos): ` +
      `rectángulo con esquina noroeste en x=${env.x.toFixed(1)}, y=${env.y.toFixed(1)} y tamaño ` +
      `${env.ancho.toFixed(1)} m (ancho, este-oeste) × ${env.fondo.toFixed(1)} m (fondo, norte-sur). ` +
      `Coordenadas: origen (0,0) en la esquina noroeste de la parcela; x hacia el este, y hacia el sur. ` +
      `Coloca TODAS las estancias dentro de ese rectángulo.`,
  );

  for (const p of PLANTAS) {
    const est = proyecto.plantas[p.id] ?? [];
    if (est.length === 0) continue;
    const detalle = est
      .map(
        (e) =>
          `${tipoEstancia(e.tipo).nombre} ${e.ancho.toFixed(1)}×${e.fondo.toFixed(1)} m en (x=${e.x.toFixed(1)}, y=${e.y.toFixed(1)})`,
      )
      .join('; ');
    l.push(`${p.nombre}: ${detalle}.`);
  }
  if (PLANTAS.every((p) => (proyecto.plantas[p.id] ?? []).length === 0)) {
    l.push('El proyecto aún no tiene ninguna estancia.');
  }

  l.push('');
  l.push(
    `ESTADO ACTUAL: ocupación ${m.ocupacionPct.toFixed(1)} %, edificabilidad ${m.edificabilidad.toFixed(2)} m²/m² ` +
      `(${m.superficieComputable.toFixed(0)} m² computables), altura ${m.alturaEdificacion.toFixed(1)} m, ` +
      `${m.numDormitorios} dormitorios y ${m.numBanyos} baños.`,
  );
  const incumple = evaluacion.normativa.filter((r) => r.nivel === 'error');
  if (incumple.length > 0) {
    l.push(`INCUMPLIMIENTOS: ${incumple.map((r) => r.mensaje).join(' ')}`);
  } else {
    l.push('El boceto actual cumple la normativa.');
  }

  return l.join('\n');
}
