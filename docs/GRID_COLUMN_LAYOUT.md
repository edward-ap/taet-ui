# Column layout and row selection QA

Grid/TreeGrid remain experimental. This is the current physical LTR contract;
no logical RTL pinning or new keyboard column-reorder shortcut is introduced
by the column QA pass. Cross-grid row transfer is described in GRID_TRANSFER.md.

## Existing column operations

Both facades expose `moveColumn(id,index)`, `freezeColumn(id,'left'|'right')`,
`unfreezeColumn`, `hideColumn`, `showColumn`, `autoSizeColumn(s)`,
`getLayoutState()` and `restoreLayoutState()`. Their shared GridColumnModel owns
order/width/hidden/frozen. Column menus provide local pin/hide/Best fit; the gutter
menu provides Columns/Best fit all/Reset column layout, including all-hidden
recovery. The 10px gutter has no data ID, drag/resize/sort index or export value.

Native header drag is enabled by `columnReorder` (library default true). It moves
only between columns with the same frozen flag: left, right, or unpinned. It does
not change the flag. Disabled, hidden, replaced, removed or repinned drag sources
cannot commit an old session. Escape/dragend/drop cancellation clears its preview;
cleanup of an old drag cannot cancel a new session started by a callback.
There is no built-in keyboard shortcut/menu item for column reorder; applications
can invoke `moveColumn` from a command. Existing menus are keyboard accessible. Native column drag has no horizontal edge-auto-scroll contract; scroll to the target band before dragging.

Pinning uses sticky physical left/right offsets and retains logical column order;
it does not silently repartition the column array. `moveColumn` changes that
logical order independently of pin flags. For ordinary edge bands, place left
columns first and right columns last. No new oversized-band auto-unpin policy was
added. Header/body/live editor geometry now shares measured CSS track widths,
including fr/minmax and multiple pinned columns after resize and virtual scroll.

Moving/pinning an edited column preserves its DOM, draft and owned focus. Explicit
external focus, replacement editors and teardown win over restoration. Hiding an
edited column or replacing its schema/projection cancels through the existing
system policy without committing the draft. Scroll still cancels as documented.
An open picker follows its existing outside-click/scroll/positioning contract.

Sort/filter/row selection use record/column IDs, not header DOM positions. Grid
range endpoints are `{rowId,columnId}`; the rectangle between them is resolved in
the current visible column order. Clipboard/export use that current order and
exclude hidden columns by default and always exclude the gutter. TreeGrid does
not acquire Grid's cell-range/clipboard/export APIs.

## Tree hierarchy and state boundaries

Hierarchy follows the current `treeColumnId` when that column moves or pins; the
gutter never acquires indent/toggle depth. If the hierarchy column is hidden or
removed, TreeGrid currently falls back to the first visible data column. Showing
the old column does not automatically switch the live hierarchy column back.
Version1 Tree layout saves columns and expanded IDs, not schema callbacks or
`treeColumnId`; the application reconstructs schema/configuration separately.
This existing fallback policy was not replaced with a new binding API.

Layout is ordinary JSON, independent of record data. Grid state additionally has
its documented sort/summary/page-size/search/group/detail fields; Tree state has
expanded IDs. Width/order/visibility/pin restore does not restore deleted records
or serialize editor/formatter functions. Legacy partial GridColumnModel restore
rules remain in GRID_STATE_TYPES.md. Reset restores initial known column fields,
not application data or all filter/sort/context state.

Tree expanded-state restore now changes only differing branches. Restoring an
unchanged layout must not transiently collapse retained branches and erase their
selected descendants or live draft. A genuinely collapsed/filtered descendant is
still removed from the current projection and selection by the existing policy.

## Row selection and markers

Use `multiSelect:true,rowRangeSelection:true` for explorer-style row ranges.
Neither library default changes. Ctrl/Cmd toggles; Shift replaces the anchor range;
Ctrl/Cmd+Shift unions it. Up/Down/Home/End select, Shift extends, Ctrl/Cmd moves
focus only. Row range mode suppresses implicit Grid cell-range gestures; explicit
setCellRanges still exists. Every selected visible row has its own 3px accent in
the 10px gutter, independent of the active row and any cell editor.

Scroll retains offscreen IDs and recreates their markers on return. Sorting retains
IDs; parse remaps selected records with the same IDs. Filter/page/remove prune
records absent from the current view. Tree collapse prunes hidden descendants;
expanding or removing a filter does not invent remembered selection. Grid group
collapse instead retains already-selected records while new Shift ranges exclude
hidden group children. These are model policies, not a missing marker. Silent
selection writes still synchronize every row without semantic selection events.

## Live screens

- `/examples/grid-workbench/?columns=1`: the existing desktop tree/table/property
  screen with actual pin bands, header drag,127 records for scrolling, local
  multi-select and Save/Restore layout JSON in application memory. Pin a second
  adjacent column and resize an edge; use menus for visibility/Best fit/reset.
  Properties remain a one-record inspector of application selection/context;
  the example mirrors eligible selected task IDs between the views; each view owns its selected subset, not one shared SelectionModel. Restore uses the application context barrier: valid drafts commit and invalid drafts block the action.
- `/examples/grid-workbench/`: the previous compact default and keyboard path.
- `/examples/grid-editors/`: local row multi-select plus Check/Switch/Radio read
  visuals and transactional live editors. Ctrl/Cmd+arrows can move active focus
  without clearing selected rows before F2 editing.

## Row drag-and-drop inventory

Grid's opt-in local `rowReorder`/`moveRows` works within its local store, with stable
IDs and existing veto/silent rules. Sort/grouping/remote provider/active editor or
disabled state prohibit moves; filter/paging resolve the target in the full store.
Handles support Alt+Up/Down. Existing cross-grid drop rejection remains tested.
TreeGrid has a separate opt-in local `nodeReorder` contract: its gutter drags
nodes with their complete subtrees inside one TreeGrid. The public `moveNode` and
`moveNodes` helpers use the same inside/before/after rules; see
[TreeGrid subtree movement](TREE_GRID_MOVE.md). This does not add cross-tree copy
or transfer. TreeList and TreeExplorer retain their own component contracts.

Opt-in local Grid to Grid row transfer is now implemented separately: see
[GRID_TRANSFER](GRID_TRANSFER.md). It uses the full service row gutter and a prepared,
callback-free two-store commit, with move/copy and explicit API mapping. Same-store,
TreeGrid, remote providers and asynchronous transfers are not included. Existing
local row reorder remains independent; its handle can coexist with transfer.
