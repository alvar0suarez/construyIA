import { useRef, useState } from 'react';
import { tipoEstancia } from '../engine/catalogo';
import { evaluar } from '../engine/cumplimiento';
import { consultarAsistente, type EstanciaPropuesta } from '../ia/cliente';
import { resumenProyecto } from '../ia/contexto';
import { PLANTAS } from '../domain/types';
import type { NormativaMunicipal } from '../normativa/schema';
import { useStore } from '../state/store';
import { Seccion } from './Seccion';

const CLAVE_LS = 'construyia-apikey';
const nombrePlanta = (id: string) => PLANTAS.find((p) => p.id === id)?.nombre ?? id;

export function Asistente({ normativa }: { normativa: NormativaMunicipal }) {
  const proyecto = useStore((s) => s.proyecto);
  const addEstanciaConfig = useStore((s) => s.addEstanciaConfig);
  const setPersonalizada = useStore((s) => s.setPersonalizada);
  const setNormativaId = useStore((s) => s.setNormativaId);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(CLAVE_LS) ?? '');
  const [ajustes, setAjustes] = useState(false);
  const [deseo, setDeseo] = useState('');
  const [respuesta, setRespuesta] = useState('');
  const [propuestas, setPropuestas] = useState<EstanciaPropuesta[]>([]);
  const [anadidas, setAnadidas] = useState<Set<number>>(new Set());
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [pdfEstado, setPdfEstado] = useState('');
  const inputPdf = useRef<HTMLInputElement>(null);

  const guardarKey = (k: string) => {
    setApiKey(k);
    if (k) localStorage.setItem(CLAVE_LS, k);
    else localStorage.removeItem(CLAVE_LS);
  };

  const preguntar = async () => {
    setError('');
    setRespuesta('');
    setPropuestas([]);
    setAnadidas(new Set());
    if (!apiKey) {
      setAjustes(true);
      setError('Introduce tu clave de API de Anthropic para usar el asistente.');
      return;
    }
    setCargando(true);
    try {
      const contexto = resumenProyecto(proyecto, normativa, evaluar(proyecto, normativa));
      const { texto, propuestas } = await consultarAsistente({ apiKey, contexto, deseo });
      setRespuesta(texto);
      setPropuestas(propuestas);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCargando(false);
    }
  };

  const aplicar = (p: EstanciaPropuesta, i: number) => {
    addEstanciaConfig({ tipoId: p.tipo, planta: p.planta, ancho: p.ancho, fondo: p.fondo });
    setAnadidas((s) => new Set(s).add(i));
  };

  const interpretarPdf = async (fichero: File) => {
    setError('');
    setPdfEstado('');
    if (!apiKey) {
      setAjustes(true);
      setError('Introduce tu clave de API para interpretar el PDF.');
      return;
    }
    setPdfEstado(`Leyendo ${fichero.name}…`);
    try {
      // pdf.js es pesado: se carga solo al interpretar un PDF.
      const [{ extraerTextoPdf }, { interpretarNormativa }] = await Promise.all([
        import('../ia/pdf'),
        import('../ia/interpretarPdf'),
      ]);
      const { texto, paginas } = await extraerTextoPdf(fichero);
      if (texto.replace(/\s/g, '').length < 400) {
        setPdfEstado('');
        setError(
          'El PDF parece un escaneo sin texto. La interpretación de escaneos (por imagen) llegará en una versión posterior.',
        );
        return;
      }
      setPdfEstado(`Interpretando ${paginas} páginas con IA…`);
      const norma = await interpretarNormativa({ apiKey, texto });
      // Se carga como normativa personalizada editable, marcada interpretada-ia.
      setPersonalizada({
        ...norma,
        municipio: norma.municipio || 'Mi municipio',
        zona: `${norma.zona} (interpretada por IA — revísala)`,
      });
      setNormativaId('personalizada');
      setPdfEstado(
        `✓ Interpretado: ${norma.municipio} — ${norma.zona}. Cargado como normativa editable; revisa los valores${
          norma.citas?.length ? ` (${norma.citas.length} citas del documento)` : ''
        }.`,
      );
    } catch (e) {
      setPdfEstado('');
      setError((e as Error).message);
    }
  };

  return (
    <Seccion titulo="💬 Asistente de diseño (IA)">
      <p className="asistente-intro">
        Cuéntale a la IA cómo quieres tu casa y te sugiere ideas ajustadas a{' '}
        <strong>{normativa.municipio}</strong> y a tu boceto actual.
      </p>

      <textarea
        className="asistente-deseo"
        rows={3}
        placeholder="Ej.: familia de 4, teletrabajo, mucha luz por la mañana, zona de día abierta, presupuesto ajustado…"
        value={deseo}
        onChange={(e) => setDeseo(e.target.value)}
      />
      <div className="asistente-acciones">
        <button className="btn-primario" onClick={preguntar} disabled={cargando}>
          {cargando ? 'Pensando…' : '✨ Sugerir ideas'}
        </button>
        <button className="enlace" onClick={() => setAjustes((v) => !v)}>
          ⚙️ Clave API
        </button>
      </div>

      {ajustes && (
        <div className="asistente-ajustes">
          <label>
            Clave de API de Anthropic (se guarda solo en este dispositivo)
            <input
              type="password"
              value={apiKey}
              placeholder="sk-ant-…"
              onChange={(e) => guardarKey(e.target.value.trim())}
            />
          </label>
          <p className="asistente-nota">
            Usa una clave con límite de gasto. No sale de tu navegador salvo
            hacia la API de Anthropic. Consíguela en{' '}
            <a href="https://console.anthropic.com/" target="_blank" rel="noreferrer">
              console.anthropic.com
            </a>
            .
          </p>
        </div>
      )}

      <div className="asistente-pdf">
        <button className="enlace" onClick={() => inputPdf.current?.click()}>
          📄 Interpretar un PDF de normativa
        </button>
        <input
          ref={inputPdf}
          type="file"
          accept="application/pdf,.pdf"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void interpretarPdf(f);
            e.target.value = '';
          }}
        />
        {pdfEstado && <p className="asistente-nota">{pdfEstado}</p>}
      </div>

      {error && <p className="asistente-error">{error}</p>}
      {respuesta && <div className="asistente-respuesta">{respuesta}</div>}

      {propuestas.length > 0 && (
        <div className="asistente-propuestas">
          <p className="asistente-nota">Añade al boceto con un clic:</p>
          {propuestas.map((p, i) => (
            <button
              key={i}
              className="propuesta"
              disabled={anadidas.has(i)}
              onClick={() => aplicar(p, i)}
            >
              {anadidas.has(i) ? '✓ añadida' : '➕'} {tipoEstancia(p.tipo).nombre}{' '}
              {p.ancho}×{p.fondo} m · {nombrePlanta(p.planta)}
            </button>
          ))}
        </div>
      )}

      {(respuesta || cargando) && (
        <p className="asistente-nota">
          Sugerencias orientativas de una IA — no sustituyen a tu arquitecto/a.
        </p>
      )}
    </Seccion>
  );
}
