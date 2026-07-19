import { describe, expect, it } from 'vitest';
import type { Estancia } from '../domain/types';
import { ladosCubiertos, losaConHuecos } from './muros';

const est = (parcial: Partial<Estancia>): Estancia => ({
  id: 'x',
  tipo: 'salon',
  x: 0,
  y: 0,
  ancho: 4,
  fondo: 4,
  huecos: [],
  ...parcial,
});

describe('fusión de muros compartidos', () => {
  it('omite el muro oeste cuando la vecina anterior cubre todo el tramo', () => {
    const a = est({ id: 'a', x: 0, y: 0, ancho: 4, fondo: 6 });
    const b = est({ id: 'b', x: 4, y: 1, ancho: 3, fondo: 3 });
    expect([...ladosCubiertos(b, [a])]).toEqual(['oeste']);
  });

  it('no omite si el tramo no está cubierto por completo', () => {
    const a = est({ id: 'a', x: 0, y: 2, ancho: 4, fondo: 3 });
    const b = est({ id: 'b', x: 4, y: 1, ancho: 3, fondo: 6 }); // sobresale
    expect(ladosCubiertos(b, [a]).size).toBe(0);
  });

  it('no omite si el muro compartido tiene huecos (puerta entre estancias)', () => {
    const a = est({ id: 'a', x: 0, y: 0, ancho: 4, fondo: 6 });
    const b = est({
      id: 'b',
      x: 4,
      y: 1,
      ancho: 3,
      fondo: 3,
      huecos: [{ id: 'h', tipo: 'puerta', lado: 'oeste', offset: 1, ancho: 0.9, alto: 2.1, antepecho: 0 }],
    });
    expect(ladosCubiertos(b, [a]).size).toBe(0);
  });

  it('detecta norte/sur igual que este/oeste', () => {
    const a = est({ id: 'a', x: 0, y: 0, ancho: 6, fondo: 4 });
    const abajo = est({ id: 'b', x: 1, y: 4, ancho: 3, fondo: 3 });
    expect([...ladosCubiertos(abajo, [a])]).toEqual(['norte']);
  });
});

describe('losa de forjado con huecos (vacío a doble altura)', () => {
  const rect = { x: 2, y: 3, ancho: 6, fondo: 8 };

  it('la losa cubre exactamente la huella de la estancia', () => {
    const geo = losaConHuecos(rect, []);
    geo.computeBoundingBox();
    const bb = geo.boundingBox!;
    expect(bb.min.x).toBeCloseTo(rect.x);
    expect(bb.max.x).toBeCloseTo(rect.x + rect.ancho);
    expect(bb.min.y).toBeCloseTo(rect.y);
    expect(bb.max.y).toBeCloseTo(rect.y + rect.fondo);
  });

  it('perforar añade geometría (más vértices que sin hueco)', () => {
    const sin = losaConHuecos(rect, []).attributes.position.count;
    const con = losaConHuecos(rect, [{ x: 3, y: 4, ancho: 2, fondo: 3 }]).attributes
      .position.count;
    expect(con).toBeGreaterThan(sin);
  });
});
