import { ExtrudeGeometry, Path, Shape } from 'three';
import type { Estancia, Lado } from '../domain/types';

export const GROSOR_MURO = 0.12;

export interface MuroSpec {
  geometria: ExtrudeGeometry;
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
export function murosDeEstancia(
  e: Estancia,
  base: number,
  altura: number,
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
    muros.push(construir(lado));
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
