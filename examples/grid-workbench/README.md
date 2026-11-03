# Project workbench

Start `npm run dev`, then open `http://127.0.0.1:5173/examples/grid-workbench/`.
This is a compact desktop acceptance screen for Grid, TreeGrid and PropertyGrid.

Select a project in the hierarchy to scope the task table, or select a task in
either table to inspect the same record. The controls borrow one DataStore and
have separate TreeDataView/DataView projections. The returned screen owns the
controls, views, subscriptions and store; call `workbench.destroy()` to release it.

Use the first **Hierarchy** button to enter the screen from the keyboard. Arrow
keys navigate; Space selects. Enter/F2 begins a table edit, Escape cancels, Enter
commits and Tab/Shift+Tab moves between editable cells and exits at the boundary.
Names need at least three characters and hours must be nonnegative. A context
switch attempts to commit the current draft and stays on it if validation fails.
**Edit selected properties** gives a keyboard entry point into the PropertyGrid.

**Find task** filters the current project's task names. **Silent update** changes
a different task through DataStore, so a current draft stays open. **Reload
records** imports fresh objects with stable IDs, while **Remove selected** removes
the selected task or project subtree. All writes use DataStore; no private table
DOM or mutable options are used to force a refresh.

The reusable `createGridWorkbench(container, records?)` factory is recipe 09. It
returns its owner, data, separate views and controls plus small domain actions.
`window.workbench` is only the example host's handle, useful for manual acceptance
or the accompanying browser tests; the factory itself creates no globals.

The thin left gutter hosts each table's Settings menu; column menus keep local
sort/filter/best-fit/pinning commands. Use the table menu for Columns, Best fit
all, clear conditions/sorting and Reset column layout. The latter restores initial
column widths/order/visibility/pinning, keeping project/data context. Menu clearing
also clears Find task text; application project scope remains. No extra data field
is added to exports or clipboard. At the final editable cell, Tab focuses the next
external control or releases focus to the document when there is none.

Column/selection QA: open `http://127.0.0.1:5173/examples/grid-workbench/?columns=1`.
This opt-in uses the same factory with `{columnQA:true}` as its third argument:
127 records, extra existing record fields, left/right pin bands, column dragging,
row multi-select and Save/Restore layout JSON in memory. Ctrl/Cmd toggles rows;
Shift selects a row range. Properties stay a single-record context inspector.
The ordinary URL keeps the previous screen and keyboard path. No cross-grid row
transfer is provided. See ../../docs/GRID_COLUMN_LAYOUT.md for exact boundaries.
