import type { NormativaMunicipal } from '../schema';

/**
 * BORRADOR con cotejo parcial (2026-07-18) contra el Avance del PGOU de
 * Galapagar (documento en tramitación que transcribe las condiciones de las
 * NN.SS 88/89 para el ámbito de La Navata). El grado RU3 (AS y pareada,
 * parcela mínima 500 m²) coincide con los valores de la app original en
 * retranqueos (4/3/3), edificabilidad (0,5), altura (6,5 m) y plantas (2),
 * PERO fija la ocupación en 30 % (la app original usaba 50 %, que
 * corresponde al grado RU4). Se adopta el 30 % documentado, más conservador.
 * Pendiente: contrastar con el texto vigente de las NN.SS 89 (no el Avance)
 * para subir a 'contrastada'.
 */
export const galapagarU3: NormativaMunicipal = {
  id: 'galapagar-u3',
  municipio: 'Galapagar',
  provincia: 'Madrid',
  zona: 'Residencial Unifamiliar RU3/U3 (La Navata, UA4)',
  verificacion: 'borrador',
  fechaRevision: '2026-07-18',
  fuentes: [
    {
      titulo: 'Avance PGOU Galapagar — Normas urbanísticas (Ordenanza 3 Unifamiliar RU y cuadro La Navata)',
      url: 'https://www.comunidad.madrid/transparencia/sites/default/files/regulation/documents/03_normas_urbanisticas_1.pdf',
    },
    {
      titulo: 'NNSS 1976 (texto refundido COPLACO) — visor Planea (IDEM Madrid)',
      url: 'https://idem.madrid.org/cartografia/planea/planeamiento/planeamiento/Galapagar/Vigente/NURBANISTICAS.PDF',
    },
  ],
  parcelaMinima: 500,
  retranqueos: { frente: 4, fondo: 3, lateral: 3 },
  ocupacionMaxima: 30,
  edificabilidadMaxima: 0.5,
  alturaMaxima: 6.5,
  plantasMaximas: 2,
  notas:
    'RU3 admite tipología aislada o pareada (en pareado, retranqueo nulo al ' +
    'lindero común con proyecto unitario). Frente mínimo de parcela 10 m. ' +
    'Separación entre edificaciones 3 m. 2 plazas de aparcamiento por ' +
    'vivienda dentro de la parcela. En la ordenanza RU no computa la ' +
    'edificabilidad bajo cubierta ni bajo rasante. Estética: prohibido ' +
    'ladrillo visto, revoco a la tirolesa y aluminio en color natural; ' +
    'preferencia por madera, cerámico o pétreo. ⚠️ OJO: la app original ' +
    'usaba ocupación 50 % — el Avance del PGOU documenta 30 % para RU3; ' +
    'verifica el grado exacto de tu parcela con el Ayuntamiento.',
  ubicacion: { lat: 40.5794, lng: -4.0028 },
};
