import { describe, expect, it } from 'vitest';
import { areaInterseccion, resolverColocacion } from './geometria';

const limites = { ancho: 20, fondo: 20 };

describe('resolverColocacion (evitar solapes)', () => {
  it('deja la posición igual si no hay solape', () => {
    const r = { x: 2, y: 2, ancho: 3, fondo: 3 };
    const pos = resolverColocacion(r, [{ x: 10, y: 10, ancho: 3, fondo: 3 }], limites);
    expect(pos).toEqual({ x: 2, y: 2 });
  });

  it('separa una estancia que se solapa con otra', () => {
    const movida = { x: 4, y: 4, ancho: 4, fondo: 4 };
    const fija = { x: 2, y: 2, ancho: 4, fondo: 4 };
    const pos = resolverColocacion(movida, [fija], limites);
    const resultante = { ...movida, ...pos };
    expect(areaInterseccion(resultante, fija)).toBeCloseTo(0);
  });

  it('empuja por el eje de menor penetración (pequeño solape en X → sale por X)', () => {
    // Solapa 1 en X y 3 en Y ⇒ debe salir por X (pegándose al borde derecho).
    const movida = { x: 5, y: 0, ancho: 4, fondo: 4 };
    const fija = { x: 2, y: 1, ancho: 4, fondo: 4 };
    const pos = resolverColocacion(movida, [fija], limites);
    expect(pos.x).toBeCloseTo(6); // fija.x + fija.ancho
    expect(pos.y).toBeCloseTo(0);
  });

  it('resuelve solapes con varias vecinas', () => {
    const movida = { x: 3, y: 3, ancho: 4, fondo: 4 };
    const vecinas = [
      { x: 2, y: 2, ancho: 3, fondo: 3 },
      { x: 6, y: 2, ancho: 3, fondo: 3 },
    ];
    const pos = resolverColocacion(movida, vecinas, limites);
    const resultante = { ...movida, ...pos };
    for (const v of vecinas) expect(areaInterseccion(resultante, v)).toBeLessThan(0.01);
  });

  it('mantiene la estancia dentro de la parcela', () => {
    const movida = { x: 17, y: 17, ancho: 4, fondo: 4 };
    const pos = resolverColocacion(movida, [], limites);
    expect(pos.x).toBeLessThanOrEqual(limites.ancho - movida.ancho + 1e-6);
    expect(pos.y).toBeLessThanOrEqual(limites.fondo - movida.fondo + 1e-6);
  });
});
