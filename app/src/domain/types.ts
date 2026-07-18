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

/**
 * Hueco (ventana o puerta) en una pared de una estancia.
 * `lado` es la pared de la estancia (coincide con la orientación real,
 * porque las estancias están alineadas con los ejes de la parcela).
 * `offset` se mide en metros desde el extremo oeste (paredes norte/sur)
 * o desde el extremo norte (paredes este/oeste).
 */
export interface Hueco {
  id: string;
  tipo: 'ventana' | 'puerta';
  lado: Lado;
  offset: number;
  ancho: number;
  alto: number;
  /** Altura del antepecho (0 en puertas). */
  antepecho: number;
}

export interface Estancia extends Rect {
  id: string;
  tipo: string; // id de TipoEstanciaDef en el catálogo
  huecos?: Hueco[];
}

export interface Proyecto {
  schemaVersion: 1;
  nombre: string;
  normativaId: string;
  /**
   * Sobrescrituras del usuario sobre la normativa seleccionada (por id de
   * normativa, para conservarlas al cambiar de una a otra). Estructura
   * definida en normativa/registry.ts (AjustesNormativa).
   */
  ajustesNormativa?: Record<string, unknown>;
  parcela: Parcela;
  plantas: Record<PlantaId, Estancia[]>;
  /** Altura libre + forjado por planta sobre rasante, en metros. */
  alturaPorPlanta: number;
  /** Cubierta de la vivienda. Si falta, se asume inclinada a 30°. */
  cubierta?: { tipo: 'plana' | 'inclinada'; pendiente: number };
}

export const CUBIERTA_DEFECTO = { tipo: 'inclinada', pendiente: 30 } as const;
