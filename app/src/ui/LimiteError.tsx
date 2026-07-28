import { Component, type ReactNode } from 'react';

/**
 * Límite de error: si algo revienta al pintar la app, en vez de dejar la
 * pantalla en blanco muestra un mensaje y dos botones de recuperación
 * (recargar, o borrar los datos guardados y recargar). También limpia
 * cualquier service worker/caché antiguos, que ya causaron pantallazos en
 * blanco.
 */
export class LimiteError extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  private async limpiarSWyCaches() {
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
      if ('caches' in window) {
        const claves = await caches.keys();
        await Promise.all(claves.map((k) => caches.delete(k)));
      }
    } catch {
      /* da igual: seguimos con la recarga */
    }
  }

  private recargar = async () => {
    await this.limpiarSWyCaches();
    location.reload();
  };

  private borrarYRecargar = async () => {
    try {
      localStorage.clear();
    } catch {
      /* modo privado u otro: seguimos */
    }
    await this.limpiarSWyCaches();
    location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="limite-error">
        <div className="limite-error-caja">
          <h1>Vaya, algo ha fallado 😕</h1>
          <p>
            La aplicación no ha podido cargarse. Prueba a recargar. Si sigue sin
            funcionar, puedes borrar los datos guardados en este dispositivo y
            empezar de nuevo (no afecta a proyectos que hayas exportado).
          </p>
          <div className="limite-error-botones">
            <button className="paso-btn primario" onClick={this.recargar}>
              🔄 Recargar
            </button>
            <button className="paso-btn" onClick={this.borrarYRecargar}>
              🗑 Borrar mis datos y recargar
            </button>
          </div>
          <details>
            <summary>Detalles técnicos</summary>
            <pre>{String(this.state.error?.message || this.state.error)}</pre>
          </details>
        </div>
      </div>
    );
  }
}
