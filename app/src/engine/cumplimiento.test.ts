import { describe, expect, it } from 'vitest';
import type { Proyecto } from '../domain/types';
import { galapagarU3 } from '../normativa/data/galapagar';
import { evaluar } from './cumplimiento';
import {
  areaUnion,
  compartenPared,
  distanciaRects,
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

  it('compartenPared y distanciaRects', () => {
    const a = { x: 0, y: 0, ancho: 4, fondo: 4 };
    const pegadoDerecha = { x: 4, y: 1, ancho: 3, fondo: 3 };
    const pegadoDebajo = { x: 1, y: 4, ancho: 3, fondo: 3 };
    const separado = { x: 6, y: 0, ancho: 3, fondo: 3 };
    const esquina = { x: 4, y: 3.8, ancho: 3, fondo: 3 }; // solape de solo 0.2
    expect(compartenPared(a, pegadoDerecha)).toBe(true);
    expect(compartenPared(a, pegadoDebajo)).toBe(true);
    expect(compartenPared(a, separado)).toBe(false);
    expect(compartenPared(a, esquina)).toBe(false);
    expect(distanciaRects(a, separado)).toBeCloseTo(2);
    expect(distanciaRects(a, pegadoDerecha)).toBe(0);
    expect(distanciaRects(a, { x: 7, y: 8, ancho: 1, fondo: 1 })).toBeCloseTo(5);
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

  it('edificabilidad: el sótano no computa y el porche computa al 60 %', () => {
    const p = proyectoBase();
    p.plantas.sotano.push({ id: 's', tipo: 'garaje', x: 5, y: 5, ancho: 10, fondo: 10 }); // 100 m² → 0
    p.plantas.baja.push({ id: 'b', tipo: 'salon', x: 5, y: 5, ancho: 10, fondo: 10 }); // 100 m²
    p.plantas.baja.push({ id: 'p', tipo: 'porche', x: 5, y: 15, ancho: 4, fondo: 5 }); // 20 m² → 12
    const ev = evaluar(p, galapagarU3);
    // Galapagar sobreescribe el porche a 0,6: 100 + 20·0,6 = 112
    expect(ev.metricas.superficieComputable).toBeCloseTo(112);
    expect(ev.normativa.find((r) => r.regla === 'edificabilidad')!.nivel).toBe('ok');
  });

  it('el coeficiente de edificabilidad es parametrizable por normativa', () => {
    const p = proyectoBase();
    p.plantas.baja.push({ id: 'p', tipo: 'porche', x: 5, y: 5, ancho: 4, fondo: 5 }); // 20 m²
    // Sin override: el porche usa el 0,5 genérico del catálogo → 10 m²
    const generica = { ...galapagarU3, computo: undefined };
    expect(evaluar(p, generica).metricas.superficieComputable).toBeCloseTo(10);
    // Con override a 1: 20 m²
    const computaTodo = { ...galapagarU3, computo: { edificabilidad: { porche: 1 } } };
    expect(evaluar(p, computaTodo).metricas.superficieComputable).toBeCloseTo(20);
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

  it('detecta solapes entre estancias de la misma planta', () => {
    const p = proyectoBase();
    p.plantas.baja.push({ id: 'a', tipo: 'salon', x: 5, y: 5, ancho: 4, fondo: 4 });
    p.plantas.baja.push({ id: 'b', tipo: 'dormitorio', x: 7, y: 7, ancho: 4, fondo: 4 }); // solapa 2×2 = 4 m²
    const sin = evaluar(proyectoBase(), galapagarU3).recomendaciones.some((r) => r.regla === 'solape');
    expect(sin).toBe(false);
    const con = evaluar(p, galapagarU3).recomendaciones.find((r) => r.regla === 'solape');
    expect(con?.mensaje).toContain('se solapan');
  });

  it('doble altura: una estancia sube la altura de la edificación y la cumbrera', () => {
    const p = proyectoBase();
    p.alturaPorPlanta = 3;
    p.cubierta = { tipo: 'plana', pendiente: 0 };
    // Salón a doble altura en planta baja (sin primera): 2 × 3 = 6 m a cornisa
    p.plantas.baja.push({ id: 's', tipo: 'salon', x: 5, y: 5, ancho: 5, fondo: 4, alturaPlantas: 2 });
    const ev = evaluar(p, galapagarU3);
    expect(ev.metricas.alturaEdificacion).toBeCloseTo(6);
    expect(ev.metricas.alturaCumbrera).toBeCloseTo(6);
    // La superficie computable se cuenta una vez (es el suelo), no doble
    expect(ev.metricas.superficieComputable).toBeCloseTo(20);
  });

  it('parcela mínima', () => {
    const p = proyectoBase();
    p.parcela = { norte: 15, sur: 15, este: 20, oeste: 20, frente: 'sur' }; // 300 m² < 500
    const ev = evaluar(p, galapagarU3);
    expect(ev.normativa.find((r) => r.regla === 'parcela-minima')!.nivel).toBe('error');
  });

  it('retranqueo de piscina: valida contra todos los linderos', () => {
    const p = proyectoBase();
    const normativaConPiscina = { ...galapagarU3, retranqueoPiscina: 3 };
    p.plantas.baja.push({ id: 'pi', tipo: 'piscina', x: 1, y: 10, ancho: 4, fondo: 8 });
    let regla = evaluar(p, normativaConPiscina).normativa.find(
      (r) => r.regla === 'retranqueo-piscina',
    )!;
    expect(regla.nivel).toBe('error');
    p.plantas.baja[0].x = 3.5;
    regla = evaluar(p, normativaConPiscina).normativa.find(
      (r) => r.regla === 'retranqueo-piscina',
    )!;
    expect(regla.nivel).toBe('ok');
    // Sin el parámetro en la normativa, no se emite la regla
    expect(
      evaluar(p, galapagarU3).normativa.find((r) => r.regla === 'retranqueo-piscina'),
    ).toBeUndefined();
  });

  it('bioclimática: iluminación insuficiente, salón al norte y exceso al oeste', () => {
    const p = proyectoBase();
    p.plantas.baja.push({
      id: 's1', tipo: 'salon', x: 5, y: 5, ancho: 5, fondo: 5,
      huecos: [{ id: 'h1', tipo: 'ventana', lado: 'norte', offset: 1, ancho: 1, alto: 1, antepecho: 1 }],
    });
    p.plantas.baja.push({
      id: 'd1', tipo: 'dormitorio', x: 11, y: 5, ancho: 4, fondo: 3, huecos: [],
    });
    p.plantas.baja.push({
      id: 'c1', tipo: 'cocina', x: 5, y: 11, ancho: 4, fondo: 3,
      huecos: [
        { id: 'h2', tipo: 'ventana', lado: 'oeste', offset: 0.5, ancho: 2.5, alto: 2, antepecho: 0.5 },
      ],
    });
    const ev = evaluar(p, galapagarU3);
    const msgs = ev.recomendaciones.map((r) => r.mensaje).join(' | ');
    // Salón: 1 m² ventana / 25 m² suelo < 10 % y todo al norte
    expect(msgs).toContain('recomendado ≥ 10 %');
    expect(msgs).toContain('solo tiene ventanas al norte');
    // Dormitorio sin ventanas
    expect(msgs).toContain('sin ventanas');
    // 5 m² al oeste de 6 m² totales > 40 %
    expect(msgs).toContain('oeste');
    expect(ev.metricas.ventanasPorOrientacion.oeste).toBeCloseTo(5);
  });

  it('bioclimática: sin huecos definidos en ninguna estancia no se emiten avisos', () => {
    const p = proyectoBase();
    p.plantas.baja.push({ id: 's1', tipo: 'salon', x: 5, y: 5, ancho: 5, fondo: 5 });
    const ev = evaluar(p, galapagarU3);
    const msgs = ev.recomendaciones.map((r) => r.mensaje).join(' | ');
    expect(msgs).not.toContain('ventana');
  });

  it('adyacencias: cocina-comedor, en suite y baño cercano', () => {
    const p = proyectoBase();
    p.plantas.baja.push(
      { id: 'c', tipo: 'cocina', x: 5, y: 5, ancho: 3, fondo: 3 },
      { id: 'co', tipo: 'comedor', x: 12, y: 5, ancho: 3, fondo: 4 }, // lejos de la cocina
      { id: 'dp', tipo: 'dormPrincipal', x: 5, y: 12, ancho: 4, fondo: 4 },
      { id: 'b', tipo: 'banyo', x: 16, y: 20, ancho: 2, fondo: 2 }, // lejos de todo
    );
    let msgs = evaluar(p, galapagarU3).recomendaciones.map((r) => r.mensaje).join(' | ');
    expect(msgs).toContain('cocina y el comedor no comparten pared');
    expect(msgs).toContain('no tiene baño en suite');
    expect(msgs).toContain('ningún dormitorio tiene un baño cercano');

    // Pegamos el comedor a la cocina y el baño al dormitorio principal
    p.plantas.baja[1].x = 8; // comedor pegado a cocina (borde x=8)
    p.plantas.baja[3].x = 9; // baño pegado al principal (x: 5+4)
    p.plantas.baja[3].y = 13;
    msgs = evaluar(p, galapagarU3).recomendaciones.map((r) => r.mensaje).join(' | ');
    expect(msgs).not.toContain('no comparten pared');
    expect(msgs).not.toContain('en suite');
    expect(msgs).not.toContain('baño cercano');
  });

  it('cubierta: pendiente y cumbrera contra la normativa', () => {
    const p = proyectoBase();
    p.plantas.baja.push({ id: 'b', tipo: 'salon', x: 5, y: 5, ancho: 8, fondo: 6 });
    // Inclinada 30°: caballete = 3·tan(30°) ≈ 1,73 → cumbrera 3 + 1,73 = 4,73 < 10,1
    p.cubierta = { tipo: 'inclinada', pendiente: 30 };
    let ev = evaluar(p, galapagarU3);
    expect(ev.normativa.find((r) => r.regla === 'cubierta')!.nivel).toBe('ok');
    expect(ev.normativa.find((r) => r.regla === 'cumbrera')!.nivel).toBe('ok');
    expect(ev.metricas.alturaCumbrera).toBeCloseTo(3 + 3 * Math.tan(Math.PI / 6), 2);

    // Plana: la ordenanza exige inclinada
    p.cubierta = { tipo: 'plana', pendiente: 0 };
    ev = evaluar(p, galapagarU3);
    expect(ev.normativa.find((r) => r.regla === 'cubierta')!.nivel).toBe('error');
    expect(ev.metricas.alturaCumbrera).toBeCloseTo(3);

    // Pendiente fuera de rango
    p.cubierta = { tipo: 'inclinada', pendiente: 55 };
    ev = evaluar(p, galapagarU3);
    expect(ev.normativa.find((r) => r.regla === 'cubierta')!.nivel).toBe('error');
  });

  it('cubierta: la estancia cubierta por la planta superior no lleva tejado', () => {
    const p = proyectoBase();
    p.alturaPorPlanta = 3;
    p.cubierta = { tipo: 'inclinada', pendiente: 45 };
    // Baja 10×10 con primera 10×10 encima: solo la primera lleva tejado
    p.plantas.baja.push({ id: 'b', tipo: 'salon', x: 5, y: 5, ancho: 10, fondo: 10 });
    p.plantas.primera.push({ id: 'p1', tipo: 'dormitorio', x: 5, y: 5, ancho: 10, fondo: 10 });
    const ev = evaluar(p, galapagarU3);
    // Cumbrera = 6 (cornisa primera) + 5·tan45 = 11 → supera 10,1
    expect(ev.metricas.alturaCumbrera).toBeCloseTo(11);
    expect(ev.normativa.find((r) => r.regla === 'cumbrera')!.nivel).toBe('error');
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
