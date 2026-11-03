# Grid row transfer (experimental, opt in)

First version: local Grid to Grid, independent concrete DataStores. This is not
clipboard cut/paste, TreeGrid node drag or a generic async transfer service.

## API and gesture

`rowTransfer: {drag:true, accept:true, mode:'move'}` explicitly grants export and
import. Omitted capabilities are false. `setRowTransferMode('copy'|'move')` changes
the source mode and cancels its active drag. `transferRowsTo(target,ids,{mode?,
mapItem?})` uses the same operation. Pointer drag starts from the full 10px
service row cell, including its empty area outside the colored selection marker.
There is no extra icon or transfer handle in a data cell. Pointerdown does not
change selection: an ordinary click retains standard Ctrl/Cmd/Shift behavior;
native drag begins only after the browser's threshold. Header settings remain a
menu, never a row drag source. If indicatorGutter is false, pointer transfer cannot
start; programmatic transferRowsTo remains available with the same permissions.
Grab/hover feedback is limited to enabled, available transfer gutters. Active
editors and disabled grids have no draggable gutter. Per-record read-only policy
still belongs to the existing veto hooks, not a new implicit row property.
Dragging a selected row uses the selected visible set, in source store order.
Dragging an unselected row first selects only that row. Text/cell range, editors,
column handles and existing opt-in local row-reorder handles remain separate gestures.

Both facades must opt in. Same-grid/same-store, disabled or destroyed owners,
active editors, grouped/remote grids, stale source/projection/schema and active
DataStore transactions/beforeChange phases reject. Sorted/filtered local views
are allowed: incoming records append to target store, then its ordinary view
sort/filter/page rules apply. A target filter may hide an accepted record.

Default schema compatibility compares ID configuration and column field/value
bindings, independently of width/order/visibility. Different bindings require an
explicit synchronous API mapItem(item,index), returning the complete target row.
This is also the explicit way to allocate new IDs. Native drag supports only
compatible schemas in this first version; it never imports external text/files.

## Atomic data contract

DataStore.transferTo(target,ids,{mode?,mapItem?,origin?,userAction?,reason?}) stages
all IDs, rows, maps and per-row events. Move preserves row references by default.
Copy spreads each row into a new object: own enumerable fields are copied;
nested objects, Date values and functions keep their references. No JSON or deep
clone is used. Both source and target IDs must be stable independently of index;
any target ID collision (existing or within the batch) rejects the entire batch.

Target add beforeChange events, then source remove beforeChange events for move,
and both Grid beforeRowTransfer hooks see unchanged stores. Any veto, thrown
preflight callback, teardown or stale guard aborts the transfer. Writes through
either store API are rejected during preflight and publication; reads are allowed.
This narrow synchronous write barrier is released in finally. Destroy remains a
terminal action: explicit callback teardown is not rolled back.

Only after every check succeeds are prepared target and source arrays/maps
assigned without application callbacks between them. Each changed store gets one
batch invalidate/change/afterChange with per-row changes. Both invalidations are
published before semantic phases. Transfer notifications collect observer errors
so an early throwing observer cannot prevent later view subscribers synchronizing.
A successful commit remains accepted even when an after observer throws; errors
are returned in notificationErrors. Never retry an accepted result automatically.

The boundary is the pair of store arrays/maps, not simultaneous snapshots of all
DataViews or rollback of arbitrary direct record-property writes by trusted code.
Callbacks must use DataStore for collection/value writes. Async callbacks/promises,
network providers and cross-process atomicity are unsupported. No silent transfer
route is exposed; validation/veto hooks always run.

Independent undo/redo stacks are cleared on successful move in both stores, and
only in target for copy. No coordinated cross-store undo is promised. Rejection
leaves stacks intact. Copy leaves source rows/revision/history unchanged. Source
selection prunes moved rows through its existing view contract; copy retains it.
Target selection is retained; an application can select returned target ids after
success (only visible IDs are selectable). The demo does this explicitly.

Grid beforeRowTransfer is emitted once per owner with role source/target and can
set cancel/reason. rowTransfer reports the final accepted/rejected result once per
surviving owner. Read-only cells govern editing, not structural row permissions;
use these explicit capabilities/hooks for domain row permissions (for example,
veto a record marked readOnly). Disabled grids always reject.

## Demo and limits

`/examples/grid-transfer/` has two independent stores, move/copy control, multi-row
selection, counts, reasons/events and a fixture reset. Drag the service strip; the
header menu and data cells are independent. It uses the bundled Tæt UI
font, 24px rows and 10px gutter. Escape, outside drop, source changes and teardown
cancel the internal lifetime-bound drag token and its preview. Local row reorder
can coexist via its distinct handle. No new keyboard transfer shortcut, arbitrary
external drop ingestion, TreeGrid, mapping UI or drag edge-auto-scroll is added.

## Mouse-selection diagnostics

The demo pane labels show the live selected count. Select rows with actual
Ctrl/Cmd-click or a Shift range, verify at least two markers/count, then press and
move from a selected gutter in one gesture. A completed plain click on a selected
row still applies normal single-row selection at click/mouseup; starting a second
gesture afterwards transfers that resulting single row. Dragging an unselected
row intentionally selects only that row. A batch containing the demo read-only
policy row rejects the whole batch, as does any conflicting target ID.

Native pointer regressions explicitly choose rows with mouse/keyboard modifiers,
assert multiple selected IDs and ARIA rows before dragging, and compare the set at
pointerdown/dragstart/acceptance. They cover both directions and move/copy; they do
not establish a fix for a report whose exact failing gesture is not reproduced.

For an exact unreproduced gesture, open `/examples/grid-transfer/?trace=1`.
The existing log then shows capture/queued pointerdown,mousedown,click,dragstart,
drop and dragend with source/target selected IDs and row keys. These are passive,
owner-scoped diagnostics; they do not select rows or modify transfer behavior.

Queued means a microtask observation, not a guarantee that all native event
listeners/default actions have completed. The selection/invalidate lines report
actual model changes; use those together with capture and final transfer IDs when
locating a collapse. Trace never changes selection or prevents a native event.

The fixture row `locked` is visibly prefixed `[READ ONLY]`. Its demo-only
beforeRowTransfer policy rejects the entire selected batch at drop, naming the
blocking ID and record in the status/log. The count/mode drag hint is a preview,
not acceptance: a Shift range containing A3 and locked transfers neither row.
Choose A1/A2 or A2/A3 to try an ordinary two-row move/copy. No ordinary fixture
record has readOnly metadata, and this does not change Grid selection semantics.
