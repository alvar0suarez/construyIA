import type { NormativaMunicipal } from '../normativa/schema';

const ENDPOINT = 'https://api.anthropic.com/v1/messages';
const MODELO = 'claude-sonnet-5';

const SYSTEM = `Eres un técnico en urbanismo. Del texto de una ordenanza municipal, extrae los parámetros de la zona de USO RESIDENCIAL UNIFAMILIAR. Si hay varios grados/subzonas, extrae el que el usuario indique o el principal. Devuelve SOLO datos presentes en el texto; si un parámetro no aparece, omítelo (no lo inventes). Para cada parámetro, incluye la cita textual y la página en el campo de notas. Usa la herramienta 'registrar_normativa'.`;

/** Parámetro extraído + su procedencia (para que la revisión sea rápida). */
export interface NormativaInterpretada extends NormativaMunicipal {
  citas?: string[];
}

const HERRAMIENTA = {
  name: 'registrar_normativa',
  description: 'Registra los parámetros urbanísticos extraídos del documento.',
  input_schema: {
    type: 'object',
    properties: {
      municipio: { type: 'string' },
      zona: { type: 'string', description: 'Nombre de la ordenanza/zona/grado' },
      parcelaMinima: { type: 'number', description: 'm² (omitir si no aparece)' },
      retranqueoFrente: { type: 'number', description: 'metros a fachada/calle' },
      retranqueoFondo: { type: 'number', description: 'metros a testero' },
      retranqueoLateral: { type: 'number', description: 'metros a laterales' },
      ocupacionMaxima: { type: 'number', description: '% de la parcela' },
      edificabilidadMaxima: { type: 'number', description: 'm²/m²' },
      alturaMaxima: { type: 'number', description: 'm a cornisa' },
      alturaMaximaCumbrera: { type: 'number', description: 'm a cumbrera (omitir si no)' },
      plantasMaximas: { type: 'number' },
      pendienteCubiertaMin: { type: 'number', description: 'grados (omitir si no exige inclinada)' },
      pendienteCubiertaMax: { type: 'number', description: 'grados' },
      notas: { type: 'string', description: 'Condiciones no numéricas (estética, cubierta, etc.)' },
      citas: {
        type: 'array',
        items: { type: 'string' },
        description: 'Frase textual + página que respalda cada parámetro',
      },
    },
    required: [
      'municipio',
      'zona',
      'retranqueoFrente',
      'retranqueoFondo',
      'retranqueoLateral',
      'ocupacionMaxima',
      'edificabilidadMaxima',
      'alturaMaxima',
      'plantasMaximas',
    ],
  },
};

interface EntradaTool {
  municipio: string;
  zona: string;
  parcelaMinima?: number;
  retranqueoFrente: number;
  retranqueoFondo: number;
  retranqueoLateral: number;
  ocupacionMaxima: number;
  edificabilidadMaxima: number;
  alturaMaxima: number;
  alturaMaximaCumbrera?: number;
  plantasMaximas: number;
  pendienteCubiertaMin?: number;
  pendienteCubiertaMax?: number;
  notas?: string;
  citas?: string[];
}

/**
 * Interpreta el texto de una normativa con la IA y devuelve una
 * `NormativaMunicipal` con nivel 'interpretada-ia' (pendiente de revisión).
 */
export async function interpretarNormativa(params: {
  apiKey: string;
  texto: string;
  provincia?: string;
  grado?: string;
}): Promise<NormativaInterpretada> {
  const { apiKey, texto, provincia = '', grado } = params;

  const contenido =
    `${grado ? `Extrae el grado/subzona: ${grado}.\n\n` : ''}TEXTO DE LA ORDENANZA:\n` +
    // Recorte defensivo: ordenanzas muy largas caben de sobra en el contexto,
    // pero limitamos para controlar el coste.
    texto.slice(0, 120_000);

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODELO,
      max_tokens: 1500,
      system: SYSTEM,
      tools: [HERRAMIENTA],
      tool_choice: { type: 'tool', name: 'registrar_normativa' },
      messages: [{ role: 'user', content: contenido }],
    }),
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error('La clave de API no es válida.');
    throw new Error(`Error de la API de Claude: ${res.status}`);
  }

  const data = await res.json();
  const bloque = (data?.content ?? []).find(
    (b: { type: string; name?: string }) => b.type === 'tool_use' && b.name === 'registrar_normativa',
  );
  if (!bloque) throw new Error('La IA no pudo extraer parámetros del documento.');
  const e = bloque.input as EntradaTool;

  return {
    id: `ia-${Date.now().toString(36)}`,
    municipio: e.municipio,
    provincia,
    zona: e.zona,
    verificacion: 'interpretada-ia',
    fechaRevision: '',
    fuentes: [{ titulo: 'PDF aportado por el usuario e interpretado por IA' }],
    parcelaMinima: e.parcelaMinima,
    retranqueos: {
      frente: e.retranqueoFrente,
      fondo: e.retranqueoFondo,
      lateral: e.retranqueoLateral,
    },
    ocupacionMaxima: e.ocupacionMaxima,
    edificabilidadMaxima: e.edificabilidadMaxima,
    alturaMaxima: e.alturaMaxima,
    alturaMaximaCumbrera: e.alturaMaximaCumbrera,
    plantasMaximas: e.plantasMaximas,
    pendienteCubierta:
      e.pendienteCubiertaMin != null && e.pendienteCubiertaMax != null
        ? { min: e.pendienteCubiertaMin, max: e.pendienteCubiertaMax }
        : undefined,
    notas: e.notas,
    citas: e.citas,
  };
}
