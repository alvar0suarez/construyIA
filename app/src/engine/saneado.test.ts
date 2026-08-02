import { describe, expect, it } from 'vitest';
import { areaInterseccion } from './geometria';
import { encajarEn, envolvente, separar } from './saneado';

const LIM = { x: 0, y: 0, ancho: 20, fondo: 20 };

describe('encajarEn', () => {
  it('deja el rect igual si ya está dentro', () => {
    const r = { x: 5, y: 5, ancho: 3, fondo: 3 };
    expect(encajarEn(r, LIM)).toEqual(r);
  });

  it('desplaza un rect que se sale por la derecha/abajo', () => {
    const r = encajarEn({ x: 19, y: 19, ancho: 4, fondo: 4 }, LIM);
    expect(r.x).toBeCloseTo(16);
    expect(r.y).toBeCloseTo(16);
  });

  it('encoge un rect mayor que los límites', () => {
    const r = encajarEn({ x: -5, y: 0, ancho: 30, fondo: 5 }, LIM);
    expect(r.ancho).toBeCloseTo(20);
    expect(r.x).toBeCloseTo(0);
  });

  it('respeta límites con origen desplazado (envolvente con retranqueos)', () => {
    const env = { x: 3, y: 3, ancho: 10, fondo: 10 };
    const r = encajarEn({ x: 0, y: 0, ancho: 4, fondo: 4 }, env);
    expect(r.x).toBeCloseTo(3);
    expect(r.y).toBeCloseTo(3);
  });
});

describe('envolvente', () => {
  it('calcula el bounding box del conjunto', () => {
    const bb = envolvente([
      { x: 2, y: 2, ancho: 3, fondo: 3 },
      { x: 6, y: 4, ancho: 2, fondo: 5 },
    ]);
    expect(bb).toEqual({ x: 2, y: 2, ancho: 6, fondo: 7 });
  });
  it('devuelve null si no hay rects', () => {
    expect(envolvente([])).toBeNull();
  });
});

describe('separar', () => {
  it('deja los muebles quietos si no se solapan', () => {
    const items = [
      { id: 'a', x: 1, y: 1, ancho: 2, fondo: 2 },
      { id: 'b', x: 6, y: 6, ancho: 2, fondo: 2 },
    ];
    const out = separar(items, LIM);
    expect(out.map((o) => ({ x: o.x, y: o.y }))).toEqual([
      { x: 1, y: 1 },
      { x: 6, y: 6 },
    ]);
  });

  it('separa dos muebles montados', () => {
    const out = separar(
      [
        { id: 'a', x: 3, y: 3, ancho: 3, fondo: 3 },
        { id: 'b', x: 4, y: 3.2, ancho: 3, fondo: 3 },
      ],
      LIM,
    );
    expect(areaInterseccion(out[0], out[1])).toBeLessThan(0.1);
  });

  it('mantiene todo dentro de los límites', () => {
    const out = separar(
      [
        { id: 'a', x: 18, y: 18, ancho: 3, fondo: 3 },
        { id: 'b', x: 18.5, y: 18.5, ancho: 3, fondo: 3 },
      ],
      LIM,
    );
    for (const o of out) {
      expect(o.x).toBeGreaterThanOrEqual(-1e-6);
      expect(o.y).toBeGreaterThanOrEqual(-1e-6);
      expect(o.x + o.ancho).toBeLessThanOrEqual(LIM.ancho + 1e-6);
      expect(o.y + o.fondo).toBeLessThanOrEqual(LIM.fondo + 1e-6);
    }
  });
});
