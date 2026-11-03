# Common table contract and migration

Grid and TreeGrid remain experimental. This approved change keeps their constructors,
record-based selection and package aliases. Imported provenance stays immutable;
`provenance/grid-candidate.json` pins the reviewed successor. Run its updater only
for an explicitly approved table change, never to make a failing gate disappear.

## Selection and silent writes

SelectionModel and RangeSelectionModel emit `invalidate` after each accepted write,
including `{silent:true}`. Its committed snapshot, origin, userAction and silent
metadata are for technical synchronization. No-op or veto emits none. Non-silent
writes retain beforeChange/change/afterChange; subscribing to change remains the
single application notification. Destroy or a newer nested write stops later phases.
Current EventBus dispatch snapshots remain unchanged.

Grid/TreeGrid listen to invalidate, so direct borrowed-model writes update DOM/ARIA,
status and selection summaries without manufacturing table semantic events. The
models still hold records, not IDs; table set/getSelectedIds are the ID facade.
Selection is limited to the current projection/page. Parse with stable IDs maps
selection to replacement records; hidden/removed records are pruned. A callback
closing/replacing the owner or selection context aborts stale follow-up activation.

## Projection changes and application edit context

Filtering, paging, removal and TreeGrid collapse can prune records from the
current visible selection. This reconciliation writes the SelectionModel with
`{silent:true, origin:'system'}`: row markers/ARIA/status synchronize, but the table
does **not** emit `selectionChange` just because a selected row left the view.
`selectionChange` is a semantic notification for non-silent selection writes, not
a universal notification that an application editor's current record is visible.

After an application-owned `setFilter` or other projection action returns, read
`getSelectedIds()` again and reconcile any separate form/current-record state.
For one subscription that follows every accepted selection write, including silent
pruning, use the public `grid.selection.events.on('invalidate', callback)` contract.
That callback is technical synchronization, not another business selection event;
do not attach the same business side effect to both invalidate and selectionChange.
Dispose the subscription with the screen owner. No-op selection writes emit neither.

## Editing and keyboard

Both tables use Enter/F2 to start, Escape to cancel and Enter to commit. Tab and
Shift+Tab commit then visit the next/previous visible editable cell in row order,
skipping hidden, readonly and noneditable cells. At the first/last editable cell,
focus leaves the table in that direction instead of wrapping. When there is no
external tabbable target, the table releases focus to the document body. Invalid/rejected
drafts keep their editor and focus. Composing/default-prevented keys are ignored.

Both emit cancellable beforeEditStart before factory creation. editCommit contains
changed/writeResult; TreeGrid retains legacy cancel for compatibility, but committed
writes are vetoed only in beforeCellChange. Silent starts/commits suppress semantic
events and still validate/synchronize. Callbacks may close the screen, replace data,
change schema/projection or open another editor; the old attempt stops and cannot
overwrite the newer editor or keyboard target. Unrelated background updates preserve
the live draft; removal/hiding/replacement of its target cancels it.

## Sort, conditions and schema

Both expose getSortModel(): Rule[]. Legacy getSortState remains first-rule/null
on Grid and an array on TreeGrid. Tree sorting still sorts siblings, not a flat
dataset, and TreeGrid keeps its single-rule sort API.

TreeGrid setColumnFilter now accepts the same ColumnFilterInput conditions as Grid
(values/text/number/date/boolean), plus its legacy string/function forms. Both have
clearColumnFilter. clearFilter removes only the global predicate.
clearAllFilters({search:false}) retains search; {search:true} clears it. Omitted
search preserves legacy defaults: Grid retains search, TreeGrid clears its query.
No search model, paging, grouping, summaries or remote cache is added to TreeGrid.

setColumns cancels editing, prunes missing/unsortable sort rules and missing column
conditions, rebuilds accessors/comparators, and retains valid selection identities.
Schema reconciliation is silent. Layout version 1 and JSON schemaVersion 1 remain
readable; JSON factories still create controls, not hot-update live schemas.

## Optional editor controls

Tables import only the small editor-factory marker/protocol. Built-in control
editors remain at taet-ui/grid/editors and keep the same Symbol.for identity.
Named read-only table bundles therefore do not pull the entire editor catalog.
The full bundle still exports those controls, so this does not promise a full-profile
size reduction or a measured WebView startup improvement.

## Desktop acceptance screen

Run `npm run dev`, then open `/examples/grid-workbench/`. The screen composes
TreeGrid, Grid and PropertyGrid as live controls, with one source store and separate
views. See [recipe 09](../examples/ai-recipes/09-grid-workbench.js) and the
[workbench guide](../examples/grid-workbench/README.md). The screen owns its borrowed
models/services and closes its children before releasing them.

Acceptance covers keyboard entry/exit, validation and context changes, property
writes, silent updates, sorting/filtering/collapse, parse/remove/schema replacement,
background edits and callback teardown. No reader/specialized extension, plugin
engine, GridLight or remote page cache is introduced.
