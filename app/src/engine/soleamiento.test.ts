import { describe, expect, it } from 'vitest';
import { diaDelAnyo, posicionSolar, vectorSolar } from './soleamiento';

const LAT_MADRID = 40.5;

describe('soleamiento', () => {
  it('solsticio de verano al mediodía: sol alto y al sur', () => {
    const p = posicionSolar(LAT_MADRID, diaDelAnyo(6), 12);
    expect(p.elevacion).toBeGreaterThan(70);
    expect(p.elevacion).toBeLessThan(76);
    expect(Math.abs(p.azimut - 180)).toBeLessThan(3);
  });

  it('solsticio de invierno al mediodía: sol bajo', () => {
    const p = posicionSolar(LAT_MADRID, diaDelAnyo(12), 12);
    expect(p.elevacion).toBeGreaterThan(22);
    expect(p.elevacion).toBeLessThan(30);
  });

  it('por la mañana el sol está al este (azimut < 180)', () => {
    const p = posicionSolar(LAT_MADRID, diaDelAnyo(6), 9);
    expect(p.azimut).toBeGreaterThan(60);
    expect(p.azimut).toBeLessThan(180);
  });

  it('de noche la elevación es negativa', () => {
    const p = posicionSolar(LAT_MADRID, diaDelAnyo(12), 23);
    expect(p.elevacion).toBeLessThan(0);
  });

  it('vector solar: al mediodía apunta hacia arriba y hacia el sur (+z)', () => {
    const v = vectorSolar(posicionSolar(LAT_MADRID, diaDelAnyo(6), 12));
    expect(v.y).toBeGreaterThan(0.9);
    expect(v.z).toBeGreaterThan(0); // sur
    expect(Math.abs(v.x)).toBeLessThan(0.1);
  });
});
