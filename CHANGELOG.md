# Tæt UI changes

## 0.6.0-rc.4 - release candidate, 2026-11-03

- Clean current branding, remove the private historical CI link and update local benchmark/demo identifiers.
- Export taet-ui-theme v1 files as .taet-theme.json; keep importing the previous v1 format and bare definitions.
- Prefer taet-ui.theme-editor.v1 storage, fall back to the previous key and write only the current key; opening an editor does not migrate or erase stored data.
- Expose taetUiDocs and taetThemeEditor while retaining existing host aliases; preserve CSS selectors, CSS imports and cross-version drag MIME contracts.
- Rename the row-drag plain-text label to Tæt UI rows without changing reorder behavior.
- Add the real light/dark Atelier desktop showcase, a reproducible host example and documented consumer-trial limitations.
- Published rc.3 packages, release assets and source history remain unchanged. Publication outcomes are recorded in the matching GitHub prerelease notes.

## 0.6.0-rc.3 — local migration, 2026-11-03

- Rename display branding to Tæt UI, package/imports/assets to taet-ui.
- Preserve the released rc.2 framework scope and zero runtime dependencies.
- Integrate the accepted PropertyGrid gutter-border and selection-marker CSS patch.
- Retain legacy CSS selectors, tokens, drag/theme formats and the dense.css alias.
- Start new history, preserving the original project folders/tags and provenance.
- Use owned Node HTTP fixtures for browser gates; retain all assertions.
- Add classic TaetUI IIFE delivery alongside ESM, with minified variants and portable ZIP examples/checksums.
- Prepare public npm metadata and the next preview channel; publication outcomes are verified separately. See docs/TAET_MIGRATION.md.

The following pre-rename changelog is historical and keeps exact released versions.

# Changelog

## 0.6.0-rc.2 - preview (2026-11-02)

- TreeGrid compares pairs of valid Date values by timestamp. Equal timestamps remain stable within siblings; null placement, locale, and the legacy invalid/mixed-value fallback are unchanged. See `docs/GRID_TYPES.md`.
- Grid and TreeGrid settings buttons use a deterministic decorative SVG in the existing 10px service gutter. Row markers, drag gestures, menu scope, and keyboard focus remain unchanged.
- Added checked integration recipes for DTO dialog results, guarded asynchronous work and retry, master/detail context, ownership, application UI snapshots, and resize persistence. No new public runtime API or default policy is introduced.
- Fixed Switch cell-editor activation on WebKit so the native label default cannot override deliberate application focus. One toggle and callback-safe teardown are preserved. Forwarded private DOM clicks are synthetic (`isTrusted: false`); the original visual-label event is prevented. See `docs/GRID_EDITOR_MATRIX.md`.
- Browser fixtures await actual Date DOM paint, Mapper port geometry and editor focus before assertions or keyboard injection. Strict behavior assertions and global timeouts are unchanged.
- Windows CI uses two workers after a recorded `ERR_NO_BUFFER_SPACE` module-load failure. This is a conservative mitigation, not a proven explanation of the historical retained-renderer failure.
- The feedback base passed full Windows/Linux Node22/24 CI, three-engine compatibility and bundle gates. Its Windows Tauri/WebView2 stand passed 46/46 programmatic checks in each of two launches; the maintainer subsequently reported the manual interactive check passed. Exact inputs and limits are in `docs/VERIFICATION.md` and `docs/NATIVE_ACCEPTANCE.md`. The rc.1 tag and historical failed runs remain unchanged.

## 0.6.0-rc.1 - preview

### Working checkpoint - 2026-11-01

User hands-on acceptance confirmed Grid editing/editor fonts, the 10px gutter
and per-selected-row markers, multi-select, pinning/column reorder, cross-Grid
move/copy and local TreeGrid node-with-subtree moves. This local checkpoint
preserves the tested desktop baseline, not a publication or universal readiness
claim. Tree copy/cross-tree/remote/custom providers remain outside this scope;
a separate Windows Tauri/WebView2 stand later passed bounded programmatic checks
and user-observed row/subtree moves. Full physical input/IME and remote CI remain
unverified. Exact scope: docs/VERIFICATION.md and docs/NATIVE_ACCEPTANCE.md.


Grid column QA: measured multi-pin header/editor geometry, live backward-move
focus, stale/reentrant drag protection and delta Tree expanded-state restore.
The optional workbench column mode and editor matrix demonstrate row multi-select
with per-row markers; Check/Radio now have passive read visuals.

Managed overlays now use the common bundled-font tokens. The editor matrix shows
Switch state using the existing static indicator and explicit transactional edit
activation, with passive read visuals and no per-row Controls.

Grid editor matrix: nine existing factories on Grid/TreeGrid, typed nullable
Select values, common closed-Select/popup keyboard policy, compact Select/Radio
geometry, popup resize/focus and callback-safe teardown; live recipe11/example.
Disabling a table now silently cancels its draft and releases the owned popup.

Grid/TreeGrid indicator gutter now defaults to 10px instead of 20px; explicit
CSS widths and gutter/menu opt-outs remain supported.

- Foundation/components/advanced aliases over existing constructors; maturity unchanged.
- Specialized raster/Painter/StockChart/FlatFile/Spectrum/Pivot delivery deferred.
  Reader must retain its complete pinned 0.5 bundle.
- Form removes logical slots/values/subscriptions; composition owns children before mount.
- Stop late callback phases after teardown; ignore focus events during destruction.
- Reject terminal admission, duplicate/prototype keys and ownership cycles atomically.
- ShortcutManager respects defaultPrevented/IME, explicit editor opt-in, semantic keys
  and exact Meta priority over portable Ctrl/Cmd fallback.
- Grid/TreeGrid share silent selection invalidation, safe selection reentry, keyboard
  editing, beforeEditStart/commit metadata and schema reconciliation. Legacy APIs remain.
- Read-only tables no longer import the built-in editor catalog just to check a factory.
- Desktop tree/table/property workbench demonstrates shared data and edit context.
- Imported source hashes remain immutable; approved table changes have a separate candidate manifest.
- Runnable mutation example, exact docs routes, coherent assets and honest provenance.

Compatibility: duplicate pending Form slots now fail early; shortcuts in text
editors require opt-in. Specialized exports are intentionally absent, not emulated.

Table compatibility: legacy getSortState return types and Tree string/function
filters remain. getSortModel returns Rule[] on both. clearAllFilters({search})
explicitly chooses scope; omission retains each legacy default. Tab/Shift+Tab
now exit at editable boundaries rather than wrapping; invalid drafts retain focus.

- Shared presentation gutter (now 10px by default) carries the selected-row accent and table menu.
  Columns/Best fit all/global clears moved out of local column menus; reset is
  explicitly column layout only. Shared indicatorGutter/gridMenu constructor
  opt-outs preserve compact embedded layouts; data/ARIA/range/export indices stay.
- At a document edge with no external tabbable, Tab commits and releases table
  focus to the document body consistently in Chromium/Firefox/WebKit.
