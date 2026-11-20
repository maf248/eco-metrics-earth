## 1. Verification

- [x] 1.1 The ten NX family packages in the root `package.json` share one exact 23.x version, and the README tech-stack table shows the same version.
- [x] 1.2 `npm ls nx @nx/devkit @nx/js` shows no nested 22.x copies.
- [x] 1.3 `npx openspec validate --specs` passes after archiving.
