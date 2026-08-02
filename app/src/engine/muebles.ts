/** Catálogo de mobiliario interior. Medidas en metros. */

export interface TipoMuebleDef {
  id: string;
  nombre: string;
  icono: string;
  color: string;
  /** Altura del mueble en metros (para el volumen 3D). */
  alto: number;
  defaultW: number;
  defaultD: number;
}

export const CATALOGO_MUEBLES: TipoMuebleDef[] = [
  { id: 'cama', nombre: 'Cama doble', icono: '🛏️', color: '#c9a27e', alto: 0.55, defaultW: 1.5, defaultD: 2 },
  { id: 'camaIndividual', nombre: 'Cama individual', icono: '🛏️', color: '#c9a27e', alto: 0.55, defaultW: 0.9, defaultD: 2 },
  { id: 'sofa', nombre: 'Sofá', icono: '🛋️', color: '#6f8faf', alto: 0.8, defaultW: 2, defaultD: 0.9 },
  { id: 'mesaComedor', nombre: 'Mesa comedor', icono: '🍽️', color: '#a9895f', alto: 0.75, defaultW: 1.6, defaultD: 0.9 },
  { id: 'mesa', nombre: 'Mesa', icono: '🪵', color: '#a9895f', alto: 0.75, defaultW: 1.2, defaultD: 0.7 },
  { id: 'escritorio', nombre: 'Escritorio', icono: '💻', color: '#9c8161', alto: 0.75, defaultW: 1.4, defaultD: 0.7 },
  { id: 'armario', nombre: 'Armario', icono: '🚪', color: '#8d7355', alto: 2.1, defaultW: 1.2, defaultD: 0.6 },
  { id: 'estanteria', nombre: 'Estantería', icono: '📚', color: '#8d7355', alto: 1.8, defaultW: 1, defaultD: 0.35 },
  { id: 'cocinaEncimera', nombre: 'Encimera cocina', icono: '🍳', color: '#d3d3d3', alto: 0.9, defaultW: 2.4, defaultD: 0.6 },
  { id: 'nevera', nombre: 'Nevera', icono: '🧊', color: '#dfe6ec', alto: 1.8, defaultW: 0.7, defaultD: 0.7 },
  { id: 'tv', nombre: 'TV / mueble', icono: '📺', color: '#2b2f33', alto: 0.5, defaultW: 1.6, defaultD: 0.4 },
  { id: 'inodoro', nombre: 'Inodoro', icono: '🚽', color: '#f2f4f6', alto: 0.42, defaultW: 0.4, defaultD: 0.6 },
  { id: 'lavabo', nombre: 'Lavabo', icono: '🚰', color: '#f2f4f6', alto: 0.85, defaultW: 0.6, defaultD: 0.45 },
  { id: 'ducha', nombre: 'Ducha', icono: '🚿', color: '#bcd3e0', alto: 0.08, defaultW: 0.9, defaultD: 0.9 },
  { id: 'banera', nombre: 'Bañera', icono: '🛁', color: '#e7eef2', alto: 0.55, defaultW: 1.6, defaultD: 0.7 },
];

const POR_ID = new Map(CATALOGO_MUEBLES.map((m) => [m.id, m]));
const GENERICO: TipoMuebleDef = {
  id: 'mueble',
  nombre: 'Mueble',
  icono: '📦',
  color: '#b0a48c',
  alto: 0.7,
  defaultW: 1,
  defaultD: 0.6,
};

export function tipoMueble(id: string): TipoMuebleDef {
  return POR_ID.get(id) ?? GENERICO;
}
