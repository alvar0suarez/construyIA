import { PLANTAS, type Proyecto } from '../domain/types';
import type { NormativaMunicipal } from '../normativa/schema';
import { tipoEstancia } from './catalogo';
import {
  areaRect,
  contenidoEn,
  dimensionesParcela,
  envolventeEdificable,
} from './geometria';
import { calcularMetricas, type Metricas } from './metricas';

export type Nivel = 'ok' | 'aviso' | 'error';

export interface ResultadoRegla {
  regla: string;
  nivel: Nivel;
  mensaje: string;
  /** Valor medido y límite, formateados, para mostrar en la UI. */
  valor?: string;
  limite?: string;
}

export interface Evaluacion {
  metricas: Metricas;
  normativa: ResultadoRegla[];
  recomendaciones: ResultadoRegla[];
}

const f = (n: number, dec = 1) =>
  n.toLocaleString('es-ES', { maximumFractionDigits: dec });

export function evaluar(
  proyecto: Proyecto,
  normativa: NormativaMunicipal,
): Evaluacion {
  const m = calcularMetricas(proyecto);
  const reglas: ResultadoRegla[] = [];
  const recomendaciones: ResultadoRegla[] = [];

  // --- Fiabilidad de los datos ---
  if (normativa.verificacion === 'borrador' || normativa.verificacion === 'interpretada-ia') {
    reglas.push({
      regla: 'fiabilidad',
      nivel: 'aviso',
      mensaje: `Normativa en estado "${normativa.verificacion}": los parámetros están pendientes de verificar con la fuente oficial.`,
    });
  }

  // --- Parcela mínima ---
  if (normativa.parcelaMinima != null) {
    const cumple = m.areaParcela >= normativa.parcelaMinima;
    reglas.push({
      regla: 'parcela-minima',
      nivel: cumple ? 'ok' : 'error',
      mensaje: cumple
        ? 'La parcela supera la superficie mínima.'
        : 'La parcela no alcanza la superficie mínima de la ordenanza.',
      valor: `${f(m.areaParcela, 0)} m²`,
      limite: `≥ ${f(normativa.parcelaMinima, 0)} m²`,
    });
  }

  // --- Retranqueos ---
  const envolvente = envolventeEdificable(proyecto.parcela, normativa);
  const invasoras = PLANTAS.filter((p) => p.sobreRasante)
    .flatMap((p) => proyecto.plantas[p.id] ?? [])
    .filter(
      (e) => tipoEstancia(e.tipo).computaOcup && !contenidoEn(e, envolvente),
    );
  reglas.push({
    regla: 'retranqueos',
    nivel: invasoras.length === 0 ? 'ok' : 'error',
    mensaje:
      invasoras.length === 0
        ? 'Toda la edificación respeta los retranqueos.'
        : `${invasoras.length} estancia(s) invaden la zona de retranqueo.`,
    limite: `frente ${normativa.retranqueos.frente} m · fondo ${normativa.retranqueos.fondo} m · lateral ${normativa.retranqueos.lateral} m`,
  });

  // --- Retranqueo de piscina ---
  if (normativa.retranqueoPiscina != null) {
    const d = dimensionesParcela(proyecto.parcela);
    const r = normativa.retranqueoPiscina;
    const zonaPiscina = {
      x: r,
      y: r,
      ancho: Math.max(0, d.ancho - 2 * r),
      fondo: Math.max(0, d.fondo - 2 * r),
    };
    const piscinasFuera = Object.values(proyecto.plantas)
      .flat()
      .filter((e) => e.tipo === 'piscina' && !contenidoEn(e, zonaPiscina));
    if (piscinasFuera.length > 0) {
      reglas.push({
        regla: 'retranqueo-piscina',
        nivel: 'error',
        mensaje: 'La piscina está a menos distancia del lindero de la permitida.',
        limite: `≥ ${f(r)} m a todos los linderos`,
      });
    } else if (
      Object.values(proyecto.plantas).flat().some((e) => e.tipo === 'piscina')
    ) {
      reglas.push({
        regla: 'retranqueo-piscina',
        nivel: 'ok',
        mensaje: 'La piscina respeta el retranqueo a linderos.',
        limite: `≥ ${f(r)} m`,
      });
    }
  }

  // --- Ocupación ---
  const okOcup = m.ocupacionPct <= normativa.ocupacionMaxima + 1e-6;
  reglas.push({
    regla: 'ocupacion',
    nivel: okOcup ? 'ok' : 'error',
    mensaje: okOcup
      ? 'Ocupación dentro del máximo.'
      : 'La edificación ocupa más parcela de la permitida.',
    valor: `${f(m.ocupacionPct)} %`,
    limite: `≤ ${f(normativa.ocupacionMaxima)} %`,
  });

  // --- Edificabilidad ---
  const okEdif = m.edificabilidad <= normativa.edificabilidadMaxima + 1e-6;
  reglas.push({
    regla: 'edificabilidad',
    nivel: okEdif ? 'ok' : 'error',
    mensaje: okEdif
      ? 'Edificabilidad dentro del máximo.'
      : 'Se supera la edificabilidad máxima de la parcela.',
    valor: `${f(m.superficieComputable, 0)} m² (${f(m.edificabilidad, 2)} m²/m²)`,
    limite: `≤ ${f(normativa.edificabilidadMaxima * m.areaParcela, 0)} m² (${f(normativa.edificabilidadMaxima, 2)} m²/m²)`,
  });

  // --- Altura y plantas ---
  const okAltura = m.alturaEdificacion <= normativa.alturaMaxima + 1e-6;
  reglas.push({
    regla: 'altura',
    nivel: okAltura ? 'ok' : 'error',
    mensaje: okAltura
      ? 'Altura dentro del máximo.'
      : 'La edificación supera la altura máxima.',
    valor: `${f(m.alturaEdificacion)} m (${m.plantasSobreRasante} planta(s) × ${f(proyecto.alturaPorPlanta)} m)`,
    limite: `≤ ${f(normativa.alturaMaxima)} m`,
  });
  if (m.plantasSobreRasante > normativa.plantasMaximas) {
    reglas.push({
      regla: 'plantas',
      nivel: 'error',
      mensaje: `Hay ${m.plantasSobreRasante} plantas sobre rasante y la ordenanza permite ${normativa.plantasMaximas}.`,
    });
  }

  // --- Recomendaciones de diseño (no normativas) ---
  const todas = Object.values(proyecto.plantas).flat();
  for (const e of todas) {
    const def = tipoEstancia(e.tipo);
    if (def.minArea != null && areaRect(e) < def.minArea - 1e-6) {
      recomendaciones.push({
        regla: 'superficie-minima',
        nivel: 'aviso',
        mensaje: `${def.nombre}: ${f(areaRect(e))} m², por debajo del mínimo recomendado (${f(def.minArea)} m²).`,
      });
    }
  }

  if (m.numBanyos === 0 && todas.length > 0) {
    recomendaciones.push({
      regla: 'banyos',
      nivel: 'aviso',
      mensaje: 'No hay ningún baño ni aseo en la vivienda.',
    });
  } else if (m.numDormitorios >= 2 && m.numBanyos === 1) {
    recomendaciones.push({
      regla: 'banyos',
      nivel: 'aviso',
      mensaje: `${m.numDormitorios} dormitorios pero solo 1 baño.`,
    });
  }

  const hayPrimera = (proyecto.plantas.primera ?? []).length > 0;
  const hayEscalera = todas.some((e) => tipoEstancia(e.tipo).esEscalera);
  const haySotano = (proyecto.plantas.sotano ?? []).length > 0;
  if ((hayPrimera || haySotano) && !hayEscalera) {
    recomendaciones.push({
      regla: 'escalera',
      nivel: 'aviso',
      mensaje: 'Hay más de una planta pero ninguna escalera configurada.',
    });
  }

  if (m.superficieComputable > 0) {
    const plazas = todas.filter((e) => tipoEstancia(e.tipo).esGaraje).length;
    const rec = Math.ceil((m.superficieComputable / 100) * 1.5);
    if (plazas === 0) {
      recomendaciones.push({
        regla: 'garaje',
        nivel: 'aviso',
        mensaje: `Sin garaje. Recomendadas ~${rec} plaza(s) (1,5 por cada 100 m² construidos).`,
      });
    }
  }

  return { metricas: m, normativa: reglas, recomendaciones };
}
