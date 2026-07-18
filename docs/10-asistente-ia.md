# 10 — Asistente de diseño con IA

El salto de ConstruyIA de "validador de normativa" a "**copiloto de tu
casa**": el usuario sube el PDF de su normativa o escribe en prosa lo que
quiere, y la IA (1) interpreta las restricciones y (2) le sugiere ideas de
diseño que las respetan.

Son dos capacidades distintas que comparten infraestructura:

| Capacidad | Entrada | Salida |
|---|---|---|
| **A. Interpretar PDF** | PDF de normativa | `NormativaMunicipal` estructurada (nivel `interpretada-ia`) |
| **B. Sugerir diseño** | Prosa del usuario + normativa activa + proyecto actual | Sugerencias en lenguaje natural + acciones aplicables |

## Decisión de arquitectura: BYOK (trae tu clave) en el cliente

La app es estática (GitHub Pages, sin servidor). Para dar IA **sin montar
backend ni asumir coste de API**, el usuario introduce su **propia clave de
la API de Anthropic**, que se guarda solo en `localStorage` (nunca sale del
navegador salvo hacia la API de Anthropic). Las llamadas van directas desde
el navegador con el header `anthropic-dangerous-direct-browser-access: true`.

**Por qué BYOK ahora:**
- Coste 0 para el proyecto; el usuario paga sus propios tokens (céntimos).
- Cero infraestructura: encaja con el modelo estático actual.
- Privacidad: la clave y los datos no pasan por nuestros servidores.

**Limitación asumida:** pedir una API key es fricción para el usuario medio.
Por eso BYOK es el modo F1/F2-temprano (para el fundador y usuarios
técnicos). Cuando el producto se monetice (F2), se añade un **proxy
serverless** con clave del proyecto y límites por cuenta — el mismo código
de cliente, cambiando solo el endpoint. Documentado como evolución, no como
bloqueo.

> Seguridad: la clave BYOK vive en `localStorage` del dispositivo. Se avisa
> al usuario de que use una clave con límite de gasto y de que no la
> comparta. El proxy de F2 elimina esta exposición.

## A. Interpretar un PDF de normativa

Flujo (implementa el pipeline de [docs/09](09-f1-plataforma-normativas.md)
en el cliente):

```
PDF → (pdf.js extrae texto; si es escaneado, páginas como imágenes)
    → Claude (claude-sonnet-5) con tool `registrar_normativa`
    → validación contra el esquema en el borde
    → NormativaMunicipal nivel 'interpretada-ia' + citas
    → el usuario la revisa, ajusta y la usa (o la aporta al registro por PR)
```

- **Salida estructurada obligatoria**: la herramienta fuerza el JSON con el
  esquema de `NormativaMunicipal`; si no valida, se reintenta.
- **Citas por parámetro**: cada valor trae la frase y la página. La UI las
  muestra junto al campo para que revisar sea comparar, no releer el PDF.
- **Nivel honesto**: entra como `interpretada-ia`. La UI ya distingue ese
  nivel; nunca se presenta como oficial.

## B. Sugerir diseño en prosa

El usuario escribe, p. ej.: *"Somos una familia de 4, teletrabajo, quiero
mucha luz por la mañana y una zona de día abierta; presupuesto ajustado"*.
El asistente responde con sugerencias **ancladas en la normativa activa y
en el proyecto actual**:

- Conoce el contexto: normativa seleccionada (retranqueos, ocupación,
  edificabilidad, altura, cubierta…) + resumen del proyecto (parcela,
  estancias, métricas de cumplimiento).
- Sugiere: distribución (orientar la zona de día al sur/este por la luz de
  la mañana), nº de dormitorios/baños, aprovechamiento de la edificabilidad
  restante, avisos ("con RU3 al 30 % de ocupación te caben ~X m² en
  planta"), ideas bioclimáticas y de coste.
- **Con procedencia**: cada sugerencia cita el dato normativo o la métrica
  en que se basa. Nada de recomendaciones "mágicas".

### Acciones aplicables (fase 2 del asistente)

Además de texto, el asistente podrá devolver **acciones estructuradas** que
el usuario aplica con un clic: "añadir dormitorio 3×4 al norte", "poner
ventana al sur en el salón". Se implementan como tools que mapean a las
acciones del store (`addEstancia`, `addHueco`…), siempre con confirmación
del usuario — la IA propone, el usuario dispone.

## Contrato de datos (esbozo)

```ts
interface ContextoAsistente {
  normativa: NormativaMunicipal;   // la activa (con ajustes del usuario)
  metricas: Metricas;              // cumplimiento actual del proyecto
  resumenProyecto: string;         // parcela + estancias por planta
  deseoUsuario: string;            // la prosa
}

interface SugerenciaIA {
  texto: string;                   // explicación en lenguaje natural
  base: string[];                  // datos normativos/métricas citados
  acciones?: AccionAplicable[];    // opcional (fase 2)
}
```

El **motor de cumplimiento sigue siendo la fuente de verdad**: la IA sugiere,
pero cualquier boceto resultante se revalida con `engine/` — si una
sugerencia incumpliera, el panel lo marcaría igual. La IA no puede
"saltarse" la normativa, solo ayudar a navegarla.

## Fases de implementación

| Sub-fase | Entregable |
|---|---|
| IA.0 | Ajustes: campo de API key (BYOK) en `localStorage` + cliente ligero de la API de Claude en el navegador |
| IA.1 | **B**: panel "Asistente" que toma la prosa + contexto y devuelve sugerencias de texto con procedencia |
| IA.2 | **A**: subir PDF → normativa `interpretada-ia` con citas, revisable |
| IA.3 | Acciones aplicables (la IA propone cambios de boceto que el usuario acepta) |
| F2 | Proxy serverless con clave del proyecto y planes (elimina el BYOK) |

Cada sub-fase aporta valor sola. IA.0+IA.1 ya dan el "copiloto que sugiere",
que es lo que más ilusiona al usuario, sin depender de la extracción de PDF.
