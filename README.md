# ConstruyIA 🏠

**Diseña tu vivienda unifamiliar dentro de la normativa municipal.**

ConstruyIA es una aplicación web que te ayuda a hacer bocetos de tu futura casa
sobre tu parcela real, validando en tiempo real el cumplimiento de la normativa
urbanística municipal (retranqueos, ocupación, edificabilidad, altura...) y
dándote recomendaciones de diseño.

> ⚠️ **Aviso**: los resultados son orientativos y **no vinculantes**. La
> normativa urbanística la interpreta en último término el ayuntamiento y tu
> arquitecto/a. Verifica siempre los parámetros con las fuentes oficiales.

## ¿Por qué?

Comprar una parcela y diseñar una casa implica entender normativa municipal
que cambia radicalmente de un municipio a otro (e incluso entre zonas del
mismo municipio). Los retranqueos, la ocupación máxima o la edificabilidad
condicionan por completo qué casa puedes construir — y por tanto qué parcela
te conviene comprar. ConstruyIA te permite:

- **Comparar parcelas** en distintos municipios con su normativa aplicada.
- **Bocetar** la distribución de tu vivienda (plantas, estancias, garaje...).
- **Validar** en vivo que el boceto cumple la normativa.
- **Compartir** el boceto con familia o con tu arquitecto/a.

## Estado del proyecto

🚧 En desarrollo activo. Fase actual: **F0 — MVP personal** (ver
[hoja de ruta](docs/02-roadmap.md)).

Normativas incluidas:

| Municipio | Ordenanza | Estado |
|---|---|---|
| Galapagar (Madrid) | Residencial Unifamiliar U3 (UA4) | ✅ Verificada con NNSS |
| Las Rozas (Madrid) | Ordenanza Zonal 3 | ⚠️ Borrador — pendiente de verificar |
| Personalizada | — | ✅ Editable por el usuario |

## Desarrollo

```bash
cd app
npm install
npm run dev        # servidor de desarrollo
npm test           # tests del motor de normativa
npm run build      # build de producción
```

## Documentación

- [01 — Visión de producto](docs/01-vision.md)
- [02 — Hoja de ruta](docs/02-roadmap.md)
- [03 — Arquitectura técnica](docs/03-arquitectura.md)
- [04 — Modelo de normativa y fuentes](docs/04-normativa.md)
- [05 — Inventario de la app original](docs/05-app-original.md)
- [06 — Portal público de cobertura](docs/06-portal-cobertura.md)
