import type { NormativaMunicipal } from './schema';
import { galapagarRU4, galapagarU3 } from './data/galapagar';
import { lasRozasNZ3 } from './data/lasRozas';

export const PERSONALIZADA_ID = 'personalizada';

export const plantillaPersonalizada: NormativaMunicipal = {
  id: PERSONALIZADA_ID,
  municipio: 'Mi municipio',
  provincia: '',
  zona: 'Parámetros introducidos a mano',
  verificacion: 'personalizada',
  fechaRevision: '',
  fuentes: [],
  retranqueos: { frente: 4, fondo: 3, lateral: 3 },
  ocupacionMaxima: 50,
  edificabilidadMaxima: 0.5,
  alturaMaxima: 6.5,
  plantasMaximas: 2,
};

export const NORMATIVAS: NormativaMunicipal[] = [galapagarU3, galapagarRU4, lasRozasNZ3];

/** Parámetros numéricos que el usuario puede sobrescribir sobre cualquier normativa. */
export type AjustesNormativa = Partial<
  Pick<
    NormativaMunicipal,
    | 'retranqueos'
    | 'ocupacionMaxima'
    | 'edificabilidadMaxima'
    | 'alturaMaxima'
    | 'plantasMaximas'
    | 'parcelaMinima'
    | 'retranqueoPiscina'
  >
>;

/**
 * Aplica los ajustes del usuario sobre una normativa base. El resultado se
 * marca como `personalizada` para que la UI y las validaciones dejen claro
 * que ya no son los valores de la fuente.
 */
export function aplicarAjustes(
  base: NormativaMunicipal,
  ajustes: AjustesNormativa | undefined,
): NormativaMunicipal {
  if (!ajustes || Object.keys(ajustes).length === 0) return base;
  return {
    ...base,
    ...ajustes,
    retranqueos: { ...base.retranqueos, ...ajustes.retranqueos },
    verificacion: 'personalizada',
    zona: `${base.zona} (con ajustes tuyos)`,
  };
}

export function getNormativa(
  id: string,
  personalizada: NormativaMunicipal,
  ajustes?: AjustesNormativa,
): NormativaMunicipal {
  if (id === PERSONALIZADA_ID) return personalizada;
  const base = NORMATIVAS.find((n) => n.id === id) ?? galapagarU3;
  return aplicarAjustes(base, ajustes);
}
