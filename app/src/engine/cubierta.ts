import {
  CUBIERTA_DEFECTO,
  PLANTAS,
  type Estancia,
  type PlantaId,
  type Proyecto,
} from '../domain/types';
import { tipoEstancia } from './catalogo';
import { areaInterseccion } from './geometria';

/** Estancias que nunca llevan tejado. */
const SIN_TEJADO = new Set(['piscina', 'terraza']);

export function cubiertaDe(proyecto: Proyecto): { tipo: 'plana' | 'inclinada'; pendiente: number } {
  return proyecto.cubierta ?? { ...CUBIERTA_DEFECTO };
}

/**
 * ¿Lleva tejado esta estancia? Sí, salvo que sea descubierta o que alguna
 * estancia de la planta superior la cubra de forma apreciable.
 */
export function llevaTejado(e: Estancia, plantaSuperior: Estancia[]): boolean {
  if (SIN_TEJADO.has(tipoEstancia(e.tipo).id)) return false;
  return !plantaSuperior.some((s) => areaInterseccion(e, s) > 0.5);
}

/** Altura del caballete sobre la cornisa para una estancia (a dos aguas). */
export function alturaTejado(e: Estancia, pendienteGrados: number): number {
  const semiluz = Math.min(e.ancho, e.fondo) / 2;
  return semiluz * Math.tan((pendienteGrados * Math.PI) / 180);
}

/**
 * Altura de cumbrera de la edificación: cota más alta de cualquier tejado
 * (base de la planta + altura de planta + caballete). Con cubierta plana
 * coincide con la altura a cornisa.
 */
export function alturaCumbrera(proyecto: Proyecto): number {
  const cubierta = cubiertaDe(proyecto);
  const sobre = PLANTAS.filter((p) => p.sobreRasante);
  let maxima = 0;
  sobre.forEach((p, i) => {
    const base = i * proyecto.alturaPorPlanta;
    const superior = i + 1 < sobre.length ? proyecto.plantas[sobre[i + 1].id as PlantaId] ?? [] : [];
    for (const e of proyecto.plantas[p.id as PlantaId] ?? []) {
      if (!tipoEstancia(e.tipo).computaOcup) continue;
      const cornisa = base + proyecto.alturaPorPlanta;
      const caballete =
        cubierta.tipo === 'inclinada' && llevaTejado(e, superior)
          ? alturaTejado(e, cubierta.pendiente)
          : 0;
      maxima = Math.max(maxima, cornisa + caballete);
    }
  });
  return maxima;
}
