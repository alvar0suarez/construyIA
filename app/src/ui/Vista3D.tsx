import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BoxGeometry,
  BufferGeometry,
  EdgesGeometry,
  Line,
  LineBasicMaterial,
  Vector3,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { PLANTAS, type PlantaId } from '../domain/types';
import { tipoEstancia } from '../engine/catalogo';
import { dimensionesParcela, envolventeEdificable } from '../engine/geometria';
import {
  diaDelAnyo,
  formatoHora,
  localASolar,
  ortoYOcaso,
  posicionSolar,
  solarALocal,
  vectorSolar,
} from '../engine/soleamiento';
import type { NormativaMunicipal } from '../normativa/schema';
import { useStore } from '../state/store';
import { murosDeEstancia } from './muros';

const LAT_DEFECTO = 40.5;
const LNG_DEFECTO = -3.7;
const ALTURA_OJOS = 1.6;
const SIN_MUROS = new Set(['piscina', 'terraza', 'porche']);
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

type Modo = 'orbita' | 'interior';

function ControlesOrbita({ objetivo }: { objetivo: [number, number, number] }) {
  const { camera, gl } = useThree();
  useEffect(() => {
    const c = new OrbitControls(camera, gl.domElement);
    c.target.set(...objetivo);
    c.maxPolarAngle = Math.PI / 2 - 0.02;
    c.update();
    return () => c.dispose();
  }, [camera, gl, objetivo]);
  return null;
}

function ControlesInterior({ alturaOjos }: { alturaOjos: number }) {
  const { camera, gl } = useThree();
  const controles = useRef<PointerLockControls | null>(null);
  const teclas = useRef(new Set<string>());

  useEffect(() => {
    camera.rotation.set(0, Math.PI, 0); // mirar al horizonte, hacia el sur (frente)
    const c = new PointerLockControls(camera, gl.domElement);
    controles.current = c;
    const lock = () => c.lock();
    gl.domElement.addEventListener('click', lock);
    const down = (e: KeyboardEvent) => teclas.current.add(e.code);
    const up = (e: KeyboardEvent) => teclas.current.delete(e.code);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      gl.domElement.removeEventListener('click', lock);
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      c.unlock();
      c.dispose();
    };
  }, [camera, gl]);

  useFrame((_, dt) => {
    const c = controles.current;
    if (!c) return;
    const paso = 4 * Math.min(dt, 0.1); // 4 m/s
    const t = teclas.current;
    if (t.has('KeyW') || t.has('ArrowUp')) c.moveForward(paso);
    if (t.has('KeyS') || t.has('ArrowDown')) c.moveForward(-paso);
    if (t.has('KeyA') || t.has('ArrowLeft')) c.moveRight(-paso);
    if (t.has('KeyD') || t.has('ArrowRight')) c.moveRight(paso);
    camera.position.y = alturaOjos; // caminar a altura de ojos constante
  });
  return null;
}

function Escena({
  normativa,
  mes,
  horaSolar,
  conJaula,
}: {
  normativa: NormativaMunicipal;
  mes: number;
  horaSolar: number;
  conJaula: boolean;
}) {
  const parcela = useStore((s) => s.proyecto.parcela);
  const plantas = useStore((s) => s.proyecto.plantas);
  const alturaPorPlanta = useStore((s) => s.proyecto.alturaPorPlanta);

  const dims = dimensionesParcela(parcela);
  const envolvente = envolventeEdificable(parcela, normativa);

  const lat = normativa.ubicacion?.lat ?? LAT_DEFECTO;
  const dia = diaDelAnyo(mes);
  const sol = posicionSolar(lat, dia, horaSolar);
  const vSol = vectorSolar(sol);
  const deDia = sol.elevacion > 0;
  const radio = Math.max(dims.ancho, dims.fondo) * 1.5;

  // Arco de la trayectoria solar del día (de orto a ocaso)
  const arcoSolar = useMemo(() => {
    const oo = ortoYOcaso(lat, dia);
    const puntos: Vector3[] = [];
    for (let h = oo.amanecer; h <= oo.atardecer; h += 0.25) {
      const v = vectorSolar(posicionSolar(lat, dia, h));
      puntos.push(new Vector3(v.x * radio, Math.max(0, v.y * radio), v.z * radio));
    }
    const geo = new BufferGeometry().setFromPoints(puntos);
    return new Line(geo, new LineBasicMaterial({ color: '#f9a825', transparent: true, opacity: 0.8 }));
  }, [lat, dia, radio]);

  const basePlanta = (id: PlantaId) =>
    id === 'sotano' ? -alturaPorPlanta : id === 'baja' ? 0 : alturaPorPlanta;

  const jaula = useMemo(
    () =>
      new EdgesGeometry(
        new BoxGeometry(envolvente.ancho, normativa.alturaMaxima, envolvente.fondo),
      ),
    [envolvente.ancho, envolvente.fondo, normativa.alturaMaxima],
  );

  const cuerpos = useMemo(() => {
    return PLANTAS.flatMap((p) =>
      (plantas[p.id] ?? []).map((e) => {
        const def = tipoEstancia(e.tipo);
        const base = basePlanta(p.id);
        const esPlana = def.id === 'piscina' || def.id === 'terraza';
        const conMuros = !SIN_MUROS.has(def.id);
        return {
          e,
          def,
          base,
          esPlana,
          sobreRasante: p.sobreRasante,
          muros: conMuros && !esPlana
            ? murosDeEstancia(e, base, alturaPorPlanta - 0.08)
            : null,
        };
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plantas, alturaPorPlanta]);

  return (
    <>
      <color attach="background" args={[deDia ? '#dcebf5' : '#1a2233']} />
      <ambientLight intensity={deDia ? 0.55 : 0.15} />
      <hemisphereLight intensity={deDia ? 0.35 : 0.1} color="#cfe4f7" groundColor="#7a8a6f" />
      {conJaula && <primitive object={arcoSolar} />}
      {conJaula && deDia && (
        <mesh position={[vSol.x * radio, vSol.y * radio, vSol.z * radio]}>
          <sphereGeometry args={[radio * 0.03, 16, 16]} />
          <meshBasicMaterial color="#ffd54f" />
        </mesh>
      )}
      {deDia && (
        <directionalLight
          position={[vSol.x * radio, vSol.y * radio, vSol.z * radio]}
          intensity={Math.min(1.4, 0.4 + sol.elevacion / 50)}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-left={-radio}
          shadow-camera-right={radio}
          shadow-camera-top={radio}
          shadow-camera-bottom={-radio}
          shadow-camera-far={radio * 4}
        />
      )}

      <group position={[-dims.ancho / 2, 0, -dims.fondo / 2]}>
        {/* Terreno alrededor */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[dims.ancho / 2, -0.03, dims.fondo / 2]} receiveShadow>
          <planeGeometry args={[dims.ancho + 40, dims.fondo + 40]} />
          <meshStandardMaterial color="#b8c4a8" />
        </mesh>
        {/* Parcela */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[dims.ancho / 2, -0.01, dims.fondo / 2]} receiveShadow>
          <planeGeometry args={[dims.ancho, dims.fondo]} />
          <meshStandardMaterial color="#cfe0c3" />
        </mesh>

        {/* Flecha del norte */}
        <mesh position={[dims.ancho / 2, 0.4, -2]} rotation={[-Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.5, 1.6, 4]} />
          <meshStandardMaterial color="#c62828" />
        </mesh>

        {conJaula && (
          <lineSegments
            geometry={jaula}
            position={[
              envolvente.x + envolvente.ancho / 2,
              normativa.alturaMaxima / 2,
              envolvente.y + envolvente.fondo / 2,
            ]}
          >
            <lineBasicMaterial color="#2e7d32" transparent opacity={0.7} />
          </lineSegments>
        )}

        {cuerpos.map(({ e, def, base, esPlana, sobreRasante, muros }) => {
          if (esPlana) {
            return (
              <mesh key={e.id} position={[e.x + e.ancho / 2, base + 0.075, e.y + e.fondo / 2]} receiveShadow>
                <boxGeometry args={[e.ancho, 0.15, e.fondo]} />
                <meshStandardMaterial color={def.id === 'piscina' ? '#4fc3f7' : def.color} />
              </mesh>
            );
          }
          if (!muros) {
            // Porche: losa de suelo + techo fino sobre pilares implícitos
            return (
              <group key={e.id}>
                <mesh position={[e.x + e.ancho / 2, base + 0.04, e.y + e.fondo / 2]} receiveShadow>
                  <boxGeometry args={[e.ancho, 0.08, e.fondo]} />
                  <meshStandardMaterial color={def.color} />
                </mesh>
                <mesh position={[e.x + e.ancho / 2, base + alturaPorPlanta - 0.1, e.y + e.fondo / 2]} castShadow>
                  <boxGeometry args={[e.ancho, 0.12, e.fondo]} />
                  <meshStandardMaterial color="#a1887f" />
                </mesh>
              </group>
            );
          }
          return (
            <group key={e.id}>
              {/* Suelo de la estancia */}
              <mesh position={[e.x + e.ancho / 2, base + 0.04, e.y + e.fondo / 2]} receiveShadow>
                <boxGeometry args={[e.ancho, 0.08, e.fondo]} />
                <meshStandardMaterial color={def.color} transparent={!sobreRasante} opacity={sobreRasante ? 1 : 0.5} />
              </mesh>
              {/* Muros con huecos */}
              {muros.muros.map((m, i) => (
                <mesh
                  key={i}
                  geometry={m.geometria}
                  position={m.posicion}
                  rotation={[0, m.rotacionY, 0]}
                  castShadow
                  receiveShadow
                >
                  <meshStandardMaterial
                    color="#efe9df"
                    transparent={!sobreRasante}
                    opacity={sobreRasante ? 1 : 0.4}
                  />
                </mesh>
              ))}
              {/* Cristales */}
              {muros.cristales.map((c, i) => (
                <mesh key={`c${i}`} position={c.posicion} rotation={[0, c.rotacionY, 0]}>
                  <planeGeometry args={c.tam} />
                  <meshStandardMaterial color="#7ec8f7" transparent opacity={0.35} side={2} />
                </mesh>
              ))}
            </group>
          );
        })}
      </group>
    </>
  );
}

export function Vista3D({ normativa }: { normativa: NormativaMunicipal }) {
  const parcela = useStore((s) => s.proyecto.parcela);
  const plantas = useStore((s) => s.proyecto.plantas);
  const plantaActiva = useStore((s) => s.plantaActiva);
  const alturaPorPlanta = useStore((s) => s.proyecto.alturaPorPlanta);

  const [modo, setModo] = useState<Modo>('orbita');
  const [mes, setMes] = useState(6);
  const [hora, setHora] = useState(14); // hora local oficial
  const [reproduciendo, setReproduciendo] = useState(false);

  const dims = dimensionesParcela(parcela);
  const lat = normativa.ubicacion?.lat ?? LAT_DEFECTO;
  const lng = normativa.ubicacion?.lng ?? LNG_DEFECTO;
  const dia = diaDelAnyo(mes);
  const horaSolar = localASolar(hora, lng, mes);
  const sol = posicionSolar(lat, dia, horaSolar);
  const oo = ortoYOcaso(lat, dia);
  const amanecerLocal = solarALocal(oo.amanecer, lng, mes);
  const atardecerLocal = solarALocal(oo.atardecer, lng, mes);

  useEffect(() => {
    if (!reproduciendo) return;
    const t = setInterval(
      () => setHora((h) => (h >= 23.75 ? 5 : Math.round((h + 0.25) * 4) / 4)),
      120,
    );
    return () => clearInterval(t);
  }, [reproduciendo]);

  const camaraOrbita: [number, number, number] = [
    dims.ancho * 0.9,
    Math.max(dims.ancho, dims.fondo) * 0.7,
    dims.fondo * 1.25,
  ];

  // Punto de partida del paseo: centro de la primera estancia de la planta
  // activa (o centro de la parcela), a altura de ojos sobre esa planta.
  const baseActiva =
    plantaActiva === 'sotano' ? -alturaPorPlanta : plantaActiva === 'baja' ? 0 : alturaPorPlanta;
  const primera = (plantas[plantaActiva] ?? [])[0];
  const camaraInterior: [number, number, number] = primera
    ? [
        primera.x + primera.ancho / 2 - dims.ancho / 2,
        baseActiva + ALTURA_OJOS,
        primera.y + primera.fondo / 2 - dims.fondo / 2,
      ]
    : [0, baseActiva + ALTURA_OJOS, 0];

  return (
    <div className="vista3d">
      <div className="vista3d-toolbar">
        <div className="selector-vista">
          <button className={modo === 'orbita' ? 'activa' : ''} onClick={() => setModo('orbita')}>
            🛰 Órbita
          </button>
          <button className={modo === 'interior' ? 'activa' : ''} onClick={() => setModo('interior')}>
            🚶 Interior
          </button>
        </div>
        <label className="control-sol">
          📅 {MESES[mes - 1]}
          <input type="range" min={1} max={12} value={mes} onChange={(e) => setMes(+e.target.value)} />
        </label>
        <label className="control-sol">
          🕐 {formatoHora(hora)}
          <input type="range" min={5} max={23.75} step={0.25} value={hora} onChange={(e) => setHora(+e.target.value)} />
        </label>
        <button
          className={reproduciendo ? 'activa' : ''}
          title="Animar el día completo"
          onClick={() => setReproduciendo((r) => !r)}
        >
          {reproduciendo ? '⏸' : '▶ día'}
        </button>
        <span className="dato-sol">
          🌅 {formatoHora(amanecerLocal)} · 🌇 {formatoHora(atardecerLocal)} ·
          ☀️ {oo.horasDeSol.toFixed(1)} h de sol
          {sol.elevacion > 0
            ? ` · elevación ${sol.elevacion.toFixed(0)}° · azimut ${sol.azimut.toFixed(0)}°`
            : ' · 🌙 noche'}
        </span>
      </div>
      <Canvas
        key={modo} // reinicia la cámara al cambiar de modo
        camera={{ position: modo === 'orbita' ? camaraOrbita : camaraInterior, fov: modo === 'orbita' ? 45 : 70 }}
        shadows
      >
        <Escena normativa={normativa} mes={mes} horaSolar={horaSolar} conJaula={modo === 'orbita'} />
        {modo === 'orbita' ? (
          <ControlesOrbita objetivo={[0, alturaPorPlanta / 2, 0]} />
        ) : (
          <ControlesInterior alturaOjos={baseActiva + ALTURA_OJOS} />
        )}
      </Canvas>
      <div className="vista3d-leyenda">
        {modo === 'orbita'
          ? `🟩 jaula = envolvente edificable hasta ${normativa.alturaMaxima} m · 🟡 arco = trayectoria solar del día · 🔺 rojo = norte · hora local de ${normativa.municipio}`
          : '🚶 Haz clic en la escena para capturar el ratón · WASD/flechas para andar · Esc para soltar · caminas por la ' +
            (plantaActiva === 'sotano' ? 'planta sótano' : plantaActiva === 'baja' ? 'planta baja' : 'primera planta')}
      </div>
    </div>
  );
}
