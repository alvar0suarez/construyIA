import { useRef } from 'react';
import type { Proyecto } from '../domain/types';
import { useStore } from '../state/store';
import type { Pagina } from './App';

export function Cabecera({
  pagina,
  setPagina,
}: {
  pagina: Pagina;
  setPagina: (p: Pagina) => void;
}) {
  const nombre = useStore((s) => s.proyecto.nombre);
  const setNombre = useStore((s) => s.setNombre);
  const proyecto = useStore((s) => s.proyecto);
  const importProyecto = useStore((s) => s.importProyecto);
  const resetProyecto = useStore((s) => s.resetProyecto);
  const deshacer = useStore((s) => s.deshacer);
  const rehacer = useStore((s) => s.rehacer);
  const hayPasado = useStore((s) => s.pasado.length > 0);
  const hayFuturo = useStore((s) => s.futuro.length > 0);
  const inputFichero = useRef<HTMLInputElement>(null);

  const exportar = () => {
    const blob = new Blob([JSON.stringify(proyecto, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${proyecto.nombre.replace(/\s+/g, '_') || 'proyecto'}.construyia.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importar = async (fichero: File) => {
    try {
      const texto = await fichero.text();
      importProyecto(JSON.parse(texto) as Proyecto);
    } catch (e) {
      alert(`No se pudo importar el proyecto: ${(e as Error).message}`);
    }
  };

  return (
    <header className="cabecera">
      <button className="logo" onClick={() => setPagina('inicio')}>
        <span className="logo-icono">🏠</span> Construy<em>IA</em>
      </button>
      <nav className="pestanas">
        <button
          className={pagina === 'inicio' ? 'activa' : ''}
          onClick={() => setPagina('inicio')}
        >
          Inicio
        </button>
        <button
          className={pagina === 'diseno' ? 'activa' : ''}
          onClick={() => setPagina('diseno')}
        >
          Diseño
        </button>
        <button
          className={pagina === 'cobertura' ? 'activa' : ''}
          onClick={() => setPagina('cobertura')}
        >
          Cobertura
        </button>
      </nav>
      {pagina === 'diseno' && (
        <input
          className="nombre-proyecto"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          aria-label="Nombre del proyecto"
        />
      )}
      <div className="acciones">
        {pagina === 'diseno' && (
          <>
            <button onClick={deshacer} disabled={!hayPasado} title="Deshacer (Ctrl+Z)">↩</button>
            <button onClick={rehacer} disabled={!hayFuturo} title="Rehacer (Ctrl+Y)">↪</button>
          </>
        )}
        <button onClick={exportar}>Exportar</button>
        <button onClick={() => inputFichero.current?.click()}>Importar</button>
        <button
          onClick={() => {
            if (confirm('¿Empezar un proyecto nuevo? Se perderá el actual si no lo has exportado.')) {
              resetProyecto();
            }
          }}
        >
          Nuevo
        </button>
        <input
          ref={inputFichero}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void importar(f);
            e.target.value = '';
          }}
        />
      </div>
    </header>
  );
}
