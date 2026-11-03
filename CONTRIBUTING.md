# Contributing

Start with README, AGENTS.md, docs/AI_CONTEXT.md and the relevant docs/AI_MAP.md row.
Read exact declarations and a checked recipe before changing a public contract.
Runtime stays dependency-free. Preserve ownership/lifecycle, tier and maturity rules.

Table changes require explicit approval and review before regenerating the separate
candidate hashes. The immutable imported snapshot must retain its original bytes.
Run shared/table regressions when changing shared mechanics.

Use npm ci and npm test; then test:all, relevant compatibility/bundle gates and pack
inspection. Browser binaries are separate development prerequisites. Regenerate
API inventories after export changes. Keep exact results/limits in docs/VERIFICATION.md.
Do not commit generated dist/node_modules/reports/caches, binaries or private data.
Publication is a separate maintainer action. See docs/VERSIONING.md and SECURITY.md.
