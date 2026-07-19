import * as pdfjs from 'pdfjs-dist';
// El worker de pdf.js se carga desde el propio bundle (Vite lo empaqueta).
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = PdfWorker;

/**
 * Extrae el texto de un PDF con capa de texto. Devuelve el texto concatenado
 * por páginas (con marcas de página) y el nº de páginas. Si el PDF es un
 * escaneo sin texto, `texto` vendrá casi vacío y el llamador debe avisar.
 */
export async function extraerTextoPdf(
  fichero: File,
): Promise<{ texto: string; paginas: number }> {
  const datos = new Uint8Array(await fichero.arrayBuffer());
  const doc = await pdfjs.getDocument({ data: datos }).promise;
  const partes: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const pagina = await doc.getPage(i);
    const contenido = await pagina.getTextContent();
    const texto = contenido.items
      .map((it) => ('str' in it ? it.str : ''))
      .join(' ');
    partes.push(`\n[página ${i}]\n${texto}`);
  }
  return { texto: partes.join('\n'), paginas: doc.numPages };
}
