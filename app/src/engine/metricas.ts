import { PLANTAS, type Proyecto } from '../domain/types';
import { tipoEstancia } from './catalogo';
import { areaParcela, areaRect, areaUnion } from './geometria';

export interface Metricas {
  areaParcela: number;
  /** m² de proyección sobre parcela de la edificación sobre rasante. */
  areaOcupada: number;
  ocupacionPct: number;
  /** m² que computan edificabilidad (según coeficiente por tipo, sobre rasante). */
  superficieComputable: number;
  edificabilidad: number; // m²/m²
  plantasSobreRasante: number;
  alturaEdificacion: number; // m
  superficieUtilAprox: number; // suma de todas las estancias interiores
  numDormitorios: number;
  numBanyos: number;
  plazasGarajeRecomendadas: number;
}

export function calcularMetricas(proyecto: Proyecto): Metricas {
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
      superficieComputable += areaRect(e) * tipoEstancia(e.tipo).computaEdif;
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

  return {
    areaParcela: aParcela,
    areaOcupada,
    ocupacionPct: aParcela > 0 ? (areaOcupada / aParcela) * 100 : 0,
    superficieComputable,
    edificabilidad: aParcela > 0 ? superficieComputable / aParcela : 0,
    plantasSobreRasante: plantasConUso,
    alturaEdificacion,
    superficieUtilAprox,
    numDormitorios,
    numBanyos,
    plazasGarajeRecomendadas: Math.ceil(superficieComputable / 100 * 1.5) / 1, // 1,5 plazas / 100 m²
  };
}
