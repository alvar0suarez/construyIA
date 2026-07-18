# 02 — Hoja de ruta

## F0 — MVP personal (fase actual)

**Objetivo**: sustituir el HTML original por una app mantenible en este
repositorio, útil para comparar parcelas y bocetar.

- [x] Documentación de visión, arquitectura y modelo de normativa.
- [x] Proyecto Vite + React + TypeScript con tests (Vitest).
- [x] Modelo de datos de normativa municipal con nivel de verificación y fuentes.
- [x] Normativa Galapagar U3 (UA4) — verificada con la app original / NNSS.
- [x] Normativa Las Rozas NZ-3 — borrador, pendiente de verificar (portal municipal caído el 2026-07-18).
- [x] Normativa personalizada editable en la UI.
- [x] Editor de parcela (4 lados, frente/acceso) con envolvente edificable dibujada.
- [x] Editor de plano 2D: estancias por planta (sótano/baja/primera), catálogo de tipos con superficies mínimas, arrastrar/redimensionar.
- [x] Motor de cumplimiento: retranqueos, ocupación, edificabilidad, altura, nº de plantas.
- [x] Recomendaciones: superficies mínimas por estancia, ratio dormitorios/baños, plazas de garaje, escalera si hay planta alta.
- [x] Persistencia en localStorage + exportar/importar proyecto JSON (para compartir con la familia).
- [x] Vista 3D del volumen (three.js): estancias extruidas por planta, sótano translúcido y "jaula" de la envolvente edificable hasta la altura máxima.
- [x] Página de **cobertura de normativa**: mapa de España (provincias, es-atlas/IGN) con los municipios cargados, y tabla de auditoría pública (municipio, zona, estado de verificación, fecha de revisión, fuentes).
- [x] Retranqueo de piscina a linderos como parámetro opcional de normativa.
- [x] CI en GitHub Actions (tests + build).
- [ ] Parcelas no rectangulares (polígono libre de N vértices).
- [ ] Despliegue automático (GitHub Pages) para compartir por URL.

## F1 — Multi-municipio + IA

**Objetivo**: que funcione para cualquier municipio de España.

- [ ] Backend ligero (API) + base de datos de normativas.
- [ ] Esquema de normativa ampliado: grados/subzonas por ordenanza, condiciones
      estéticas (cubierta, materiales de fachada), cómputo de edificabilidad
      (qué computa y qué no: sótanos, porches, garajes...).
- [ ] **Subida de PDF de normativa** → extracción con IA (Claude) → parámetros
      estructurados marcados como `interpretada-ia` hasta revisión humana.
- [ ] Cobertura inicial: municipios del noroeste de Madrid (Galapagar, Las
      Rozas, Torrelodones, Collado Villalba, Guadarrama...).
- [ ] Cuentas de usuario y proyectos en la nube; compartir por enlace.
- [ ] Chat de consulta sobre la normativa cargada ("¿puedo hacer un porche de
      20 m²?") con citas al artículo concreto.

## F2 — Producto vendible

**Objetivo**: útil para autopromotores y profesionales; modelo de negocio.

- [ ] Catálogo de materiales y soluciones constructivas actualizado
      (aislamiento, estructura, fachadas, cubiertas) con orientación de
      precio y recomendaciones según clima/zona.
- [ ] Estimación de presupuesto orientativo por m² según calidades.
- [ ] Modo arquitecto: exportar memoria de parámetros urbanísticos, DXF/IFC
      básico del boceto.
- [ ] Comparador de parcelas (misma casa en N parcelas/municipios).
- [ ] Cumplimiento CTE básico (habitabilidad, accesibilidad) como capa extra
      de validación.
- [ ] Modelo de negocio: freemium (1 proyecto gratis), suscripción pro para
      profesionales, API para portales inmobiliarios.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Normativa desactualizada → decisiones erróneas | Nivel de verificación visible + fecha + fuente en cada dato; disclaimer permanente |
| Interpretación IA incorrecta de PDFs | Marcar como `interpretada-ia`, mostrar el texto fuente junto al parámetro, revisión humana |
| Alcance excesivo (editor CAD completo) | Mantener el editor en "boceto": rectángulos + snapping; el CAD es del arquitecto |
| Responsabilidad legal | Términos claros: herramienta de ayuda a decisión, nunca proyecto técnico |
