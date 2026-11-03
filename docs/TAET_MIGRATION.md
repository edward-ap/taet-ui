# Tæt UI local migration

Display name: Tæt UI. Technical/package name: taet-ui. GitHub repository:
edward-ap/taet (https://github.com/edward-ap/taet), created public after explicit
maintainer authorization on 2026-11-03. Initial commit d03a9c0 was local-only; it
is preserved. A separate harness fix and release-preparation changes follow it.
GitHub release/CI and npm publication outcomes are verified separately.

## Source inventory and choice

| Input | Identity | Decision |
| --- | --- | --- |
| Original dense-ui | HEAD 18c65890435e1bae97af262a20ced705e0e49e4f with local edits | Older framework; preserved in place |
| Released rc.2 source | 1e51bdc8baa99130954206b0aff6367b0764e9d6, clean | All 878 tracked files copied as baseline |
| Runtime feedback base | be78df1056d1c25369b989f51d7819f37c88c8fd | Included through rc.2: Date sorting, Switch focus, fixture readiness and documentation |
| Accepted PropertyGrid production patch | codex/property-grid-presentation on rc.2 | Only src/ui/styles/property-grid.css integrated: 2 insertions, 11 deletions |
| SelectInput CORE_PROPOSAL.md | Investigation | Excluded; not an accepted framework patch |
| Radio application styling | Application-specific 24px square arrow and polish | Excluded; external consumers unchanged |
| Old archive/specialized extensions | Painter/Viewport/StockChart/FlatFile/Spectrum/Pivot | Excluded; released scope retained |

The PropertyGrid patch insets category borders past the +/- gutter and compensates
the triangle position; it removes only the selected-row blue pseudo-element marker.
Selection background, focus, keyboard behavior and JS API are preserved.
Its SHA-256 is 3c62abcc2f6bedad1b2c9da3a1b3d8255193645cf201237f2ee78135ec1a5ac2.
All 47 approved Grid/TreeGrid file hashes and immutable imported provenance bytes
are preserved. Candidate packageVersion alone advances to match the new package.

Version 0.6.0-rc.3 identifies these changed artifacts without reusing released rc.2.
No old tags/history are copied, moved or rewritten. MIT/OFL licenses and attribution
are retained. Historical verification and release notes keep their original names,
versions, links and exact evidence identities; they are not new migration results.

## Names and compatibility

Current documentation, package imports, examples, build profiles and portable assets
use taet-ui; human-facing titles use Tæt UI. Canonical CSS is taet-ui/taet-ui.css.
taet-ui/dense.css and src/ui/dense.css remain import aliases for CSS migration.
JavaScript export names and constructor identity remain unchanged.

The dui-* classes, --dui-* tokens, semantic density values, denseUiDocs inspection global, denseThemeEditor demo
host global, dense-ui.theme-editor.v1 local storage key, dense-ui-theme JSON format,
application/x-dense-ui-grid-rows and application/x-dense-ui-tree-nodes MIME types
remain compatibility contracts. Grid's legacy human-readable drag text also remains
to preserve reviewed source bytes. Do not globally replace the word dense.
Test runner configuration now uses TAET_UI_PORT/WORKERS/TEST_OUTPUT/TEST_SERVER.
Portable bundles are taet-ui[.min].js/css (full/components/foundation).

## Excluded local material and publication

Only baseline tracked files were selected: no old .git, node_modules, dist, reports,
private notes, caches, profiles, test artifacts or application implementations.
Original folders, accepted-patch worktrees and existing consumers remain in place.
The destination was empty immediately before copying.

The initial root private:true prevented accidental npm publication. The maintainer
subsequently authorized a public repository, GitHub prerelease and npm taet-ui
publication under next. Root publishConfig now selects public access/next; portable
profile package.json files remain private. Read-only registry lookup does not
reserve a name. No old repo visibility/tags or external consumers are changed.
Native Tauri rebuild and non-Windows native acceptance are not implied by browser checks.
