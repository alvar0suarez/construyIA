# 05 — Inventario funcional de la app original ("Casa Diseño")

La app original era un único HTML con un bundle de producción (React +
Three.js) sin código fuente disponible. Este inventario se extrajo por
ingeniería inversa del bundle y sirve como referencia de paridad funcional.

## Funcionalidades detectadas

### Parcela
- Dimensiones de los 4 lados de la parcela (m), con ajuste automático de
  geometría para parcelas no rectangulares ("podrás afinar los vértices
  después").
- Selección de frente/acceso a la parcela y recolocación según acceso.

### Normativa
- Normativa precargada: "Ordenanza Residencial Unifamiliar U3 (UA4)" con:
  `retranqueos {frente: 4, fondo: 3, lateral_izq: 3, lateral_der: 3}`,
  `alturaMax: 6.5`, `ocupacionMax: 50 %`, `edificabilidadMax: 0.5`,
  `plantasMax: 2`.
- Notas estéticas: cubierta inclinada 20–45°, teja cerámica o pizarra, sin
  ladrillo visto, sin carpintería de aluminio color natural, garaje bajo
  rasante no computa edificabilidad (Art. 3.11.2.2.A).

### Plantas y estancias
- Plantas: sótano ("bajo rasante"), PLANTA BAJA, PRIMERA PLANTA.
- Catálogo de estancias con icono, color, superficie mínima y dimensiones por
  defecto. Detectadas: Sala de estar (mín 16 m², 4×4), Comedor (mín 12 m²,
  3×4), Cocina (mín 10 m², 3×3), Dorm. Principal (mín 14 m², 4×4),
  Dormitorio (mín 10 m², 3×4), baño/aseo, terraza (mín 9 m², 3×3),
  garaje, pérgola/porche abierto, mueble de cocina (0.9×0.9).
- Tipos de garaje: "integrado en planta" (computa edificabilidad y
  ocupación), y otros (bajo rasante, exento...).
- Escaleras: recta (1.2×3), en L (2.4×...), etc.
- Muebles decorativos: sofá (2.1×0.9), cama individual...

### Validaciones normativas
- Estancias que invaden la zona de retranqueo (con recuento).
- Ocupación (%) vs máximo.
- Edificabilidad (m²/m²) vs máximo.
- Altura de edificación vs máximo.

### Recomendaciones de diseño
- Plazas de garaje recomendadas: 1,5 por cada 100 m² construidos.
- "X dormitorios pero solo 1 baño."
- "El dormitorio principal no tiene baño en suite."
- "Ningún dormitorio tiene un baño cercano (<3 m)."
- "No hay ningún baño ni aseo registrado."
- "La cocina y el comedor no comparten pared."
- "Hay primera planta pero ninguna escalera configurada."
- "El garaje no está situado en el perímetro de la parcela."

### Visualización
- Editor 2D de plano por planta.
- Vista 3D (Three.js) del volumen.
- Resumen de métricas: superficie de parcela, ocupación, edificabilidad,
  altura, plazas de garaje recomendadas.

## Estado de paridad en la nueva app (F0)

| Funcionalidad | Estado |
|---|---|
| Parcela 4 lados + frente | ✅ Portada |
| Normativa Galapagar U3 | ✅ Portada (como datos declarativos) |
| Plantas sótano/baja/primera | ✅ Portada |
| Catálogo de estancias con mínimos | ✅ Portada (simplificado, sin muebles) |
| Validaciones normativas | ✅ Portadas y ampliadas (parcela mínima, plantas máx.) |
| Recomendaciones de diseño | ✅ Portadas parcialmente (garaje, baños, escalera, mínimos) |
| Adyacencia cocina-comedor, baño <3 m, en-suite | ⏳ Pendiente |
| Parcela no rectangular | ⏳ Pendiente (roadmap) |
| Vista 3D | ⏳ Pendiente (roadmap) |
| Muebles decorativos | ⏳ Pendiente (baja prioridad) |
