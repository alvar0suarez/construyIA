/**
 * Cliente ligero de la API de Claude para el asistente de diseño, llamado
 * directamente desde el navegador con la clave del propio usuario (BYOK).
 * La clave nunca sale del dispositivo salvo hacia la API de Anthropic.
 */

import { CATALOGO } from '../engine/catalogo';
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
