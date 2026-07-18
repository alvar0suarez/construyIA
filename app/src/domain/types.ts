/** Todas las magnitudes del dominio están en metros / m². */

export type Lado = 'norte' | 'sur' | 'este' | 'oeste';

export type PlantaId = 'sotano' | 'baja' | 'primera';

export const PLANTAS: { id: PlantaId; nombre: string; sobreRasante: boolean }[] = [
  { id: 'sotano', nombre: 'Sótano', sobreRasante: false },
  { id: 'baja', nombre: 'Planta baja', sobreRasante: true },
  { id: 'primera', nombre: 'Primera planta', sobreRasante: true },
];

/** Parcela rectangular definida por sus 4 lados. El frente es el lado que da a la calle. */
export interface Parcela {
  norte: number;
  sur: number;
  este: number;
  oeste: number;
  frente: Lado;
}

export interface Rect {
  x: number;
  y: number;
  ancho: number;
  fondo: number;
}

export interface Estancia extends Rect {
  id: string;
  tipo: string; // id de TipoEstanciaDef en el catálogo
}

export interface Proyecto {
  schemaVersion: 1;
  nombre: string;
  normativaId: string;
  parcela: Parcela;
  plantas: Record<PlantaId, Estancia[]>;
  /** Altura libre + forjado por planta sobre rasante, en metros. */
  alturaPorPlanta: number;
}
