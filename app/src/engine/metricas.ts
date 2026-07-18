import { PLANTAS, type Lado, type Proyecto } from '../domain/types';
import type { NormativaMunicipal } from '../normativa/schema';
import { tipoEstancia } from './catalogo';
import { alturaCumbrera } from './cubierta';
import { areaParcela, areaRect, areaUnion } from './geometria';

/**
 * Coeficiente de edificabilidad de un tipo de estancia: el de la normativa
 * si lo sobrescribe, si no el del catálogo.
 */
export function coefEdificabilidad(
  tipoId: string,
  normativa?: NormativaMunicipal,
): number {
  const override = normativa?.computo?.edificabilidad?.[tipoId];
  return override ?? tipoEstancia(tipoId).computaEdif;
}

export interface Metricas {
  areaParcela: number;
  /** m² de proyección sobre parcela de la edificación sobre rasante. */
  areaOcupada: number;
  ocupacionPct: number;
  /** m² que computan edificabilidad (según coeficiente por tipo, sobre rasante). */
  superficieComputable: number;
  edificabilidad: number; // m²/m²
  plantasSobreRasante: number;
  alturaEdificacion: number; // m (a cornisa)
  alturaCumbrera: number; // m (cota más alta del tejado)
  superficieUtilAprox: number; // suma de todas las estancias interiores
  numDormitorios: number;
  numBanyos: number;
  plazasGarajeRecomendadas: number;
  /** m² de ventana por orientación (todas las plantas). */
  ventanasPorOrientacion: Record<Lado, number>;
}

export function calcularMetricas(
  proyecto: Proyecto,
  normativa?: NormativaMunicipal,
): Metricas {
  const aParcela = areaParcela(proyecto.parcela);

  const sobreRasante = PLANTAS.filter((p) => p.sobreRasante).map(
    (p) => proyecto.plantas[p.id] ?? [],
  );

  const huella = sobreRasante
    .flat()
    .filter((e) => tipoEstancia(e.tipo).computaOcup);
  const areaOcupada = areaUnion(huella);

  let superficieComputable = 0;
  for (const estancias of sobreRasante) {
    for (const e of estancias) {
      superficieComputable += areaRect(e) * coefEdificabilidad(e.tipo, normativa);
    }
  }

  const plantasConUso = sobreRasante.filter((es) => es.length > 0).length;
  const alturaEdificacion = plantasConUso * proyecto.alturaPorPlanta;

  const todas = Object.values(proyecto.plantas).flat();
  const superficieUtilAprox = todas
    .filter((e) => tipoEstancia(e.tipo).computaEdif > 0)
    .reduce((s, e) => s + areaRect(e), 0);

  const numDormitorios = todas.filter(
    (e) => tipoEstancia(e.tipo).esDormitorio,
  ).length;
  const numBanyos = todas.filter((e) => tipoEstancia(e.tipo).esBanyo).length;

  const ventanasPorOrientacion: Record<Lado, number> = {
    norte: 0,
    sur: 0,
    este: 0,
    oeste: 0,
  };
  for (const e of todas) {
    for (const h of e.huecos ?? []) {
      if (h.tipo === 'ventana') {
        ventanasPorOrientacion[h.lado] += h.ancho * h.alto;
      }
    }
  }

  return {
    areaParcela: aParcela,
    areaOcupada,
    ocupacionPct: aParcela > 0 ? (areaOcupada / aParcela) * 100 : 0,
    superficieComputable,
    edificabilidad: aParcela > 0 ? superficieComputable / aParcela : 0,
    plantasSobreRasante: plantasConUso,
    alturaEdificacion,
    alturaCumbrera: alturaCumbrera(proyecto),
    superficieUtilAprox,
    numDormitorios,
    numBanyos,
    plazasGarajeRecomendadas: Math.ceil(superficieComputable / 100 * 1.5) / 1, // 1,5 plazas / 100 m²
    ventanasPorOrientacion,
  };
}
