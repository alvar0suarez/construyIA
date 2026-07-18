import { readFileSync, writeFileSync } from 'node:fs';
import * as topojson from 'topojson-client';

const topo = JSON.parse(readFileSync('provinces.json', 'utf8'));
const fc = topojson.feature(topo, topo.objects.provinces);

const [lonMin, latMin, lonMax, latMax] = topo.bbox;
const COS = Math.cos((40 * Math.PI) / 180);
const W = 1000;
const S = W / ((lonMax - lonMin) * COS);
const H = Math.round((latMax - latMin) * S);

const px = (lon) => +(((lon - lonMin) * COS) * S).toFixed(1);
const py = (lat) => +((latMax - lat) * S).toFixed(1);

const provincias = fc.features.map((f) => {
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  let d = '';
  for (const poly of polys) {
    for (const ring of poly) {
      d += ring.map(([lon, lat], i) => `${i ? 'L' : 'M'}${px(lon)} ${py(lat)}`).join('') + 'Z';
    }
  }
  return { n: f.properties.name, d };
});

const salida = `/**
 * Mapa de provincias de España. GENERADO — no editar a mano.
 * Fuente: es-atlas 0.6.0 (IGN), proyección equirrectangular simple.
 * Regenerar con: scripts/generar-mapa.md
 */
export const MAPA_VIEWBOX = '0 0 ${W} ${H}';

/** Proyecta lat/lng a coordenadas del viewBox del mapa. */
export function proyectar(lat: number, lng: number): { x: number; y: number } {
  return {
    x: ((lng - ${lonMin}) * ${COS.toFixed(6)}) * ${S.toFixed(6)},
    y: (${latMax} - lat) * ${S.toFixed(6)},
  };
}

export interface ProvinciaPath { n: string; d: string }

export const PROVINCIAS: ProvinciaPath[] = ${JSON.stringify(provincias)};
`;
writeFileSync(new URL('../src/ui/mapa/espanaProvincias.ts', import.meta.url), salida);
console.log('provincias:', provincias.length, '| viewBox:', W, 'x', H, '| bytes:', salida.length);
