# 03 — Arquitectura técnica

## Decisiones (F0)

| Decisión | Elección | Por qué |
|---|---|---|
| Stack UI | React 18 + TypeScript + Vite | Igual que la app original (facilita portar), tooling maduro, build estático desplegable en GitHub Pages |
| Estado | Zustand | Mínimo boilerplate, estado global simple (proyecto + normativa), fácil de persistir |
| Render 2D | SVG nativo | Suficiente para boceto por rectángulos; accesible; sin dependencias de canvas |
| 3D | Pospuesto (react-three-fiber en roadmap) | La app original lo tenía; se portará cuando el modelo 2D esté estable |
| Tests | Vitest | El motor de normativa es lógica pura → alta cobertura barata |
| Persistencia | localStorage + export/import JSON | Sin backend en F0; el JSON es el formato de compartición |
| Backend | Ninguno en F0 | Todo client-side. En F1: API + BD de normativas |

## Estructura

```
construyIA/
├── docs/                  # Planificación y documentación
└── app/
    ├── src/
    │   ├── domain/        # Tipos del dominio (Parcela, Vivienda, Estancia, Planta, Proyecto)
    │   ├── normativa/     # Esquema de normativa + datos por municipio + registro
    │   │   └── data/      # galapagar.ts, lasRozas.ts ...
    │   ├── engine/        # Motor puro: geometría, cumplimiento, recomendaciones
    │   ├── state/         # Store Zustand + persistencia
    │   └── ui/            # Componentes React (editor SVG, paneles)
    └── ...
```

**Regla de dependencias**: `domain` ← `normativa` ← `engine` ← `state` ← `ui`.
El motor (`engine`) no importa nada de React ni de la UI: es TypeScript puro y
testeable, pensado para reutilizarse en F1 como servicio/API o como
herramienta de un agente IA.

## Modelo de dominio

```
Proyecto
├── normativaId (o normativa personalizada embebida)
├── Parcela { lados N/S/E/O en metros, ladoFrente }
└── Plantas[] (sótano | baja | primera)
    └── Estancias[] { tipo, x, y, ancho, fondo }
```

- Unidades: **metros** en todo el dominio. La UI convierte a píxeles con una
  escala única.
- Coordenadas: origen en la esquina superior-izquierda de la parcela, eje Y
  hacia abajo (como SVG).
- La parcela en F0 es rectangular (ancho = media de lados N/S, fondo = media
  de E/O, como en la app original); el polígono libre está en el roadmap.

## Motor de cumplimiento

Cada regla produce un `ResultadoRegla`:

```ts
{ regla: string, nivel: 'ok' | 'aviso' | 'error', mensaje: string,
  valor?: string, limite?: string }
```

- `error`: incumplimiento normativo (bloqueo real en licencia).
- `aviso`: recomendación de diseño o dato pendiente de verificar.

Reglas F0: retranqueos por lado (frente/fondo/laterales), ocupación máxima
(%), edificabilidad (m² computables / m² parcela), altura máxima y nº máximo
de plantas, parcela mínima, y recomendaciones (superficies mínimas por tipo de
estancia, baños vs dormitorios, escalera si hay planta alta, plazas de
garaje).

**Cómputo de edificabilidad (F0, simplificado)**: computan las estancias de
plantas sobre rasante; el sótano no computa; los porches abiertos computan al
50 %. Cada normativa podrá sobreescribir estas reglas en F1 (es uno de los
puntos donde más varían los municipios).

## Normativa como datos

Ver [04-normativa.md](04-normativa.md). Lo esencial: las normativas son datos
declarativos (no código), con `verificacion`, `fuentes[]` y `fechaRevision`.
El motor las interpreta. Así, añadir un municipio = añadir un fichero de
datos, y en F1 = una fila en la BD generada por el pipeline de ingestión
(PDF → IA → revisión).

## Camino a F1 (preparado desde F0)

- El esquema `NormativaMunicipal` ya incluye procedencia y verificación →
  compatible con ingestión por IA.
- El motor es puro → se puede ejecutar en servidor (Node) sin cambios.
- El `Proyecto` se serializa a JSON versionado (`schemaVersion`) → migrable a
  BD en la nube.
