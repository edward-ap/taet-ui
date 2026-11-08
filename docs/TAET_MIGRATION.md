# Tæt UI migration and compatibility

Display name: Tæt UI. Package, import and repository name: taet-ui.
The public repository is https://github.com/edward-ap/taet-ui.
The current 0.6.0-rc.5 candidate retains published rc.3/rc.4 source, npm versions,
GitHub releases and assets unchanged. Each new publication has its own version
and assets; exact outcomes are recorded in the matching GitHub prerelease notes.

## Source inventory

- Released rc.2 baseline: 1e51bdc8baa99130954206b0aff6367b0764e9d6, 878 tracked files.
- Feedback base: be78df1056d1c25369b989f51d7819f37c88c8fd, included through rc.2.
- Original working source: 18c65890435e1bae97af262a20ced705e0e49e4f, preserved separately.
- Accepted PropertyGrid presentation patch: category-border gutter inset and removal
  of the selected-row blue pseudo-element, preserving background/focus/keyboard.
  Original patch SHA-256: 3c62abcc2f6bedad1b2c9da3a1b3d8255193645cf201237f2ee78135ec1a5ac2.
- Excluded: unaccepted SelectInput proposal, application-specific radio styling,
  old specialized Painter/Viewport/StockChart/FlatFile/Spectrum/Pivot extensions.

Initial commit d03a9c0, harness fix 635df4a and rc.3 preparation/history remain.
The immutable imported source-snapshot.json stays byte-for-byte unchanged.
The rc.4 Grid candidate changes only the reviewed row-drag display text; the other
46 reviewed source hashes and all imported hashes remain unchanged. No row move,
selection, event, MIME or ownership behavior is changed by that presentation edit.
Exact current hashes are in provenance/grid-candidate.json.

## Current names and retained compatibility

Canonical CSS import: taet-ui/taet-ui.css. The taet-ui/dense.css export and
src/ui/dense.css file stay as forwarding aliases for installed consumers.
The immutable imported manifest also records that original stylesheet filename.
The dui-* classes, data-dui-* attributes and --dui-* tokens remain CSS/DOM contracts.
Semantic compact/density options and ordinary English wording retain their meaning.

Theme export writes format taet-ui-theme, version 1, and .taet-theme.json filenames.
Import also accepts dense-ui-theme version 1 and the existing bare definitions.
Older implementations do not understand the new format tag; backward reading is
provided by the new implementation, not by rewriting already published packages.

Preset storage reads taet-ui.theme-editor.v1 first and falls back to
dense-ui.theme-editor.v1 only when the current key is absent. An empty current
array is authoritative. No eager write occurs on mount. The next preset mutation
writes the full collection to the current key, leaving the previous key untouched.

Canonical documentation/example globals are taetUiDocs and taetThemeEditor.
denseUiDocs and denseThemeEditor remain aliases to the same objects for existing
inspection and documented host integrations. New examples/tests use current names.

application/x-dense-ui-grid-rows and application/x-dense-ui-tree-nodes stay as
cross-version drag MIME contracts. Their runtime strings and compatibility tests
are intentional residuals; renaming them would require a separate protocol change.
The plain-text row drag label is Tæt UI rows.

## Boundaries

Zero runtime dependencies, existing constructors, exports and maturity tiers remain.
No external application, original source directory, historical tag or remote is edited.
Only tracked framework inputs are packaged; generated dist/distribution, dependencies,
reports, caches and private diagnostics remain out of Git. MIT/OFL attribution and
third-party license text are retained. Native rebuilds and physical-input acceptance
are separate from browser automation. See VERIFICATION.md for exact checked inputs.
