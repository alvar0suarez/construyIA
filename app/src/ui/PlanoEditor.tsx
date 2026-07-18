import { useEffect, useRef, useState } from 'react';
import type { Estancia, PlantaId } from '../domain/types';
import { PLANTAS } from '../domain/types';
import { tipoEstancia } from '../engine/catalogo';
import {
  dimensionesParcela,
  envolventeEdificable,
  retranqueoPorLado,
} from '../engine/geometria';
import type { NormativaMunicipal } from '../normativa/schema';
import { useStore } from '../state/store';

const SNAP = 0.1; // metros

type Arrastre =
  | { modo: 'mover'; id: string; dx: number; dy: number }
  | { modo: 'redimensionar'; id: string }
  | { modo: 'mover-hueco'; estanciaId: string; huecoId: string };

export function PlanoEditor({ normativa }: { normativa: NormativaMunicipal }) {
  const parcela = useStore((s) => s.proyecto.parcela);
  const plantas = useStore((s) => s.proyecto.plantas);
  const plantaActiva = useStore((s) => s.plantaActiva);
  const seleccionId = useStore((s) => s.seleccionId);
  const seleccionHuecoId = useStore((s) => s.seleccionHuecoId);
  const setSeleccion = useStore((s) => s.setSeleccion);
  const setSeleccionHueco = useStore((s) => s.setSeleccionHueco);
  const updateEstancia = useStore((s) => s.updateEstancia);
  const removeEstancia = useStore((s) => s.removeEstancia);
  const updateHueco = useStore((s) => s.updateHueco);
  const removeHueco = useStore((s) => s.removeHueco);
  const marcarHistoria = useStore((s) => s.marcarHistoria);

  const svgRef = useRef<SVGSVGElement>(null);
  const [arrastre, setArrastre] = useState<Arrastre | null>(null);

  const dims = dimensionesParcela(parcela);
  const envolvente = envolventeEdificable(parcela, normativa);
  const retranqueos = retranqueoPorLado(parcela.frente, normativa.retranqueos);
  const estancias = plantas[plantaActiva] ?? [];
  const fantasmas: Estancia[] = PLANTAS.filter(
    (p) => p.id !== plantaActiva && p.sobreRasante,
  ).flatMap((p) => plantas[p.id as PlantaId] ?? []);

  useEffect(() => {
    const onTecla = (e: KeyboardEvent) => {
      if (
        (e.key === 'Delete' || e.key === 'Backspace') &&
        !(e.target instanceof HTMLInputElement)
      ) {
        if (seleccionHuecoId && seleccionId) {
          removeHueco(seleccionId, seleccionHuecoId);
        } else if (seleccionId) {
          removeEstancia(seleccionId);
        }
      }
    };
    window.addEventListener('keydown', onTecla);
    return () => window.removeEventListener('keydown', onTecla);
  }, [seleccionId, seleccionHuecoId, removeEstancia, removeHueco]);

  /** Convierte coordenadas de puntero a metros del plano. */
  const aMetros = (e: React.PointerEvent): { x: number; y: number } => {
    const svg = svgRef.current!;
    const pt = new DOMPoint(e.clientX, e.clientY);
    const m = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return { x: m.x, y: m.y };
  };

  const snap = (v: number) => Math.round(v / SNAP) * SNAP;

  const onMover = (e: React.PointerEvent) => {
    if (!arrastre) return;
    const p = aMetros(e);
    if (arrastre.modo === 'mover-hueco') {
      const est = estancias.find((x) => x.id === arrastre.estanciaId);
      const hueco = est?.huecos?.find((h) => h.id === arrastre.huecoId);
      if (!est || !hueco) return;
      const horizontal = hueco.lado === 'norte' || hueco.lado === 'sur';
      const largo = horizontal ? est.ancho : est.fondo;
      const coord = horizontal ? p.x - est.x : p.y - est.y;
      updateHueco(est.id, hueco.id, {
        offset: snap(
          Math.min(Math.max(coord - hueco.ancho / 2, 0), Math.max(0, largo - hueco.ancho)),
        ),
      });
      return;
    }
    const est = estancias.find((x) => x.id === arrastre.id);
    if (!est) return;
    if (arrastre.modo === 'mover') {
      updateEstancia(est.id, {
        x: snap(Math.min(Math.max(p.x - arrastre.dx, 0), dims.ancho - est.ancho)),
        y: snap(Math.min(Math.max(p.y - arrastre.dy, 0), dims.fondo - est.fondo)),
      });
    } else {
      updateEstancia(est.id, {
        ancho: snap(Math.min(Math.max(p.x - est.x, 0.5), dims.ancho - est.x)),
        fondo: snap(Math.min(Math.max(p.y - est.y, 0.5), dims.fondo - est.y)),
      });
    }
  };

  const etiquetaFrente: Record<string, { x: number; y: number; rot: number }> = {
    sur: { x: dims.ancho / 2, y: dims.fondo + 1.2, rot: 0 },
    norte: { x: dims.ancho / 2, y: -0.5, rot: 0 },
    oeste: { x: -0.6, y: dims.fondo / 2, rot: -90 },
    este: { x: dims.ancho + 0.6, y: dims.fondo / 2, rot: 90 },
  };
  const ef = etiquetaFrente[parcela.frente];

  const plantaNombre = PLANTAS.find((p) => p.id === plantaActiva)!.nombre;

  return (
    <div className="plano-contenedor">
      <div className="plano-titulo">
        {plantaNombre} · parcela {dims.ancho.toFixed(1)} × {dims.fondo.toFixed(1)} m
        {plantaActiva === 'sotano' && ' · bajo rasante (no computa edificabilidad)'}
      </div>
      <svg
        ref={svgRef}
        className="plano"
        viewBox={`-2 -2 ${dims.ancho + 4} ${dims.fondo + 4}`}
        onPointerMove={onMover}
        onPointerUp={() => setArrastre(null)}
        onPointerLeave={() => setArrastre(null)}
        onPointerDown={(e) => {
          if (e.target === e.currentTarget) setSeleccion(null);
        }}
      >
        {/* Parcela */}
        <rect
          x={0}
          y={0}
          width={dims.ancho}
          height={dims.fondo}
          className="svg-parcela"
          onPointerDown={() => setSeleccion(null)}
        />

        {/* Cuadrícula de 1 m */}
        {Array.from({ length: Math.floor(dims.ancho) }, (_, i) => (
          <line key={`v${i}`} x1={i + 1} y1={0} x2={i + 1} y2={dims.fondo} className="svg-grid" />
        ))}
        {Array.from({ length: Math.floor(dims.fondo) }, (_, i) => (
          <line key={`h${i}`} x1={0} y1={i + 1} x2={dims.ancho} y2={i + 1} className="svg-grid" />
        ))}

        {/* Zona de retranqueo (entre parcela y envolvente) */}
        <path
          className="svg-retranqueo"
          fillRule="evenodd"
          d={`M0 0 H${dims.ancho} V${dims.fondo} H0 Z
              M${envolvente.x} ${envolvente.y}
              h${envolvente.ancho} v${envolvente.fondo} h${-envolvente.ancho} Z`}
        />
        <rect
          x={envolvente.x}
          y={envolvente.y}
          width={envolvente.ancho}
          height={envolvente.fondo}
          className="svg-envolvente"
        />

        {/* Cotas de retranqueo */}
        <text x={dims.ancho / 2} y={retranqueos.norte / 2 + 0.3} className="svg-cota">{retranqueos.norte} m</text>
        <text x={dims.ancho / 2} y={dims.fondo - retranqueos.sur / 2 + 0.3} className="svg-cota">{retranqueos.sur} m</text>
        <text x={retranqueos.oeste / 2} y={dims.fondo / 2} className="svg-cota">{retranqueos.oeste} m</text>
        <text x={dims.ancho - retranqueos.este / 2} y={dims.fondo / 2} className="svg-cota">{retranqueos.este} m</text>

        {/* Frente / calle */}
        <text
          x={ef.x}
          y={ef.y}
          className="svg-frente"
          transform={`rotate(${ef.rot} ${ef.x} ${ef.y})`}
        >
          🚗 calle (frente)
        </text>

        {/* Estancias de otras plantas, como referencia */}
        {fantasmas.map((e) => (
          <rect
            key={e.id}
            x={e.x}
            y={e.y}
            width={e.ancho}
            height={e.fondo}
            className="svg-fantasma"
          />
        ))}

        {/* Estancias de la planta activa */}
        {estancias.map((e) => {
          const def = tipoEstancia(e.tipo);
          const sel = e.id === seleccionId;
          return (
            <g key={e.id}>
              <rect
                x={e.x}
                y={e.y}
                width={e.ancho}
                height={e.fondo}
                fill={def.color}
                className={`svg-estancia${sel ? ' seleccionada' : ''}`}
                onPointerDown={(ev) => {
                  ev.stopPropagation();
                  setSeleccion(e.id);
                  marcarHistoria();
                  const p = aMetros(ev);
                  setArrastre({ modo: 'mover', id: e.id, dx: p.x - e.x, dy: p.y - e.y });
                }}
              />
              <text
                x={e.x + e.ancho / 2}
                y={e.y + e.fondo / 2 - 0.25}
                className="svg-etiqueta"
              >
                {def.icono} {def.nombre}
              </text>
              <text
                x={e.x + e.ancho / 2}
                y={e.y + e.fondo / 2 + 0.55}
                className="svg-etiqueta svg-etiqueta-area"
              >
                {(e.ancho * e.fondo).toFixed(1)} m²
              </text>
              {sel && (
                <circle
                  cx={e.x + e.ancho}
                  cy={e.y + e.fondo}
                  r={0.4}
                  className="svg-asa"
                  onPointerDown={(ev) => {
                    ev.stopPropagation();
                    marcarHistoria();
                    setArrastre({ modo: 'redimensionar', id: e.id });
                  }}
                />
              )}
              {/* Huecos: ventanas y puertas sobre las paredes */}
              {(e.huecos ?? []).map((h) => {
                const horizontal = h.lado === 'norte' || h.lado === 'sur';
                const x1 = horizontal
                  ? e.x + h.offset
                  : h.lado === 'oeste' ? e.x : e.x + e.ancho;
                const y1 = horizontal
                  ? h.lado === 'norte' ? e.y : e.y + e.fondo
                  : e.y + h.offset;
                const x2 = horizontal ? x1 + h.ancho : x1;
                const y2 = horizontal ? y1 : y1 + h.ancho;
                const selHueco = h.id === seleccionHuecoId;
                return (
                  <line
                    key={h.id}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    className={`svg-hueco ${h.tipo}${selHueco ? ' seleccionada' : ''}`}
                    onPointerDown={(ev) => {
                      ev.stopPropagation();
                      setSeleccion(e.id);
                      setSeleccionHueco(h.id);
                      marcarHistoria();
                      setArrastre({ modo: 'mover-hueco', estanciaId: e.id, huecoId: h.id });
                    }}
                  >
                    <title>
                      {h.tipo === 'ventana' ? 'Ventana' : 'Puerta'} {h.ancho}×{h.alto} m
                    </title>
                  </line>
                );
              })}
            </g>
          );
        })}
      </svg>
      {seleccionId && (
        <div className="plano-ayuda">
          Arrastra para mover · círculo para redimensionar · <kbd>Supr</kbd> para eliminar
          <button className="borrar" onClick={() => removeEstancia(seleccionId)}>
            🗑 Eliminar estancia
          </button>
        </div>
      )}
    </div>
  );
}
