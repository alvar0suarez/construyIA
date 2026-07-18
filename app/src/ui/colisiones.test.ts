import { describe, expect, it } from 'vitest';
import { resolverColision, type MuroColision } from './colisiones';

const muro = (parcial: Partial<MuroColision>): MuroColision => ({
  ax: 0,
  az: 0,
  bx: 4,
  bz: 0,
  aperturas: [],
  ...parcial,
});

describe('colisiones del paseo interior', () => {
  it('empuja fuera del muro al acercarse de frente', () => {
    const r = resolverColision(2, 0.1, 0.3, [muro({})]);
    expect(r.x).toBeCloseTo(2);
    expect(r.z).toBeCloseTo(0.3);
  });

  it('no toca la posición si está lejos', () => {
    const r = resolverColision(2, 1.5, 0.3, [muro({})]);
    expect(r).toEqual({ x: 2, z: 1.5 });
  });

  it('deja pasar por la apertura de una puerta', () => {
    const conPuerta = muro({ aperturas: [[1.5, 2.5]] });
    const dentro = resolverColision(2, 0.05, 0.3, [conPuerta]);
    expect(dentro.z).toBeCloseTo(0.05); // sin corrección: está en el vano
    const fuera = resolverColision(0.5, 0.05, 0.3, [conPuerta]);
    expect(fuera.z).toBeCloseTo(0.3); // fuera del vano sí colisiona
  });

  it('colisiona también con los extremos del muro', () => {
    const r = resolverColision(4.1, 0.1, 0.3, [muro({})]);
    const dist = Math.hypot(r.x - 4, r.z - 0);
    expect(dist).toBeGreaterThanOrEqual(0.3 - 1e-9);
  });

  it('muros verticales funcionan igual', () => {
    const vertical = muro({ ax: 0, az: 0, bx: 0, bz: 4 });
    const r = resolverColision(-0.1, 2, 0.3, [vertical]);
    expect(r.x).toBeCloseTo(-0.3);
    expect(r.z).toBeCloseTo(2);
  });
});
