import type { NormativaMunicipal } from '../schema';

/**
 * BORRADOR — valores provisionales y conservadores. La NZ-3 de Las Rozas
 * regula por grados (cada parcela tiene asignado un grado con sus propios
 * parámetros). Pendiente de cargar los cuadros oficiales por grado
 * (el portal municipal devolvía 503 el día de la investigación, 2026-07-18).
 */
export const lasRozasNZ3: NormativaMunicipal = {
  id: 'las-rozas-nz3',
  municipio: 'Las Rozas de Madrid',
  provincia: 'Madrid',
  zona: 'Ordenanza Zonal 3 — Vivienda unifamiliar (grado sin determinar)',
  verificacion: 'borrador',
  fechaRevision: '2026-07-18',
  fuentes: [
    {
      titulo: 'NZ-3 — Condiciones particulares de la Ordenanza Zonal 3',
      url: 'https://www.lasrozas.es/normativa/NORMATIVA_ORDENANZAS/NZ-3.pdf',
    },
    {
      titulo: 'Nuevo PGOU — Ayuntamiento de Las Rozas',
      url: 'https://www.lasrozas.es/urbanismo-conservacion-y-medio-ambiente/urbanismo/PGOU',
    },
  ],
  retranqueos: { frente: 5, fondo: 4, lateral: 3 },
  ocupacionMaxima: 30,
  edificabilidadMaxima: 0.35,
  alturaMaxima: 7,
  plantasMaximas: 2,
  notas:
    'VALORES PROVISIONALES pendientes de verificar con la NZ-3. Los parámetros ' +
    'reales dependen del grado asignado a la parcela en el plano de ordenación.',
  ubicacion: { lat: 40.4919, lng: -3.8735 },
};
