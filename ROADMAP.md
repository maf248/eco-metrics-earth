# Propuestas de Mejora — eco-metrics earth 🌍

Este documento registra todas las propuestas de mejora identificadas para el proyecto. Cada propuesta se trabajará en sesiones independientes siguiendo el workflow SDD (Spec-Driven Development).

---

## Estado del Proyecto (27 Nov 2026)

| Aspecto          | Estado | Nota                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tests            | ✅     | Unit (web, api, shared) y E2E (chromium completo + 4 browsers con los checks `@smoke`) pasando, 0 errores                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Lint             | ✅     | Sin warnings                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Build            | ✅     | Compila correctamente                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| CI               | ✅     | Una corrida por push en cualquier branch (`permissions` mínimos, `concurrency` que cancela corridas reemplazadas sin cortar deploys); guardia de lockfile podado del API; build de la imagen Docker del API sin publicarla cuando cambian sus inputs; E2E salteado en pushes que solo tocan docs; el nombre del job es contrato con Vercel Deployment Checks                                                                                                                                                                                                                                                                                                                                                                                 |
| CD / Deploy      | ✅     | web: Vercel en `eco-metrics.earth` (producción retenida por Deployment Checks hasta CI verde y la API de producción desplegada y sirviendo; verificado en el merge a `main` del 27 Nov 2026); api: Cloud Run vía `deploy-api.yml` llamado desde CI (`main` → `eco-metrics-api`, `develop` → `eco-metrics-api-dev`, que consumen los previews de Vercel), imagen reproducible desde lockfile podado, una imagen por entorno en Artifact Registry con cleanup que conserva las últimas 3                                                                                                                                                                                                                                                       |
| Dependencias     | 🟡     | Producción sin advisories (`npm audit --omit=dev` limpio). Dependabot alerts activas (los PRs automáticos de seguridad quedan apagados porque GitHub los abre contra `main`). Los `overrides` de `package.json` fuerzan versiones corregidas; el de `undici@^7` existe porque `nx` pinnea `undici` 7.29.0 con advisories altas: quitarlo cuando `nx` lo traiga corregido. Queda abierta una sola alerta, moderada y de desarrollo: `minimatch` (GHSA-g3hv-75wg-m249). La de `glob` (GHSA-3g3m-2fjr-6pw4) la autodescartó GitHub por ser de desarrollo, pero las versiones vulnerables siguen instaladas. Las dos las traen `nx`, `jest`, `@swc/cli` y el `npm` empaquetado; el fix está en la siguiente major, así que no se fuerza override |
| Coverage         | ✅     | Medido con Jest                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| E2E              | ✅     | Playwright en 5 browsers (chromium corre todo; firefox, webkit y los dos mobile solo los checks `@smoke`), en CI, arranque determinista y proveedores simulados con un servidor de fixtures local (OWID, Copernicus, NOAA LSA; sin red)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Theming          | ✅     | Light/dark mode con toggle, persistencia (localStorage) y zero-flash (spec `theme-toggle` + `theme-system`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Monitoreo        | ✅     | Logs JSON del API en formato Cloud Logging (`severity`, `requestId`, trace de Cloud Run, Error Reporting) y Sentry en web y API (source maps, alertas por email y un uptime monitor sobre la home, configurados según `docs/deploy/sentry.md`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Datos reales** | 🟡     | **7 de 12 categorías con datos.** Con proveedor en vivo: `co2-emissions`, `global-temperature`, `energy-sources` y `deforestation` (OWID; esta última con FAO FRA 2025 y Global Forest Watch como orígenes, un endpoint por fuente) y `ocean-health` (Copernicus Climate Pulse, OWID y NOAA LSA, una sección y un endpoint por proveedor). Con dataset estático: `water-footprint` y `waste-recycling` (World Bank What a Waste 3.0). Contrato `502` ante fallas del proveedor, snapshots en GCS como respaldo, chequeo en `GET /api/v1/health/dependencies` y atribución en `/data-sources/`. Las 5 restantes siguen como placeholders y hay 3 categorías nuevas planeadas (ver Estrategia de Proveedores)                                  |

---

## 🌐 Estrategia de Proveedores de Datos

> Solo proveedores **libres para uso comercial** (con atribución). En uso: OWID (CC BY; también como vía a FAO FRA 2025, cuyos términos suman no usar los datos para promocionar productos ni sugerir respaldo de FAO, y a Global Forest Watch), Copernicus Climate Pulse (CC BY 4.0), NOAA LSA (dominio público) y World Bank What a Waste 3.0 (CC BY 4.0, estático). Las colecciones de Postman validadas están en `postman/`.

**Candidatos para las categorías pendientes:**

| Proveedor                        | Licencia        | Aporta                                                                                                             |
| -------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------ |
| **OWID**                         | CC BY           | Series país-año de casi todas las categorías (Grapher CSV, ya integrado)                                           |
| **NOAA** (GML, NSIDC, NCEI, CRW) | Dominio público | Series casi en tiempo real: CO₂ ppm mensual (Mauna Loa), sea ice diario, estrés de corales                         |
| **World Bank Open Data**         | CC BY           | REST JSON por país/indicador (sin key): área forestal, especies amenazadas, PM2.5, estrés hídrico y acceso al agua |
| **WRI Aqueduct 4.0**             | CC BY 4.0       | Estrés hídrico por país y provincia, actual y proyectado a 2030, 2050 y 2080 (descarga estática)                   |

**Descartados para producción comercial (solo prototipos):**

- **Open-Meteo** — el tier gratuito es **solo no comercial**.
- **IUCN Red List API** — solo no comercial (la vía comercial es IBAT). Alternativas: contadores de especies amenazadas de World Bank/OWID + GBIF (CC BY).
- **EM-DAT** (desastres naturales, también vía OWID) — licencia restrictiva de UCLouvain, no comercial.
- **WHO/UNICEF JMP directo** (acceso al agua) — CC BY-NC-SA 3.0 IGO. El mismo indicador por World Bank (`SH.H2O.SMDW.ZS`) figura como CC BY 4.0: usar esa vía.

### Categorías pendientes

| Categoría          | OWID                                                     | NOAA                            | World Bank                         | Métrica inicial sugerida                        |
| ------------------ | -------------------------------------------------------- | ------------------------------- | ---------------------------------- | ----------------------------------------------- |
| plastic-pollution  | ✅ producción, mismanaged, fate                          | 🟡 Marine Debris (estático)     | —                                  | Global plastics production (OWID)               |
| reforestation      | 🟡 forest area neto (proxy, ya integrado)                | —                               | 🟡 área forestal                   | Net forest change (OWID/FAOSTAT)                |
| endangered-species | ✅ threatened species (IUCN counts), Living Planet Index | —                               | ✅ mamíferos/aves/peces amenazados | Threatened species por país (World Bank u OWID) |
| glacier-melting    | ✅ mass balance glaciares de referencia                  | ✅ sea ice index diario (NSIDC) | —                                  | Sea ice extent (NOAA) o mass balance (OWID)     |
| air-quality        | 🟡 PM2.5 exposure anual, muertes por contaminación       | —                               | ✅ PM2.5 exposure anual            | PM2.5 exposure anual (World Bank/OWID)          |

> ⚠️ **reforestation** reutilizaría el endpoint `/api/v1/deforestation/forest-area` (FAO FRA 2025), pero el mapa de cambio neto desde 1990 de deforestation ya muestra las ganancias: hace falta una métrica de ganancia propia (p. ej. expansión forestal de FRA, validando que OWID la publique). Global Forest Watch licencia por dataset: tree cover gain (Hansen/UMD) hay que revisarlo antes de usarlo, aunque tree cover loss by dominant driver sea CC BY 4.0. Si no aparece una métrica que la diferencie de verdad, evaluar unificarla con deforestation.

> ⚠️ **air-quality en tiempo real** no tiene opción comercial-safe sin key: Open-Meteo es no comercial y OpenAQ tiene licencias heterogéneas. Opción viable: **OpenWeatherMap Air Pollution** (ODbL, comercial OK con atribución, key gratuita) — postergarlo y arrancar con la exposición anual a PM2.5.

### Categorías nuevas planeadas

Foco ecológico: cada una tiene un dato principal y otros de contexto. Las tres se suman a `ECO_CATEGORIES` recién cuando tengan datos, para no agregar placeholders. Licencias tomadas de la metadata de OWID o de la página del proveedor: confirmarlas en la fuente original en la spec de cada una.

- **Water Scarcity** (`water-scarcity`; título SEO "Water Stress by Country"). El eje es el estrés hídrico; `water-footprint` sigue aparte como consumo.
  - **Principal:** nivel de estrés hídrico por país, extracción sobre agua disponible descontando el caudal ecológico (ODS 6.4.2, FAO AQUASTAT vía World Bank `ER.H2O.FWST.ZS`, CC BY 4.0, 2000–2023), y WRI Aqueduct 4.0 (CC BY 4.0) para las proyecciones a 2030, 2050 y 2080.
  - **Contexto:** extracción por sector (agricultura ~70%), agua renovable por persona y extracción total (AQUASTAT, CC BY 4.0) y acceso a agua potable segura (World Bank `SH.H2O.SMDW.ZS`, nunca JMP directo).
  - La versión de OWID del indicador de estrés figura como "© United Nations": tomarlo de World Bank.
- **Wildfires** (`wildfires`). GWIS (Copernicus/JRC) vía OWID, CC BY 4.0, ya integrado como proveedor.
  - **Datos:** área quemada por país (2002–2025) y por tipo de vegetación (bosques, sabanas, matorrales y pastizales, cultivos), % del territorio quemado, cantidad de incendios, emisiones de CO₂ y PM2.5 de los incendios (2003–2026) y el año en curso semana a semana contra los anteriores (actualización ~mensual; el año en curso viene incompleto).
  - Conecta con `deforestation` (el fuego es una de las causas de tree cover loss) y con `air-quality` (PM2.5).
  - **Fuera de alcance:** desastres en general (EM-DAT no es comercial); sequía (Global Drought Observatory publica solo grillas GeoTIFF/NetCDF, sin cifras por país, y la licencia no está confirmada); olas de calor (solo grillas ERA5). Por eso el nombre es Wildfires y no Extreme Weather.
  - **Al sumarla, cambiar el ícono de `deforestation`:** hoy es un árbol en llamas y se confundiría con Wildfires.
- **Greenhouse Gases** (`greenhouse-gases`). Categoría propia y no sección de `co2-emissions`, porque suma gases que no son CO₂. Reparto: `co2-emissions` mide el CO₂ emitido por país; esta, cómo se acumulan todos los gases en la atmósfera, más las emisiones de los que no son CO₂.
  - **Principal:** concentración mensual de CO₂, metano y N₂O (NOAA GML; la tabla de arriba lo da como dominio público, pero OWID registra CC BY 4.0 para CO₂ y metano: confirmar en NOAA y atribuir igual. El N₂O hay que tomarlo de NOAA directo).
  - **Contexto:** CO₂ de los últimos ~800.000 años por núcleos de hielo (EPA vía OWID, dominio público) y emisiones de metano y N₂O por país (OWID, licencia a verificar).
  - "CO2 levels" es la búsqueda fuerte: que aparezca en la intro y en el título SEO.

---

## 🔴 Crítico / Alta Prioridad

_Sin propuestas abiertas._

---

## 🟡 Importante / Media Prioridad

### P1: Que una sección con error no tire abajo toda la página

**Problema:** en las páginas por secciones (`ocean-health` y `deforestation`) solo la caída de un proveedor queda aislada en su sección; cualquier otro error de nuestra API en una sola sección (un 404 por desfase de deploy, un payload con otra forma, un 500) hace fallar la página entera y muestra `error.tsx`.

**Idea:** tratar el error de una sección como "sección no disponible" (el mismo estado que ya existe para el proveedor caído) y reportarlo a Sentry, manteniendo el error de página completa solo cuando fallan todas. Complementa el gate que publica la web recién cuando la API nueva está arriba: ese gate evita la ventana entre deploys, esto limita el daño de cualquier error puntual.

**A validar:** que no tape errores reales (que lleguen a Sentry y a los logs), que no quede cacheado 24 h un estado de error (revalidación corta como la del `502` del proveedor) y si aplica también a las páginas de un solo proveedor.

**Dificultad:** 3/10. **Requiere:** spec OpenSpec.

---

## 📋 Plan de Acción Sugerido

Si no estás seguro por dónde empezar, este es el orden recomendado:

1. **P1** — aislar el error de una sección para que no caiga la página entera.
2. **I09** — sharding de los E2E: el CI ya pasó el disparador de 18 min.
3. Mejoras rápidas del backlog: **I16** (ícono de la página de error), **I19** (fechas del sitemap), **I21** (PRs a `main` completados solos), **I22** (referencias al dominio viejo) e **I17** (analytics).

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

- **I09.** Sharding de los E2E en GitHub Actions — el job de CI ya tarda ~17,5–19 min (19,1 min en el merge a `main` del 27 Nov 2026, 17,5 en `develop`; el E2E solo, ~14 min), y crece ~1,5–2 min por cada categoría con datos (quedan 5 de 12). Partir en 2 shards bajaría el job a ~11–13 min (no a la mitad: cada shard repite contenedor, `npm ci`, arranque de servidores y compilación de páginas en `next dev`) a cambio de ~4–5 min más de runner por corrida, que no se cobran por ser repo público. Disparador: CI > 18 min — **alcanzado** (27 Nov 2026).
- **I10.** Analizar GitHub Environments (`production` / `development`) para el deploy de la API, disponibles gratis desde que el repo es público. Ventajas posibles: que GitHub restrinja el deploy a producción a `main`, aprobación manual opcional antes de producción, variables por entorno en vez del sufijo `_DEV` e historial de deploys en el repo. Solo evaluar; adoptarlo requiere spec.
- **I21.** Completar solo los PR `develop → main`: hoy abren con título "Develop" y descripción vacía. Un workflow en `pull_request` (`opened`, base `main`, head `develop`) lee los commits de `main..develop` (sin los de release ni los merges), reescribe el título con un resumen de lo que sube (p. ej. "Release: ocean-health, roadmap" o cantidad de feat/fix/docs) y arma la descripción con los mensajes cortos agrupados por tipo, marcando si toca API, web o ambas (la web de producción espera el deploy de la API). Solo completa si el título sigue siendo el default y la descripción está vacía, para no pisar lo escrito a mano. Corre en ~15–30 s aparte del CI (que es solo por `push`) y no bloquea nada; permisos `contents: read` y `pull-requests: write`. Opcional: indicar si la release será minor (hay `feat`) o patch. Dificultad: 2/10.
- **I22.** Cerrar el paso al dominio `eco-metrics.earth`. Producción ya lo sirve (canonical, `og:url`, sitemap y `robots.txt` verificados el 27 Nov 2026; `www` y `eco-metrics-earth.vercel.app` redirigen con 308), pero quedan referencias al dominio viejo. En el repo: la URL del uptime monitor en `docs/deploy/sentry.md` y el ejemplo de `CORS_ORIGIN` en `docs/deploy/cloud-run.md`. Fuera del repo: la variable de GitHub `CORS_ORIGIN` (pasarla a `https://eco-metrics.earth`; se aplica en el próximo deploy de la API), el uptime monitor de Sentry (hoy recibe un 308) y el alta del dominio en Google Search Console (TXT en el DNS de Vercel) con el envío del sitemap. Los ejemplos de `openspec/` y los tests del patrón de previews `*.vercel.app` quedan como están. Trivial, sin spec.
- **I23.** Dominio `dev.eco-metrics.earth` para `develop`. Antes de agregarlo, pasar la Deployment Protection del proyecto de `all_except_custom_domains` a Standard Protection: hoy los dominios propios quedan públicos y `dev.` sería indexable como copia de producción. Después: dominio en Preview con rama `develop`, `NEXT_PUBLIC_SITE_URL` de Preview solo para `develop` y el origen en `CORS_ORIGIN_DEV`. Opcional: que `scripts/vercel-ignore.sh` permita forzar un build, porque hoy un Redeploy del mismo commit siempre se cancela (diff vacío) y un cambio de variable `NEXT_PUBLIC_*` espera al próximo commit que toque la web. Sin apuro: la URL fija de la rama ya existe y está protegida. Dificultad: 2/10.

### 🟢 Configuración / Build

- **I03.** `legacy-peer-deps=true` en `.npmrc` — workaround porque `eslint-plugin-jsx-a11y@6.10.2` no declara ESLint 10 en sus peer deps. PR [#1081](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/pull/1081) abierto. Eliminar cuando se publique un release con soporte.
- **I04.** Sin Storybook ni documentación visual de componentes. Hay 110 componentes, 94 sin contar los 16 íconos (27 Nov 2026), por encima del umbral de ~40 fijado para reconsiderarlo; muchas piezas genéricas (explorador por país, panel de chart, tablas, atribución) ya tienen tests unitarios. Reevaluar si el overhead de configuración y mantenimiento se justifica.
- **I20.** Dependabot para npm: hoy solo cubre Docker y GitHub Actions, y las actualizaciones de paquetes se revisan a mano con `npm outdated`. Sumar el ecosistema `npm` contra `develop`, semanal, agrupando parches y minors en un PR y dejando las majors aparte (las de toolchain requieren spec). Validar que respete las versiones exactas, los workspaces y el lockfile podado del API. Simple de configurar; el costo es revisar los PRs.

### 🟡 Datos / Proveedores

- **I08.** Detectar el país del visitante (p. ej. headers de geolocalización de Vercel) y preseleccionarlo o resaltarlo en los selectores de país — hoy los selectores de `co2-emissions`, `global-temperature`, `energy-sources` y `deforestation` arrancan siempre en World. Sin detección en el cliente ni cookies; hay que cuidar que el HTML cacheado por ISR no dependa del visitante (la preselección tendría que aplicarse en el cliente). Dificultad: 3/10. Requiere: spec OpenSpec.
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
- **I24.** Categoría de agricultura — evaluada y descartada por ahora: sumaría más deuda técnica que valor. Había datos comerciales (FAOSTAT, CC BY 4.0: tierra agrícola, fertilizante y pesticidas por hectárea, emisiones del sistema agroalimentario por país); HYDE es CC BY-NC y Poore & Nemecek no declara licencia. Reconsiderarla solo si sobra espacio después de las categorías planeadas.

**Última actualización:** 27 Nov 2026
