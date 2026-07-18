# 06 — Portal público de cobertura de normativa

## Idea

La base de datos de normativas es el activo central del producto, y su
credibilidad depende de que sea **pública, auditable y visiblemente
actualizada**. El portal de cobertura (pestaña "Cobertura" en la app) es el
escaparate de ese activo:

1. **Mapa de España** con los municipios cargados: verde = verificada,
   ámbar = borrador o interpretada por IA pendiente de revisión. La meta
   visual es "poner España en verde" (8.131 municipios).
2. **Tabla de auditoría**: para cada normativa — municipio, zona/ordenanza,
   estado de verificación, fecha de última revisión y enlaces a las fuentes
   oficiales. Cualquiera puede comprobar de dónde sale cada parámetro.
3. **Canal de aportación**: si falta un municipio, el usuario puede (a) usar
   la normativa personalizada introduciendo su ficha urbanística, o (b)
   pedir su incorporación al registro (hoy: issue en GitHub con el PDF;
   en F1: subida directa con interpretación por IA + revisión humana).

## Implementación actual (F0)

- El mapa se genera en tiempo de desarrollo desde
  [es-atlas](https://github.com/martgnz/es-atlas) (IGN) a paths SVG
  (`app/scripts/generar-mapa.mjs`), sin dependencias en tiempo de ejecución.
- Los municipios se posicionan con `ubicacion {lat, lng}` del esquema de
  normativa y la misma proyección del mapa.
- La tabla se deriva del registro de normativas (`app/src/normativa/`): no
  hay una segunda fuente de verdad que mantener.

## Evolución (F1+)

- Cuando las normativas vivan en una BD con API, esta página consumirá la
  API y podrá mostrar: historial de cambios por municipio (auditoría real,
  quién revisó qué y cuándo), número de usuarios por municipio, y peticiones
  pendientes de la comunidad.
- Vista por municipios (no solo puntos): colorear el término municipal
  usando las geometrías municipales del IGN (es-atlas incluye
  `municipalities.json`).
- RSS/changelog público de actualizaciones de normativa, para que
  profesionales puedan suscribirse a los municipios que les interesan.
