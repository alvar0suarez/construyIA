import { PLANTAS, type Proyecto } from '../domain/types';
import type { NormativaMunicipal } from '../normativa/schema';
import { tipoEstancia } from './catalogo';
import {
  areaInterseccion,
  areaRect,
  compartenPared,
  contenidoEn,
  dimensionesParcela,
  distanciaRects,
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
  const m = calcularMetricas(proyecto, normativa);
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

  // --- Cubierta ---
  if (m.plantasSobreRasante > 0) {
    const cubierta = proyecto.cubierta ?? { tipo: 'inclinada' as const, pendiente: 30 };
    if (normativa.pendienteCubierta) {
      const { min, max } = normativa.pendienteCubierta;
      if (cubierta.tipo === 'plana') {
        reglas.push({
          regla: 'cubierta',
          nivel: 'error',
          mensaje: `La ordenanza exige cubierta inclinada (${min}–${max}°) y el proyecto tiene cubierta plana.`,
        });
      } else if (cubierta.pendiente < min - 1e-6 || cubierta.pendiente > max + 1e-6) {
        reglas.push({
          regla: 'cubierta',
          nivel: 'error',
          mensaje: `Pendiente de cubierta fuera del rango permitido.`,
          valor: `${f(cubierta.pendiente, 0)}°`,
          limite: `${min}–${max}°`,
        });
      } else {
        reglas.push({
          regla: 'cubierta',
          nivel: 'ok',
          mensaje: 'Pendiente de cubierta dentro del rango.',
          valor: `${f(cubierta.pendiente, 0)}°`,
          limite: `${min}–${max}°`,
        });
      }
    }
    if (normativa.alturaMaximaCumbrera != null) {
      const okCumbrera = m.alturaCumbrera <= normativa.alturaMaximaCumbrera + 1e-6;
      reglas.push({
        regla: 'cumbrera',
        nivel: okCumbrera ? 'ok' : 'error',
        mensaje: okCumbrera
          ? 'Altura de cumbrera dentro del máximo.'
          : 'El tejado supera la altura máxima de cumbrera.',
        valor: `${f(m.alturaCumbrera)} m`,
        limite: `≤ ${f(normativa.alturaMaximaCumbrera)} m`,
      });
    }
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

  // --- Recomendaciones bioclimáticas (a partir de las ventanas) ---
  const HABITABLES = new Set(['salon', 'comedor', 'cocina', 'dormPrincipal', 'dormitorio']);
  const conHuecosDefinidos = todas.some((e) => (e.huecos ?? []).length > 0);
  if (conHuecosDefinidos) {
    for (const e of todas) {
      const def = tipoEstancia(e.tipo);
      if (!HABITABLES.has(def.id)) continue;
      const areaVentanas = (e.huecos ?? [])
        .filter((h) => h.tipo === 'ventana')
        .reduce((s, h) => s + h.ancho * h.alto, 0);
      const suelo = areaRect(e);
      if (areaVentanas === 0) {
        recomendaciones.push({
          regla: 'iluminacion',
          nivel: 'aviso',
          mensaje: `${def.nombre} sin ventanas: no tendrá luz natural ni ventilación.`,
        });
      } else if (areaVentanas < suelo * 0.1 - 1e-6) {
        recomendaciones.push({
          regla: 'iluminacion',
          nivel: 'aviso',
          mensaje: `${def.nombre}: ${f(areaVentanas)} m² de ventana para ${f(suelo)} m² de suelo (recomendado ≥ 10 %).`,
        });
      }
      if (
        def.id === 'salon' &&
        areaVentanas > 0 &&
        (e.huecos ?? []).filter((h) => h.tipo === 'ventana').every((h) => h.lado === 'norte')
      ) {
        recomendaciones.push({
          regla: 'orientacion',
          nivel: 'aviso',
          mensaje:
            'El salón solo tiene ventanas al norte: recibirá poca luz directa. ' +
            'Valora abrir huecos al sur/este.',
        });
      }
    }

    const vo = m.ventanasPorOrientacion;
    const totalVentanas = vo.norte + vo.sur + vo.este + vo.oeste;
    if (totalVentanas > 4 && vo.oeste > totalVentanas * 0.4) {
      recomendaciones.push({
        regla: 'orientacion',
        nivel: 'aviso',
        mensaje:
          `${f(vo.oeste)} m² de ventana al oeste (${f((vo.oeste / totalVentanas) * 100, 0)} % del total): ` +
          'riesgo de sobrecalentamiento en las tardes de verano y mayor gasto ' +
          'en climatización. Valora protecciones solares o redistribuir huecos.',
      });
    }
  }

  // --- Solapes entre estancias de la misma planta ---
  for (const p of PLANTAS) {
    const conMuros = (proyecto.plantas[p.id] ?? []).filter(
      (e) => tipoEstancia(e.tipo).computaOcup,
    );
    let solape = 0;
    for (let i = 0; i < conMuros.length; i++) {
      for (let j = i + 1; j < conMuros.length; j++) {
        solape += areaInterseccion(conMuros[i], conMuros[j]);
      }
    }
    if (solape > 1) {
      recomendaciones.push({
        regla: 'solape',
        nivel: 'aviso',
        mensaje: `${p.nombre}: hay estancias que se solapan (${f(solape)} m²). En el plano se recortan en cuña, pero conviene ajustarlas para que no se pisen.`,
      });
    }
  }

  // --- Distribución: adyacencias (por planta, como en la app original) ---
  for (const p of PLANTAS) {
    const enPlanta = proyecto.plantas[p.id] ?? [];
    const cocinas = enPlanta.filter((e) => e.tipo === 'cocina');
    const comedores = enPlanta.filter((e) => e.tipo === 'comedor');
    if (
      cocinas.length > 0 &&
      comedores.length > 0 &&
      !cocinas.some((c) => comedores.some((co) => compartenPared(c, co)))
    ) {
      recomendaciones.push({
        regla: 'adyacencia',
        nivel: 'aviso',
        mensaje: `${p.nombre}: la cocina y el comedor no comparten pared (servir será incómodo).`,
      });
    }

    const banyosPlanta = enPlanta.filter((e) => tipoEstancia(e.tipo).esBanyo);
    const principal = enPlanta.find((e) => e.tipo === 'dormPrincipal');
    if (
      principal &&
      banyosPlanta.length > 0 &&
      !banyosPlanta.some((b) => compartenPared(principal, b))
    ) {
      recomendaciones.push({
        regla: 'adyacencia',
        nivel: 'aviso',
        mensaje: 'El dormitorio principal no tiene baño en suite (pared compartida).',
      });
    }

    const dormitoriosPlanta = enPlanta.filter((e) => tipoEstancia(e.tipo).esDormitorio);
    if (dormitoriosPlanta.length > 0 && banyosPlanta.length > 0) {
      const lejanos = dormitoriosPlanta.filter(
        (d) => !banyosPlanta.some((b) => distanciaRects(d, b) < 3),
      );
      if (lejanos.length === dormitoriosPlanta.length) {
        recomendaciones.push({
          regla: 'adyacencia',
          nivel: 'aviso',
          mensaje: `${p.nombre}: ningún dormitorio tiene un baño cercano (< 3 m).`,
        });
      }
    }
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
