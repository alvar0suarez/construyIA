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

/**
 * Estilos que viajan con el SVG al exportarlo a imagen (las clases del CSS
 * de la app no existen fuera del documento). Mantener en sintonía con
 * estilos.css.
 */
const ESTILOS_EXPORT = `
  text { font-family: system-ui, sans-serif; }
  .svg-parcela { fill: #edf3e6; stroke: #7a8a6f; stroke-width: 0.15; }
  .svg-grid { stroke: #dde4d4; stroke-width: 0.02; }
  .svg-retranqueo { fill: rgba(189, 68, 54, 0.06); }
  .svg-envolvente { fill: none; stroke: #2e7d5b; stroke-width: 0.09; stroke-dasharray: 0.4 0.25; }
  .svg-cota { font-size: 0.7px; fill: #bd4436; text-anchor: middle; opacity: 0.7; }
  .svg-frente { font-size: 0.9px; fill: #68705f; text-anchor: middle; }
  .svg-fantasma { fill: none; stroke: #b9b4aa; stroke-width: 0.06; stroke-dasharray: 0.2 0.2; }
  .svg-estancia { stroke: #565045; stroke-width: 0.06; opacity: 0.94; }
  .svg-estancia.seleccionada { stroke: #565045; stroke-width: 0.06; }
  .svg-etiqueta { font-size: 0.55px; text-anchor: middle; fill: #2f2c25; }
  .svg-etiqueta-area { font-size: 0.5px; fill: #68705f; }
  .svg-asa { display: none; }
  .svg-guia { display: none; }
  .svg-hueco.ventana { stroke: #1e88e5; stroke-width: 0.18; }
  .svg-hueco.puerta { stroke: #8d6e63; stroke-width: 0.2; }
`;

/** Descarga el SVG del plano como PNG a ~2000 px de ancho. */
function descargarPlanoPNG(svg: SVGSVGElement, nombreFichero: string) {
  const clon = svg.cloneNode(true) as SVGSVGElement;
  const estilo = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  estilo.textContent = ESTILOS_EXPORT;
  clon.insertBefore(estilo, clon.firstChild);
  const [, , vw, vh] = (clon.getAttribute('viewBox') ?? '0 0 1 1').split(' ').map(Number);
  const xml = new XMLSerializer().serializeToString(clon);
  const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml' }));
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 2000;
    canvas.height = Math.round((2000 * vh) / vw);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = nombreFichero;
      a.click();
      URL.revokeObjectURL(a.href);
    }, 'image/png');
  };
  img.src = url;
}

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

  // Zoom y encuadre: pellizco con dos dedos, rueda en escritorio.
  const [zoom, setZoom] = useState<{ z: number; cx: number; cy: number } | null>(null);
  const dedos = useRef(new Map<number, { x: number; y: number }>());
  const pinchaInicial = useRef<{ z: number; cx: number; cy: number; dist: number; mx: number; my: number } | null>(null);
  // Coalescencia de pointermove con requestAnimationFrame: en móviles los
  // eventos llegan más rápido de lo que renderiza React y el arrastre se
  // atasca; aplicamos solo la última posición una vez por frame.
  const rafPendiente = useRef<number | null>(null);
  const ultimoEvento = useRef<{ x: number; y: number } | null>(null);

  const dims = dimensionesParcela(parcela);
  const envolvente = envolventeEdificable(parcela, normativa);

  const vb0 = { w: dims.ancho + 4, h: dims.fondo + 4 };
  const z = zoom?.z ?? 1;
  const centro = zoom ?? { z: 1, cx: dims.ancho / 2, cy: dims.fondo / 2 };
  const vw = vb0.w / z;
  const vh = vb0.h / z;
  const viewBox = `${centro.cx - vw / 2} ${centro.cy - vh / 2} ${vw} ${vh}`;

  /** Escala aproximada px/metro del svg en pantalla (para el paneo táctil). */
  const pxPorMetro = () => {
    const r = svgRef.current?.getBoundingClientRect();
    if (!r) return 20;
    return Math.min(r.width / vw, r.height / vh);
  };

  const onPinchDown = (e: React.PointerEvent) => {
    dedos.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (dedos.current.size === 2) {
      setArrastre(null); // dos dedos = zoom/paneo, no arrastre de estancia
      const [a, b] = [...dedos.current.values()];
      pinchaInicial.current = {
        ...centro,
        z,
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        mx: (a.x + b.x) / 2,
        my: (a.y + b.y) / 2,
      };
    }
  };
  const onPinchMove = (e: React.PointerEvent) => {
    if (!dedos.current.has(e.pointerId)) return;
    dedos.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const ini = pinchaInicial.current;
    if (dedos.current.size !== 2 || !ini) return;
    const [a, b] = [...dedos.current.values()];
    const dist = Math.hypot(a.x - b.x, a.y - b.y);
    const nuevoZ = Math.min(8, Math.max(1, (ini.z * dist) / Math.max(1, ini.dist)));
    const escala = pxPorMetro();
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    setZoom({
      z: nuevoZ,
      cx: ini.cx - (mx - ini.mx) / escala,
      cy: ini.cy - (my - ini.my) / escala,
    });
  };
  const onPinchUp = (e: React.PointerEvent) => {
    dedos.current.delete(e.pointerId);
    if (dedos.current.size < 2) pinchaInicial.current = null;
  };

  const onRueda = (e: React.WheelEvent) => {
    const p = aMetros(e as unknown as React.PointerEvent);
    const nuevoZ = Math.min(8, Math.max(1, z * Math.exp(-e.deltaY * 0.0015)));
    if (nuevoZ === z) return;
    setZoom({
      z: nuevoZ,
      cx: p.x + (centro.cx - p.x) * (z / nuevoZ),
      cy: p.y + (centro.cy - p.y) * (z / nuevoZ),
    });
  };
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

  /** Imán: si `valor` está cerca de algún candidato, salta a él. */
  const iman = (valor: number, candidatos: number[], tolerancia = 0.3): number => {
    let mejor = valor;
    let distancia = tolerancia;
    for (const c of candidatos) {
      const d = Math.abs(valor - c);
      if (d < distancia) {
        distancia = d;
        mejor = c;
      }
    }
    return mejor;
  };

  const onMover = (e: React.PointerEvent) => {
    if (!arrastre) return;
    ultimoEvento.current = aMetros(e);
    if (rafPendiente.current != null) return;
    rafPendiente.current = requestAnimationFrame(() => {
      rafPendiente.current = null;
      if (ultimoEvento.current) aplicarMovimiento(ultimoEvento.current);
    });
  };

  const aplicarMovimiento = (p: { x: number; y: number }) => {
    if (!arrastre) return;
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
    // Bordes de otras estancias (esta planta y las demás) y de la envolvente,
    // como objetivos magnéticos para pegar y alinear.
    const vecinas = [...estancias.filter((o) => o.id !== est.id), ...fantasmas];
    if (arrastre.modo === 'mover') {
      const candX = [envolvente.x, envolvente.x + envolvente.ancho - est.ancho];
      const candY = [envolvente.y, envolvente.y + envolvente.fondo - est.fondo];
      for (const o of vecinas) {
        candX.push(o.x, o.x + o.ancho, o.x - est.ancho, o.x + o.ancho - est.ancho);
        candY.push(o.y, o.y + o.fondo, o.y - est.fondo, o.y + o.fondo - est.fondo);
      }
      updateEstancia(est.id, {
        x: iman(snap(Math.min(Math.max(p.x - arrastre.dx, 0), dims.ancho - est.ancho)), candX),
        y: iman(snap(Math.min(Math.max(p.y - arrastre.dy, 0), dims.fondo - est.fondo)), candY),
      });
    } else {
      const candAncho = vecinas.flatMap((o) => [o.x - est.x, o.x + o.ancho - est.x, o.ancho]);
      candAncho.push(envolvente.x + envolvente.ancho - est.x);
      const candFondo = vecinas.flatMap((o) => [o.y - est.y, o.y + o.fondo - est.y, o.fondo]);
      candFondo.push(envolvente.y + envolvente.fondo - est.y);
      updateEstancia(est.id, {
        ancho: iman(snap(Math.min(Math.max(p.x - est.x, 0.5), dims.ancho - est.x)), candAncho),
        fondo: iman(snap(Math.min(Math.max(p.y - est.y, 0.5), dims.fondo - est.y)), candFondo),
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
        <span>
          {plantaNombre} · parcela {dims.ancho.toFixed(1)} × {dims.fondo.toFixed(1)} m
          {plantaActiva === 'sotano' && ' · bajo rasante (no computa edificabilidad)'}
        </span>
        <span className="plano-acciones">
          {zoom && zoom.z > 1.01 && (
            <button className="reencuadrar" onClick={() => setZoom(null)}>
              ⤢ {Math.round(zoom.z * 100)} % · encajar
            </button>
          )}
          <button
            className="reencuadrar"
            title="Descargar el plano como imagen PNG"
            onClick={() =>
              svgRef.current &&
              descargarPlanoPNG(svgRef.current, `plano-${plantaActiva}.png`)
            }
          >
            Descargar PNG
          </button>
        </span>
      </div>
      <svg
        ref={svgRef}
        className="plano"
        viewBox={viewBox}
        onWheel={onRueda}
        onPointerDownCapture={onPinchDown}
        onPointerMoveCapture={onPinchMove}
        onPointerUpCapture={onPinchUp}
        onPointerCancelCapture={onPinchUp}
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

        {/* Guías de distancia a linderos de la estancia seleccionada */}
        {(() => {
          const sel = estancias.find((e) => e.id === seleccionId);
          if (!sel) return null;
          const cx = sel.x + sel.ancho / 2;
          const cy = sel.y + sel.fondo / 2;
          const guias = [
            { x1: 0, y1: cy, x2: sel.x, y2: cy, d: sel.x },
            { x1: sel.x + sel.ancho, y1: cy, x2: dims.ancho, y2: cy, d: dims.ancho - sel.x - sel.ancho },
            { x1: cx, y1: 0, x2: cx, y2: sel.y, d: sel.y },
            { x1: cx, y1: sel.y + sel.fondo, x2: cx, y2: dims.fondo, d: dims.fondo - sel.y - sel.fondo },
          ].filter((g) => g.d > 0.05);
          return (
            <g className="svg-guia">
              {guias.map((g, i) => (
                <g key={i}>
                  <line x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2} />
                  <text x={(g.x1 + g.x2) / 2} y={(g.y1 + g.y2) / 2 - 0.25}>
                    {g.d.toFixed(1)} m
                  </text>
                </g>
              ))}
            </g>
          );
        })()}

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
