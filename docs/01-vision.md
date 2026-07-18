# 01 — Visión de producto

## El problema

Quien compra una parcela para construir su casa se enfrenta a:

1. **Normativa opaca y dispersa**: cada municipio tiene su PGOU/NNSS con
   ordenanzas zonales distintas. Los documentos son PDFs largos, técnicos y
   difíciles de interpretar sin formación.
2. **Decisiones encadenadas**: los parámetros urbanísticos (retranqueos,
   ocupación, edificabilidad, altura, parcela mínima) determinan qué casa cabe
   en qué parcela. Comprar parcela sin entenderlos es comprar a ciegas.
3. **Comunicación difícil**: explicar a la familia o al arquitecto "cómo
   quiero la casa" sin herramientas visuales es lento y da lugar a
   malentendidos.

## La solución

Una aplicación donde el usuario:

1. **Elige municipio/zona** → la app carga la normativa aplicable (o sube su
   PDF y la IA la interpreta — fase futura).
2. **Define su parcela** (dimensiones, lado de acceso/frente).
3. **Boceta la vivienda**: plantas, estancias, garaje, piscina...
4. **Ve en tiempo real** el cumplimiento normativo y recomendaciones de
   diseño (superficies mínimas, plazas de garaje, distribución).
5. **Comparte** el boceto (enlace/fichero) para recibir opiniones.

## Usuarios objetivo

| Fase | Usuario | Necesidad |
|---|---|---|
| F0 | **Yo mismo** (autopromotor buscando parcela en Madrid: Galapagar, Las Rozas/Las Matas...) | Comparar parcelas y bocetar dentro de normativa |
| F1 | Autopromotores en España | Lo mismo, en su municipio |
| F2 | Arquitectos / estudios | Pre-dimensionado rápido, consulta normativa centralizada, propuesta de materiales |
| F2 | Inmobiliarias / portales | "¿Qué se puede construir en esta parcela?" como servicio |

## Propuesta de valor

- **Normativa centralizada y actualizada**: base de datos de ordenanzas
  municipales con nivel de verificación explícito y fuentes citadas.
- **Validación instantánea**: motor de reglas que evalúa el boceto contra la
  normativa en cada cambio.
- **Asistencia de diseño**: recomendaciones de habitabilidad (CTE y buenas
  prácticas), materiales y soluciones constructivas actualizadas.
- **Honestidad**: siempre no vinculante, siempre con fuentes, siempre
  recomendando validar con arquitecto y ayuntamiento. La confianza es el
  producto.

## Principios

1. **Útil para mí primero**: cada fase debe resolver un problema real del
   usuario fundador antes de generalizar.
2. **Datos con procedencia**: ningún parámetro normativo sin fuente y fecha.
   Distinguir siempre `verificada` / `borrador` / `interpretada por IA`.
3. **El motor es la joya**: la lógica de validación vive separada de la UI,
   testeada, para poder reutilizarla (web, API, agente IA).
4. **No vinculante, y visible**: el disclaimer no es letra pequeña, es parte
   de la UX.
