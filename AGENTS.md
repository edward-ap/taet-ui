# Tæt UI release candidate

Start with docs/AI_CONTEXT.md, docs/LLM_GUIDE.md and the relevant row of docs/AI_MAP.md.
Read exact public declarations and one checked recipe. docs/STABLE_API.md tracks
maturity; docs/TIERS.md tracks architecture. These are different dimensions.

- Keep runtime dependency-free and compose live Control instances.
- Form owns rows/columns before mount. Mount general Panel before add/attach.
- Values use .value; collection changes use DataStore; silent still synchronizes UI.
- Owners destroy descendants. Stop callback phases after teardown.
- Grid/TreeGrid changes require an explicit user instruction. The approved
  candidate is pinned in provenance/grid-candidate.json; preserve the immutable
  imported source-snapshot.json and regenerate candidate hashes only after review.
  Run their regressions after changing shared mechanics.
- Specialized reader/raster, Painter, StockChart, FlatFile, Spectrum and Pivot
  extensions are deferred, not missing APIs to re-invent in foundation.
- Never import the archive or private applications. Use local package exports.
- Run npm test, npm run test:all, build/pack/bundle and available-engine browser gates.
  Browser concurrency defaults to 32 isolated workers; Windows WebKit is capped at one after observed parallel instability; use separate ports/outputs
  for independent runs, and verify timing-sensitive failures without load.
- After exports change run npm run docs:api; preserve tier and maturity boundaries.
- Keep generated dist, node_modules, reports and caches out of Git. Record exact
  checks and remaining limitations in docs/VERIFICATION.md.
- Local Git initialization is allowed. Push, publication and external sharing
  need a separate user instruction.
