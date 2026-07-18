# 07 — ¿Web o aplicación instalable?

## Decisión: web-first

ConstruyIA se desarrolla como **aplicación web**, y esa decisión se mantiene
también para las ambiciones grandes (vista interior en primera persona,
renderizado realista, recomendaciones energéticas). Razones:

1. **Compartir es el producto.** Enviar un enlace a la familia o al
   arquitecto y que lo abran en el móvil sin instalar nada es una ventaja
   competitiva directa para nuestro caso de uso. Un instalable mata esa
   fricción cero.
2. **La web aguanta de sobra.** El navegador ejecuta hoy motores 3D
   completos vía WebGL/WebGPU. Referencias del sector construidas como web
   apps: Figma (editor de diseño profesional), SketchUp for Web y AutoCAD
   Web (CAD), Planner 5D y HomeByMe (diseño de viviendas con render), los
   configuradores 3D de IKEA. three.js (que ya usamos) soporta recorridos
   en primera persona, materiales PBR, sombras e iluminación en tiempo
   real sin despeinarse en un portátil normal.
3. **Un solo código, todas las plataformas.** Windows/Mac/Linux/tablet/móvil
   sin builds nativos ni firmas de instaladores ni actualizaciones que
   distribuir: publicar = actualizar para todos.

## ¿Dónde están los límites reales de la web?

| Necesidad | ¿La web lo soporta? | Estrategia |
|---|---|---|
| Editor 2D de planos | ✅ Sobrado (SVG/Canvas) | Ya implementado |
| Vista 3D exterior con envolvente | ✅ Sobrado (three.js) | Ya implementado |
| Recorrido interior en primera persona | ✅ Bien (three.js PointerLock/joystick virtual) | F0.5–F1 |
| Iluminación realista en tiempo real | ✅ Aceptable (luces + sombras + AO) | F1 |
| Render fotorrealista / vídeo | ⚠️ Costoso en cliente | Render en servidor o generación con IA a partir de capturas del modelo (F2) |
| Ficheros muy grandes (IFC pesados, nubes de puntos) | ⚠️ Limitado por RAM del navegador | Fuera de alcance: somos herramienta de boceto, no CAD |
| Trabajar sin conexión | ✅ PWA (service worker) | F1 |
| "Quiero un icono en el escritorio" | ✅ PWA instalable | F1, gratis casi |

Conclusión: para el 95 % de la visión no hay limitación técnica. El 5 %
(render fotorrealista de calidad cine) no se resuelve instalando un .exe:
se resuelve con render en la nube o IA generativa, que además funciona
igual desde la web.

## Plan B documentado (por si algún día hace falta)

Si apareciera una necesidad genuinamente nativa (integración profunda con
hardware, rendimiento extremo), el mismo código web se empaqueta como
aplicación de escritorio con **Tauri** o Electron sin reescribir nada.
Es una puerta que queda abierta, no un camino que haya que preparar ahora.

## Implicaciones para la hoja de ruta

- F0.5: despliegue en GitHub Pages (URL pública para compartir bocetos).
- F1: PWA (instalable + offline) cuando haya usuarios más allá del equipo.
- F2: pipeline de render de calidad (nube/IA) para imágenes y vídeo
  "enseñables" del proyecto.
