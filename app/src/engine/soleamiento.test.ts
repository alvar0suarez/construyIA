import { describe, expect, it } from 'vitest';
import {
  diaDelAnyo,
  formatoHora,
  localASolar,
  ortoYOcaso,
  posicionSolar,
  solarALocal,
  vectorSolar,
} from './soleamiento';

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

  it('horas de sol en Madrid: ~15h en junio, ~9,3h en diciembre', () => {
    const verano = ortoYOcaso(LAT_MADRID, diaDelAnyo(6));
    expect(verano.horasDeSol).toBeGreaterThan(14.5);
    expect(verano.horasDeSol).toBeLessThan(15.5);
    const invierno = ortoYOcaso(LAT_MADRID, diaDelAnyo(12));
    expect(invierno.horasDeSol).toBeGreaterThan(8.8);
    expect(invierno.horasDeSol).toBeLessThan(9.8);
    // Simetría respecto al mediodía solar
    expect(verano.amanecer + verano.atardecer).toBeCloseTo(24);
  });

  it('hora local española: mediodía solar en Madrid ≈ 14:15 en verano, 13:15 en invierno', () => {
    const LNG_MADRID = -3.7;
    expect(solarALocal(12, LNG_MADRID, 7)).toBeCloseTo(14.25, 1);
    expect(solarALocal(12, LNG_MADRID, 1)).toBeCloseTo(13.25, 1);
    // Ida y vuelta
    expect(localASolar(solarALocal(9.5, LNG_MADRID, 7), LNG_MADRID, 7)).toBeCloseTo(9.5);
  });

  it('formatoHora', () => {
    expect(formatoHora(6.5)).toBe('06:30');
    expect(formatoHora(21.983)).toBe('21:59');
    expect(formatoHora(14.25)).toBe('14:15');
  });

  it('vector solar: al mediodía apunta hacia arriba y hacia el sur (+z)', () => {
    const v = vectorSolar(posicionSolar(LAT_MADRID, diaDelAnyo(6), 12));
    expect(v.y).toBeGreaterThan(0.9);
    expect(v.z).toBeGreaterThan(0); // sur
    expect(Math.abs(v.x)).toBeLessThan(0.1);
  });
});
