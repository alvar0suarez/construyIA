# 04 — Modelo de normativa y fuentes

## Esquema de datos

Cada normativa municipal/zonal se modela como datos declarativos:

```ts
interface NormativaMunicipal {
  id: string;                    // 'galapagar-u3'
  municipio: string;             // 'Galapagar'
  provincia: string;             // 'Madrid'
  zona: string;                  // 'Residencial Unifamiliar U3 (UA4)'
  verificacion: 'verificada' | 'borrador' | 'interpretada-ia' | 'personalizada';
  fechaRevision: string;         // ISO date de la última revisión
  fuentes: { titulo: string; url?: string }[];

  parcelaMinima?: number;        // m²
  retranqueos: { frente: number; fondo: number; lateral: number }; // metros
  ocupacionMaxima: number;       // % de la parcela
  edificabilidadMaxima: number;  // m² construibles / m² de parcela
  alturaMaxima: number;          // metros (a cornisa)
  plantasMaximas: number;        // sobre rasante
  notas?: string;                // condiciones estéticas y otras no modeladas
}
```

**Niveles de verificación** (siempre visibles en la UI):

- `verificada`: contrastada con el documento oficial por una persona.
- `borrador`: valores provisionales/típicos, pendientes de contrastar.
- `interpretada-ia` (F1): extraída de un PDF por IA, pendiente de revisión.
- `personalizada`: introducida a mano por el usuario.

## Normativas incluidas en F0

### Galapagar — Residencial Unifamiliar U3 (UA4) · `verificada`*

Valores portados de la app original (introducidos en su día a partir de las
NNSS de Galapagar):

| Parámetro | Valor |
|---|---|
| Retranqueo a frente | 4 m |
| Retranqueo a fondo y laterales | 3 m |
| Ocupación máxima | 50 % |
| Edificabilidad máxima | 0,5 m²/m² |
| Altura máxima | 6,5 m |
| Plantas máximas | 2 |

Notas de la ordenanza (de la app original): cubierta inclinada 20–45°; teja
cerámica o pizarra; sin ladrillo visto; sin carpintería de aluminio en color
natural; garaje bajo rasante no computa edificabilidad (Art. 3.11.2.2.A).

\* "Verificada" respecto a la app original. Recomendado re-contrastar con el
documento oficial antes de decisiones importantes.

**Fuentes**:
- [Normas urbanísticas de Galapagar (Comunidad de Madrid)](https://www.comunidad.madrid/transparencia/sites/default/files/regulation/documents/03_normas_urbanisticas_1.pdf)
- [NNSS vigentes (visor Planea, IDEM Madrid)](https://idem.madrid.org/cartografia/planea/planeamiento/planeamiento/Galapagar/Vigente/NURBANISTICAS.PDF)
- [Portal de transparencia — Ayto. Galapagar](https://transparencia.galapagar.es/?page_id=8991)

Dato adicional encontrado en la investigación: la ordenanza U-3 admite
tipología aislada o pareada; en pareado el retranqueo al lindero común es
nulo. Parcela mínima habitual 500 m². Aparcamiento: 1 plaza por vivienda o
por cada 50 m² de otros usos. (Pendiente de contrastar con el texto oficial.)

### Las Rozas — Ordenanza Zonal 3 (vivienda unifamiliar) · `borrador`

La NZ-3 regula la vivienda unifamiliar **por grados** (la parcela concreta
tiene asignado un grado que fija parcela mínima, retranqueos, ocupación,
edificabilidad y altura). El día de la investigación (2026-07-18) el portal
municipal devolvía error 503, así que los valores cargados son **provisionales
y conservadores** y están marcados como `borrador` en la app.

**Pendiente**: descargar la NZ-3 y cargar los cuadros por grado.

**Fuentes oficiales a consultar**:
- [NZ-3 — Condiciones particulares Ordenanza Zonal 3](https://www.lasrozas.es/normativa/NORMATIVA_ORDENANZAS/NZ-3.pdf)
- [Memoria datos básicos — Ordenanza Zonal 3](https://www.lasrozas.es/sites/default/files/inline-files/Memoria%20datos%20basicos_Uso%20residencial_Ordenanza%20zonal%203.pdf)
- [Nuevo PGOU — Ayto. Las Rozas](https://www.lasrozas.es/urbanismo-conservacion-y-medio-ambiente/urbanismo/PGOU)

### Personalizada · `personalizada`

El usuario puede editar todos los parámetros a mano — útil cuando ya tiene la
ficha urbanística de su parcela o para municipios aún no cargados.

## Qué NO modela aún el esquema (roadmap F1)

- Grados/subzonas dentro de una ordenanza (Las Rozas los necesita).
- Reglas de cómputo de edificabilidad por normativa (porches, sótanos,
  bajocubierta, garajes — cada municipio computa distinto).
- Condiciones estéticas estructuradas (cubierta, materiales, vuelos).
- Retranqueos especiales (a viales concretos, entre edificaciones, piscinas).
- Fondo edificable máximo, longitud máxima de fachada, parcela mínima por
  tipología (aislada/pareada).

## Disclaimer

Los datos de esta aplicación son orientativos y pueden estar desactualizados
o contener errores. No sustituyen a la ficha urbanística municipal ni al
criterio de un/a arquitecto/a colegiado/a. Verifica siempre con el
ayuntamiento antes de tomar decisiones de compra o diseño.
