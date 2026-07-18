import { describe, expect, it } from 'vitest';
import type { Proyecto } from '../domain/types';
import { evaluar } from '../engine/cumplimiento';
import { galapagarU3 } from '../normativa/data/galapagar';
import { resumenProyecto } from './contexto';

function proyecto(): Proyecto {
  return {
    schemaVersion: 1,
    nombre: 'Test',
    normativaId: 'galapagar-u3',
    parcela: { norte: 20, sur: 20, este: 30, oeste: 30, frente: 'sur' },
    plantas: {
      sotano: [],
      baja: [{ id: 's', tipo: 'salon', x: 5, y: 5, ancho: 5, fondo: 4, huecos: [] }],
      primera: [],
    },
    alturaPorPlanta: 3,
  };
}

describe('resumen de contexto para la IA', () => {
  it('incluye normativa, parcela, estancias y estado', () => {
    const p = proyecto();
    const texto = resumenProyecto(p, galapagarU3, evaluar(p, galapagarU3));
    expect(texto).toContain('Galapagar');
    expect(texto).toContain('ocupación máx 30 %');
    expect(texto).toContain('20.0 × 30.0 m');
    expect(texto).toContain('Sala de estar 5.0×4.0 m');
    expect(texto).toContain('cumple la normativa');
  });

  it('refleja los incumplimientos y el proyecto vacío', () => {
    const p = proyecto();
    p.plantas.baja = [];
    expect(resumenProyecto(p, galapagarU3, evaluar(p, galapagarU3))).toContain(
      'no tiene ninguna estancia',
    );
    // Ocupar toda la parcela: se supera la ocupación
    const lleno = proyecto();
    lleno.plantas.baja = [{ id: 'g', tipo: 'salon', x: 3, y: 3, ancho: 14, fondo: 24, huecos: [] }];
    expect(resumenProyecto(lleno, galapagarU3, evaluar(lleno, galapagarU3))).toContain(
      'INCUMPLIMIENTOS',
    );
  });
});
