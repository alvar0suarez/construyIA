import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Estancia,
  Hueco,
  Lado,
  Mueble,
  Parcela,
  PlantaId,
  Proyecto,
} from '../domain/types';
import type { NormativaMunicipal } from '../normativa/schema';
import {
  getNormativa,
  plantillaPersonalizada,
  type AjustesNormativa,
} from '../normativa/registry';
import { tipoEstancia } from '../engine/catalogo';
import { dimensionesParcela, envolventeEdificable } from '../engine/geometria';
import { encajarEn, envolvente, separar } from '../engine/saneado';

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
  /** En el plano 2D, recorta la parte solapada de las estancias (siluetas en
   *  L en vez de cuadrados montados). */
  recortarSolapes: boolean;
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
  setRecortarSolapes: (v: boolean) => void;

  /** Guarda un punto de restauración ANTES de una mutación o gesto de arrastre. */
  marcarHistoria: () => void;
  deshacer: () => void;
  rehacer: () => void;

  addEstancia: (tipoId: string) => void;
  /** Añade una estancia con planta y dimensiones concretas (acciones de IA). */
  addEstanciaConfig: (config: {
    tipoId: string;
    planta: PlantaId;
    ancho?: number;
    fondo?: number;
  }) => void;
  updateEstancia: (id: string, cambios: Partial<Estancia>) => void;
  removeEstancia: (id: string) => void;
  duplicarEstancia: (id: string) => void;

  addHueco: (estanciaId: string, tipo: Hueco['tipo']) => void;
  updateHueco: (estanciaId: string, huecoId: string, parcial: Partial<Hueco>) => void;
  removeHueco: (estanciaId: string, huecoId: string) => void;

  resetProyecto: () => void;
  importProyecto: (p: Proyecto) => void;
  /** Reemplaza el boceto con una vivienda completa generada por IA. */
  aplicarDiseno: (diseno: DisenoAplicable) => void;
  /** Coloca el mobiliario interior generado por IA. */
  aplicarMuebles: (
    muebles: Array<{ tipo: string; planta: PlantaId; x: number; y: number; ancho: number; fondo: number }>,
  ) => void;
}

/** Diseño completo aplicable (lo que devuelve la IA, ya validado). */
export interface DisenoAplicable {
  estancias: Array<{
    tipo: string;
    planta: PlantaId;
    x: number;
    y: number;
    ancho: number;
    fondo: number;
    alturaPlantas?: number;
    huecos?: Array<{
      tipo: Hueco['tipo'];
      lado: Lado;
      offset: number;
      ancho: number;
      alto: number;
      antepecho: number;
    }>;
  }>;
  alturaPorPlanta?: number;
  cubierta?: { tipo: 'plana' | 'inclinada'; pendiente?: number };
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
      recortarSolapes: true,
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
      setRecortarSolapes: (recortarSolapes) => set({ recortarSolapes }),

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

      addEstanciaConfig: ({ tipoId, planta, ancho, fondo }) =>
        set((s) => {
          const def = tipoEstancia(tipoId);
          const dims = dimensionesParcela(s.proyecto.parcela);
          const w = ancho ?? def.defaultW;
          const f = fondo ?? def.defaultD;
          const nueva: Estancia = {
            id: nuevoId('e'),
            tipo: tipoId,
            x: Math.max(0, Math.min(dims.ancho - w, dims.ancho / 2 - w / 2)),
            y: Math.max(0, Math.min(dims.fondo - f, dims.fondo / 2 - f / 2)),
            ancho: w,
            fondo: f,
            huecos: [],
          };
          const plantas = { ...s.proyecto.plantas };
          plantas[planta] = [...plantas[planta], nueva];
          return {
            pasado: [...s.pasado.slice(-MAX_HISTORIA + 1), s.proyecto],
            futuro: [],
            proyecto: { ...s.proyecto, plantas },
            plantaActiva: planta,
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

      aplicarDiseno: (diseno) =>
        set((s) => {
          // Se encajan las estancias dentro de la envolvente edificable (ya
          // descontados los retranqueos), así el diseño de la IA respeta los
          // límites aunque haya colocado algo un poco fuera.
          const env = envolventeEdificable(s.proyecto.parcela, get().normativaActiva());
          const plantas: Proyecto['plantas'] = { sotano: [], baja: [], primera: [] };
          for (const e of diseno.estancias) {
            const destino = plantas[e.planta];
            if (!destino) continue;
            const r = encajarEn(
              { x: e.x, y: e.y, ancho: Math.max(0.5, e.ancho), fondo: Math.max(0.5, e.fondo) },
              env,
            );
            const huecos: Hueco[] = (e.huecos ?? []).map((h) => ({
              id: nuevoId('h'),
              tipo: h.tipo,
              lado: h.lado,
              offset: h.offset,
              ancho: h.ancho,
              alto: h.alto,
              antepecho: h.antepecho,
            }));
            destino.push({
              id: nuevoId('e'),
              tipo: e.tipo,
              x: r.x,
              y: r.y,
              ancho: r.ancho,
              fondo: r.fondo,
              ...(e.alturaPlantas && e.alturaPlantas > 1 ? { alturaPlantas: e.alturaPlantas } : {}),
              huecos,
            });
          }
          return {
            pasado: [...s.pasado.slice(-MAX_HISTORIA + 1), s.proyecto],
            futuro: [],
            proyecto: {
              ...s.proyecto,
              plantas,
              // Una casa nueva descarta el mobiliario anterior.
              muebles: undefined,
              alturaPorPlanta: diseno.alturaPorPlanta ?? s.proyecto.alturaPorPlanta,
              cubierta: diseno.cubierta
                ? {
                    tipo: diseno.cubierta.tipo,
                    pendiente:
                      diseno.cubierta.pendiente ?? s.proyecto.cubierta?.pendiente ?? 30,
                  }
                : s.proyecto.cubierta,
            },
            plantaActiva: 'baja',
            seleccionId: null,
            seleccionHuecoId: null,
          };
        }),

      aplicarMuebles: (muebles) =>
        set((s) => {
          const dims = dimensionesParcela(s.proyecto.parcela);
          const parcelaRect = { x: 0, y: 0, ancho: dims.ancho, fondo: dims.fondo };
          // Agrupa por planta con id y tamaños saneados.
          const grupos: Record<PlantaId, Mueble[]> = { sotano: [], baja: [], primera: [] };
          for (const mu of muebles) {
            const destino = grupos[mu.planta];
            if (!destino) continue;
            destino.push({
              id: nuevoId('m'),
              tipo: mu.tipo,
              x: mu.x,
              y: mu.y,
              ancho: Math.max(0.2, Math.min(mu.ancho, dims.ancho)),
              fondo: Math.max(0.2, Math.min(mu.fondo, dims.fondo)),
            });
          }
          // Cada mueble se encaja dentro de la huella de la casa en su planta
          // (para que no floten en el jardín) y se separan los que se montan.
          const porPlanta: Record<PlantaId, Mueble[]> = { sotano: [], baja: [], primera: [] };
          for (const p of Object.keys(grupos) as PlantaId[]) {
            const limites = envolvente(s.proyecto.plantas[p] ?? []) ?? parcelaRect;
            porPlanta[p] = separar(grupos[p], limites);
          }
          return {
            pasado: [...s.pasado.slice(-MAX_HISTORIA + 1), s.proyecto],
            futuro: [],
            proyecto: { ...s.proyecto, muebles: porPlanta },
          };
        }),
    }),
    {
      name: 'construyia-proyecto',
      partialize: (s) => ({
        proyecto: s.proyecto,
        normativaPersonalizada: s.normativaPersonalizada,
        recortarSolapes: s.recortarSolapes,
      }),
    },
  ),
);
