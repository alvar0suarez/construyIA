# 09 — F1: plataforma de normativas + subida de PDF con IA

Diseño técnico de la fase F1: convertir el registro de normativas de un
puñado de ficheros TypeScript en una **plataforma multi-municipio** que
crezca con la comunidad, con un pipeline que convierte un PDF de normativa
en parámetros estructurados usando IA, revisados por humanos antes de ser
fiables.

> Contexto: la F0 dejó el motor de cumplimiento como TS puro
> (`app/src/engine`), las normativas como datos declarativos
> (`app/src/normativa`) con nivel de confianza y fuentes, y un registro
> público de cobertura. F1 industrializa la **entrada** de esos datos.

---

## 1. ¿Dónde viven las normativas?

### Decisión: **git como base de datos** en F1; BD en la nube solo cuando duela

Se mantienen las normativas como **ficheros de datos versionados en el
repositorio** (un JSON por normativa bajo `data/normativas/`), y el flujo de
alta/edición es un **pull request**. La app los consume como hoy (import
estático o `fetch` de un índice JSON generado en build).

**Por qué, frente a montar ya un backend con BD (Supabase/Postgres):**

| Criterio | Git como BD (elegido) | Backend + BD |
|---|---|---|
| Coste inicial | 0 € (repo público + Pages) | Hosting + BD desde el día 1 |
| Auditoría pública | **Nativa**: cada dato es un commit firmado, con autor, fecha y diff | Hay que construir tabla de auditoría y exponerla |
| Revisión antes de publicar | **Nativa**: el PR es la revisión; nada entra a `main` sin aprobar | Hay que construir estados y moderación |
| Contribución externa | PR o issue con el PDF (barrera: saber usar GitHub) | Formulario web (barrera menor) |
| Escala a cientos de municipios | Bien hasta ~miles de ficheros; el índice se genera en build | Mejor para volumen muy alto y edición concurrente |
| Edición en caliente por no-técnicos | No (requiere merge + redeploy) | Sí (escritura directa) |

El proyecto **vive de la credibilidad del dato**, y git da auditoría y
revisión gratis y perfectas — justo lo que un registro normativo necesita.
La BD se justifica cuando aparezca **edición en caliente por usuarios no
técnicos a diario** o **cientos de altas simultáneas**; hasta entonces sería
complejidad y coste sin retorno.

**Disparadores concretos para migrar a Supabase/Postgres (F2):** más de ~20
aportaciones/semana que saturen la revisión por PR, necesidad de que un
ayuntamiento edite su propia ficha desde un panel, o funciones que exijan
consulta server-side (búsqueda geoespacial "¿qué normativa aplica a este
punto?"). La migración es de bajo riesgo porque el formato ya es JSON
plano: un script vuelca los ficheros a filas.

### Estructura propuesta

```
data/
  normativas/
    galapagar/
      ru3.json
      ru4.json
      _municipio.json      # nombre, provincia, ubicación, geometría opcional
    las-rozas/
      nz3-g1.json
      ...
  indice.json              # GENERADO en build: lista ligera para el mapa
  esquema/
    normativa.schema.json  # JSON Schema para validar en CI
```

- **Validación en CI**: un test valida cada JSON contra `normativa.schema.json`
  (Ajv). Un PR con un dato mal formado no pasa el check — la calidad se
  garantiza en la puerta.
- **Índice generado**: `scripts/generar-indice.mjs` recorre `data/normativas`
  y emite `indice.json` (municipio, zona, nivel, fecha, ubicación) que
  alimenta el mapa de cobertura sin cargar todas las normativas completas.
- La app carga la normativa concreta bajo demanda (`fetch` del JSON) al
  seleccionarla; hoy el import es estático, el cambio es mecánico.

---

## 2. Esquema ampliado

El esquema de F0 (`app/src/normativa/schema.ts`) cubre lo básico. F1 añade
lo que hace variar de verdad a los municipios. Tipos propuestos:

```ts
/** Cómo computa un espacio a efectos de edificabilidad/ocupación. Cada
 *  normativa puede sobreescribir los coeficientes del catálogo. */
interface ReglasComputo {
  /** Coeficiente de edificabilidad por tipo de espacio (0..1). */
  edificabilidad: {
    sotano: number;          // Galapagar: 0
    bajocubierta: number;    // Galapagar: 0
    porcheCerrado1o2Lados: number; // Galapagar: 0.6
    porcheCerrado3Lados: number;   // 1
    garajeSobreRasante: number;
  };
  /** Qué NO computa ocupación (proyección en planta). */
  ocupacionExcluye: string[]; // p.ej. ['piscinaEnterrada', 'aleros<0.6m']
}

/** Retranqueos que dependen de condiciones, no un único número. */
interface RetranqueosAvanzados {
  frente: number;
  fondo: number;
  lateral: number;
  /** Piscina: puede depender de la cota (enterrada vs elevada). */
  piscina?: { enterrada: number; elevada: number; umbralCota: number };
  edificacionAuxiliar?: number;
  /** Nulo al lindero común en pareado/hilera. */
  linderoComunPareado?: boolean;
}

/** Una revisión del dato: quién, cuándo, con qué fuente. */
interface Revision {
  fecha: string;
  autor: string;            // usuario de GitHub o 'ia:claude-sonnet-5'
  nivelResultante: NivelVerificacion;
  nota?: string;
  commit?: string;          // sha, enlazable
}

interface NormativaMunicipalV2 extends NormativaMunicipal {
  /** Grado/subzona dentro de la ordenanza (RU3, NZ3-grado1…). */
  grado?: string;
  computo?: ReglasComputo;
  retranqueosAvanzados?: RetranqueosAvanzados;
  /** Condiciones estéticas estructuradas (además de `notas`). */
  estetica?: {
    cubierta?: { material?: string[]; prohibido?: string[] };
    fachada?: { prohibido?: string[] };
  };
  /** Fondo edificable máximo, longitud máxima de fachada… */
  fondoEdificableMax?: number;
  longitudFachadaMax?: number;
  /** Historial completo — la auditoría que hoy es implícita en git. */
  historial?: Revision[];
}
```

El motor (`engine/`) lee estos campos si existen y cae a los valores por
defecto del catálogo si no — **compatibilidad hacia atrás**: las normativas
de F0 siguen siendo válidas. El coeficiente del porche, hoy cableado a 0,6
en `catalogo.ts`, pasa a leerse de `computo.edificabilidad` por normativa.

---

## 3. Pipeline PDF → IA → revisión

El corazón de F1: bajar el coste de añadir un municipio de "una tarde de
lectura" a "revisar una propuesta".

```
 PDF normativa
     │  (usuario sube en formulario / adjunta en issue)
     ▼
 [1] Preproceso
     ├─ PDF con capa de texto → extracción directa
     └─ PDF escaneado        → render de páginas a imagen (visión)
     ▼
 [2] Extracción con Claude (claude-sonnet-5)
     ├─ system: "eres un técnico urbanista; extrae SOLO lo presente"
     ├─ tool/output estructurado validado contra normativa.schema.json
     └─ por cada grado: parámetros + CITA textual + página
     ▼
 [3] Autovalidación
     ├─ Ajv contra el esquema (tipos, rangos)
     └─ heurísticas (ocupación 0–100, edificabilidad 0–5, altura 3–20…)
     ▼
 [4] Propuesta → nivel 'interpretada-ia'
     ├─ se abre un PR automático con el/los JSON y las citas
     └─ NUNCA entra a main sin revisión humana
     ▼
 [5] Revisión humana → 'contrastada' (o correcciones)
```

**Decisiones:**

- **Modelo**: `claude-sonnet-5` para extracción (buen equilibrio
  precisión/coste en documentos largos); se puede escalar a Opus para
  ordenanzas especialmente enrevesadas. Salida **estructurada** (tool use)
  validada en el borde para que el modelo reintente si no encaja el esquema.
- **PDFs escaneados**: se detectan por ausencia de capa de texto y se pasan
  como **imágenes** a la API (visión). Es el caso real de las NNSS 1976 de
  Galapagar, que hubo que leer visualmente.
- **Citas obligatorias**: cada parámetro extraído incluye la cita textual y
  la página. Sin cita, el parámetro se marca como no fiable. Esto hace la
  revisión humana rápida (comparar cita ↔ valor) y mantiene la honestidad
  del proyecto.
- **La IA nunca publica**: su salida es siempre `interpretada-ia` y genera
  un PR. Un humano lo revisa antes de `contrastada`. El nivel es visible en
  la UI, como hoy.
- **Aportación ciudadana**: dos vías. (a) *Issue con plantilla* + PDF
  adjunto (F1 temprano, cero infraestructura). (b) *Formulario web* que
  sube el PDF a un endpoint que dispara el pipeline y abre el PR (F1 tardío;
  requiere una función serverless con la API key — primer trozo de backend).

### Prompt de extracción (esbozo)

```
Eres un técnico en urbanismo. Extrae del documento los parámetros de cada
ORDENANZA/GRADO de uso residencial unifamiliar. Devuelve SOLO datos
presentes en el texto; si algo no aparece, omítelo (no inventes).
Para cada parámetro incluye la cita textual y la página. Responde con la
herramienta `registrar_normativa` conforme al esquema.
```

---

## 4. Esfuerzo, costes y fases

### Coste por PDF (orden de magnitud)

- Ordenanza típica: 40–130 páginas. Como texto ≈ 40k–150k tokens de
  entrada; salida estructurada ≈ 2k–5k tokens.
- Con Sonnet, un documento entero ≈ **céntimos a ~1 €** por pasada. PDFs
  escaneados (visión) cuestan algo más por el tokenizado de imágenes.
- Volumen realista F1 (decenas de municipios) → **coste testimonial**. No
  es el cuello de botella; lo es la **revisión humana**.

### Hosting

- F1 temprano: **0 €** (todo en el repo + GitHub Pages + Actions para el
  pipeline por `workflow_dispatch`/issue).
- F1 tardío (formulario web): una función serverless (Cloudflare
  Workers/Vercel) que guarda la API key y abre PRs vía la API de GitHub.
  Coste bajo, dentro de planes gratuitos al inicio.

### Fases incrementales

| Sub-fase | Entregable | Backend |
|---|---|---|
| F1.0 | Migrar normativas actuales a `data/normativas/*.json` + JSON Schema + validación en CI + índice generado | No |
| F1.1 | Esquema ampliado (grados, cómputo parametrizable) y motor que lo lee | No |
| F1.2 | Script CLI local: `pdf → propuesta JSON` con Claude, salida a PR manual | No (API key local) |
| F1.3 | Plantilla de issue para aportar normativa + Action que lanza el pipeline y abre PR | No (Actions) |
| F1.4 | Formulario web de subida de PDF | Sí (1 función serverless) |
| F2 | Migración a BD si los disparadores del §1 se cumplen | Sí |

Cada sub-fase aporta valor sola y no obliga a la siguiente. F1.0–F1.3 se
hacen **sin salir del modelo git-como-BD** y sin coste de hosting.

---

## 5. Qué NO cambia

- El **motor de cumplimiento** sigue siendo TS puro y agnóstico del origen
  de los datos: da igual si la normativa viene de un import, un `fetch` o
  una BD.
- La **honestidad de niveles** (`contrastada`/`borrador`/`interpretada-ia`/
  `personalizada`) es el eje: la IA solo produce `interpretada-ia`, y el
  salto a `contrastada` es siempre humano.
- El **registro público** y su mapa siguen siendo el escaparate; con F1
  simplemente se llenan más rápido y con trazabilidad de cada revisión.
