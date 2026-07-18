import { useEffect, useRef } from 'react';

/**
 * Tarjeta de sección plegable: abierta en escritorio, plegada por defecto en
 * pantallas pequeñas (salvo `abiertaEnMovil`). No controlamos `open` en cada
 * render para que el usuario pueda plegar/desplegar libremente.
 */
export function Seccion({
  titulo,
  abiertaEnMovil = false,
  children,
}: {
  titulo: React.ReactNode;
  abiertaEnMovil?: boolean;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.open = window.innerWidth > 1000 || abiertaEnMovil;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <details ref={ref} className="seccion">
      <summary>{titulo}</summary>
      <div className="seccion-cuerpo">{children}</div>
    </details>
  );
}
