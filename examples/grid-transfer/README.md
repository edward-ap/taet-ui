# Grid transfer

Run the existing local server and open http://127.0.0.1:5173/examples/grid-transfer/.
Both Grids opt into rowTransfer drag/accept, multiSelect and rowRangeSelection.
Mode toggles call setRowTransferMode on both; the full 10px service row cell drags selected visible
rows (or selects an unselected row first). Copy preserves IDs, so a second copy
into the same target rejects. Reset restores the fixture. A read-only example row
is vetoed through beforeRowTransfer, not an invented global Grid readOnly option.
Accepted incoming visible rows are selected explicitly by the demo handler.
See ../../docs/GRID_TRANSFER.md for atomicity, mapping, IDs, history and limits.

Native drag places the same opaque session token in the custom MIME flavor and
text/plain for WebKit compatibility. A drop still requires the current internal
session and an exact token match; records are resolved from the source store.
Plain text is not interpreted as row data or as a clipboard operation.

No extra transfer icon is rendered. A click keeps normal Ctrl/Cmd/Shift selection;
selected-row pointerdown does not collapse the selected set before native drag.
Header settings remain a menu. With indicatorGutter:false no pointer transfer can
start, while transferRowsTo remains usable. Active editors/disabled grids do not
provide a draggable gutter. Existing local row-reorder handles are independent.

Pane labels include the live selected count. Use Ctrl/Cmd-click or Shift to select
multiple rows, then press-drag a selected gutter without a preliminary completed
plain click. A completed plain click selects only that row; an unselected-row drag
also intentionally starts a single-row operation. Read-only-policy and duplicate
ID rejections leave the whole source batch unchanged.

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
