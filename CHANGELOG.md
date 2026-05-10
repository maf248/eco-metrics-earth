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
