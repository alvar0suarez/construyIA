/**
 * Nivel de confianza de los datos de una normativa. Importante: NINGUNO
 * implica validación por un organismo oficial — describe únicamente cuánto
 * trabajo de cotejo ha hecho el proyecto sobre las fuentes:
 *
 * - `contrastada`: una persona del proyecto ha cotejado cada parámetro con
 *   el documento oficial citado en `fuentes` (en la fecha `fechaRevision`).
 * - `borrador`: valores recopilados pero con cotejo incompleto o pendiente.
 * - `interpretada-ia`: extraída de un documento por IA, sin revisión humana.
 * - `personalizada`: introducida a mano por el usuario.
 */
export type NivelVerificacion =
  | 'contrastada'
  | 'borrador'
  | 'interpretada-ia'
  | 'personalizada';

export interface FuenteNormativa {
  titulo: string;
  url?: string;
}

/**
 * Normativa urbanística de una zona/ordenanza municipal, como datos
 * declarativos. El motor de cumplimiento la interpreta; añadir un municipio
 * es añadir datos, no código.
 */
export interface NormativaMunicipal {
  id: string;
  municipio: string;
  provincia: string;
  zona: string;
  verificacion: NivelVerificacion;
  /** Fecha ISO de la última revisión de estos datos. */
  fechaRevision: string;
  fuentes: FuenteNormativa[];

  /** m² — opcional; si falta, no se valida. */
  parcelaMinima?: number;
  /** Retranqueos mínimos en metros, medidos perpendicularmente al lindero. */
  retranqueos: { frente: number; fondo: number; lateral: number };
  /** % máximo de la parcela ocupable por edificación. */
  ocupacionMaxima: number;
  /** m² construibles por m² de parcela. */
  edificabilidadMaxima: number;
  /** Altura máxima de la edificación en metros. */
  alturaMaxima: number;
  /** Nº máximo de plantas sobre rasante. */
  plantasMaximas: number;
  /** Retranqueo mínimo de la piscina a todos los linderos, en metros. */
  retranqueoPiscina?: number;
  /** Condiciones (estéticas u otras) aún no modeladas de forma estructurada. */
  notas?: string;
  /** Coordenadas del municipio, para el mapa de cobertura. */
  ubicacion?: { lat: number; lng: number };
}
