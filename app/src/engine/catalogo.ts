/**
 * Catálogo de tipos de estancia. Portado de la app original ("Casa Diseño")
 * con los coeficientes de cómputo simplificados de F0:
 * - computaEdif: fracción de su superficie que computa edificabilidad
 *   cuando está sobre rasante (el sótano nunca computa en F0).
 * - computaOcup: si su proyección computa ocupación de parcela.
 */
export interface TipoEstanciaDef {
  id: string;
  nombre: string;
  icono: string;
  color: string;
  /** Superficie mínima recomendada en m² (aviso, no error normativo). */
  minArea?: number;
  defaultW: number;
  defaultD: number;
  computaEdif: number;
  computaOcup: boolean;
  esDormitorio?: boolean;
  esBanyo?: boolean;
  esEscalera?: boolean;
  esGaraje?: boolean;
}

export const CATALOGO: TipoEstanciaDef[] = [
  { id: 'salon', nombre: 'Sala de estar', icono: '🛋', color: '#a8d8a8', minArea: 16, defaultW: 4, defaultD: 4, computaEdif: 1, computaOcup: true },
  { id: 'comedor', nombre: 'Comedor', icono: '🍽', color: '#f4f0a6', minArea: 12, defaultW: 3, defaultD: 4, computaEdif: 1, computaOcup: true },
  { id: 'cocina', nombre: 'Cocina', icono: '🍳', color: '#f4d6a6', minArea: 10, defaultW: 3, defaultD: 3, computaEdif: 1, computaOcup: true },
  { id: 'dormPrincipal', nombre: 'Dorm. principal', icono: '👑', color: '#e8a0b8', minArea: 14, defaultW: 4, defaultD: 4, computaEdif: 1, computaOcup: true, esDormitorio: true },
  { id: 'dormitorio', nombre: 'Dormitorio', icono: '🛏', color: '#f4a6a6', minArea: 10, defaultW: 3, defaultD: 4, computaEdif: 1, computaOcup: true, esDormitorio: true },
  { id: 'banyo', nombre: 'Baño', icono: '🛁', color: '#a6d4f4', minArea: 4, defaultW: 2, defaultD: 2, computaEdif: 1, computaOcup: true, esBanyo: true },
  { id: 'aseo', nombre: 'Aseo', icono: '🚽', color: '#c2e0f4', minArea: 1.5, defaultW: 1.5, defaultD: 1.2, computaEdif: 1, computaOcup: true, esBanyo: true },
  { id: 'pasillo', nombre: 'Pasillo / distribuidor', icono: '🚪', color: '#e0e0e0', defaultW: 1.2, defaultD: 4, computaEdif: 1, computaOcup: true },
  { id: 'escalera', nombre: 'Escalera', icono: '🪜', color: '#cbb8a0', defaultW: 1.2, defaultD: 3, computaEdif: 1, computaOcup: true, esEscalera: true },
  { id: 'garaje', nombre: 'Garaje', icono: '🚗', color: '#b8c4cc', minArea: 15, defaultW: 3.5, defaultD: 5.5, computaEdif: 1, computaOcup: true, esGaraje: true },
  { id: 'trastero', nombre: 'Trastero / lavadero', icono: '📦', color: '#d8cfc4', defaultW: 2, defaultD: 2, computaEdif: 1, computaOcup: true },
  { id: 'porche', nombre: 'Porche abierto', icono: '⛱', color: '#c8e6c9', defaultW: 3, defaultD: 3, computaEdif: 0.5, computaOcup: true },
  { id: 'terraza', nombre: 'Terraza descubierta', icono: '🌤', color: '#ffe0b2', minArea: 9, defaultW: 3, defaultD: 3, computaEdif: 0, computaOcup: false },
  { id: 'piscina', nombre: 'Piscina', icono: '🏊', color: '#81d4fa', defaultW: 4, defaultD: 8, computaEdif: 0, computaOcup: false },
];

const porId = new Map(CATALOGO.map((t) => [t.id, t]));

export function tipoEstancia(id: string): TipoEstanciaDef {
  const def = porId.get(id);
  if (!def) throw new Error(`Tipo de estancia desconocido: ${id}`);
  return def;
}
