/**
 * Colisión de la cámara (círculo en el plano XZ) contra muros (segmentos
 * con aperturas de puertas). TypeScript puro para poder testearlo.
 */

export interface MuroColision {
  /** Extremos del segmento en coordenadas de mundo (x, z). */
  ax: number;
  az: number;
  bx: number;
  bz: number;
  /** Tramos transitables [inicio, fin] medidos en metros desde A (puertas). */
  aperturas: [number, number][];
}

/**
 * Corrige una posición para que el círculo de radio `radio` no atraviese
 * los muros. Empuja hacia fuera a lo largo de la normal del muro; en los
 * tramos con puerta (con holgura de 10 cm a cada lado) no hay colisión.
 */
export function resolverColision(
  x: number,
  z: number,
  radio: number,
  muros: MuroColision[],
): { x: number; z: number } {
  let px = x;
  let pz = z;
  for (let pasada = 0; pasada < 2; pasada++) {
    for (const m of muros) {
      const dx = m.bx - m.ax;
      const dz = m.bz - m.az;
      const largo2 = dx * dx + dz * dz;
      if (largo2 === 0) continue;
      let t = ((px - m.ax) * dx + (pz - m.az) * dz) / largo2;
      t = Math.min(1, Math.max(0, t));
      const cx = m.ax + t * dx;
      const cz = m.az + t * dz;
      const distX = px - cx;
      const distZ = pz - cz;
      const dist = Math.hypot(distX, distZ);
      if (dist >= radio) continue;

      // ¿Está el punto de contacto dentro de una puerta?
      const largo = Math.sqrt(largo2);
      const s = t * largo;
      const enPuerta = m.aperturas.some(([ini, fin]) => s > ini + 0.1 && s < fin - 0.1);
      if (enPuerta) continue;

      if (dist < 1e-6) {
        // Justo sobre el muro: empujar por la normal del segmento
        const nx = -dz / largo;
        const nz = dx / largo;
        px = cx + nx * radio;
        pz = cz + nz * radio;
      } else {
        px = cx + (distX / dist) * radio;
        pz = cz + (distZ / dist) * radio;
      }
    }
  }
  return { x: px, z: pz };
}
