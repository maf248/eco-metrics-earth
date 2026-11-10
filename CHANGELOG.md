## [2.20.0](https://github.com/maf248/eco-metrics-earth/compare/v2.19.0...v2.20.0) (2026-11-10)

### Features

* **web:** add co2 per capita world map with sortable country ranking ([94d51e3](https://github.com/maf248/eco-metrics-earth/commit/94d51e39fd7eacf5bc5bef3548b7bf07400012b1))
* **web:** move the co2 world map below the country explorer ([30c0672](https://github.com/maf248/eco-metrics-earth/commit/30c0672bd5808cf71f13991b5b46a75936befebb))

### Bug Fixes

* **web:** keep year table header borders and fit the energy table in the card ([75d7835](https://github.com/maf248/eco-metrics-earth/commit/75d78356f635122f94cdc8337a05ab4f3a423ae4))
* **web:** register the world map geometry through the map chart entry ([a3b349b](https://github.com/maf248/eco-metrics-earth/commit/a3b349b68f266ba74779bc209b9686fc9fc9dc6e))

## [2.19.0](https://github.com/maf248/eco-metrics-earth/compare/v2.18.0...v2.19.0) (2026-11-06)

### Features

* **web:** wrap chart legends and give charts more room on mobile ([4c5bf82](https://github.com/maf248/eco-metrics-earth/commit/4c5bf82eff7a315205612cc030d7a808ab8b6ee1))

## [2.18.0](https://github.com/maf248/eco-metrics-earth/compare/v2.17.2...v2.18.0) (2026-11-06)

### Features

* **api:** restrict the api to the web app with a required key and instance caps ([e8d6a4a](https://github.com/maf248/eco-metrics-earth/commit/e8d6a4a8d72f2ea471e78a451cd439fbfb0ee593))

### Bug Fixes

* **api:** trim the internal api key so a trailing newline still matches ([17f190a](https://github.com/maf248/eco-metrics-earth/commit/17f190adf5fe85241d70999eb900a9e823710973))
* **ci:** count both paths of a rename in change detection ([6631a09](https://github.com/maf248/eco-metrics-earth/commit/6631a09f26205b3461fd6f10a54fc5ae220211cc))
* **tooling:** track root files read by tests as nx test inputs ([1b3311d](https://github.com/maf248/eco-metrics-earth/commit/1b3311d1d2f1cfb77133c0f9e030d2b0d92a4c5b))
* **tooling:** trust the workspace so the e2e gate can read git history ([a887794](https://github.com/maf248/eco-metrics-earth/commit/a8877945a90cc214ab489a6d3dd2f9e2ec4cf4c5))

## [2.17.2](https://github.com/maf248/eco-metrics-earth/compare/v2.17.1...v2.17.2) (2026-11-04)

### Bug Fixes

* **ci:** run e2e serially in ci again ([eca7c4f](https://github.com/maf248/eco-metrics-earth/commit/eca7c4f2aba4e3a2916a968115ad6765e5425393))

## [2.17.1](https://github.com/maf248/eco-metrics-earth/compare/v2.17.0...v2.17.1) (2026-11-01)

### Bug Fixes

* **web:** serve the complete 404 page for unknown category slugs ([61eea43](https://github.com/maf248/eco-metrics-earth/commit/61eea438d4e19639e4a3a156c699a1887c81976a))

## [2.17.0](https://github.com/maf248/eco-metrics-earth/compare/v2.16.1...v2.17.0) (2026-11-01)

### Features

* **web:** make category navigation instant with complete server HTML ([5ffb433](https://github.com/maf248/eco-metrics-earth/commit/5ffb4337cb5c0975498c88aaa5e4755bbbdfaefa))

## [2.16.1](https://github.com/maf248/eco-metrics-earth/compare/v2.16.0...v2.16.1) (2026-11-01)

### Bug Fixes

* **deps:** patch production advisories in nest, joi and follow-redirects ([a9ade52](https://github.com/maf248/eco-metrics-earth/commit/a9ade524f537f77998f6c1cb2750c1165e7cdca3))

## [2.16.0](https://github.com/maf248/eco-metrics-earth/compare/v2.15.0...v2.16.0) (2026-11-01)

### Features

* **api:** serve the last good snapshot when a provider fails ([815ff3d](https://github.com/maf248/eco-metrics-earth/commit/815ff3de17277f0413602a7d70a7d372f41a7747))
* **web:** show stale and unavailable states for provider data ([6b2bc93](https://github.com/maf248/eco-metrics-earth/commit/6b2bc9319a166ce4a183dbdef622e60bd7da5cd7))

## [2.15.0](https://github.com/maf248/eco-metrics-earth/compare/v2.14.0...v2.15.0) (2026-10-27)

### Features

* **api:** add the energy sources endpoint ([d643005](https://github.com/maf248/eco-metrics-earth/commit/d6430052a8b12189113aa6472566089dc57e7e37))
* **web:** add the energy sources page ([060734b](https://github.com/maf248/eco-metrics-earth/commit/060734b4fecd586e18ccaf2a917e41c20854e5c2))

## [2.14.0](https://github.com/maf248/eco-metrics-earth/compare/v2.13.0...v2.14.0) (2026-10-26)

### Features

* **web:** add keyword-bearing titles to the live data pages ([9b8e1d3](https://github.com/maf248/eco-metrics-earth/commit/9b8e1d39918426fd93a62b7728df4efb4c6782b1))

## [2.13.0](https://github.com/maf248/eco-metrics-earth/compare/v2.12.0...v2.13.0) (2026-10-26)

### Features

* **api:** serve co2 emissions and global temperature from owid ([63636b0](https://github.com/maf248/eco-metrics-earth/commit/63636b0c01e92ee39cecadd924a9281441f2dae6))
* **web:** add co2 emissions and global temperature pages ([4d6c13d](https://github.com/maf248/eco-metrics-earth/commit/4d6c13d7b18a6fa8d1d395a6af6ff781d2af54c0))

## [2.12.0](https://github.com/maf248/eco-metrics-earth/compare/v2.11.4...v2.12.0) (2026-10-24)

### Features

* **data-sources:** add data sources catalog, page and site footer ([37d7a0d](https://github.com/maf248/eco-metrics-earth/commit/37d7a0dbd2d203d9c6b6c7aa09a2d704800f24f6))

## [2.11.4](https://github.com/maf248/eco-metrics-earth/compare/v2.11.3...v2.11.4) (2026-10-23)

### Bug Fixes

* **deps:** update undici and serialize-javascript for dev-tooling advisories ([58be4ef](https://github.com/maf248/eco-metrics-earth/commit/58be4efb7710433dbf43ccbfbc3dc7ed02e0873d))

## [2.11.3](https://github.com/maf248/eco-metrics-earth/compare/v2.11.2...v2.11.3) (2026-10-23)

### Bug Fixes

* **deps:** update fast-uri to 3.1.9 for four URI parsing advisories ([abcd702](https://github.com/maf248/eco-metrics-earth/commit/abcd702909eea36824c7a977b2e303d199e3f61d))

## [2.11.2](https://github.com/maf248/eco-metrics-earth/compare/v2.11.1...v2.11.2) (2026-10-23)

### Bug Fixes

* **deps:** update body-parser to 2.4.0 for GHSA-27r3-jxmh-p828 ([39aba65](https://github.com/maf248/eco-metrics-earth/commit/39aba654d96a93f0df772ca96b0b77fa2957a6aa))

## [2.11.1](https://github.com/maf248/eco-metrics-earth/compare/v2.11.0...v2.11.1) (2026-10-23)

### Bug Fixes

* **deps:** update zod to 4.6.7 for GHSA-mrhx-c7xc-m3w5 ([7b0803a](https://github.com/maf248/eco-metrics-earth/commit/7b0803a0ecbc990247eec73ad54ffba40068d070))

## [2.11.0](https://github.com/maf248/eco-metrics-earth/compare/v2.10.2...v2.11.0) (2026-10-23)

### Features

* **web:** improve SEO titles, descriptions and social card copy ([2623dde](https://github.com/maf248/eco-metrics-earth/commit/2623dde54e597af528b455d4dba75a90190d6ba1))

### Bug Fixes

* **deps:** bump next to 16.4.2 for critical security advisories ([4f36612](https://github.com/maf248/eco-metrics-earth/commit/4f366127a56668ca25b6b66ee6cabf5dc37ddd01))
* **deps:** override follow-redirects to 1.16.1 for credential-leak advisories ([a7ee497](https://github.com/maf248/eco-metrics-earth/commit/a7ee4972c78045c64f2ed04ecad6d948f11e5ba5))
* **web:** raise contrast of brand enter affordance and stabilize a11y audit ([46e6e18](https://github.com/maf248/eco-metrics-earth/commit/46e6e18ca77642c67a039b4918ae66ce6af20c9b))

## [2.10.2](https://github.com/maf248/eco-metrics-earth/compare/v2.10.1...v2.10.2) (2026-10-11)

### Bug Fixes

* **api:** bump proxy-addr to 2.0.8 for GHSA-jqcg-44mw-7w3h ([f06a5af](https://github.com/maf248/eco-metrics-earth/commit/f06a5afb1e9cf8f2747d93a59030c8b99817d9fc))

## [2.10.1](https://github.com/maf248/eco-metrics-earth/compare/v2.10.0...v2.10.1) (2026-10-11)

### Bug Fixes

* **api:** remove package managers from the runtime image ([b98d593](https://github.com/maf248/eco-metrics-earth/commit/b98d593d90f7b7af8da559e39ce17ee1bfb9658c))

## [2.10.0](https://github.com/maf248/eco-metrics-earth/compare/v2.9.0...v2.10.0) (2026-10-10)

### Features

* **deploy:** add dev Cloud Run service from develop and deploy production API from main ([562d0ad](https://github.com/maf248/eco-metrics-earth/commit/562d0ad349b476e8a791b0a3048ec5f961ab75d9))

### Bug Fixes

* **web:** retry the BFF fetch and never cache a failed water-footprint render ([d7c340e](https://github.com/maf248/eco-metrics-earth/commit/d7c340e53b7a465ed03536830c97c5cb7649b73c))

## [2.9.0](https://github.com/maf248/eco-metrics-earth/compare/v2.8.1...v2.9.0) (2026-10-09)

### Features

* **deploy:** gate API and web production deploys on CI and make the API image reproducible ([fd3bdd6](https://github.com/maf248/eco-metrics-earth/commit/fd3bdd6a8ef8dc2bf93baa685198b0a7f6fa5897))

## [2.8.1](https://github.com/maf248/eco-metrics-earth/compare/v2.8.0...v2.8.1) (2026-10-09)

### Bug Fixes

* **web:** add PNG social card and PWA icons, single robots group, drop Google Fonts from CSP ([d9041f7](https://github.com/maf248/eco-metrics-earth/commit/d9041f7998ea29f9f03fdaad00b00d133f3df5e4))

## [2.8.0](https://github.com/maf248/eco-metrics-earth/compare/v2.7.1...v2.8.0) (2026-10-08)

### Features

* **api:** rate-limit per real client IP behind Cloud Run and add graceful shutdown ([f474560](https://github.com/maf248/eco-metrics-earth/commit/f474560e5cd99f81797153924ffdd8ac8531f6a4))

## [2.7.1](https://github.com/maf248/eco-metrics-earth/compare/v2.7.0...v2.7.1) (2026-10-06)

### Bug Fixes

* **api:** reject inherited keys and non-array datasets in water-footprint service ([9b183f5](https://github.com/maf248/eco-metrics-earth/commit/9b183f5525ebed00cbd2e2dd16f5afb3451d37c0))
* **tooling:** use checkout hook args and detect lockfile-only changes ([7c009f3](https://github.com/maf248/eco-metrics-earth/commit/7c009f37b864b58a9153e02787fdd2db1c089242))

## [2.7.0](https://github.com/maf248/eco-metrics-earth/compare/v2.6.3...v2.7.0) (2026-10-03)

### Features

* **api:** add OWID data foundation layer ([1ebdbe0](https://github.com/maf248/eco-metrics-earth/commit/1ebdbe04c8ba92893819ce661042cd6decc5d015))

## [2.6.3](https://github.com/maf248/eco-metrics-earth/compare/v2.6.2...v2.6.3) (2026-10-03)

### Bug Fixes

* **web:** make equivalent pluralization follow the displayed quotient ([5a031a0](https://github.com/maf248/eco-metrics-earth/commit/5a031a064055c8299a201d44e9384b096a8acc65))
* **web:** trim padded env values in base URL helpers ([92c21aa](https://github.com/maf248/eco-metrics-earth/commit/92c21aaa61c21c0dc3d441310f8cde1912297d5d))

## [2.6.2](https://github.com/maf248/eco-metrics-earth/compare/v2.6.1...v2.6.2) (2026-10-02)

### Bug Fixes

* **postman:** fix broken slugs and dead charts, reorganize into collections/ and environments/ ([91421d9](https://github.com/maf248/eco-metrics-earth/commit/91421d90a827a5034bfab7a51201e056ba05d3a0))

## [2.6.1](https://github.com/maf248/eco-metrics-earth/compare/v2.6.0...v2.6.1) (2026-09-30)

### Bug Fixes

* **deps:** bump multer security override to 2.4.0 ([54dcd89](https://github.com/maf248/eco-metrics-earth/commit/54dcd89add2459c401f8458eb8a93a8228fc9a98))

## [2.6.0](https://github.com/maf248/eco-metrics-earth/compare/v2.5.1...v2.6.0) (2026-09-29)

### Features

* **api:** support multiple CORS origins with optional pattern for Vercel previews ([1d49466](https://github.com/maf248/eco-metrics-earth/commit/1d494666a42dc365f142f05c74ba0fe564f8b70f))

## [2.5.1](https://github.com/maf248/eco-metrics-earth/compare/v2.5.0...v2.5.1) (2026-09-23)

### Bug Fixes

* **release:** migrate release configs to ESM and fix scope-filtered triggering ([d8475ab](https://github.com/maf248/eco-metrics-earth/commit/d8475aba2d1b697440480f20dd5849ec2c9a1255))
* **release:** pin conventionalcommits preset to v9 for writer compatibility ([2de58dc](https://github.com/maf248/eco-metrics-earth/commit/2de58dc74de66df5809dcda54570ef2da6abdd69))

## [2.5.0](https://github.com/maf248/eco-metrics-earth/compare/v2.4.2...v2.5.0) (2026-09-22)

### Features

* **water-footprint:** add vehicles and energy-extractives category types ([531b99a](https://github.com/maf248/eco-metrics-earth/commit/531b99af4cc88de1fbca94e1fa60887f3229227b))
* **water-footprint:** curate dataset and expand to 60 products ([1e056c0](https://github.com/maf248/eco-metrics-earth/commit/1e056c0f0ab4237db7e43349c933965dc41f2db6))

## [2.4.2](https://github.com/maf248/eco-metrics-earth/compare/v2.4.1...v2.4.2) (2026-09-19)

### Bug Fixes

* **tooling:** make web typecheck wait for shared build ([8fdd7a5](https://github.com/maf248/eco-metrics-earth/commit/8fdd7a55583ba422d68ede06e405671cd25a3fb9))

## [2.4.1](https://github.com/maf248/eco-metrics-earth/compare/v2.4.0...v2.4.1) (2026-09-19)

### Bug Fixes

* **web:** keep sidebar brand on one line and make desktop nav scrollable ([53efe08](https://github.com/maf248/eco-metrics-earth/commit/53efe082446cdfb001abf845cc17260680ad1a6b))

## [2.4.0](https://github.com/maf248/eco-metrics-earth/compare/v2.3.0...v2.4.0) (2026-09-19)

### Features

* **water-footprint:** add water type discriminator and computing category ([f5f6d37](https://github.com/maf248/eco-metrics-earth/commit/f5f6d3717737593547c21b179fb5254c82676432))

## [2.3.0](https://github.com/maf248/eco-metrics-earth/compare/v2.2.1...v2.3.0) (2026-09-16)

### Features

* **web:** add COOP, CORP and stricter CSP directives ([e542bc0](https://github.com/maf248/eco-metrics-earth/commit/e542bc00b1cd89f37ee3ba9c9851c4fab7cca8c1))

## [2.2.1](https://github.com/maf248/eco-metrics-earth/compare/v2.2.0...v2.2.1) (2026-09-15)

### Bug Fixes

* **water-footprint:** correct filter active-state scoping, add focus ring and footnote spacing ([ba794a1](https://github.com/maf248/eco-metrics-earth/commit/ba794a1fb9aaa3293320aec553ce5012cab36b9a))
* **web:** make bottom nav opaque so page content does not show through ([d54ebe2](https://github.com/maf248/eco-metrics-earth/commit/d54ebe2b66ce022e95c97af4c8bc260e7fa81b26))

## [2.2.0](https://github.com/maf248/eco-metrics-earth/compare/v2.1.2...v2.2.0) (2026-09-15)

### Features

* **water-footprint:** add product table UI with filters, sort and a11y ([0ddaceb](https://github.com/maf248/eco-metrics-earth/commit/0ddaceb80f3cbd32c1feef379ca880622169199d))

### Bug Fixes

* **deps:** patch concurrently to 9.2.4 to clear critical shell-quote advisories ([80a60d9](https://github.com/maf248/eco-metrics-earth/commit/80a60d99870e18af540caf2210f55b0729729b73))

## [2.1.2](https://github.com/maf248/eco-metrics-earth/compare/v2.1.1...v2.1.2) (2026-09-14)

### Bug Fixes

* **e2e:** make webServer readiness deterministic with a wrapper ([217c179](https://github.com/maf248/eco-metrics-earth/commit/217c179cf3a168105d62d849be68a5318bf945b0))

## [2.1.1](https://github.com/maf248/eco-metrics-earth/compare/v2.1.0...v2.1.1) (2026-09-11)

### Bug Fixes

* **deps:** apply security batch of minor updates (next 16.3.4, sharp 0.35.4, react 19.3.0) ([6672c93](https://github.com/maf248/eco-metrics-earth/commit/6672c93b73b74ea30a75e82bb6793137f30a97db))

## [2.1.0](https://github.com/maf248/eco-metrics-earth/compare/v2.0.2...v2.1.0) (2026-07-13)

### Features

* **water-footprint:** implement Phase 2 — static dataset + BFF endpoint ([b56ca7e](https://github.com/maf248/eco-metrics-earth/commit/b56ca7ec347fb72f93a67cafec961295dc918d15))

### Bug Fixes

* **api:** resolve ESM module resolution failure in shared package ([e8c978b](https://github.com/maf248/eco-metrics-earth/commit/e8c978bb32149752131b049f7288ac7d1af74ae3))

## [2.0.2](https://github.com/maf248/eco-metrics-earth/compare/v2.0.1...v2.0.2) (2026-07-01)

### Bug Fixes

* **config:** update reviewer agent model to kimi-k2.6 (kimi-k2.5 removed from OpenCode Go) ([045fa49](https://github.com/maf248/eco-metrics-earth/commit/045fa492eee01ae57284f2f7b88eac82afa6d6eb))

## [2.0.1](https://github.com/maf248/eco-metrics-earth/compare/v2.0.0...v2.0.1) (2026-06-08)

### Bug Fixes

* **icons:** restore missing SVG paths and colors for ocean-health and reforestation ([f64fe9b](https://github.com/maf248/eco-metrics-earth/commit/f64fe9bf935849cc7cd66f5013f15488e8d78c0d))

## [2.0.0](https://github.com/maf248/eco-metrics-earth/compare/v1.14.0...v2.0.0) (2026-06-08)

### ⚠ BREAKING CHANGES

* **web:** rename renewable-energy category to energy-sources

### Features

* **web:** rename renewable-energy category to energy-sources ([7d512a8](https://github.com/maf248/eco-metrics-earth/commit/7d512a8de760f09fc4d33807a9e1ba3eba2e8af3))

## [1.14.0](https://github.com/maf248/eco-metrics-earth/compare/v1.13.0...v1.14.0) (2026-06-06)

### Features

* **web:** add error boundary with alert role, metadata, and reset action ([f92a0cd](https://github.com/maf248/eco-metrics-earth/commit/f92a0cddff31fbaa2c25be19db77dc584781f7c8))

## [1.13.0](https://github.com/maf248/eco-metrics-earth/compare/v1.12.0...v1.13.0) (2026-06-06)

### Features

* **web:** optimize navigation UX with React.memo and loading skeleton ([2424ebb](https://github.com/maf248/eco-metrics-earth/commit/2424ebb4ea016ad46ffeab85e1e8b1ab53a2fce2))

## [1.12.0](https://github.com/maf248/eco-metrics-earth/compare/v1.11.0...v1.12.0) (2026-05-27)

### Features

* **web:** add light/dark theme support with settings toggle ([9f999da](https://github.com/maf248/eco-metrics-earth/commit/9f999da9d391adbbfa6fd301128b8b39cde2fd24))

## [1.11.0](https://github.com/maf248/eco-metrics-earth/compare/v1.10.2...v1.11.0) (2026-05-27)

### Features

* **web:** add light/dark theme support with settings toggle ([036391b](https://github.com/maf248/eco-metrics-earth/commit/036391bdb48d0ff282a3209c53251b2eeb7077f1))

## [1.10.2](https://github.com/maf248/eco-metrics-earth/compare/v1.10.1...v1.10.2) (2026-05-23)

### Bug Fixes

* **vercel:** move ignoreCommand to script to stay under 256-char limit ([3cb3c4b](https://github.com/maf248/eco-metrics-earth/commit/3cb3c4be2e454dc938cd776efa1a8c1bb509c611))

## [1.10.1](https://github.com/maf248/eco-metrics-earth/compare/v1.10.0...v1.10.1) (2026-05-23)

### Bug Fixes

* **web:** align not-found layout with home page ([28a9260](https://github.com/maf248/eco-metrics-earth/commit/28a9260b17b822cee777944579d07fe0dafcc053))

## [1.10.0](https://github.com/maf248/eco-metrics-earth/compare/v1.9.0...v1.10.0) (2026-05-23)

### Features

* **api:** add Swagger/OpenAPI and global exception filter ([2ba0fd3](https://github.com/maf248/eco-metrics-earth/commit/2ba0fd3437fd0a9aeeaead4b4db81ecfc1c4427b))

### Bug Fixes

* **e2e:** update validation error assertion to match new ApiResponse<T> format ([b31401b](https://github.com/maf248/eco-metrics-earth/commit/b31401b9c4a4dc50e45c266ef20779645257206d))

## [1.9.0](https://github.com/maf248/eco-metrics-earth/compare/v1.8.1...v1.9.0) (2026-05-23)

### Features

* **release:** add scope-filtered changelogs via .releaserc.cjs, document independent versioning ([50d222c](https://github.com/maf248/eco-metrics-earth/commit/50d222c1d0770fcf3d383e6b73be9fd872797667))

## [1.8.1](https://github.com/maf248/eco-metrics-earth/compare/v1.8.0...v1.8.1) (2026-05-23)

### Bug Fixes

* **deploy:** use Vercel env vars for ignoreCommand to handle first deploy ([4611469](https://github.com/maf248/eco-metrics-earth/commit/461146960fcedea942261c8a9ffdd9520698c8a1))

## [1.8.0](https://github.com/maf248/eco-metrics-earth/compare/v1.7.1...v1.8.0) (2026-05-23)

### Features

* **e2e:** add end-to-end test suite (69 tests across 5 browsers) ([c9521d9](https://github.com/maf248/eco-metrics-earth/commit/c9521d9b67d11ebf955079cab1286b435307ccfc))
* **e2e:** add Playwright project scaffold and configuration ([e8f7bce](https://github.com/maf248/eco-metrics-earth/commit/e8f7bce3a251409cd92ce0dc004768cda686701c))
* **web:** add Water Footprint section with category page and icon ([c44b51b](https://github.com/maf248/eco-metrics-earth/commit/c44b51b283c2531153c1d7574b70e927acfa2870))

### Bug Fixes

* **ci:** install all Playwright browsers, run full suite ([8406d4e](https://github.com/maf248/eco-metrics-earth/commit/8406d4edf440968ef9dfed3b9a53f4523d83d6d0))
* **ci:** scope E2E to chromium-desktop only in CI ([892b679](https://github.com/maf248/eco-metrics-earth/commit/892b6795535fca6fa198cbd156e605304b0c7a55))

## [1.7.1](https://github.com/maf248/eco-metrics-earth/compare/v1.7.0...v1.7.1) (2026-05-23)

### Bug Fixes

* **deps:** downgrade TypeScript 6.0.3 to 5.9.3 to resolve [@module-federation](https://github.com/module-federation) peer dep conflicts ([824c00b](https://github.com/maf248/eco-metrics-earth/commit/824c00b9eaa9836aaf39d2220607b5f632f9461f))
* **test:** run tests serially to prevent garbled interleaved output ([54c1019](https://github.com/maf248/eco-metrics-earth/commit/54c101934141979df6b94aa3d8264769374afdcb))

## [1.7.0](https://github.com/maf248/eco-metrics-earth/compare/v1.6.1...v1.7.0) (2026-05-22)

### Features

* **api:** add global DTO validation with class-validator and class-transformer ([65af91d](https://github.com/maf248/eco-metrics-earth/commit/65af91d2a0647114d420f5e9cfc0cb87af2d81a9))
* **husky:** add openspec archive warning to pre-commit hook ([9ce4291](https://github.com/maf248/eco-metrics-earth/commit/9ce4291ec32c10541562411951bb67bc2f5ea12c))
* **web:** add mobile header with terminal typewriter brand animation ([1f2c8b0](https://github.com/maf248/eco-metrics-earth/commit/1f2c8b00e3a73e98a78a0fb7c576bc0603399704))
* **web:** add mobile header with terminal typewriter brand animation ([e4d536a](https://github.com/maf248/eco-metrics-earth/commit/e4d536a9d058e1b330f396155a8f86de7c596f66))
* **web:** improve mobile nav layout and page content positioning ([d7399d1](https://github.com/maf248/eco-metrics-earth/commit/d7399d135735a69ac10901426124dab3fe88f5fe))
* **web:** improve mobile nav layout and page content positioning ([20bcf66](https://github.com/maf248/eco-metrics-earth/commit/20bcf6651f5ff3c5c3962e5a216b237ee9123066))

### Bug Fixes

* **ci:** disable husky hooks in release workflow to allow semantic-release push to main ([a235c72](https://github.com/maf248/eco-metrics-earth/commit/a235c72091d2d9e6cefb0384b3ee5d0c710127e2))
* **deps:** regenerate package-lock.json with Node 24 ([14f6ade](https://github.com/maf248/eco-metrics-earth/commit/14f6ade94d0d11047ab80590f8032ab389d4d759))
* **husky:** make openspec pre-commit check resilient to missing CLI ([178efa1](https://github.com/maf248/eco-metrics-earth/commit/178efa115559bb53147756f398f909e63ee07c7d))
* **icons:** center GlobalTemperatureIcon by adjusting viewBox origin ([a0b9caf](https://github.com/maf248/eco-metrics-earth/commit/a0b9caf54697d2d30906ed7f5c6ff24249ee797d))
* **web:** widen desktop sidebar from w-64 to w-72 to fit brand text in one line ([4c53b1a](https://github.com/maf248/eco-metrics-earth/commit/4c53b1ad658ccb51af3a4af4b0161c475491930d))
* **web:** widen desktop sidebar from w-64 to w-72 to fit brand text in one line ([68dd85d](https://github.com/maf248/eco-metrics-earth/commit/68dd85d156d91f74c7e1297e29f3a001d2427446))

## [1.6.1](https://github.com/maf248/eco-metrics-earth/compare/v1.6.0...v1.6.1) (2026-05-17)

### Bug Fixes

* **api:** correct jest config reference in tsconfig.spec.json ([ee0843e](https://github.com/maf248/eco-metrics-earth/commit/ee0843ec44848c554a2b60cd9413edb0a0074418))

## [1.6.0](https://github.com/maf248/eco-metrics-earth/compare/v1.5.0...v1.6.0) (2026-05-16)

### Features

* **test:** enable Jest coverage reporting with thresholds (P8) ([f8edd5a](https://github.com/maf248/eco-metrics-earth/commit/f8edd5a850f19c8dc8d5462894edf517eedf2e20))

## [1.5.0](https://github.com/maf248/eco-metrics-earth/compare/v1.4.2...v1.5.0) (2026-05-10)

### Features

* **docs:** validate and fix Postman collections, enrich data source docs ([2762642](https://github.com/maf248/eco-metrics-earth/commit/2762642370bb8f50a1df51756eac22ae56623fc0))
* **tooling:** add eslint plugins, API smoke test, and scroll tests ([fd0bd85](https://github.com/maf248/eco-metrics-earth/commit/fd0bd851cb300433eef86946d6dc1dfebc6b844b))

### Bug Fixes

* **deps:** add overrides for chokidar and readdirp to resolve npm ci conflicts ([7a8b878](https://github.com/maf248/eco-metrics-earth/commit/7a8b8785391e7f239965082dfde87990b89a973c))
* **deps:** downgrade eslint to v9 for jsx-a11y compatibility ([6cee0ad](https://github.com/maf248/eco-metrics-earth/commit/6cee0ad75f7e28b6f2875f74023d7b47066ae53e))
* **postman:** correct World Bank GHG indicators and add sectoral CO2 endpoints ([84d05ad](https://github.com/maf248/eco-metrics-earth/commit/84d05ad0df02ac797a5dd1672e730237d6a88918))
* **release:** ignore non-app scopes and add Git config to workflow ([29e27ae](https://github.com/maf248/eco-metrics-earth/commit/29e27ae575558a7533a401e44f7abc3e5fe94886))

## [1.4.2](https://github.com/maf248/eco-metrics-earth/compare/v1.4.1...v1.4.2) (2026-05-10)

### Bug Fixes

* **config:** add jest types and __tests__ include to tsconfig.json for VS Code ([80fa787](https://github.com/maf248/eco-metrics-earth/commit/80fa7874e846f0eafac97efd43107d5d514534f0))

## [1.4.1](https://github.com/maf248/eco-metrics-earth/compare/v1.4.0...v1.4.1) (2026-05-10)

### Bug Fixes

* **tests:** fix VS Code type errors in test files ([71ea5e9](https://github.com/maf248/eco-metrics-earth/commit/71ea5e9d5507c3b69d34e71e134a0a337bb98011))

## [1.4.0](https://github.com/maf248/eco-metrics-earth/compare/v1.3.1...v1.4.0) (2026-05-10)

### Features

* **a11y:** fix skip-link focus, CO2 title, NavLink normalisation, icon title props, aria-labels ([6ba74c3](https://github.com/maf248/eco-metrics-earth/commit/6ba74c3b006e290909ef9c742e943c963282cb75))

## [1.3.1](https://github.com/maf248/eco-metrics-earth/compare/v1.3.0...v1.3.1) (2026-05-10)

### Bug Fixes

* **security:** allow unsafe-eval in CSP for dev mode (React Turbopack HMR) ([3c57771](https://github.com/maf248/eco-metrics-earth/commit/3c57771ea8ae687e66c98e69aed343659c5181bb))

## [1.3.0](https://github.com/maf248/eco-metrics-earth/compare/v1.2.0...v1.3.0) (2026-05-10)

### Features

* **seo:** add OG/Twitter metadata, PWA icons, SSG categories, sitemap/robots improvements ([9f73612](https://github.com/maf248/eco-metrics-earth/commit/9f73612320b4590f9c9db40b7c78657ea0da0a4e))

## [1.2.0](https://github.com/maf248/eco-metrics-earth/compare/v1.1.0...v1.2.0) (2026-05-10)

### Features

* **security:** add helmet, cors validation, rate limiting, and security headers ([421c06b](https://github.com/maf248/eco-metrics-earth/commit/421c06b0f56b7148dc9b0e3131201b50796f1a00))

## [1.1.0](https://github.com/maf248/eco-metrics-earth/compare/v1.0.1...v1.1.0) (2026-05-03)

### Features

* **web:** add SEO metadata, discovery routes, a11y landmark fix, and inline SVG icons ([de5b256](https://github.com/maf248/eco-metrics-earth/commit/de5b2566bd1942c7ff181cbc539aff1699eb6c72))

## [1.0.1](https://github.com/maf248/eco-metrics-earth/compare/v1.0.0...v1.0.1) (2026-05-02)

### Bug Fixes

* **web:** fix LCP priority, navbar alt text, focus-visible ring, and Oops heading ([934d73c](https://github.com/maf248/eco-metrics-earth/commit/934d73c11237bc9ac1198437867ae05b42e4c633))

## 1.0.0 (2026-05-01)

### Features

* **api:** add bootstrap error handling, CORS, joi env validation and config tests ([456dfca](https://github.com/maf248/eco-metrics-earth/commit/456dfcaf2d6547e6d67e872b4df72943182367b2))
* **monorepo:** set up NX monorepo base with web, api and shared package ([54b71f7](https://github.com/maf248/eco-metrics-earth/commit/54b71f76397dcda7f7dcc151f1d1621535969142))
* **release:** add root-level global versioning and CHANGELOG via semantic-release ([68aba55](https://github.com/maf248/eco-metrics-earth/commit/68aba553fe2bb7a281e8e6ceaf785352508a4a11))
* **release:** add semantic-release with per-app versioning and GitHub Actions workflow ([fed0064](https://github.com/maf248/eco-metrics-earth/commit/fed0064ad0961b3502186de612c86e36095fac1f))
* **web:** add 404 not-found page, validate category slugs, and double logo sizes ([d2bf01f](https://github.com/maf248/eco-metrics-earth/commit/d2bf01f897c36bd893c1b82b54c31a6a66091753))
* **web:** add responsive navbar with eco-category links and dynamic category pages ([4135e79](https://github.com/maf248/eco-metrics-earth/commit/4135e79a18f3bccff1803201197919373513c8c1))
* **web:** add skip-to-content link and clean up dark mode classes ([00a2ff4](https://github.com/maf248/eco-metrics-earth/commit/00a2ff48d933146725be12a8841ed09d68197e67))
* **web:** enforce trailing slash convention and add SEO guidelines ([9860606](https://github.com/maf248/eco-metrics-earth/commit/986060683ac3e2697c722ba0de216f7207075d7e))
* **web:** improve nav with brand link, scroll affordance, and list semantics ([8c8d1e6](https://github.com/maf248/eco-metrics-earth/commit/8c8d1e62a0988a99e3941b4a787e562088c7073b))
* **web:** replace inline SVG icons with SVG assets and add 5 new eco categories ([620ed64](https://github.com/maf248/eco-metrics-earth/commit/620ed6462868ed9c65c8ba31bc5592123ded2ca9))

### Bug Fixes

* **api,web,shared:** add missing return type, remove jest type leak, rewrite shared README ([c7101d0](https://github.com/maf248/eco-metrics-earth/commit/c7101d0b646d150982c71f9d3be4b41f3eceb1fd))
* **config:** apply critical nx, ts, webpack and dependency fixes ([6a6a257](https://github.com/maf248/eco-metrics-earth/commit/6a6a25798c25a8a0d7f8a32a5d6c94f929c88ede))
* **tooling:** fix nx, ts, jest-swc, eslint config and code quality issues ([8998aac](https://github.com/maf248/eco-metrics-earth/commit/8998aace16982af8323c24d9e95e4ab846c14d83))
* **web:** make category icon decorative, use metadata title template, fix nav gradient ([2fe9eb6](https://github.com/maf248/eco-metrics-earth/commit/2fe9eb6c077ddf13d22fc04ba590bed6a42bbf5e))
