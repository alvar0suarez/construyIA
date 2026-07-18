# Instrucciones del proyecto ConstruyIA

## Forma de trabajo (instrucciones permanentes del propietario)

- **Los pull requests los gestiona Claude de principio a fin**: crear el PR,
  vigilar la CI y **hacer el merge sin esperar confirmación** del propietario
  en cuanto la CI esté en verde. No quedarse a la espera.
- **Avanzar siempre lo máximo posible** sin preguntar; el propietario da
  feedback a posteriori. Solo preguntar ante decisiones destructivas o
  cambios de rumbo del producto.
- Idioma del proyecto: **español** (código con nombres en español donde sea
  natural, documentación y UI siempre en español).
- Honestidad de datos: nunca llamar "verificada/oficial" a una normativa;
  usar los niveles de `docs/04-normativa.md` (contrastada/borrador/
  interpretada-ia/personalizada).

## Contexto rápido

- App: `app/` (Vite + React + TS). Tests: `cd app && npm test`. Build:
  `npm run build`. El motor de normativa vive en `app/src/engine` y es TS
  puro (sin React) — mantenerlo así.
- Regla de dependencias: `domain ← normativa ← engine ← state ← ui`.
- Documentación de producto y decisiones en `docs/` (leer antes de cambios
  grandes; actualizar el roadmap `docs/02-roadmap.md` al completar hitos).
- Despliegue: GitHub Pages automático al hacer push/merge a `main`
  (`.github/workflows/deploy.yml`).
