import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Estancia, Parcela, PlantaId, Proyecto, Rect } from '../domain/types';
import type { NormativaMunicipal } from '../normativa/schema';
import { getNormativa, plantillaPersonalizada } from '../normativa/registry';
import { tipoEstancia } from '../engine/catalogo';
import { dimensionesParcela } from '../engine/geometria';

function proyectoNuevo(): Proyecto {
  return {
    schemaVersion: 1,
    nombre: 'Mi casa',
    normativaId: 'galapagar-u3',
    parcela: { norte: 25, sur: 25, este: 32, oeste: 32, frente: 'sur' },
    plantas: { sotano: [], baja: [], primera: [] },
    alturaPorPlanta: 3,
  };
}

let contador = 1;
const nuevoId = () => `e${Date.now().toString(36)}-${contador++}`;

interface AppState {
  proyecto: Proyecto;
  normativaPersonalizada: NormativaMunicipal;
  plantaActiva: PlantaId;
  seleccionId: string | null;

  normativaActiva: () => NormativaMunicipal;
  setNombre: (nombre: string) => void;
  setParcela: (parcial: Partial<Parcela>) => void;
  setNormativaId: (id: string) => void;
  setPersonalizada: (parcial: Partial<NormativaMunicipal>) => void;
  setAlturaPorPlanta: (h: number) => void;
  setPlantaActiva: (p: PlantaId) => void;
  setSeleccion: (id: string | null) => void;
  addEstancia: (tipoId: string) => void;
  updateEstancia: (id: string, rect: Partial<Rect>) => void;
  removeEstancia: (id: string) => void;
  resetProyecto: () => void;
  importProyecto: (p: Proyecto) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      proyecto: proyectoNuevo(),
      normativaPersonalizada: { ...plantillaPersonalizada },
      plantaActiva: 'baja',
      seleccionId: null,

      normativaActiva: () =>
        getNormativa(get().proyecto.normativaId, get().normativaPersonalizada),

      setNombre: (nombre) =>
        set((s) => ({ proyecto: { ...s.proyecto, nombre } })),

      setParcela: (parcial) =>
        set((s) => ({
          proyecto: { ...s.proyecto, parcela: { ...s.proyecto.parcela, ...parcial } },
        })),

      setNormativaId: (normativaId) =>
        set((s) => ({ proyecto: { ...s.proyecto, normativaId } })),

      setPersonalizada: (parcial) =>
        set((s) => ({
          normativaPersonalizada: { ...s.normativaPersonalizada, ...parcial },
        })),

      setAlturaPorPlanta: (alturaPorPlanta) =>
        set((s) => ({ proyecto: { ...s.proyecto, alturaPorPlanta } })),

      setPlantaActiva: (plantaActiva) => set({ plantaActiva, seleccionId: null }),

      setSeleccion: (seleccionId) => set({ seleccionId }),

      addEstancia: (tipoId) =>
        set((s) => {
          const def = tipoEstancia(tipoId);
          const dims = dimensionesParcela(s.proyecto.parcela);
          const nueva: Estancia = {
            id: nuevoId(),
            tipo: tipoId,
            x: Math.max(0, dims.ancho / 2 - def.defaultW / 2),
            y: Math.max(0, dims.fondo / 2 - def.defaultD / 2),
            ancho: def.defaultW,
            fondo: def.defaultD,
          };
          const plantas = { ...s.proyecto.plantas };
          plantas[s.plantaActiva] = [...plantas[s.plantaActiva], nueva];
          return { proyecto: { ...s.proyecto, plantas }, seleccionId: nueva.id };
        }),

      updateEstancia: (id, rect) =>
        set((s) => {
          const plantas = { ...s.proyecto.plantas };
          plantas[s.plantaActiva] = plantas[s.plantaActiva].map((e) =>
            e.id === id ? { ...e, ...rect } : e,
          );
          return { proyecto: { ...s.proyecto, plantas } };
        }),

      removeEstancia: (id) =>
        set((s) => {
          const plantas = { ...s.proyecto.plantas };
          for (const k of Object.keys(plantas) as PlantaId[]) {
            plantas[k] = plantas[k].filter((e) => e.id !== id);
          }
          return {
            proyecto: { ...s.proyecto, plantas },
            seleccionId: s.seleccionId === id ? null : s.seleccionId,
          };
        }),

      resetProyecto: () => set({ proyecto: proyectoNuevo(), seleccionId: null }),

      importProyecto: (p) => {
        if (p?.schemaVersion !== 1 || !p.parcela || !p.plantas) {
          throw new Error('Fichero de proyecto no válido');
        }
        set({ proyecto: p, seleccionId: null, plantaActiva: 'baja' });
      },
    }),
    { name: 'construyia-proyecto' },
  ),
);
