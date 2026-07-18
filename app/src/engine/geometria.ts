import type { Lado, Parcela, Rect } from '../domain/types';
import type { NormativaMunicipal } from '../normativa/schema';

/** Dimensiones del rectángulo equivalente de la parcela (F0: rectangular). */
export function dimensionesParcela(p: Parcela): { ancho: number; fondo: number } {
  return { ancho: (p.norte + p.sur) / 2, fondo: (p.este + p.oeste) / 2 };
}

export function areaParcela(p: Parcela): number {
  const d = dimensionesParcela(p);
  return d.ancho * d.fondo;
}

/**
 * Retranqueo aplicable a cada lado de la parcela según cuál sea el frente:
 * el frente lleva el retranqueo de frente, el lado opuesto el de fondo y los
 * otros dos el lateral.
 */
export function retranqueoPorLado(
  frente: Lado,
  r: NormativaMunicipal['retranqueos'],
): Record<Lado, number> {
  const opuesto: Record<Lado, Lado> = {
    norte: 'sur',
    sur: 'norte',
    este: 'oeste',
    oeste: 'este',
  };
  const res: Record<Lado, number> = {
    norte: r.lateral,
    sur: r.lateral,
    este: r.lateral,
    oeste: r.lateral,
  };
  res[frente] = r.frente;
  res[opuesto[frente]] = r.fondo;
  return res;
}

/**
 * Envolvente edificable: parcela menos retranqueos. Convención de ejes SVG:
 * norte = borde superior (y=0), oeste = borde izquierdo (x=0).
 */
export function envolventeEdificable(
  p: Parcela,
  normativa: NormativaMunicipal,
): Rect {
  const d = dimensionesParcela(p);
  const r = retranqueoPorLado(p.frente, normativa.retranqueos);
  return {
    x: r.oeste,
    y: r.norte,
    ancho: Math.max(0, d.ancho - r.oeste - r.este),
    fondo: Math.max(0, d.fondo - r.norte - r.sur),
  };
}

export function areaRect(r: Rect): number {
  return r.ancho * r.fondo;
}

/** ¿Está `interior` completamente contenido en `exterior`? (tolerancia 1 mm) */
export function contenidoEn(interior: Rect, exterior: Rect): boolean {
  const eps = 1e-3;
  return (
    interior.x >= exterior.x - eps &&
    interior.y >= exterior.y - eps &&
    interior.x + interior.ancho <= exterior.x + exterior.ancho + eps &&
    interior.y + interior.fondo <= exterior.y + exterior.fondo + eps
  );
}

/**
 * Área de la unión de rectángulos, exacta, por compresión de coordenadas.
 * Se usa para la ocupación: dos estancias solapadas no ocupan el doble.
 */
export function areaUnion(rects: Rect[]): number {
  const validos = rects.filter((r) => r.ancho > 0 && r.fondo > 0);
  if (validos.length === 0) return 0;
  const xs = [...new Set(validos.flatMap((r) => [r.x, r.x + r.ancho]))].sort(
    (a, b) => a - b,
  );
  const ys = [...new Set(validos.flatMap((r) => [r.y, r.y + r.fondo]))].sort(
    (a, b) => a - b,
  );
  let area = 0;
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < ys.length - 1; j++) {
      const cx = (xs[i] + xs[i + 1]) / 2;
      const cy = (ys[j] + ys[j + 1]) / 2;
      const cubierta = validos.some(
        (r) =>
          cx > r.x && cx < r.x + r.ancho && cy > r.y && cy < r.y + r.fondo,
      );
      if (cubierta) area += (xs[i + 1] - xs[i]) * (ys[j + 1] - ys[j]);
    }
  }
  return area;
}
