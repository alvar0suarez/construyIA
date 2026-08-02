/**
 * Cliente ligero de la API de Claude para el asistente de diseño, llamado
 * directamente desde el navegador con la clave del propio usuario (BYOK).
 * La clave nunca sale del dispositivo salvo hacia la API de Anthropic.
 */

import { CATALOGO } from '../engine/catalogo';
import { CATALOGO_MUEBLES, tipoMueble } from '../engine/muebles';
import type { PlantaId } from '../domain/types';

const ENDPOINT = 'https://api.anthropic.com/v1/messages';
const MODELO = 'claude-sonnet-5';

/** Estancia que la IA propone añadir al boceto. */
export interface EstanciaPropuesta {
  tipo: string;
  planta: PlantaId;
  ancho: number;
  fondo: number;
}

const HERRAMIENTAS = [
  {
    name: 'proponer_estancias',
    description:
      'Propón estancias concretas para añadir al boceto cuando el usuario se beneficiaría de ellas. El usuario decide si las añade.',
    input_schema: {
      type: 'object',
      properties: {
        estancias: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              tipo: { type: 'string', enum: CATALOGO.map((t) => t.id) },
              planta: { type: 'string', enum: ['sotano', 'baja', 'primera'] },
              ancho: { type: 'number', description: 'metros' },
              fondo: { type: 'number', description: 'metros' },
            },
            required: ['tipo', 'planta', 'ancho', 'fondo'],
          },
        },
      },
      required: ['estancias'],
    },
  },
];

const SYSTEM = `Eres un arquitecto experto que ayuda a una persona a bocetar su vivienda unifamiliar dentro de la normativa urbanística de su municipio. Te dan el contexto (normativa aplicable, parcela, estancias actuales y estado de cumplimiento) y lo que la persona desea.

Da sugerencias CONCRETAS y accionables de distribución, orientación, aprovechamiento de la edificabilidad y habitabilidad, SIEMPRE dentro de los límites de la normativa que te dan. Cada sugerencia relevante debe apoyarse en un dato de la normativa o una métrica del proyecto (cítalo entre paréntesis). Si algo que la persona quiere no cabe en la normativa, dilo con claridad y ofrece la mejor alternativa que sí cabe.

Cuando propongas estancias concretas que mejorarían el boceto, usa la herramienta \`proponer_estancias\` (además de explicarlo en el texto) para que el usuario pueda añadirlas con un clic. Propón dimensiones realistas y dentro de la ocupación/edificabilidad disponibles.

Importante: no eres un proyecto técnico ni una validación oficial; recuérdalo brevemente al final. Responde en español, con formato claro (viñetas), sin florituras. Sé útil y específico para ESTA parcela y ESTA normativa, no genérico.`;

const TIPOS_VALIDOS = new Set(CATALOGO.map((t) => t.id));
const PLANTAS_VALIDAS = new Set<PlantaId>(['sotano', 'baja', 'primera']);
const LADOS_VALIDOS = new Set(['norte', 'sur', 'este', 'oeste']);

/** Hueco (ventana/puerta) de una estancia generada por IA. */
export interface HuecoDiseno {
  tipo: 'ventana' | 'puerta';
  lado: 'norte' | 'sur' | 'este' | 'oeste';
  offset: number;
  ancho: number;
  alto: number;
  antepecho: number;
}

/** Estancia con posición y tamaño exactos, generada por IA. */
export interface EstanciaDiseno {
  tipo: string;
  planta: PlantaId;
  x: number;
  y: number;
  ancho: number;
  fondo: number;
  alturaPlantas?: number;
  huecos?: HuecoDiseno[];
}

/** Diseño completo de una vivienda generado por IA. */
export interface DisenoCasa {
  estancias: EstanciaDiseno[];
  alturaPorPlanta?: number;
  cubierta?: { tipo: 'plana' | 'inclinada'; pendiente?: number };
  texto: string;
}

const HERRAMIENTA_CASA = {
  name: 'generar_casa',
  description:
    'Genera una vivienda unifamiliar COMPLETA y detallada: todas las estancias con posición (x, y) y tamaño exactos dentro de la envolvente edificable, con ventanas y puertas, y la cubierta. Distribúyelas de forma coherente (zona de día abajo, dormitorios arriba, baños cerca de dormitorios, escalera si hay planta alta) sin solaparse, y respetando ocupación, edificabilidad y altura.',
  input_schema: {
    type: 'object',
    properties: {
      alturaPorPlanta: { type: 'number', description: 'metros, típico 2,7–3' },
      cubierta: {
        type: 'object',
        properties: {
          tipo: { type: 'string', enum: ['plana', 'inclinada'] },
          pendiente: { type: 'number', description: 'grados, si es inclinada' },
        },
        required: ['tipo'],
      },
      estancias: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            tipo: { type: 'string', enum: CATALOGO.map((t) => t.id) },
            planta: { type: 'string', enum: ['sotano', 'baja', 'primera'] },
            x: { type: 'number', description: 'metros desde el borde OESTE (izquierda) de la parcela' },
            y: { type: 'number', description: 'metros desde el borde NORTE (arriba) de la parcela' },
            ancho: { type: 'number', description: 'metros (dimensión este-oeste)' },
            fondo: { type: 'number', description: 'metros (dimensión norte-sur)' },
            alturaPlantas: { type: 'number', description: '1 normal, 2 doble altura' },
            huecos: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  tipo: { type: 'string', enum: ['ventana', 'puerta'] },
                  lado: { type: 'string', enum: ['norte', 'sur', 'este', 'oeste'] },
                  offset: { type: 'number', description: 'metros desde la esquina de esa pared' },
                  ancho: { type: 'number' },
                  alto: { type: 'number' },
                  antepecho: { type: 'number', description: 'altura del alféizar (0 para puertas)' },
                },
                required: ['tipo', 'lado', 'offset', 'ancho', 'alto', 'antepecho'],
              },
            },
          },
          required: ['tipo', 'planta', 'x', 'y', 'ancho', 'fondo'],
        },
      },
    },
    required: ['estancias'],
  },
};

const SYSTEM_CASA = `Eres un arquitecto que diseña una vivienda unifamiliar COMPLETA y detallada sobre una parcela real, dentro de la normativa que te dan. Te dan la envolvente edificable (el rectángulo donde puede ir la casa) y sus coordenadas.

Genera la casa entera con la herramienta \`generar_casa\`: coloca todas las estancias con posición (x, y) y tamaño exactos, EN METROS, DENTRO de la envolvente edificable. Sistema de coordenadas: origen (0,0) en la esquina noroeste de la parcela; x crece hacia el este (derecha), y crece hacia el sur (abajo).

Reglas:
- Distribución coherente: zona de día (salón, cocina, comedor) en planta baja; dormitorios y baños en planta alta si hay; baños cerca de dormitorios; escalera que conecte plantas si hay planta alta; recibidor/pasillo para circular.
- Las estancias NO deben solaparse (salvo que quieras una planta en L a propósito). Colócalas adyacentes, compartiendo pared.
- Respeta ocupación máxima, edificabilidad y altura de la normativa. No te salgas de la envolvente.
- Pon ventanas (con antepecho ~0,9 m) orientadas para buena luz y puertas (antepecho 0) donde haga falta, incluida una puerta de acceso en la fachada del frente.
- Usa medidas realistas (dormitorio ≥ 8–12 m², salón ≥ 18 m², pasillos ~1–1,2 m de ancho).

Además del uso de la herramienta, escribe un párrafo BREVE explicando la idea de la distribución. Recuerda al final, en una línea, que es orientativo y no sustituye a un arquitecto. Español.`;

export interface RespuestaAsistente {
  texto: string;
  propuestas: EstanciaPropuesta[];
}

export async function consultarAsistente(params: {
  apiKey: string;
  contexto: string;
  deseo: string;
  signal?: AbortSignal;
}): Promise<RespuestaAsistente> {
  const { apiKey, contexto, deseo, signal } = params;

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    signal,
    body: JSON.stringify({
      model: MODELO,
      max_tokens: 1200,
      system: SYSTEM,
      tools: HERRAMIENTAS,
      messages: [
        {
          role: 'user',
          content: `CONTEXTO DEL PROYECTO:\n${contexto}\n\nLO QUE QUIERO:\n${deseo || 'Dame recomendaciones para aprovechar mejor la parcela dentro de la normativa.'}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    let detalle = `${res.status}`;
    try {
      const err = await res.json();
      detalle = err?.error?.message ?? detalle;
    } catch {
      /* respuesta no-JSON */
    }
    if (res.status === 401) {
      throw new Error('La clave de API no es válida. Revísala en ⚙️ Ajustes del asistente.');
    }
    throw new Error(`Error de la API de Claude: ${detalle}`);
  }

  const data = await res.json();
  const bloques: { type: string; text?: string; name?: string; input?: unknown }[] =
    data?.content ?? [];
  const texto = bloques
    .filter((b) => b.type === 'text')
    .map((b) => b.text ?? '')
    .join('\n')
    .trim();

  const propuestas: EstanciaPropuesta[] = [];
  for (const b of bloques) {
    if (b.type !== 'tool_use' || b.name !== 'proponer_estancias') continue;
    const lista = (b.input as { estancias?: unknown[] })?.estancias ?? [];
    for (const e of lista as EstanciaPropuesta[]) {
      if (
        TIPOS_VALIDOS.has(e.tipo) &&
        PLANTAS_VALIDAS.has(e.planta) &&
        e.ancho > 0 &&
        e.fondo > 0
      ) {
        propuestas.push({
          tipo: e.tipo,
          planta: e.planta,
          ancho: Math.round(e.ancho * 10) / 10,
          fondo: Math.round(e.fondo * 10) / 10,
        });
      }
    }
  }

  return { texto: texto || '(sin comentario)', propuestas };
}

function limpiarHuecos(raw: unknown): HuecoDiseno[] {
  if (!Array.isArray(raw)) return [];
  const out: HuecoDiseno[] = [];
  for (const h of raw as HuecoDiseno[]) {
    if (
      (h?.tipo === 'ventana' || h?.tipo === 'puerta') &&
      LADOS_VALIDOS.has(h?.lado) &&
      Number.isFinite(h?.ancho) &&
      Number.isFinite(h?.alto)
    ) {
      out.push({
        tipo: h.tipo,
        lado: h.lado,
        offset: Math.max(0, Number(h.offset) || 0),
        ancho: Math.max(0.3, Number(h.ancho) || 0.9),
        alto: Math.max(0.3, Number(h.alto) || 1.2),
        antepecho: Math.max(0, Number(h.antepecho) || 0),
      });
    }
  }
  return out;
}

/** Mueble colocado por la IA. */
export interface MuebleDiseno {
  tipo: string;
  planta: PlantaId;
  x: number;
  y: number;
  ancho: number;
  fondo: number;
}

export interface MobiliarioIA {
  muebles: MuebleDiseno[];
  texto: string;
}

const MUEBLES_VALIDOS = new Set(CATALOGO_MUEBLES.map((m) => m.id));

const HERRAMIENTA_MUEBLES = {
  name: 'amueblar',
  description:
    'Amuebla la vivienda: coloca muebles DENTRO de las estancias existentes (te dan sus posiciones y tamaños). Muebles coherentes por estancia: dormitorios cama + armario + mesita; salón sofá + TV + mesa; cocina encimera + nevera; baños inodoro + lavabo + ducha o bañera; comedor mesa. No solapes los muebles con las paredes; deja paso.',
  input_schema: {
    type: 'object',
    properties: {
      muebles: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            tipo: { type: 'string', enum: CATALOGO_MUEBLES.map((m) => m.id) },
            planta: { type: 'string', enum: ['sotano', 'baja', 'primera'] },
            x: { type: 'number', description: 'metros desde el oeste (izquierda) de la parcela' },
            y: { type: 'number', description: 'metros desde el norte (arriba) de la parcela' },
            ancho: { type: 'number', description: 'metros (este-oeste); opcional, usa uno realista' },
            fondo: { type: 'number', description: 'metros (norte-sur); opcional' },
          },
          required: ['tipo', 'planta', 'x', 'y'],
        },
      },
    },
    required: ['muebles'],
  },
};

const SYSTEM_MUEBLES = `Eres un interiorista que amuebla una vivienda ya distribuida. Te dan las estancias con su posición (x, y) y tamaño en metros. Coordenadas: origen (0,0) en la esquina noroeste de la parcela; x hacia el este, y hacia el sur.

Amuebla con la herramienta \`amueblar\`: coloca cada mueble DENTRO de su estancia, sin solaparse con las paredes ni entre sí, dejando paso para circular. Amueblado coherente por tipo de estancia (dormitorio: cama + armario; salón: sofá + TV + mesa de centro; cocina: encimera + nevera; comedor: mesa; baño/aseo: inodoro + lavabo + ducha o bañera; despacho: escritorio + estantería). Usa medidas realistas.

Además escribe una frase BREVE sobre el amueblado y recuerda en una línea que es orientativo. Español.`;

/** Genera una vivienda completa con posiciones, huecos y cubierta. */
export async function generarCasaCompleta(params: {
  apiKey: string;
  contexto: string;
  deseo: string;
  signal?: AbortSignal;
}): Promise<DisenoCasa> {
  const { apiKey, contexto, deseo, signal } = params;

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    signal,
    body: JSON.stringify({
      model: MODELO,
      max_tokens: 4000,
      system: SYSTEM_CASA,
      tools: [HERRAMIENTA_CASA],
      tool_choice: { type: 'tool', name: 'generar_casa' },
      messages: [
        {
          role: 'user',
          content: `CONTEXTO DEL PROYECTO:\n${contexto}\n\nLO QUE QUIERO EN MI CASA:\n${deseo || 'Una vivienda familiar cómoda que aproveche bien la parcela dentro de la normativa.'}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    let detalle = `${res.status}`;
    try {
      const err = await res.json();
      detalle = err?.error?.message ?? detalle;
    } catch {
      /* respuesta no-JSON */
    }
    if (res.status === 401) {
      throw new Error('La clave de API no es válida. Revísala en ⚙️ Clave API.');
    }
    throw new Error(`Error de la API de Claude: ${detalle}`);
  }

  const data = await res.json();
  const bloques: { type: string; text?: string; name?: string; input?: unknown }[] =
    data?.content ?? [];
  const texto = bloques
    .filter((b) => b.type === 'text')
    .map((b) => b.text ?? '')
    .join('\n')
    .trim();

  const uso = bloques.find((b) => b.type === 'tool_use' && b.name === 'generar_casa');
  const input = (uso?.input as {
    estancias?: unknown[];
    alturaPorPlanta?: number;
    cubierta?: { tipo?: string; pendiente?: number };
  }) ?? {};

  const estancias: EstanciaDiseno[] = [];
  for (const e of (input.estancias ?? []) as EstanciaDiseno[]) {
    if (
      TIPOS_VALIDOS.has(e?.tipo) &&
      PLANTAS_VALIDAS.has(e?.planta) &&
      Number.isFinite(e?.x) &&
      Number.isFinite(e?.y) &&
      e?.ancho > 0 &&
      e?.fondo > 0
    ) {
      const alt = Number(e.alturaPlantas);
      estancias.push({
        tipo: e.tipo,
        planta: e.planta,
        x: Math.max(0, Math.round(e.x * 10) / 10),
        y: Math.max(0, Math.round(e.y * 10) / 10),
        ancho: Math.round(e.ancho * 10) / 10,
        fondo: Math.round(e.fondo * 10) / 10,
        alturaPlantas: alt >= 2 ? 2 : 1,
        huecos: limpiarHuecos(e.huecos),
      });
    }
  }

  if (estancias.length === 0) {
    throw new Error('La IA no devolvió una casa válida. Prueba a reformular lo que quieres.');
  }

  const tipoCub = input.cubierta?.tipo;
  let cubierta: DisenoCasa['cubierta'];
  if (tipoCub === 'plana' || tipoCub === 'inclinada') {
    cubierta = {
      tipo: tipoCub,
      pendiente: Number.isFinite(input.cubierta?.pendiente)
        ? Math.min(60, Math.max(5, Number(input.cubierta?.pendiente)))
        : undefined,
    };
  }

  return {
    estancias,
    alturaPorPlanta: Number.isFinite(input.alturaPorPlanta)
      ? Math.min(4, Math.max(2.2, Number(input.alturaPorPlanta)))
      : undefined,
    cubierta,
    texto: texto || 'Casa generada.',
  };
}

/** Amuebla la vivienda: la IA coloca muebles dentro de las estancias. */
export async function generarMobiliario(params: {
  apiKey: string;
  contexto: string;
  deseo: string;
  signal?: AbortSignal;
}): Promise<MobiliarioIA> {
  const { apiKey, contexto, deseo, signal } = params;

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    signal,
    body: JSON.stringify({
      model: MODELO,
      max_tokens: 3500,
      system: SYSTEM_MUEBLES,
      tools: [HERRAMIENTA_MUEBLES],
      tool_choice: { type: 'tool', name: 'amueblar' },
      messages: [
        {
          role: 'user',
          content: `CONTEXTO DEL PROYECTO (con las estancias y sus posiciones):\n${contexto}\n\nCÓMO QUIERO EL INTERIOR:\n${deseo || 'Amueblado cómodo y funcional para el día a día.'}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    let detalle = `${res.status}`;
    try {
      const err = await res.json();
      detalle = err?.error?.message ?? detalle;
    } catch {
      /* respuesta no-JSON */
    }
    if (res.status === 401) {
      throw new Error('La clave de API no es válida. Revísala en ⚙️ Clave API.');
    }
    throw new Error(`Error de la API de Claude: ${detalle}`);
  }

  const data = await res.json();
  const bloques: { type: string; text?: string; name?: string; input?: unknown }[] =
    data?.content ?? [];
  const texto = bloques
    .filter((b) => b.type === 'text')
    .map((b) => b.text ?? '')
    .join('\n')
    .trim();

  const uso = bloques.find((b) => b.type === 'tool_use' && b.name === 'amueblar');
  const lista = ((uso?.input as { muebles?: unknown[] })?.muebles ?? []) as MuebleDiseno[];

  const muebles: MuebleDiseno[] = [];
  for (const mu of lista) {
    if (
      MUEBLES_VALIDOS.has(mu?.tipo) &&
      PLANTAS_VALIDAS.has(mu?.planta) &&
      Number.isFinite(mu?.x) &&
      Number.isFinite(mu?.y)
    ) {
      const def = tipoMueble(mu.tipo);
      const ancho = Number.isFinite(mu.ancho) && mu.ancho > 0 ? Number(mu.ancho) : def.defaultW;
      const fondo = Number.isFinite(mu.fondo) && mu.fondo > 0 ? Number(mu.fondo) : def.defaultD;
      muebles.push({
        tipo: mu.tipo,
        planta: mu.planta,
        x: Math.max(0, Math.round(mu.x * 100) / 100),
        y: Math.max(0, Math.round(mu.y * 100) / 100),
        ancho: Math.round(ancho * 100) / 100,
        fondo: Math.round(fondo * 100) / 100,
      });
    }
  }

  if (muebles.length === 0) {
    throw new Error('La IA no devolvió muebles. Asegúrate de tener estancias en el boceto.');
  }

  return { muebles, texto: texto || 'Interior amueblado.' };
}
