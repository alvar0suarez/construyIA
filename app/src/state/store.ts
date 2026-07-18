import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Estancia,
  Hueco,
  Parcela,
  PlantaId,
  Proyecto,
  Rect,
} from '../domain/types';
import type { NormativaMunicipal } from '../normativa/schema';
import {
  getNormativa,
  plantillaPersonalizada,
  type AjustesNormativa,
} from '../normativa/registry';
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
    cubierta: { tipo: 'inclinada', pendiente: 30 },
  };
}

let contador = 1;
const nuevoId = (prefijo: string) =>
  `${prefijo}${Date.now().toString(36)}-${contador++}`;

const MAX_HISTORIA = 50;

interface AppState {
  proyecto: Proyecto;
  normativaPersonalizada: NormativaMunicipal;
  plantaActiva: PlantaId;
  seleccionId: string | null;
  seleccionHuecoId: string | null;
  pasado: Proyecto[];
  futuro: Proyecto[];

  normativaActiva: () => NormativaMunicipal;
  setNombre: (nombre: string) => void;
  setParcela: (parcial: Partial<Parcela>) => void;
  setNormativaId: (id: string) => void;
  setPersonalizada: (parcial: Partial<NormativaMunicipal>) => void;
  /** Sobrescribe parámetros de la normativa predefinida seleccionada. */
  setAjusteNormativa: (parcial: AjustesNormativa) => void;
  /** Vuelve a los valores de la fuente para la normativa seleccionada. */
  resetAjustesNormativa: () => void;
  setAlturaPorPlanta: (h: number) => void;
  setCubierta: (c: Proyecto['cubierta']) => void;
  setPlantaActiva: (p: PlantaId) => void;
  setSeleccion: (id: string | null) => void;
  setSeleccionHueco: (id: string | null) => void;

  /** Guarda un punto de restauración ANTES de una mutación o gesto de arrastre. */
  marcarHistoria: () => void;
  deshacer: () => void;
  rehacer: () => void;

  addEstancia: (tipoId: string) => void;
  updateEstancia: (id: string, rect: Partial<Rect>) => void;
  removeEstancia: (id: string) => void;
  duplicarEstancia: (id: string) => void;

  addHueco: (estanciaId: string, tipo: Hueco['tipo']) => void;
  updateHueco: (estanciaId: string, huecoId: string, parcial: Partial<Hueco>) => void;
  removeHueco: (estanciaId: string, huecoId: string) => void;

  resetProyecto: () => void;
  importProyecto: (p: Proyecto) => void;
}

/** Devuelve las plantas con la estancia indicada transformada. */
function conEstancia(
  proyecto: Proyecto,
  estanciaId: string,
  fn: (e: Estancia) => Estancia,
): Proyecto['plantas'] {
  const plantas = { ...proyecto.plantas };
  for (const k of Object.keys(plantas) as PlantaId[]) {
    plantas[k] = plantas[k].map((e) => (e.id === estanciaId ? fn(e) : e));
  }
  return plantas;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      proyecto: proyectoNuevo(),
      normativaPersonalizada: { ...plantillaPersonalizada },
      plantaActiva: 'baja',
      seleccionId: null,
      seleccionHuecoId: null,
      pasado: [],
      futuro: [],

      normativaActiva: () => {
        const p = get().proyecto;
        return getNormativa(
          p.normativaId,
          get().normativaPersonalizada,
          p.ajustesNormativa?.[p.normativaId] as AjustesNormativa | undefined,
        );
      },

      setNombre: (nombre) =>
        set((s) => ({ proyecto: { ...s.proyecto, nombre } })),

      setParcela: (parcial) =>
        set((s) => ({
          pasado: [...s.pasado.slice(-MAX_HISTORIA + 1), s.proyecto],
          futuro: [],
          proyecto: { ...s.proyecto, parcela: { ...s.proyecto.parcela, ...parcial } },
        })),

      setNormativaId: (normativaId) =>
        set((s) => ({ proyecto: { ...s.proyecto, normativaId } })),

      setPersonalizada: (parcial) =>
        set((s) => ({
          normativaPersonalizada: { ...s.normativaPersonalizada, ...parcial },
        })),

      setAjusteNormativa: (parcial) =>
        set((s) => {
          const id = s.proyecto.normativaId;
          const previos = (s.proyecto.ajustesNormativa?.[id] ?? {}) as AjustesNormativa;
          const nuevos: AjustesNormativa = {
            ...previos,
            ...parcial,
            ...(parcial.retranqueos
              ? { retranqueos: { ...previos.retranqueos, ...parcial.retranqueos } as AjustesNormativa['retranqueos'] }
              : {}),
          };
          return {
            proyecto: {
              ...s.proyecto,
              ajustesNormativa: { ...s.proyecto.ajustesNormativa, [id]: nuevos },
            },
          };
        }),

      resetAjustesNormativa: () =>
        set((s) => {
          const ajustes = { ...s.proyecto.ajustesNormativa };
          delete ajustes[s.proyecto.normativaId];
          return { proyecto: { ...s.proyecto, ajustesNormativa: ajustes } };
        }),

      setAlturaPorPlanta: (alturaPorPlanta) =>
        set((s) => ({ proyecto: { ...s.proyecto, alturaPorPlanta } })),

      setCubierta: (cubierta) =>
        set((s) => ({ proyecto: { ...s.proyecto, cubierta } })),

      setPlantaActiva: (plantaActiva) =>
        set({ plantaActiva, seleccionId: null, seleccionHuecoId: null }),

      setSeleccion: (seleccionId) => set({ seleccionId, seleccionHuecoId: null }),
      setSeleccionHueco: (seleccionHuecoId) => set({ seleccionHuecoId }),

      marcarHistoria: () =>
        set((s) => ({
          pasado: [...s.pasado.slice(-MAX_HISTORIA + 1), s.proyecto],
          futuro: [],
        })),

      deshacer: () =>
        set((s) => {
          const anterior = s.pasado[s.pasado.length - 1];
          if (!anterior) return s;
          return {
            proyecto: anterior,
            pasado: s.pasado.slice(0, -1),
            futuro: [s.proyecto, ...s.futuro].slice(0, MAX_HISTORIA),
            seleccionId: null,
            seleccionHuecoId: null,
          };
        }),

      rehacer: () =>
        set((s) => {
          const siguiente = s.futuro[0];
          if (!siguiente) return s;
          return {
            proyecto: siguiente,
            futuro: s.futuro.slice(1),
            pasado: [...s.pasado, s.proyecto].slice(-MAX_HISTORIA),
            seleccionId: null,
            seleccionHuecoId: null,
          };
        }),

      addEstancia: (tipoId) =>
        set((s) => {
          const def = tipoEstancia(tipoId);
          const dims = dimensionesParcela(s.proyecto.parcela);
          const nueva: Estancia = {
            id: nuevoId('e'),
            tipo: tipoId,
            x: Math.max(0, dims.ancho / 2 - def.defaultW / 2),
            y: Math.max(0, dims.fondo / 2 - def.defaultD / 2),
            ancho: def.defaultW,
            fondo: def.defaultD,
            huecos: [],
          };
          const plantas = { ...s.proyecto.plantas };
          plantas[s.plantaActiva] = [...plantas[s.plantaActiva], nueva];
          return {
            pasado: [...s.pasado.slice(-MAX_HISTORIA + 1), s.proyecto],
            futuro: [],
            proyecto: { ...s.proyecto, plantas },
            seleccionId: nueva.id,
            seleccionHuecoId: null,
          };
        }),

      updateEstancia: (id, rect) =>
        set((s) => ({
          proyecto: {
            ...s.proyecto,
            plantas: conEstancia(s.proyecto, id, (e) => ({ ...e, ...rect })),
          },
        })),

      removeEstancia: (id) =>
        set((s) => {
          const plantas = { ...s.proyecto.plantas };
          for (const k of Object.keys(plantas) as PlantaId[]) {
            plantas[k] = plantas[k].filter((e) => e.id !== id);
          }
          return {
            pasado: [...s.pasado.slice(-MAX_HISTORIA + 1), s.proyecto],
            futuro: [],
            proyecto: { ...s.proyecto, plantas },
            seleccionId: s.seleccionId === id ? null : s.seleccionId,
            seleccionHuecoId: null,
          };
        }),

      duplicarEstancia: (id) =>
        set((s) => {
          const original = s.proyecto.plantas[s.plantaActiva].find((e) => e.id === id);
          if (!original) return s;
          const dims = dimensionesParcela(s.proyecto.parcela);
          const copia: Estancia = {
            ...original,
            id: nuevoId('e'),
            x: Math.min(original.x + 0.5, Math.max(0, dims.ancho - original.ancho)),
            y: Math.min(original.y + 0.5, Math.max(0, dims.fondo - original.fondo)),
            huecos: (original.huecos ?? []).map((h) => ({ ...h, id: nuevoId('h') })),
          };
          const plantas = { ...s.proyecto.plantas };
          plantas[s.plantaActiva] = [...plantas[s.plantaActiva], copia];
          return {
            pasado: [...s.pasado.slice(-MAX_HISTORIA + 1), s.proyecto],
            futuro: [],
            proyecto: { ...s.proyecto, plantas },
            seleccionId: copia.id,
            seleccionHuecoId: null,
          };
        }),

      addHueco: (estanciaId, tipo) =>
        set((s) => {
          const nuevo: Hueco =
            tipo === 'ventana'
              ? { id: nuevoId('h'), tipo, lado: 'sur', offset: 0.5, ancho: 1.2, alto: 1.2, antepecho: 1 }
              : { id: nuevoId('h'), tipo, lado: 'sur', offset: 0.5, ancho: 0.9, alto: 2.1, antepecho: 0 };
          return {
            pasado: [...s.pasado.slice(-MAX_HISTORIA + 1), s.proyecto],
            futuro: [],
            proyecto: {
              ...s.proyecto,
              plantas: conEstancia(s.proyecto, estanciaId, (e) => ({
                ...e,
                huecos: [...(e.huecos ?? []), nuevo],
              })),
            },
            seleccionHuecoId: nuevo.id,
          };
        }),

      updateHueco: (estanciaId, huecoId, parcial) =>
        set((s) => ({
          proyecto: {
            ...s.proyecto,
            plantas: conEstancia(s.proyecto, estanciaId, (e) => ({
              ...e,
              huecos: (e.huecos ?? []).map((h) =>
                h.id === huecoId ? { ...h, ...parcial } : h,
              ),
            })),
          },
        })),

      removeHueco: (estanciaId, huecoId) =>
        set((s) => ({
          pasado: [...s.pasado.slice(-MAX_HISTORIA + 1), s.proyecto],
          futuro: [],
          proyecto: {
            ...s.proyecto,
            plantas: conEstancia(s.proyecto, estanciaId, (e) => ({
              ...e,
              huecos: (e.huecos ?? []).filter((h) => h.id !== huecoId),
            })),
          },
          seleccionHuecoId:
            s.seleccionHuecoId === huecoId ? null : s.seleccionHuecoId,
        })),

      resetProyecto: () =>
        set((s) => ({
          pasado: [...s.pasado.slice(-MAX_HISTORIA + 1), s.proyecto],
          futuro: [],
          proyecto: proyectoNuevo(),
          seleccionId: null,
          seleccionHuecoId: null,
        })),

      importProyecto: (p) => {
        if (p?.schemaVersion !== 1 || !p.parcela || !p.plantas) {
          throw new Error('Fichero de proyecto no válido');
        }
        set((s) => ({
          pasado: [...s.pasado.slice(-MAX_HISTORIA + 1), s.proyecto],
          futuro: [],
          proyecto: p,
          seleccionId: null,
          seleccionHuecoId: null,
          plantaActiva: 'baja',
        }));
      },
    }),
    {
      name: 'construyia-proyecto',
      partialize: (s) => ({
        proyecto: s.proyecto,
        normativaPersonalizada: s.normativaPersonalizada,
      }),
    },
  ),
);
