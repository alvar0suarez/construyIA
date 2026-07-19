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
- [x] Despliegue automático (GitHub Pages) para compartir por URL (workflow
      listo; se activa al hacer merge a `main`).
- [ ] Cotejo sistemático de Galapagar U3 contra las NNSS para pasarla a `contrastada`.

## F0.5 — Editor potente (entre el MVP y el multi-municipio)

**Objetivo**: que la herramienta de diseño "se sienta profesional" sin dejar
de ser fácil.

- [x] **Huecos**: puertas y ventanas colocables en las paredes de cada
      estancia (pared, posición, ancho, alto, antepecho), editables en el
      plano 2D (arrastre sobre la pared) y en el inspector, con agujeros
      reales y cristales en el 3D.
- [x] **Vista interior en primera persona**: clic para capturar el ratón,
      WASD/flechas para caminar por la planta activa, con la luz entrando
      por los huecos. (Pendiente: joystick virtual para móvil.)
- [x] **Orientación solar**: sol calculado por latitud del municipio, mes y
      hora (declinación + ángulo horario), con sombras en tiempo real y
      controles de mes/hora en la vista 3D. Flecha roja = norte.
- [x] **Soleamiento completo**: hora en tiempo local oficial (corrección de
      longitud + huso CET/CEST), amanecer/atardecer y horas de sol del día
      por coordenadas del municipio, arco de la trayectoria solar visible
      en 3D y animación del día completo (▶).
- [ ] Snapping magnético entre estancias y pared compartida (ver
      [exploración del editor de muros](08-editor-muros.md)).
- [ ] Estancias poligonales (plantas en L) — fase 2 de la exploración.
- [x] **Recomendaciones bioclimáticas**: estancia habitable sin ventanas o
      con < 10 % de superficie acristalada, salón con ventanas solo al
      norte, exceso de vidrio al oeste (sobrecalentamiento).
- [x] Deshacer/rehacer (Ctrl+Z / Ctrl+Y, historial de 50 pasos).
- [x] Fusión de muros compartidos en 3D (el muro duplicado se omite cuando
      la vecina cubre todo el tramo y no hay huecos en él).
- [x] **Cubiertas inclinadas**: tipo y pendiente de cubierta en el proyecto,
      tejados a dos aguas en 3D (solo sobre estancias no cubiertas por la
      planta superior), altura de cumbrera en métricas y validación de
      pendiente (20–45°) y cumbrera (≤10,1 m) contra la ordenanza.
- [ ] Duplicar estancia, alinear y distribuir.
- [x] Joystick virtual y controles táctiles para la vista interior en móvil.
- [x] Parámetros de cualquier normativa editables por el usuario (ajustes
      con aviso «modificada por ti» y restaurar a la fuente).
- [x] Galapagar por grados: RU3 (La Navata) y RU4.
- [x] Rendimiento del arrastre en móvil: coalescencia de eventos con
      requestAnimationFrame y evaluación de cumplimiento diferida.
- [x] UX móvil: paneles plegables en pantallas pequeñas, botones táctiles
      más grandes, pellizcar para zoom + paneo en el plano (y rueda en
      escritorio) con botón de reencuadre.
- [x] Diseñador: **girar el plano** 90° (para ver parcelas alargadas en
      horizontal en el móvil) y **alejar el zoom** hasta 0,35× (ver toda la
      parcela con contexto), con arrastre de estancias correcto en cualquier
      rotación. Botones −/+/girar/encajar.
- [x] Colisiones en el paseo interior: los muros bloquean el paso, las
      puertas dejan pasar (también en muros fusionados) y Shift los
      atraviesa.
- [x] Exportar como imagen: el plano 2D (SVG → PNG con estilos embebidos)
      y la vista 3D actual, con botones de descarga.
- [x] Guías de distancia a los cuatro linderos al seleccionar una estancia.
- [x] PWA instalable: manifest, iconos SVG/PNG y theme-color («añadir a
      pantalla de inicio» en móvil) + service worker con caché
      stale-while-revalidate (funciona sin conexión una vez visitada).

### F1.1 — Cómputo parametrizable (primer paso de la F1, en marcha)

- [x] Coeficiente de edificabilidad configurable por normativa
      (`computo.edificabilidad`), sobrescribiendo el catálogo. Base del
      esquema ampliado de [docs/09](09-f1-plataforma-normativas.md).

### Asistente de diseño con IA (ver [docs/10](10-asistente-ia.md))

- [x] **IA.0 + IA.1**: asistente que, con la clave de API del usuario (BYOK,
      guardada solo en el dispositivo), toma la normativa activa + el estado
      del boceto + la prosa del usuario y devuelve sugerencias de diseño
      ancladas en la normativa. Panel en el lateral de cumplimiento.
- [ ] IA.2: subir PDF de normativa → `NormativaMunicipal` interpretada por
      IA con citas, revisable.
- [x] **IA.3**: acciones aplicables — la IA propone estancias concretas
      (herramienta `proponer_estancias`) que el usuario añade al boceto con
      un clic, en la planta y dimensiones sugeridas.
- [x] **IA.2**: subir un PDF de normativa → la IA extrae los parámetros
      (pdf.js en el navegador + tool `registrar_normativa` con citas) y los
      carga como normativa editable en nivel `interpretada-ia` para revisar.
      Escaneos sin texto: pendiente la vía por imagen (visión).

### Motor 3D (rediseño, feedback de uso real)

- [x] Vista 3D a casi pantalla completa en móvil (antes era una franja): el
      canvas de R3F llena su contenedor (~66 % del viewport móvil).
- [x] **Tejado unificado**: un solo tejado a dos aguas sobre la huella de la
      casa (con alero), en lugar de un tejadito por estancia que se veía
      fragmentado.
- [x] Cámara que **encuadra la casa** (no la parcela entera), para que
      llene la vista.
- [x] **Doble altura**: estancias que ocupan 2 plantas de alto (salón a
      doble altura); altura por estancia en el modelo, reflejada en la
      cornisa/cumbrera del motor y en el 3D. El forjado de la planta superior
      se perfora sobre el vacío para no tapar el hueco a doble altura.
- [x] **Solapes en cuña (2D)**: cuando dos estancias se solapan, la posterior
      recorta a la anterior con una máscara SVG para que el borde se vea en
      cuña limpia en vez de muros pisados. El motor avisa (regla `solape`) del
      área solapada por planta. (Pendiente: recorte equivalente en 3D.)
- [ ] Tejado a 4 aguas y limahoyas para plantas en L.

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
- [ ] **Render de calidad y vídeo**: imágenes fotorrealistas del interior/
      exterior (render en la nube o IA generativa a partir del modelo 3D)
      para "enseñar la casa" antes de construirla.
- [ ] Estimación de consumo energético orientativo según orientación,
      huecos, aislamiento y zona climática (simplificación CTE DB-HE).
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
