import type { NormativaMunicipal } from '../schema';

export const galapagarU3: NormativaMunicipal = {
  id: 'galapagar-u3',
  municipio: 'Galapagar',
  provincia: 'Madrid',
  zona: 'Residencial Unifamiliar U3 (UA4)',
  verificacion: 'verificada',
  fechaRevision: '2026-07-18',
  fuentes: [
    {
      titulo: 'Normas urbanísticas de Galapagar (Comunidad de Madrid)',
      url: 'https://www.comunidad.madrid/transparencia/sites/default/files/regulation/documents/03_normas_urbanisticas_1.pdf',
    },
    {
      titulo: 'NNSS vigentes — visor Planea (IDEM Madrid)',
      url: 'https://idem.madrid.org/cartografia/planea/planeamiento/planeamiento/Galapagar/Vigente/NURBANISTICAS.PDF',
    },
  ],
  parcelaMinima: 500,
  retranqueos: { frente: 4, fondo: 3, lateral: 3 },
  ocupacionMaxima: 50,
  edificabilidadMaxima: 0.5,
  alturaMaxima: 6.5,
  plantasMaximas: 2,
  notas:
    'Cubierta inclinada 20–45°. Teja cerámica o pizarra. Sin ladrillo visto. ' +
    'Sin carpintería de aluminio en color natural. Garaje bajo rasante no ' +
    'computa edificabilidad (Art. 3.11.2.2.A). Tipología aislada o pareada ' +
    '(en pareado, retranqueo nulo al lindero común).',
};
