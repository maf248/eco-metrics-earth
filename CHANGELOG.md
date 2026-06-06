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
