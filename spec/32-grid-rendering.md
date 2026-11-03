# Grid rendering contract (experimental)

Grid and TreeGrid own an internal GridWindowRenderer. This is not a public export or a toolkit-wide scheduler. TreeGrid adds retained hierarchy glyphs, logical ARIA indices and viewport anchors across branch changes.

## Timing and identity

- Render callbacks should be pure. During painting, Grid checks custom column
  values/renderers, row classes, formatting predicates, details, group values,
  summaries/summary formatters, status formatters and editor/readOnly resolvers;
  TreeGrid checks column values/renderers and node icons. Teardown stops the pass.
  A model invalidation stops remaining obsolete work and schedules a fresh frame,
  including silent replacement. This is incremental DOM work, not transactional
  rendering: already updated cells remain until the next successful pass.
- Recursive `refresh()` during painting is ignored. Nested detail/summary changes
  retain their next paint. Eight consecutively invalidated passes cancel automatic
  retries and throw an explicit non-settling callback error. Consumer exceptions
  propagate, release the paint guard and cancel pending automatic retries; fix the
  callback and call `refresh()` to retry. Returned Nodes remain trusted,
  application-authored content; this guard does not sanitize them or own controls
  hidden inside them.

- Direct filter changes on an attached DataView/TreeDataView compose with table conditions before the projection rebuilds. There is no intermediate unfiltered projection or second rebuild to repair ownership. A same-result predicate still schedules table paint for status/UI state; it does not fabricate a semantic view change. TreeGrid silent filter/sort changes suppress filterChange/sortChange as well as projection change events.
- Selection/range models now emit technical invalidate after every accepted write, including silent. Tables synchronize selection DOM/ARIA/status/summary from that phase and forward semantic change only once. No-op/veto emits no invalidation; teardown/newer nested write stops later phases.
- Search and column models emit technical invalidate on silent changes too. Search updates its projection synchronously and schedules filter-mode paint; highlights and the search panel also synchronize when no projection change occurs. Column layout changes synchronize headers/body through GridCore. Compound layout operations defer redundant column paints. Silent writes emit no corresponding searchChange/layoutChange or view/page semantic events.
- DataStore/DataView mutations and semantic events are synchronous. Data, view and group invalidations schedule one paint for the next animation frame; scroll and resize join the same pending paint. Silent mutations still invalidate UI without public semantic change events.
- A scroll-only frame reuses the body when its row/column window and viewport geometry are unchanged. Headers/footers still follow horizontal scroll; cell renderers, selection synchronization and projection rebuilding are skipped. Any model/geometry invalidation in that frame forces a full pass, including invalidations issued by a renderer during the previous pass. User scrolling still cancels an active editor and restores its cell. Custom renderer output depending on external state should be refreshed explicitly, not through a scroll side effect.
- When a scroll-only frame crosses window boundaries with unchanged model and geometry, it reuses the prepared entries/offsets and renders only entering cells. Retained cell content and row metadata are preserved; leaving nodes are released, selection/ARIA are synchronized, and header/footer scrolling continues. Summaries/status are not recomputed for pure scroll. Invalidations, editing, resize and explicit refresh retain the full path, including reevaluation of retained custom renderer output. This does not make arbitrary data mutations or projection changes incremental.
- `grid.refresh()` synchronizes the DOM immediately and reevaluates detail content. Editing and keyboard navigation also synchronously materialize target cells, including after a queued data change.
- Initial creation builds the control shell first. `mount()` renders rows synchronously after BaseControl attaches the shell and measures it, avoiding a temporary full-column body during that first measurement. Mounting into hidden or detached hosts retains the unmeasurable-viewport fallback; showing the host resolves the window through resize observation (or an explicit `refresh()` when observation is disabled).
- Visible row nodes are keyed by row id (group rows by path); cells by column id. Primitive text is updated in place. Rows/cells leaving the overscan window are released; they are not cached indefinitely. A renderer returning a new Node replaces that cell's content. Retention is an optimization, not an application-facing DOM ownership API.
- DOM reconciliation removes departed children before inserting/reordering the desired children. Advancing a window does not move its retained rows/cells in front of an obsolete leading node; this preserves focused descendants and avoids invalidating their layout merely to delete that node afterward.
- `DataStore.batch` additionally reduces projection work and remains useful for imports and command transactions. Paint batching does not make sorting, filtering, grouping, summaries or source storage lazy.

## Two-dimensional window

- `virtualRows` and `virtualColumns` default to true and can be disabled independently at construction. Rows use `rowHeight` (or the resolved theme height), plus `virtualOverscan` rows on each side (default 6). Body columns use the horizontal viewport plus one track on each side; frozen tracks are always included.
- Used CSS header track widths are measured and cached until column layout or viewport width changes. Numeric, fractional, percentage and minmax tracks are supported. Intrinsic `auto`, `min-content` and `max-content` tracks retain all body columns. An unmeasurable/disconnected header also temporarily uses all columns.
- Data rows with measured, virtualized columns use their explicit total pixel width without the CSS `max-content` minimum. This avoids redundant intrinsic sizing as visible cells enter/leave. Full-column, intrinsic and unmeasurable fallback layouts retain the original minimum; changing column layout updates retained rows accordingly. Header/footer sizing is unchanged.
- Headers and summary footers retain all columns. Their widths and scroll positions match body tracks. Horizontal virtualization bounds body DOM; it does not bound header/footer work or source-array memory.
- `aria-rowcount`, `aria-colcount` and cell indices describe the logical projection, including grouped/detail rows, rather than only mounted nodes. Frozen selected cells retain sticky positioning.
- Grid selection synchronization resolves column indices once per pass when cell ranges exist, against the current visible column order. Empty ranges skip projection/index preparation while still clearing old range classes and updating row selection, active cells and accessible focus. Indices are not retained across paints; hidden or missing endpoints invalidate only their own range.

## Group and detail rows

- Group rows use the fixed row height while row virtualization is enabled. Their labels are clipped to that height. Collapsed descendants are excluded from the logical row window.
- Expanded details are entries in the same window. Their initial height estimate is three data rows; an owned ResizeObserver measures visible detail border-box height and watches later content resizes. Prefix offsets locate the visible range, and the top visible entry serves as an anchor during measurement corrections. Scrollbar estimates can change as previously unseen details are measured.
- Height measurements are retained only for expanded entries and invalidated by item replacement, viewport width changes or explicit refresh. The observer unobserves evicted detail DOM and disconnects on destroy.
- A detail callback is not invoked merely because another cell changes. It is reevaluated on item replacement, row-index/callback change, explicit refresh or reentry into the window. Persistent application state belongs outside detail DOM, which can be unmounted while offscreen.

## Editing and teardown

- An offscreen `startEdit` target is scrolled into view and painted before its editor mounts. The delayed scroll event from that positioning does not cancel the new editor.
- Resize keeps the live editor and its draft value, adjusting horizontal positioning as needed. Later scroll or projection changes follow existing edit-cancellation semantics. No offscreen DOM pool holds editors alive.
- Destroy cancels the pending frame, disconnects detail observations and releases DOM references. Externally supplied stores, views and models retain their existing ownership contracts.

Behavior regressions: `test/grid-window.test.js`, `browser-tests/grid-window.spec.js`, `browser-tests/grid-scroll-window.spec.js`, plus existing Grid/editor/docs/workbench browser checks. Performance measurements are descriptive, not timing assertions in CI.

## Incremental projections

DataView's stable-id update path replaces the projected/page item and id map without rebuilding the projection. It applies to ordinary DataStore identities and only when filters/comparators are absent or their toolkit-owned field dependencies are unchanged. Grid registers dependencies for built-in field filters and sorting; function-valued column accessors, custom comparators, global filters, search filters and custom identities use full refresh. Dependency registration is internal, not a public promise inferred from arbitrary user functions. Identity changes, structural mutations, batches, undo and explicit refresh also recompute.

Public event snapshots remain independent arrays with synchronous metadata and old/new item references. Silent updates emit invalidation only. An update outside the current page replaces the full projected item without fabricating a page change. Sorting/filtering/grouping dependency changes are never skipped. DataStore still owns all source records; events still allocate snapshot arrays, so this is not a claim of constant-time end-to-end updates.

TreeDataView caches parent/child lookups. Ordinary nonstructural updates replace the item in that hierarchy and in the visible entry, if present. Without filters/sorting/custom identity, expand/collapse modifies only the affected flattened branch. The remaining visible sequence and event snapshots still require array work. Custom filters and comparators are reevaluated conservatively. Parent/id changes and explicit refresh rebuild the hierarchy. Filtering visits descendants even when their parent matches, preserving all qualifying descendants.

TreeGrid observes silent invalidation as well as public changes. It anchors the top visible entry across branch changes; if that entry disappears, a visible ancestor is preferred. A live editor survives resize or unrelated branch updates while its row stays mounted. External replacement of its item, scrolling, collapse of its ancestor, or destruction cancels it. `startEdit` materializes a visible projection target synchronously; it does not implicitly expand collapsed ancestors.

Grid also retains a draft during background `update`/`batch` invalidations when the edited item reference, page and complete visible id order remain unchanged. Replacement of the edited record and changes to membership/order still cancel it. Custom projections without comparable old/new ids retain conservative cancellation.

TreeDataView event `oldEntries`, `entries`, `oldIds` and `ids` are enumerable, assignable snapshot properties, materialized on first access. They describe the version at emission even when first read after later mutations, reentrant events or destruction. Arrays and entry wrappers remain independent of the model; item references remain shallow, as before. The event phases share their snapshot arrays. Spreading/serializing an event reads its snapshots and pays the copy cost. Holding events retains their captured versions; applications should not retain an unbounded event history. Internal sequence/entry replacement makes deferred copying safe; `entries()` and `getEntry()` still return immediate copies.

Additional regressions: `test/incremental-projections.test.js`, `browser-tests/tree-grid-window.spec.js`. TreeList consumes the same corrected TreeDataView, but retains its own DOM renderer.

## Keyboard acceptance

The root owns table navigation focus; the scroll body has `tabindex="-1"`.
Grid and TreeGrid expose the mounted active cell through `aria-activedescendant`.
Arrow/Home/End navigation can materialize virtual rows. Editor caret keys do not
navigate the table, and Enter/Escape return focus after a completed edit/cancel.
Embedded inputs/buttons keep their own keys. Teardown during synchronous target
rendering stops obsolete active-cell notifications.

Grid's F2 and Tab/Shift+Tab editing traverse visible editable columns, skipping
hidden columns. TreeGrid retains its Enter editing contract; this does not add
Grid's F2, adjacent-edit Tab or clipboard features to TreeGrid.

See render and keyboard acceptance (historical evidence retained in the archive)
for browser evidence and remaining native-host/screen-reader acceptance.
