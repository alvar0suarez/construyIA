import { Canvas, useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import { BoxGeometry, EdgesGeometry } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PLANTAS } from '../domain/types';
import { tipoEstancia } from '../engine/catalogo';
import { dimensionesParcela, envolventeEdificable } from '../engine/geometria';
import type { NormativaMunicipal } from '../normativa/schema';
import { useStore } from '../state/store';

/**
 * Convención de ejes: plano (x, y) en metros → 3D (x, z); la altura es Y.
 * El origen 3D se centra en la parcela para que la órbita gire alrededor.
 */

function Controles({ objetivo }: { objetivo: [number, number, number] }) {
  const { camera, gl } = useThree();
  useEffect(() => {
    const controles = new OrbitControls(camera, gl.domElement);
    controles.target.set(...objetivo);
    controles.maxPolarAngle = Math.PI / 2 - 0.02; // no bajar del suelo
    controles.update();
    return () => controles.dispose();
  }, [camera, gl, objetivo]);
  return null;
}

export function Vista3D({ normativa }: { normativa: NormativaMunicipal }) {
  const parcela = useStore((s) => s.proyecto.parcela);
  const plantas = useStore((s) => s.proyecto.plantas);
  const alturaPorPlanta = useStore((s) => s.proyecto.alturaPorPlanta);

  const dims = dimensionesParcela(parcela);
  const envolvente = envolventeEdificable(parcela, normativa);
  const cx = dims.ancho / 2;
  const cz = dims.fondo / 2;

  const alturaPlanta = (plantaId: string): number => {
    if (plantaId === 'sotano') return -alturaPorPlanta;
    if (plantaId === 'baja') return 0;
    return alturaPorPlanta;
  };

  const camaraPos = useMemo<[number, number, number]>(
    () => [dims.ancho * 0.9, Math.max(dims.ancho, dims.fondo) * 0.7, dims.fondo * 1.25],
    [dims.ancho, dims.fondo],
  );

  const jaula = useMemo(
    () =>
      new EdgesGeometry(
        new BoxGeometry(envolvente.ancho, normativa.alturaMaxima, envolvente.fondo),
      ),
    [envolvente.ancho, envolvente.fondo, normativa.alturaMaxima],
  );

  return (
    <div className="vista3d">
      <Canvas camera={{ position: camaraPos, fov: 45 }} shadows>
        <color attach="background" args={['#eef1f5']} />
        <ambientLight intensity={0.7} />
        <directionalLight
          position={[dims.ancho, 25, dims.fondo * 0.3]}
          intensity={1.1}
          castShadow
        />
        <group position={[-cx, 0, -cz]}>
          {/* Parcela */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, -0.01, cz]} receiveShadow>
            <planeGeometry args={[dims.ancho, dims.fondo]} />
            <meshStandardMaterial color="#cfe0c3" />
          </mesh>

          {/* Envolvente edificable (jaula hasta la altura máxima) */}
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

          {/* Estancias extruidas por planta */}
          {PLANTAS.flatMap((p) =>
            (plantas[p.id] ?? []).map((e) => {
              const def = tipoEstancia(e.tipo);
              const esPlana = def.id === 'piscina' || def.id === 'terraza';
              const alto = esPlana ? 0.15 : alturaPorPlanta * 0.92;
              const base = alturaPlanta(p.id);
              return (
                <mesh
                  key={e.id}
                  position={[e.x + e.ancho / 2, base + alto / 2, e.y + e.fondo / 2]}
                  castShadow
                >
                  <boxGeometry args={[e.ancho, alto, e.fondo]} />
                  <meshStandardMaterial
                    color={def.id === 'piscina' ? '#4fc3f7' : def.color}
                    transparent={!p.sobreRasante}
                    opacity={p.sobreRasante ? 1 : 0.45}
                  />
                </mesh>
              );
            }),
          )}

          {/* Marca del frente (calle) */}
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={
              parcela.frente === 'norte' ? [cx, 0.01, -1]
              : parcela.frente === 'sur' ? [cx, 0.01, dims.fondo + 1]
              : parcela.frente === 'oeste' ? [-1, 0.01, cz]
              : [dims.ancho + 1, 0.01, cz]
            }
          >
            <planeGeometry
              args={
                parcela.frente === 'norte' || parcela.frente === 'sur'
                  ? [dims.ancho, 2]
                  : [2, dims.fondo]
              }
            />
            <meshStandardMaterial color="#9e9e9e" />
          </mesh>
        </group>
        <Controles objetivo={[0, alturaPorPlanta / 2, 0]} />
      </Canvas>
      <div className="vista3d-leyenda">
        🟩 jaula = envolvente edificable hasta altura máx. ({normativa.alturaMaxima} m) ·
        arrastra para orbitar · rueda para zoom
      </div>
    </div>
  );
}
