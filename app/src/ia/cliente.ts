/**
 * Cliente ligero de la API de Claude para el asistente de diseño, llamado
 * directamente desde el navegador con la clave del propio usuario (BYOK).
 * La clave nunca sale del dispositivo salvo hacia la API de Anthropic.
 */

const ENDPOINT = 'https://api.anthropic.com/v1/messages';
const MODELO = 'claude-sonnet-5';

const SYSTEM = `Eres un arquitecto experto que ayuda a una persona a bocetar su vivienda unifamiliar dentro de la normativa urbanística de su municipio. Te dan el contexto (normativa aplicable, parcela, estancias actuales y estado de cumplimiento) y lo que la persona desea.

Da sugerencias CONCRETAS y accionables de distribución, orientación, aprovechamiento de la edificabilidad y habitabilidad, SIEMPRE dentro de los límites de la normativa que te dan. Cada sugerencia relevante debe apoyarse en un dato de la normativa o una métrica del proyecto (cítalo entre paréntesis). Si algo que la persona quiere no cabe en la normativa, dilo con claridad y ofrece la mejor alternativa que sí cabe.

Importante: no eres un proyecto técnico ni una validación oficial; recuérdalo brevemente al final. Responde en español, con formato claro (viñetas), sin florituras. Sé útil y específico para ESTA parcela y ESTA normativa, no genérico.`;

export interface RespuestaAsistente {
  texto: string;
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
  const texto = (data?.content ?? [])
    .filter((b: { type: string }) => b.type === 'text')
    .map((b: { text: string }) => b.text)
    .join('\n')
    .trim();
  return { texto: texto || '(respuesta vacía)' };
}
