import type { NormativaMunicipal } from './schema';
import { galapagarU3 } from './data/galapagar';
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

export const NORMATIVAS: NormativaMunicipal[] = [galapagarU3, lasRozasNZ3];

export function getNormativa(
  id: string,
  personalizada: NormativaMunicipal,
): NormativaMunicipal {
  if (id === PERSONALIZADA_ID) return personalizada;
  return NORMATIVAS.find((n) => n.id === id) ?? galapagarU3;
}
