# Regenerar el mapa de España

`src/ui/mapa/espanaProvincias.ts` es un fichero generado a partir de
[es-atlas](https://github.com/martgnz/es-atlas) (datos del IGN) con
`generar-mapa.mjs`. Para regenerarlo:

```bash
cd app/scripts
curl -sL -o provinces.json https://unpkg.com/es-atlas@0.6.0/es/provinces.json
npm install --no-save topojson-client
node generar-mapa.mjs   # escribe src/ui/mapa/espanaProvincias.ts
rm provinces.json
```

El script usa una proyección equirrectangular simple centrada en ~40° N y
emite tanto los paths de provincias (`PROVINCIAS`) como la función
`proyectar(lat, lng)` que usan los puntos de municipios del mapa de
cobertura — por eso ambos deben regenerarse juntos.
