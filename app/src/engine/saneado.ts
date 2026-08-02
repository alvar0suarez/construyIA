import type { Rect } from '../domain/types';

/**
 * Encaja un rectángulo dentro de `limites`: lo encoge si es mayor y lo desplaza
 * para que no se salga. Devuelve un rect nuevo (no muta el original).
 */
export function encajarEn(r: Rect, limites: Rect): Rect {
  const ancho = Math.min(r.ancho, limites.ancho);
  const fondo = Math.min(r.fondo, limites.fondo);
  const x = Math.min(Math.max(r.x, limites.x), limites.x + limites.ancho - ancho);
  const y = Math.min(Math.max(r.y, limites.y), limites.y + limites.fondo - fondo);
  return { ...r, x, y, ancho, fondo };
}

/** Envolvente (bounding box) de un conjunto de rectángulos, o null si vacío. */
export function envolvente(rects: Rect[]): Rect | null {
  if (rects.length === 0) return null;
  const x0 = Math.min(...rects.map((r) => r.x));
  const y0 = Math.min(...rects.map((r) => r.y));
  const x1 = Math.max(...rects.map((r) => r.x + r.ancho));
  const y1 = Math.max(...rects.map((r) => r.y + r.fondo));
  return { x: x0, y: y0, ancho: x1 - x0, fondo: y1 - y0 };
}

/**
 * Separa rectángulos que se solapan empujándolos por el eje de menor
 * penetración, manteniéndolos dentro de `limites`. Útil para que el mobiliario
 * generado por IA no quede montado. Devuelve nuevos rects (mantiene el orden).
 * Se toleran solapes < `holgura` (m²-ish, en cada eje) para no mover de más.
 */
export function separar<T extends Rect>(items: T[], limites: Rect, holgura = 0.02): T[] {
  const out = items.map((it) => ({ ...it, ...encajarEn(it, limites) }));
  for (let iter = 0; iter < 12; iter++) {
    let movido = false;
    for (let i = 0; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) {
        const a = out[i];
        const b = out[j];
        const penX = Math.min(a.x + a.ancho, b.x + b.ancho) - Math.max(a.x, b.x);
        const penY = Math.min(a.y + a.fondo, b.y + b.fondo) - Math.max(a.y, b.y);
        if (penX > holgura && penY > holgura) {
          movido = true;
          if (penX <= penY) {
            const d = penX / 2;
            const izq = a.x + a.ancho / 2 <= b.x + b.ancho / 2;
            out[i] = { ...a, x: a.x + (izq ? -d : d) };
            out[j] = { ...b, x: b.x + (izq ? d : -d) };
          } else {
            const d = penY / 2;
            const arriba = a.y + a.fondo / 2 <= b.y + b.fondo / 2;
            out[i] = { ...a, y: a.y + (arriba ? -d : d) };
            out[j] = { ...b, y: b.y + (arriba ? d : -d) };
          }
          out[i] = { ...out[i], ...encajarEn(out[i], limites) };
          out[j] = { ...out[j], ...encajarEn(out[j], limites) };
        }
      }
    }
    if (!movido) break;
  }
  return out;
}
