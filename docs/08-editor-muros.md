# 08 — Exploración: ¿cómo debería editarse la vivienda?

Feedback del propietario (2026-07-18): estudiar una forma más libre de
modificar las paredes — tipo drag & drop o "ir construyendo" — además del
modelo actual de estancias rectangulares.

## Opciones sobre la mesa

### A. Estancias-rectángulo (modelo actual)
Cada estancia es un rectángulo con 4 paredes propias.

- ✅ Facilísimo de usar y de validar (retranqueos, ocupación, superficies).
- ✅ El boceto va rapidísimo: añadir → arrastrar → listo.
- ❌ Dos estancias contiguas duplican la pared entre ellas (se ve doble muro
  en 3D si no coinciden exactamente).
- ❌ No permite plantas en L/diagonales dentro de una estancia.

### B. Dibujo de muros libre (estilo Sweet Home 3D / AutoCAD)
El usuario dibuja segmentos de muro; las habitaciones emergen de los
recintos cerrados.

- ✅ Máxima libertad (plantas en L, muros curvos en el futuro).
- ❌ Curva de aprendizaje alta; fácil dejar recintos sin cerrar.
- ❌ La detección de habitaciones y el cómputo de superficies se complica
  mucho (grafos de muros, detección de ciclos).

### C. Híbrido por fases (propuesta) ⭐
1. **Snapping magnético entre estancias** (corto plazo): al arrastrar una
   estancia cerca de otra, se pega borde con borde; la pared compartida se
   funde en una sola en el 3D y habilita las reglas de adyacencia
   ("cocina y comedor comparten pared", puertas entre estancias).
2. **Estancias poligonales** (medio plazo): la estancia sigue siendo "una
   habitación" (se mantiene toda la validación), pero su contorno se puede
   editar por vértices para hacer L y recortes.
3. **Reevaluar B** solo si 1+2 se quedan cortas con usuarios reales.

La clave: no perder la sencillez del boceto (nuestra ventaja frente a un
CAD) mientras ganamos expresividad. El motor de cumplimiento ya trabaja
con `Rect`; la fase 2 exigirá generalizarlo a polígonos (área, contención
en la envolvente, unión) — la geometría de `engine/geometria.ts` está
aislada precisamente para eso.

## Relación con la vista interior

La cámara en primera persona (ya implementada: modo Interior, WASD) es el
"renderizado desde dentro" que pedía el feedback. Mejoras previstas:
colisiones con muros, altura de techos visible (techo opcional), materiales
por estancia, y joystick táctil para móvil.
