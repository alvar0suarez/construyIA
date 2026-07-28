import { describe, expect, it } from 'vitest';
import { areaVisible, interseccionRect } from './geometria';

describe('interseccionRect', () => {
  it('devuelve el solape de dos rectángulos', () => {
    const r = interseccionRect(
      { x: 0, y: 0, ancho: 4, fondo: 4 },
      { x: 2, y: 2, ancho: 4, fondo: 4 },
    );
    expect(r).toEqual({ x: 2, y: 2, ancho: 2, fondo: 2 });
  });

  it('devuelve null si no se tocan', () => {
    expect(
      interseccionRect({ x: 0, y: 0, ancho: 2, fondo: 2 }, { x: 5, y: 5, ancho: 2, fondo: 2 }),
    ).toBeNull();
  });
});

describe('areaVisible (recorte de solapes)', () => {
  const e = { x: 0, y: 0, ancho: 4, fondo: 4 }; // 16 m²

  it('sin nada encima, el área es la del rectángulo', () => {
    expect(areaVisible(e, [])).toBeCloseTo(16);
  });

  it('resta el trozo cubierto por una estancia superior (silueta en L)', () => {
    // Encima ocupa la esquina 2×2 = 4 m² ⇒ visible 12 m².
    expect(areaVisible(e, [{ x: 2, y: 2, ancho: 2, fondo: 2 }])).toBeCloseTo(12);
  });

  it('no cuenta dos veces el solape de varias estancias superiores', () => {
    // Dos rectángulos encima que se solapan entre sí sobre la misma esquina.
    const encima = [
      { x: 2, y: 2, ancho: 2, fondo: 2 },
      { x: 3, y: 2, ancho: 1, fondo: 2 }, // dentro del anterior
    ];
    expect(areaVisible(e, encima)).toBeCloseTo(12);
  });

  it('un tapado total deja área 0', () => {
    expect(areaVisible(e, [{ x: -1, y: -1, ancho: 6, fondo: 6 }])).toBeCloseTo(0);
  });
});
