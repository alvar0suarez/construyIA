/**
 * Posición solar aproximada (fórmulas clásicas de declinación y ángulo
 * horario). Precisión de ±1–2°, de sobra para sombras orientativas.
 */

const RAD = Math.PI / 180;

/** Día del año representativo de cada mes (día 21). */
export function diaDelAnyo(mes: number): number {
  const acumulados = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  return acumulados[Math.min(Math.max(mes, 1), 12) - 1] + 21;
}

export interface PosicionSolar {
  /** Elevación sobre el horizonte en grados (negativa = noche). */
  elevacion: number;
  /** Azimut en grados desde el norte, en sentido horario (180 = sur). */
  azimut: number;
}

export function posicionSolar(
  latitud: number,
  dia: number,
  horaSolar: number,
): PosicionSolar {
  const decl = 23.45 * Math.sin(RAD * (360 / 365) * (284 + dia));
  const anguloHorario = 15 * (horaSolar - 12);

  const senElev =
    Math.sin(RAD * latitud) * Math.sin(RAD * decl) +
    Math.cos(RAD * latitud) * Math.cos(RAD * decl) * Math.cos(RAD * anguloHorario);
  const elevacion = Math.asin(senElev) / RAD;

  const cosAz =
    (Math.sin(RAD * decl) - senElev * Math.sin(RAD * latitud)) /
    (Math.cos(Math.asin(senElev)) * Math.cos(RAD * latitud));
  let azimut = Math.acos(Math.min(1, Math.max(-1, cosAz))) / RAD;
  if (anguloHorario > 0) azimut = 360 - azimut;

  return { elevacion, azimut };
}

export interface OrtoOcaso {
  /** Hora solar de amanecer y atardecer (12 = mediodía solar). */
  amanecer: number;
  atardecer: number;
  horasDeSol: number;
}

/** Orto y ocaso (en hora solar) para una latitud y día del año. */
export function ortoYOcaso(latitud: number, dia: number): OrtoOcaso {
  const decl = 23.45 * Math.sin(RAD * (360 / 365) * (284 + dia));
  const cosH0 = -Math.tan(RAD * latitud) * Math.tan(RAD * decl);
  // Fuera de |1| habría sol de medianoche / noche polar (no ocurre en España).
  const h0 = Math.acos(Math.min(1, Math.max(-1, cosH0))) / RAD / 15;
  return { amanecer: 12 - h0, atardecer: 12 + h0, horasDeSol: 2 * h0 };
}

/**
 * Conversión hora solar ↔ hora local oficial en España peninsular/Baleares:
 * corrige la longitud geográfica (4 min por grado) y el huso (CET/CEST,
 * con cambio de hora aproximado abril–octubre). Ignora la ecuación del
 * tiempo (±15 min) — suficiente para uso orientativo.
 */
export function solarALocal(horaSolar: number, longitud: number, mes: number): number {
  const huso = mes >= 4 && mes <= 10 ? 2 : 1;
  return horaSolar - longitud / 15 + huso;
}

export function localASolar(horaLocal: number, longitud: number, mes: number): number {
  const huso = mes >= 4 && mes <= 10 ? 2 : 1;
  return horaLocal + longitud / 15 - huso;
}

/** Formatea una hora decimal como "HH:MM" (normalizada a 0–24). */
export function formatoHora(h: number): string {
  const norm = ((h % 24) + 24) % 24;
  const horas = Math.floor(norm);
  const minutos = Math.round((norm - horas) * 60);
  return `${String(horas + (minutos === 60 ? 1 : 0)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;
}

/**
 * Vector unitario (x, y, z) apuntando HACIA el sol en el sistema de la
 * escena 3D: x = este, y = arriba, z = sur (el plano usa norte arriba,
 * que en 3D es -z).
 */
export function vectorSolar(pos: PosicionSolar): { x: number; y: number; z: number } {
  const e = RAD * pos.elevacion;
  const a = RAD * pos.azimut;
  return {
    x: Math.sin(a) * Math.cos(e),
    y: Math.sin(e),
    z: -Math.cos(a) * Math.cos(e),
  };
}
