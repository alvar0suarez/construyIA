# 04 — Modelo de normativa y fuentes

## Esquema de datos

Cada normativa municipal/zonal se modela como datos declarativos:

```ts
interface NormativaMunicipal {
  id: string;                    // 'galapagar-u3'
  municipio: string;             // 'Galapagar'
  provincia: string;             // 'Madrid'
  zona: string;                  // 'Residencial Unifamiliar U3 (UA4)'
  verificacion: 'contrastada' | 'borrador' | 'interpretada-ia' | 'personalizada';
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

**Niveles de confianza** (siempre visibles en la UI):

- `contrastada`: una persona del proyecto ha cotejado cada parámetro con el
  documento oficial citado en `fuentes`, en la fecha `fechaRevision`.
- `borrador`: valores recopilados pero con cotejo incompleto o pendiente.
- `interpretada-ia` (F1): extraída de un PDF por IA, pendiente de revisión.
- `personalizada`: introducida a mano por el usuario.

> ⚠️ **Ningún nivel implica validación oficial.** Deliberadamente no usamos
> la palabra "verificada": sonaría a que un ayuntamiento u organismo público
> ha validado los datos, y eso no ocurre en ningún caso. Los niveles solo
> describen cuánto trabajo de cotejo ha hecho el proyecto sobre las fuentes.
> Si algún día un ayuntamiento colabora oficialmente, se añadirá un nivel
> `oficial` diferenciado.

## Normativas incluidas en F0

### Galapagar — Residencial Unifamiliar RU3/U3 (La Navata) · `borrador` (cotejo parcial)

**Cotejo del 2026-07-18** contra los documentos oficiales accesibles online:

1. El PDF "vigente" del visor Planea resultó ser el **texto refundido de las
   NNSS de 1976** (COPLACO), que no contiene la nomenclatura U3/UA4 (usa
   grados RU0–RU5 antiguos).
2. El documento de la Comunidad de Madrid es el **Avance del PGOU** (en
   tramitación), que transcribe las condiciones de las **NN.SS 88/89 para el
   ámbito de La Navata** — el origen real de la "U3 (UA4)" de la app
   original.

Valores adoptados (grado **RU3**, aislada/pareada, La Navata):

| Parámetro | Valor | ¿Coincide con la app original? |
|---|---|---|
| Parcela mínima | 500 m² | ✅ |
| Frente mínimo de parcela | 10 m | (no modelado aún) |
| Retranqueo a fachada/calle | 4 m | ✅ |
| Retranqueo a laterales y testero | 3 m | ✅ |
| **Ocupación máxima** | **30 %** | ⚠️ **La app original usaba 50 %** (valor del grado RU4) |
| Edificabilidad máxima | 0,5 m²/m² | ✅ |
| Altura máxima | 6,5 m | ✅ |
| Plantas máximas | 2 | ✅ |
| Aparcamiento | 2 plazas/vivienda en parcela | (recomendación en la app) |

Se adopta el **30 % de ocupación** (valor documentado y más conservador).
No computa edificabilidad bajo cubierta ni bajo rasante. Estética: prohibido
ladrillo visto, revoco a la tirolesa y aluminio natural en carpinterías.

**Por qué sigue en `borrador`**: la fuente es el Avance del PGOU (documento
en tramitación que transcribe las NN.SS 89), no el texto refundido vigente
de las NN.SS 89. Para subir a `contrastada` hay que cotejar con ese texto
(solicitable al Ayuntamiento) y confirmar el grado exacto de la parcela.

**Cotejo ampliado (2026-07-18, sobre el PDF aportado por el propietario,
guardado en [`docs/normativa-fuentes/`](normativa-fuentes/README.md))**:

- **Grado RU4** añadido al registro (parcela 250 m², ocupación 50 %,
  edificabilidad 0,50, altura 6,6 m) — el propietario confirma que su
  parcela es RU4.
- **Piscinas** (§6.2.6, edificaciones auxiliares): enterradas (≤1 m sobre
  el terreno circundante) **no computan ocupación ni edificabilidad y
  pueden adosarse a linderos**; elevadas ≥1 m deben ir a 3 m de linderos y
  vía pública (salvo autorización escrita del colindante). Por eso el
  parámetro `retranqueoPiscina` queda sin fijar en Galapagar: la regla
  depende de la cota de la piscina (pendiente de modelar en F1).
- **Cómputo de espacios cubiertos** (condiciones generales): cerrados por
  1-2 lados computan al **60 %**, por 3+ lados al 100 %. El catálogo de la
  app usa ahora 60 % para el porche (antes 50 %).
- **Edificaciones auxiliares**: máximo 100 m² construibles, solo planta
  baja, cumbrera ≤3 m (vestuarios de piscina en RU: cornisa 3 m, cumbrera
  6 m); techadas computan ocupación al 100 % y edificabilidad al 50 %
  (100 % si cerradas por 3+ lados); bajo rasante no computan.

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
- ~~Reglas de cómputo de edificabilidad por normativa~~ ✅ **hecho (F1.1)**:
  el campo opcional `computo.edificabilidad` sobrescribe el coeficiente del
  catálogo por tipo de estancia (Galapagar usa `{ porche: 0.6 }`). Falta
  ampliarlo a sótanos/bajocubierta con reglas por cota.
- Condiciones estéticas estructuradas (cubierta, materiales, vuelos).
- Retranqueos especiales (a viales concretos, entre edificaciones, piscinas).
- Fondo edificable máximo, longitud máxima de fachada, parcela mínima por
  tipología (aislada/pareada).

## Disclaimer

Los datos de esta aplicación son orientativos y pueden estar desactualizados
o contener errores. No sustituyen a la ficha urbanística municipal ni al
criterio de un/a arquitecto/a colegiado/a. Verifica siempre con el
ayuntamiento antes de tomar decisiones de compra o diseño.
