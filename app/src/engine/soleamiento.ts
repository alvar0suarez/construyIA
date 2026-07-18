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
