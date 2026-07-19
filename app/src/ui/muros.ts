import {
  BufferGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Path,
  Shape,
} from 'three';
import type { Estancia, Lado, Rect } from '../domain/types';
import { alturaTejado } from '../engine/cubierta';

export const GROSOR_MURO = 0.12;

export interface MuroSpec {
  geometria: BufferGeometry;
  /** Posición del origen local del muro en el mundo (x, y, z). */
  posicion: [number, number, number];
  /** Rotación sobre Y. */
  rotacionY: number;
}

export interface CristalSpec {
  posicion: [number, number, number];
  /** Dimensiones del plano del cristal (ancho, alto). */
  tam: [number, number];
  rotacionY: number;
}

/**
 * Construye las 4 paredes de una estancia como extrusiones con agujeros
 * para sus huecos, más los cristales de las ventanas.
 *
 * Convención: el plano 2D (x, y) se mapea a 3D como (x, ·, z). Las paredes
 * norte/sur se modelan sin rotación (X local = X mundo); las este/oeste se
 * rotan -90° sobre Y (X local = Z mundo). El offset del hueco se mide desde
 * el oeste (paredes N/S) o desde el norte (paredes E/O), igual que en 2D.
 */
/**
 * Tejado a dos aguas sobre un rectángulo (la huella de la casa): prisma
 * triangular con el caballete a lo largo del lado mayor. El alero sobresale
 * `vuelo` metros por los cuatro lados para que parezca un tejado de verdad.
 */
export function tejadoRect(
  rect: Rect,
  cotaCornisa: number,
  pendienteGrados: number,
  vuelo = 0.4,
): { spec: MuroSpec; altura: number } {
  const r = {
    x: rect.x - vuelo,
    y: rect.y - vuelo,
    ancho: rect.ancho + 2 * vuelo,
    fondo: rect.fondo + 2 * vuelo,
  };
  const aLoLargoDeX = r.ancho >= r.fondo;
  const luz = aLoLargoDeX ? r.fondo : r.ancho;
  const largo = aLoLargoDeX ? r.ancho : r.fondo;
  const h = (luz / 2) * Math.tan((pendienteGrados * Math.PI) / 180);

  const seccion = new Shape();
  seccion.moveTo(0, 0);
  seccion.lineTo(luz, 0);
  seccion.lineTo(luz / 2, h);
  seccion.closePath();
  const geometria = new ExtrudeGeometry(seccion, { depth: largo, bevelEnabled: false });

  const spec: MuroSpec = aLoLargoDeX
    ? { geometria, posicion: [r.x, cotaCornisa, r.y + r.fondo], rotacionY: Math.PI / 2 }
    : { geometria, posicion: [r.x, cotaCornisa, r.y], rotacionY: 0 };
  return { spec, altura: h };
}

/**
 * Losa de suelo (forjado) de una estancia con agujeros rectangulares, para
 * dejar pasar el vacío de las estancias a doble altura de la planta inferior
 * (así el forjado de arriba no tapa el hueco del salón a doble altura).
 *
 * El shape usa coordenadas de plano absolutas (x → X mundo, y → Z mundo).
 * Se renderiza con rotación [π/2, 0, 0] y posición [0, base + grosor, 0]
 * dentro del grupo de la escena, de modo que la losa ocupa base .. base+grosor.
 */
export function losaConHuecos(
  rect: Rect,
  huecos: Rect[],
  grosor = 0.08,
): ExtrudeGeometry {
  const shape = new Shape();
  shape.moveTo(rect.x, rect.y);
  shape.lineTo(rect.x + rect.ancho, rect.y);
  shape.lineTo(rect.x + rect.ancho, rect.y + rect.fondo);
  shape.lineTo(rect.x, rect.y + rect.fondo);
  shape.closePath();
  for (const h of huecos) {
    const path = new Path();
    path.moveTo(h.x, h.y);
    path.lineTo(h.x + h.ancho, h.y);
    path.lineTo(h.x + h.ancho, h.y + h.fondo);
    path.lineTo(h.x, h.y + h.fondo);
    path.closePath();
    shape.holes.push(path);
  }
  return new ExtrudeGeometry(shape, { depth: grosor, bevelEnabled: false });
}

/**
 * Tejado a cuatro aguas (con faldones en los cuatro lados) sobre un
 * rectángulo. El caballete corre a lo largo del lado mayor, acortado media
 * luz por cada extremo (donde arrancan los dos faldones de los testeros).
 * Más propio de los chalés de la zona y recoge mejor los extremos que el de
 * dos aguas. El alero sobresale `vuelo` metros por los cuatro lados.
 *
 * La geometría se construye en coordenadas de plano absolutas (x → X mundo,
 * z → Z mundo; y = altura sobre la cornisa). Se renderiza con posición
 * [0, cotaCornisa, 0] y sin rotación. Se usa DoubleSide al pintar, así que la
 * orientación de las caras es indiferente.
 */
export function tejadoCuatroAguas(
  rect: Rect,
  cotaCornisa: number,
  pendienteGrados: number,
  vuelo = 0.4,
): { spec: MuroSpec; altura: number } {
  const r = {
    x: rect.x - vuelo,
    y: rect.y - vuelo,
    ancho: rect.ancho + 2 * vuelo,
    fondo: rect.fondo + 2 * vuelo,
  };
  const aLoLargoDeX = r.ancho >= r.fondo;
  const luz = aLoLargoDeX ? r.fondo : r.ancho;
  const h = (luz / 2) * Math.tan((pendienteGrados * Math.PI) / 180);

  const x0 = r.x;
  const x1 = r.x + r.ancho;
  const z0 = r.y;
  const z1 = r.y + r.fondo;

  // Esquinas del alero (y = 0) y extremos del caballete (y = h).
  const A: [number, number, number] = [x0, 0, z0];
  const B: [number, number, number] = [x1, 0, z0];
  const C: [number, number, number] = [x1, 0, z1];
  const D: [number, number, number] = [x0, 0, z1];
  let R1: [number, number, number];
  let R2: [number, number, number];
  if (aLoLargoDeX) {
    const zc = r.y + r.fondo / 2;
    R1 = [x0 + luz / 2, h, zc];
    R2 = [x1 - luz / 2, h, zc];
  } else {
    const xc = r.x + r.ancho / 2;
    R1 = [xc, h, z0 + luz / 2];
    R2 = [xc, h, z1 - luz / 2];
  }

  const tris = aLoLargoDeX
    ? [
        // faldones largos (norte y sur)
        A, B, R2, A, R2, R1,
        D, C, R2, D, R2, R1,
        // faldones de los testeros (este y oeste)
        A, D, R1,
        B, C, R2,
      ]
    : [
        // faldones largos (este y oeste)
        A, D, R2, A, R2, R1,
        B, C, R2, B, R2, R1,
        // faldones de los testeros (norte y sur)
        A, B, R1,
        D, C, R2,
      ];

  const geometria = new BufferGeometry();
  geometria.setAttribute(
    'position',
    new Float32BufferAttribute(tris.flat(), 3),
  );
  geometria.computeVertexNormals();

  return { spec: { geometria, posicion: [0, cotaCornisa, 0], rotacionY: 0 }, altura: h };
}

/** Tejado a dos aguas sobre una estancia (compatibilidad). */
export function tejadoDeEstancia(
  e: Estancia,
  cotaCornisa: number,
  pendienteGrados: number,
): MuroSpec {
  const h = alturaTejado(e, pendienteGrados);
  const aLoLargoDeX = e.ancho >= e.fondo;
  const luz = aLoLargoDeX ? e.fondo : e.ancho;
  const largo = aLoLargoDeX ? e.ancho : e.fondo;

  const seccion = new Shape();
  seccion.moveTo(0, 0);
  seccion.lineTo(luz, 0);
  seccion.lineTo(luz / 2, h);
  seccion.closePath();
  const geometria = new ExtrudeGeometry(seccion, { depth: largo, bevelEnabled: false });

  return aLoLargoDeX
    ? { geometria, posicion: [e.x, cotaCornisa, e.y + e.fondo], rotacionY: Math.PI / 2 }
    : { geometria, posicion: [e.x, cotaCornisa, e.y], rotacionY: 0 };
}

/**
 * Lados de una estancia cuyo muro puede omitirse porque otra estancia
 * anterior de la misma planta aporta ya la pared completa (fusión de muros
 * compartidos). Solo se omite si el muro de `e` no tiene huecos en ese lado
 * y el muro vecino cubre todo el tramo.
 */
export function ladosCubiertos(e: Estancia, anteriores: Estancia[]): Set<Lado> {
  const eps = 0.05;
  const cubiertos = new Set<Lado>();
  const conHueco = new Set((e.huecos ?? []).map((h) => h.lado));
  for (const o of anteriores) {
    const cubreX = o.x <= e.x + eps && o.x + o.ancho >= e.x + e.ancho - eps;
    const cubreY = o.y <= e.y + eps && o.y + o.fondo >= e.y + e.fondo - eps;
    if (Math.abs(o.y + o.fondo - e.y) <= eps && cubreX && !conHueco.has('norte')) {
      cubiertos.add('norte');
    }
    if (Math.abs(e.y + e.fondo - o.y) <= eps && cubreX && !conHueco.has('sur')) {
      cubiertos.add('sur');
    }
    if (Math.abs(o.x + o.ancho - e.x) <= eps && cubreY && !conHueco.has('oeste')) {
      cubiertos.add('oeste');
    }
    if (Math.abs(e.x + e.ancho - o.x) <= eps && cubreY && !conHueco.has('este')) {
      cubiertos.add('este');
    }
  }
  return cubiertos;
}

export function murosDeEstancia(
  e: Estancia,
  base: number,
  altura: number,
  omitir: Set<Lado> = new Set(),
): { muros: MuroSpec[]; cristales: CristalSpec[] } {
  const muros: MuroSpec[] = [];
  const cristales: CristalSpec[] = [];

  const construir = (lado: Lado): MuroSpec => {
    const horizontal = lado === 'norte' || lado === 'sur';
    const largo = horizontal ? e.ancho : e.fondo;
    const shape = new Shape();
    shape.moveTo(0, 0);
    shape.lineTo(largo, 0);
    shape.lineTo(largo, altura);
    shape.lineTo(0, altura);
    shape.closePath();

    for (const h of e.huecos ?? []) {
      if (h.lado !== lado) continue;
      const x0 = Math.min(Math.max(h.offset, 0), Math.max(0, largo - h.ancho));
      const y0 = Math.min(h.antepecho, Math.max(0, altura - h.alto));
      const agujero = new Path();
      agujero.moveTo(x0, y0);
      agujero.lineTo(x0 + h.ancho, y0);
      agujero.lineTo(x0 + h.ancho, y0 + Math.min(h.alto, altura - y0));
      agujero.lineTo(x0, y0 + Math.min(h.alto, altura - y0));
      agujero.closePath();
      shape.holes.push(agujero);
    }

    const geometria = new ExtrudeGeometry(shape, {
      depth: GROSOR_MURO,
      bevelEnabled: false,
    });

    // Posición del origen local y sentido de la extrusión (+Z local):
    // norte: origen (e.x, base, e.y), extrude hacia el interior (+z mundo)
    // sur:   origen (e.x, base, e.y + fondo − grosor)
    // oeste: rotación -90° ⇒ X local → +Z mundo, +Z local → −X mundo;
    //        origen (e.x + grosor, base, e.y)
    // este:  origen (e.x + ancho, base, e.y)
    switch (lado) {
      case 'norte':
        return { geometria, posicion: [e.x, base, e.y], rotacionY: 0 };
      case 'sur':
        return {
          geometria,
          posicion: [e.x, base, e.y + e.fondo - GROSOR_MURO],
          rotacionY: 0,
        };
      case 'oeste':
        return { geometria, posicion: [e.x + GROSOR_MURO, base, e.y], rotacionY: -Math.PI / 2 };
      default:
        return { geometria, posicion: [e.x + e.ancho, base, e.y], rotacionY: -Math.PI / 2 };
    }
  };

  for (const lado of ['norte', 'sur', 'este', 'oeste'] as Lado[]) {
    if (!omitir.has(lado)) muros.push(construir(lado));
  }

  for (const h of e.huecos ?? []) {
    if (h.tipo !== 'ventana') continue;
    const horizontal = h.lado === 'norte' || h.lado === 'sur';
    const largo = horizontal ? e.ancho : e.fondo;
    const x0 = Math.min(Math.max(h.offset, 0), Math.max(0, largo - h.ancho));
    const cy = base + h.antepecho + h.alto / 2;
    const medio = GROSOR_MURO / 2;
    if (horizontal) {
      const cx = e.x + x0 + h.ancho / 2;
      const cz = h.lado === 'norte' ? e.y + medio : e.y + e.fondo - medio;
      cristales.push({ posicion: [cx, cy, cz], tam: [h.ancho, h.alto], rotacionY: 0 });
    } else {
      const cz = e.y + x0 + h.ancho / 2;
      const cx = h.lado === 'oeste' ? e.x + medio : e.x + e.ancho - medio;
      cristales.push({ posicion: [cx, cy, cz], tam: [h.ancho, h.alto], rotacionY: Math.PI / 2 });
    }
  }

  return { muros, cristales };
}
