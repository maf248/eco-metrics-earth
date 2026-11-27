# Propuestas de Mejora — eco-metrics earth 🌍

Este documento registra todas las propuestas de mejora identificadas para el proyecto. Cada propuesta se trabajará en sesiones independientes siguiendo el workflow SDD (Spec-Driven Development).

---

## Estado del Proyecto (26 Nov 2026)

| Aspecto          | Estado | Nota                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tests            | ✅     | Unit (web, api, shared) y E2E (chromium completo + 4 browsers con los checks `@smoke`) pasando, 0 errores                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Lint             | ✅     | Sin warnings                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Build            | ✅     | Compila correctamente                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| CI               | ✅     | Una corrida por push en cualquier branch (`permissions` mínimos, `concurrency` que cancela corridas reemplazadas sin cortar deploys); guardia de lockfile podado del API; build de la imagen Docker del API sin publicarla cuando cambian sus inputs; E2E salteado en pushes que solo tocan docs; el nombre del job es contrato con Vercel Deployment Checks                                                                                                                                                                                                                                                              |
| CD / Deploy      | ✅     | web: Vercel (producción retenida por Deployment Checks hasta CI verde y la API de producción desplegada y sirviendo; alta del segundo check en Vercel pendiente tras el primer run en `main`, ver `docs/deploy/vercel.md`); api: Cloud Run vía `deploy-api.yml` llamado desde CI (`main` → `eco-metrics-api`, `develop` → `eco-metrics-api-dev`, que consumen los previews de Vercel), imagen reproducible desde lockfile podado, una imagen por entorno en Artifact Registry con cleanup que conserva las últimas 3                                                                                                      |
| Dependencias     | 🟡     | Producción sin advisories (`npm audit --omit=dev` limpio). Dependabot alerts activas (los PRs automáticos de seguridad quedan apagados porque GitHub los abre contra `main`). Los `overrides` de `package.json` fuerzan versiones corregidas; el de `undici@^7` existe porque `nx` pinnea `undici` 7.29.0 con advisories altas: quitarlo cuando `nx` lo traiga corregido. Quedan abiertas solo dos moderadas de desarrollo, `minimatch` (GHSA-g3hv-75wg-m249) y `glob` (GHSA-3g3m-2fjr-6pw4), que traen `nx`, `jest`, `@swc/cli` y el `npm` empaquetado; el fix está en la siguiente major, así que no se fuerza override |
| Coverage         | ✅     | Medido con Jest                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| E2E              | ✅     | Playwright en 5 browsers (chromium corre todo; firefox, webkit y los dos mobile solo los checks `@smoke`), en CI, arranque determinista y proveedores simulados con un servidor de fixtures local (OWID, Copernicus, NOAA LSA; sin red)                                                                                                                                                                                                                                                                                                                                                                                   |
| Theming          | ✅     | Light/dark mode con toggle, persistencia (localStorage) y zero-flash (spec `theme-toggle` + `theme-system`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Monitoreo        | ✅     | Logs JSON del API en formato Cloud Logging (`severity`, `requestId`, trace de Cloud Run, Error Reporting) y Sentry en web y API (source maps, alertas por email y un uptime monitor sobre la home, configurados según `docs/deploy/sentry.md`)                                                                                                                                                                                                                                                                                                                                                                            |
| **Datos reales** | 🟡     | **6 de 12 categorías con datos.** Con proveedor en vivo: `co2-emissions`, `global-temperature` y `energy-sources` (OWID) y `ocean-health` (Copernicus Climate Pulse, OWID y NOAA LSA, una sección y un endpoint por proveedor). Con dataset estático: `water-footprint` y `waste-recycling` (World Bank What a Waste 3.0). Contrato `502` ante fallas del proveedor, snapshots en GCS como respaldo, chequeo en `GET /api/v1/health/dependencies` y atribución en `/data-sources/`. Las 6 restantes siguen como placeholders (ver Estrategia de Proveedores)                                                              |

---

## 🌐 Estrategia de Proveedores de Datos

> Solo proveedores **libres para uso comercial** (con atribución). En uso: OWID (CC BY), Copernicus Climate Pulse (CC BY 4.0), NOAA LSA (dominio público) y World Bank What a Waste 3.0 (CC BY 4.0, estático). Las colecciones de Postman validadas están en `postman/`.

**Candidatos para las categorías pendientes:**

| Proveedor                        | Licencia        | Aporta                                                                                     |
| -------------------------------- | --------------- | ------------------------------------------------------------------------------------------ |
| **OWID**                         | CC BY           | Series país-año de casi todas las categorías (Grapher CSV, ya integrado)                   |
| **NOAA** (GML, NSIDC, NCEI, CRW) | Dominio público | Series casi en tiempo real: CO₂ ppm mensual (Mauna Loa), sea ice diario, estrés de corales |
| **World Bank Open Data**         | CC BY           | REST JSON por país/indicador (sin key): área forestal, especies amenazadas, PM2.5          |

**Descartados para producción comercial (solo prototipos):**

- **Open-Meteo** — el tier gratuito es **solo no comercial**.
- **IUCN Red List API** — solo no comercial (la vía comercial es IBAT). Alternativas: contadores de especies amenazadas de World Bank/OWID + GBIF (CC BY).
- **Global Forest Watch** — CC BY-NC-SA en datasets clave. Alternativas: OWID deforestation + FAOSTAT + Hansen (CC BY).

### Categorías pendientes

| Categoría          | OWID                                                     | NOAA                            | World Bank                         | Métrica inicial sugerida                        |
| ------------------ | -------------------------------------------------------- | ------------------------------- | ---------------------------------- | ----------------------------------------------- |
| plastic-pollution  | ✅ producción, mismanaged, fate                          | 🟡 Marine Debris (estático)     | —                                  | Global plastics production (OWID)               |
| deforestation      | ✅ annual deforestation, forest area                     | —                               | ✅ área forestal                   | Forest area (OWID)                              |
| reforestation      | 🟡 forest area neto (proxy)                              | —                               | 🟡 área forestal                   | Net forest change (OWID/FAOSTAT)                |
| endangered-species | ✅ threatened species (IUCN counts), Living Planet Index | —                               | ✅ mamíferos/aves/peces amenazados | Threatened species por país (World Bank u OWID) |
| glacier-melting    | ✅ mass balance glaciares de referencia                  | ✅ sea ice index diario (NSIDC) | —                                  | Sea ice extent (NOAA) o mass balance (OWID)     |
| air-quality        | 🟡 PM2.5 exposure anual, muertes por contaminación       | —                               | ✅ PM2.5 exposure anual            | PM2.5 exposure anual (World Bank/OWID)          |

> ⚠️ **air-quality en tiempo real** no tiene opción comercial-safe sin key: Open-Meteo es no comercial y OpenAQ tiene licencias heterogéneas. Opción viable: **OpenWeatherMap Air Pollution** (ODbL, comercial OK con atribución, key gratuita) — postergarlo y arrancar con la exposición anual a PM2.5.

---

## 🔴 Crítico / Alta Prioridad

_Sin propuestas abiertas._

---

## 🟡 Importante / Media Prioridad

### P1: Que una sección con error no tire abajo toda la página

**Problema:** en las páginas por secciones (`ocean-health`) solo la caída de un proveedor queda aislada en su sección; cualquier otro error de nuestra API en una sola sección (un 404 por desfase de deploy, un payload con otra forma, un 500) hace fallar la página entera y muestra `error.tsx`.

**Idea:** tratar el error de una sección como "sección no disponible" (el mismo estado que ya existe para el proveedor caído) y reportarlo a Sentry, manteniendo el error de página completa solo cuando fallan todas. Complementa el gate que publica la web recién cuando la API nueva está arriba: ese gate evita la ventana entre deploys, esto limita el daño de cualquier error puntual.

**A validar:** que no tape errores reales (que lleguen a Sentry y a los logs), que no quede cacheado 24 h un estado de error (revalidación corta como la del `502` del proveedor) y si aplica también a las páginas de un solo proveedor.

**Dificultad:** 3/10. **Requiere:** spec OpenSpec.

---

## 📋 Plan de Acción Sugerido

Si no estás seguro por dónde empezar, este es el orden recomendado:

1. **P1** — aislar el error de una sección para que no caiga la página entera.
2. Mejoras rápidas del backlog: **I16** (ícono de la página de error), **I19** (fechas del sitemap), **I21** (PRs a `main` completados solos) e **I17** (analytics).

D1 (TypeScript 7) queda como seguimiento pasivo — sin acción por ahora.

---

## 🟠 Mantenimiento / Dependencias

> Seguimiento de dependencias que no se pueden actualizar todavía (majors bloqueadas o en evaluación).

### D1: Evaluación de TypeScript 7 (tsc nativo en Go)

Solo seguimiento — el salto 5.9 → 7.0 es un rewrite del compilador. No upgrade hasta validar compatibilidad con NX/Next/SWC y estabilidad del ecosistema.

**Estado:** Solo seguimiento

---

## Notas

- **Dificultad:** escala 1-10 donde 1 es trivial y 10 es extremadamente complejo
- Cada propuesta se trabajará en sesiones independientes
- Antes de implementar, se creará una propuesta OpenSpec siguiendo el workflow SDD
- Este documento se actualizará conforme se completen propuestas
- **Al eliminar un plan o una idea del backlog, renumerar todos los `Ixx` o `Pxx` siguientes** para mantener la secuencia continua sin huecos

---

## 💡 Ideas — Backlog de mejoras identificadas

Lista de hallazgos del análisis de repositorio, ordenados por prioridad (más crítico primero). Cada ítem puede convertirse en una propuesta formal siguiendo el workflow SDD.

### 🟡 Testing

- **I01.** Sin tests de accesibilidad unitarios con `jest-axe`. Los tests E2E con `@axe-core/playwright` ya auditan todas las páginas (a11y.spec.ts), lo que cubre el 80% del valor. La integración a nivel componente unitario es deseable pero no prioritaria — solo suma valor si crece mucho la cantidad de componentes.

### 🟢 CI/CD

- **I09.** Sharding de los E2E en GitHub Actions — hoy el job de CI tarda ~14–15 min, casi todo E2E, y crece ~1,5–2 min por cada categoría con datos (quedan 6 de 12). Partir en 2 shards bajaría el job a ~11–13 min (no a la mitad: cada shard repite contenedor, `npm ci`, arranque de servidores y compilación de páginas en `next dev`) a cambio de ~4–5 min más de runner por corrida, que no se cobran por ser repo público. Disparador: CI > 18 min.
- **I10.** Analizar GitHub Environments (`production` / `development`) para el deploy de la API, disponibles gratis desde que el repo es público. Ventajas posibles: que GitHub restrinja el deploy a producción a `main`, aprobación manual opcional antes de producción, variables por entorno en vez del sufijo `_DEV` e historial de deploys en el repo. Solo evaluar; adoptarlo requiere spec.
- **I21.** Completar solo los PR `develop → main`: hoy abren con título "Develop" y descripción vacía. Un workflow en `pull_request` (`opened`, base `main`, head `develop`) lee los commits de `main..develop` (sin los de release ni los merges), reescribe el título con un resumen de lo que sube (p. ej. "Release: ocean-health, roadmap" o cantidad de feat/fix/docs) y arma la descripción con los mensajes cortos agrupados por tipo, marcando si toca API, web o ambas (la web de producción espera el deploy de la API). Solo completa si el título sigue siendo el default y la descripción está vacía, para no pisar lo escrito a mano. Corre en ~15–30 s aparte del CI (que es solo por `push`) y no bloquea nada; permisos `contents: read` y `pull-requests: write`. Opcional: indicar si la release será minor (hay `feat`) o patch. Dificultad: 2/10.

### 🟢 Configuración / Build

- **I03.** `legacy-peer-deps=true` en `.npmrc` — workaround porque `eslint-plugin-jsx-a11y@6.10.2` no declara ESLint 10 en sus peer deps. PR [#1081](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/pull/1081) abierto. Eliminar cuando se publique un release con soporte.
- **I04.** Sin Storybook ni documentación visual de componentes. Hay 102 componentes, 86 sin contar los 16 íconos (26 Nov 2026), por encima del umbral de ~40 fijado para reconsiderarlo; muchas piezas genéricas (explorador por país, panel de chart, tablas, atribución) ya tienen tests unitarios. Reevaluar si el overhead de configuración y mantenimiento se justifica.
- **I20.** Dependabot para npm: hoy solo cubre Docker y GitHub Actions, y las actualizaciones de paquetes se revisan a mano con `npm outdated`. Sumar el ecosistema `npm` contra `develop`, semanal, agrupando parches y minors en un PR y dejando las majors aparte (las de toolchain requieren spec). Validar que respete las versiones exactas, los workspaces y el lockfile podado del API. Simple de configurar; el costo es revisar los PRs.

### 🟡 Datos / Proveedores

- **I08.** Detectar el país del visitante (p. ej. headers de geolocalización de Vercel) y preseleccionarlo o resaltarlo en los selectores de país — hoy los selectores de `co2-emissions`, `global-temperature` y `energy-sources` arrancan siempre en World. Sin detección en el cliente ni cookies; hay que cuidar que el HTML cacheado por ISR no dependa del visitante (la preselección tendría que aplicarse en el cliente). Dificultad: 3/10. Requiere: spec OpenSpec.
- **I11.** Ocean health — fuentes más actuales y representativas. En cada caso revisar licencia comercial, acceso (key o login), frecuencia de actualización y formato:
  - **Nivel del mar:** el archivo de NOAA LSA no se actualiza desde feb 2025 y se publica "for experimental use only". Evaluar NASA (GSFC/JPL) o Copernicus/AVISO.
  - **Calor oceánico:** de las series que publica OWID, CSIRO termina en 2015 e IAP y MRI/JMA en 2020; solo NOAA sigue, y cada una usa su propia referencia. Evaluar una fuente única y actualizada (NOAA NCEI directo o IAP).
  - **pH:** hoy es una sola estación (Hawaii). Evaluar un pH superficial global (p. ej. Copernicus Marine).
- **I12.** Ocean health — cifras más claras y robustas: aclarar en una línea por qué las dos anomalías de SST difieren (base 1991–2020 en la diaria, 1861–1890 en la anual); calcular la suba del mar con promedios anuales o regresión en vez de la primera y la última medición, y sumar la aceleración; sumar una cifra de calor oceánico al panel; una nota breve de metodología por cifra.
- **I13.** Ocean health — indicadores faltantes: olas de calor marinas y estrés térmico de corales (NOAA Coral Reef Watch, dominio público). Biodiversidad marina, más adelante.
- **I14.** Alertas de proveedores: `GET /api/v1/health/dependencies` devuelve 503 cuando cae un proveedor, pero nada lo vigila. El plan de Sentry permite un solo uptime monitor (hoy sobre la home), así que evaluar otro vigilante gratuito (p. ej. uptime check de Cloud Monitoring o un workflow programado). Prioridad: Copernicus Climate Pulse, un CSV sin API formal ni SLA y la única fuente diaria.

### 🟢 Producto

- **I16.** La página de error genérica (`error.tsx`) muestra el ícono de "404" (`NotFoundIcon`) aunque el problema no sea una página inexistente, lo que confunde. Usar un ícono propio de error. Trivial, sin spec.
- **I17.** Analytics sin cookies: hoy no hay ninguna métrica de uso. Sumar Vercel Web Analytics (qué categorías se visitan, de dónde llegan) y, opcional, Speed Insights (Core Web Vitals reales) para priorizar el resto del roadmap. Revisar el cupo del plan gratuito, el ajuste del CSP y si hace falta aviso de privacidad. Dificultad: 2/10. Requiere: spec chica.
- **I18.** Imagen para compartir (Open Graph) propia de cada categoría: hoy todas usan `og-image.png`, así que un link a una categoría se ve igual que la home en redes y mensajería. Generarlas con `opengraph-image.tsx` (nombre de la categoría y, opcional, una cifra destacada), cuidando que no dependan del BFF en cada request. Dificultad: 3/10. Requiere: spec.
- **I19.** El sitemap declara `lastModified: new Date()` en cada pedido, así que siempre dice "ahora" y Google termina ignorando el dato. Usar una fecha real (la del deploy o la de los datos de cada categoría). Simple.
- **I15.** Investigar multi-idioma: viabilidad y costo (i18n del App Router, rutas por idioma con `hreflang` y sitemap, traducción de copys, cifras y fechas, datos de proveedores que solo vienen en inglés), qué idiomas incluir según la audiencia (español como primer candidato) y el impacto en SEO, caché e E2E. Solo evaluar; adoptarlo requiere spec.

---

### 📝 Recordatorios

- **I02.** Base de datos — no hay ni hace falta hoy: los datos vienen de proveedores con snapshots en GCS y de datasets estáticos versionados. Reconsiderarla solo si aparecen cuentas de usuario, históricos propios o agregaciones que no convenga calcular por request.
- **I05.** OpenTelemetry — considerado para el futuro cuando el sistema escale a múltiples servicios o se quiera cambiar de backend de observabilidad (Sentry → Datadog, Honeycomb, etc.) sin tocar código de instrumentación. Con un solo BFF alcanzan el trace de Cloud Run y el `requestId` en los logs (Sentry está configurado solo para errores, sin tracing). No justifica el overhead de configuración actual (collector, exporters, SDK setup).
- **I06.** Axiom — plataforma de logs como servicio. Solo relevante si la retención de Cloud Logging (30 días en free tier) o Vercel resulta insuficiente para debugging post-mortem. Por ahora los logs agregados de cada plataforma son suficientes.
- **I07.** Reevaluar un subagente `designer` — se descartó porque solo haría "leer `docs/design-system.md` y aplicarlo", que ya hace `@coder` (ver _Tooling note_ en ese doc). Reconsiderarlo solo si el doc deja de ser barato de leer entero (recetas por tipo de chart, inventario de componentes, después de las categorías restantes) y hay evidencia de algo que `@coder` + `@reviewer` con el doc no cubran. Baja prioridad; si no se justifica, no se hace.

**Última actualización:** 26 Nov 2026
