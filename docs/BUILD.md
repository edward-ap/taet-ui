# Portable delivery

From a source checkout run npm ci and npm run build. Exact-pinned esbuild is
build-only. Runtime does not require Node/Python or a server.

Dist contains readable/minified ESM/CSS/maps, fonts/NotoSans-variable.woff2 + OFL,
LICENSE/notices/README, size-report and full/components/foundation metafiles.
The full profile is dist/; alternatives are dist/components/ and dist/foundation/.
Full contains retained stable/experimental APIs plus Advanced. Components contains
foundation+ordinary controls; Foundation has no component constructors.

Use one profile per document with matching CSS/fonts/notices. Profiles are separate
library instances. Complete shared CSS/fonts are retained deliberately; no unsafe
style purging. Specialized workers/reader profile are not shipped.

ES2022 is a syntax target, not API polyfills. Use HTTP/WebView origin, not file://
as a portability assumption. Maps embed sources and can be omitted from production.
Bundles do not flatten declarations; typed users use package entries.

size-report includes hashes, compression estimates, modules and source provenance.
Git state may be not-versioned/uncommitted/dirty/clean; no clean commit is invented.
Content SHA-256, immutable imported snapshot hash and approved Grid candidate
manifest hash identify pre-commit builds.
Run check-bundle.js and test:bundle. Native limits: [NATIVE_ACCEPTANCE](NATIVE_ACCEPTANCE.md).

## Standalone release archives

Each profile now has readable/minified ESM (`taet-ui[.min].js`) and classic IIFE
(`taet-ui.global[.min].js`, global `TaetUI`) plus matching CSS and source maps.
These are alternative instances: use one profile/format in a document.
`npm run distribution` builds and packages full/components/foundation ZIPs in
ignored distribution/. `npm run distribution -- --release` requires a clean
commit and matching current build provenance. Archives include a working classic
and ESM example, fonts/OFL, MIT/notices, PROVENANCE.json and SHA256SUMS.txt.
Source maps embed public framework code. Keep them for debugging or omit them
from a deployed host; JS/CSS/fonts/licenses must remain together.

The automated browser harness uses scripts/test-server.js (Node built-in HTTP).
It serves exact Buffer bytes/Content-Length and only binds loopback. The runner
checks its own child PID in readiness responses and reports fixture stderr.
The existing Python dev/docs server remains available. No app runtime server is
required by either portable format. Source npm exports remain typed ESM.
