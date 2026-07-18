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
      titulo: 'Avance PGOU Galapagar — Normas urbanísticas (copia en el repositorio, aportada por el propietario)',
      url: 'https://github.com/alvar0suarez/construyIA/blob/main/docs/normativa-fuentes/galapagar-pgou-avance-normas-urbanisticas.pdf',
    },
    {
      titulo: 'Original en el portal de transparencia de la Comunidad de Madrid',
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
  alturaMaximaCumbrera: 10.1,
  pendienteCubierta: { min: 20, max: 45 },
  plantasMaximas: 2,
  notas:
    'RU3 admite tipología aislada o pareada (en pareado, retranqueo nulo al ' +
    'lindero común con proyecto unitario). Frente mínimo de parcela 10 m. ' +
    'Separación entre edificaciones 3 m. 2 plazas de aparcamiento por ' +
    'vivienda dentro de la parcela. En la ordenanza RU no computa la ' +
    'edificabilidad bajo cubierta ni bajo rasante. Piscinas (edificación ' +
    'auxiliar, §6.2.6): enterradas (≤1 m sobre el terreno) no computan y ' +
    'pueden adosarse a linderos; elevadas ≥1 m, a 3 m de linderos y vía ' +
    'pública salvo autorización del colindante. Edificaciones auxiliares: ' +
    'máx. 100 m², solo planta baja, cumbrera ≤3 m (6 m en vestuarios RU); ' +
    'techadas computan ocupación 100 % y edificabilidad 50 % (100 % si ' +
    'cerradas por 3+ lados). Estética: prohibido ladrillo visto, revoco a ' +
    'la tirolesa y aluminio en color natural. ⚠️ Si tu parcela es de grado ' +
    'RU4, elige "Galapagar RU4"; verifica el grado con el Ayuntamiento.',
  ubicacion: { lat: 40.5794, lng: -4.0028 },
};

/**
 * Grado RU4 según el cuadro de condiciones de volumen de la Ordenanza 3 del
 * Avance del PGOU (parcela mínima 250 m², ocupación 50 %, edif. 0,50).
 * Retranqueos del cuadro general: 5 m a calle (4 m en parcelas registradas
 * antes de la modificación de las NN.SS) y altura de cornisa/2 a laterales
 * y testero con mínimo 3 m (6,6/2 = 3,3 m).
 */
export const galapagarRU4: NormativaMunicipal = {
  id: 'galapagar-ru4',
  municipio: 'Galapagar',
  provincia: 'Madrid',
  zona: 'Residencial Unifamiliar RU4',
  verificacion: 'borrador',
  fechaRevision: '2026-07-18',
  fuentes: galapagarU3.fuentes,
  parcelaMinima: 250,
  retranqueos: { frente: 5, fondo: 3.3, lateral: 3.3 },
  ocupacionMaxima: 50,
  edificabilidadMaxima: 0.5,
  alturaMaxima: 6.6,
  alturaMaximaCumbrera: 10.1,
  pendienteCubierta: { min: 20, max: 45 },
  plantasMaximas: 2,
  notas:
    'RU4 admite pareada y agrupada (y aislada si la forma de la parcela lo ' +
    'permite). En parcelas registradas antes de la modificación de las ' +
    'NN.SS el retranqueo a calle es 4 m y a linderos mínimo 3 m — ajusta ' +
    'los valores si es tu caso. No computa edificabilidad bajo cubierta ni ' +
    'bajo rasante. 2 plazas de aparcamiento por vivienda. Piscinas y ' +
    'edificaciones auxiliares: mismas reglas que RU3 (§6.2.6: piscina ' +
    'enterrada adosable y sin cómputo; elevada ≥1 m, a 3 m de linderos). ' +
    'Mismas condiciones estéticas que RU3.',
  ubicacion: { lat: 40.5794, lng: -4.0028 },
};
