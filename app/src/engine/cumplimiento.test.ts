import { describe, expect, it } from 'vitest';
import type { Proyecto } from '../domain/types';
import { galapagarU3 } from '../normativa/data/galapagar';
import { evaluar } from './cumplimiento';
import {
  areaUnion,
  envolventeEdificable,
  retranqueoPorLado,
} from './geometria';

function proyectoBase(): Proyecto {
  return {
    schemaVersion: 1,
    nombre: 'Test',
    normativaId: 'galapagar-u3',
    parcela: { norte: 25, sur: 25, este: 32, oeste: 32, frente: 'sur' },
    plantas: { sotano: [], baja: [], primera: [] },
    alturaPorPlanta: 3,
  };
}

describe('geometría', () => {
  it('asigna retranqueos según el lado del frente', () => {
    const r = retranqueoPorLado('sur', { frente: 4, fondo: 3, lateral: 2 });
    expect(r).toEqual({ sur: 4, norte: 3, este: 2, oeste: 2 });
  });

  it('calcula la envolvente edificable', () => {
    const p = proyectoBase();
    // Parcela 25×32, frente sur: oeste/este 3, norte 3 (fondo), sur 4 (frente)
    const env = envolventeEdificable(p.parcela, galapagarU3);
    expect(env).toEqual({ x: 3, y: 3, ancho: 19, fondo: 25 });
  });

  it('área de unión no cuenta solapes dos veces', () => {
    const a = { x: 0, y: 0, ancho: 4, fondo: 4 }; // 16
    const b = { x: 2, y: 0, ancho: 4, fondo: 4 }; // 16, solapa 8
    expect(areaUnion([a, b])).toBeCloseTo(24);
    expect(areaUnion([])).toBe(0);
    expect(areaUnion([a, a])).toBeCloseTo(16);
  });
});

describe('cumplimiento normativo (Galapagar U3)', () => {
  it('proyecto vacío: sin errores', () => {
    const ev = evaluar(proyectoBase(), galapagarU3);
    expect(ev.normativa.every((r) => r.nivel !== 'error')).toBe(true);
    expect(ev.metricas.areaParcela).toBeCloseTo(800);
  });

  it('detecta invasión de retranqueo', () => {
    const p = proyectoBase();
    p.plantas.baja.push({ id: 'e1', tipo: 'salon', x: 0.5, y: 10, ancho: 4, fondo: 4 });
    const ev = evaluar(p, galapagarU3);
    const regla = ev.normativa.find((r) => r.regla === 'retranqueos')!;
    expect(regla.nivel).toBe('error');
    expect(regla.mensaje).toContain('1 estancia');
  });

  it('la terraza descubierta no computa retranqueo ni ocupación', () => {
    const p = proyectoBase();
    p.plantas.baja.push({ id: 'e1', tipo: 'terraza', x: 0.5, y: 10, ancho: 4, fondo: 4 });
    const ev = evaluar(p, galapagarU3);
    expect(ev.normativa.find((r) => r.regla === 'retranqueos')!.nivel).toBe('ok');
    expect(ev.metricas.areaOcupada).toBe(0);
  });

  it('detecta exceso de ocupación', () => {
    const p = proyectoBase();
    // 19×25 = 475 m² > 50% de 800 m²
    p.plantas.baja.push({ id: 'e1', tipo: 'salon', x: 3, y: 3, ancho: 19, fondo: 25 });
    const ev = evaluar(p, galapagarU3);
    expect(ev.normativa.find((r) => r.regla === 'ocupacion')!.nivel).toBe('error');
  });

  it('edificabilidad: el sótano no computa y el porche computa al 50 %', () => {
    const p = proyectoBase();
    p.plantas.sotano.push({ id: 's', tipo: 'garaje', x: 5, y: 5, ancho: 10, fondo: 10 }); // 100 m² → 0
    p.plantas.baja.push({ id: 'b', tipo: 'salon', x: 5, y: 5, ancho: 10, fondo: 10 }); // 100 m²
    p.plantas.baja.push({ id: 'p', tipo: 'porche', x: 5, y: 15, ancho: 4, fondo: 5 }); // 20 m² → 10
    const ev = evaluar(p, galapagarU3);
    expect(ev.metricas.superficieComputable).toBeCloseTo(110);
    expect(ev.normativa.find((r) => r.regla === 'edificabilidad')!.nivel).toBe('ok');
  });

  it('detecta exceso de edificabilidad', () => {
    const p = proyectoBase();
    // 800 m² parcela → máx 400 m². 15×15=225 en baja + 225 en primera = 450.
    p.plantas.baja.push({ id: 'b', tipo: 'salon', x: 4, y: 4, ancho: 15, fondo: 15 });
    p.plantas.primera.push({ id: 'p1', tipo: 'dormitorio', x: 4, y: 4, ancho: 15, fondo: 15 });
    const ev = evaluar(p, galapagarU3);
    expect(ev.normativa.find((r) => r.regla === 'edificabilidad')!.nivel).toBe('error');
  });

  it('altura: 2 plantas × 3 m cumple, alturaPorPlanta 3.5 no', () => {
    const p = proyectoBase();
    p.plantas.baja.push({ id: 'b', tipo: 'salon', x: 5, y: 5, ancho: 5, fondo: 5 });
    p.plantas.primera.push({ id: 'p1', tipo: 'dormitorio', x: 5, y: 5, ancho: 4, fondo: 4 });
    expect(
      evaluar(p, galapagarU3).normativa.find((r) => r.regla === 'altura')!.nivel,
    ).toBe('ok');
    p.alturaPorPlanta = 3.5; // 7 m > 6.5 m
    expect(
      evaluar(p, galapagarU3).normativa.find((r) => r.regla === 'altura')!.nivel,
    ).toBe('error');
  });

  it('parcela mínima', () => {
    const p = proyectoBase();
    p.parcela = { norte: 15, sur: 15, este: 20, oeste: 20, frente: 'sur' }; // 300 m² < 500
    const ev = evaluar(p, galapagarU3);
    expect(ev.normativa.find((r) => r.regla === 'parcela-minima')!.nivel).toBe('error');
  });

  it('recomendaciones: baños, escalera y superficie mínima', () => {
    const p = proyectoBase();
    p.plantas.baja.push({ id: 'd1', tipo: 'dormitorio', x: 5, y: 5, ancho: 2, fondo: 2 }); // 4 m² < 10
    p.plantas.primera.push({ id: 'd2', tipo: 'dormitorio', x: 5, y: 9, ancho: 3, fondo: 4 });
    const ev = evaluar(p, galapagarU3);
    const msgs = ev.recomendaciones.map((r) => r.mensaje).join(' | ');
    expect(msgs).toContain('baño');
    expect(msgs).toContain('escalera');
    expect(msgs).toContain('por debajo del mínimo');
  });
});
