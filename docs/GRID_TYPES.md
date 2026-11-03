# Typed Grid and TreeGrid

Opt-in local subtree movement: [TreeGrid move contract](TREE_GRID_MOVE.md).

This page documents the typed npm package; its package imports are intentional.
For portable JavaScript application setup, use the consolidated bundle as described
in [BUILD](BUILD.md). Standalone bundles do not currently ship flattened declarations.

The existing `taet-ui/grid` package entry now has declarations for all its value
exports: Grid, TreeGrid, GridCore, supporting models/controllers, editor factories
and exporters. Export identities are unchanged. Approved common-contract behavior is described in [table migration notes](GRID_COMMON_CONTRACT.md).
These components remain experimental. Typed tables can also be imported from
`taet-ui/experimental` and `taet-ui/all`; see [component types](COMPONENT_TYPES.md).

## Construct a table directly

```ts
import { Grid, gridEditors, gridExporters, type GridColumn } from 'taet-ui/grid';

interface Customer { id: number; name: string; amount: number }
const columns: GridColumn<Customer>[] = [
  { id: 'name', field: 'name', title: 'Customer', width: 180, sortable: true,
    filterable: true, filterType: 'text', editor: gridEditors.text<Customer>() },
  { id: 'amount', title: 'Amount', width: 110, dataType: 'number',
    summary: { kind: 'total', scope: 'filtered' },
    editor: gridEditors.number<Customer>({ min: 0 }) }
];

const grid = new Grid<Customer>('#app', {
  columns, width: '100%', height: 320,
  statusBar: { pagination: { pageSize: 50 } }
});
grid.data.parse([{ id: 1, name: 'Ada', amount: 40 }]);
grid.events.on('beforeCellChange', event => {
  if (event.newValue === '') event.cancel = true;
});
grid.setColumnFilter('amount', { kind: 'number', operator: 'greater', value: 10 });
const csv: string = grid.exportData(gridExporters.csv());
grid.destroy();
```

Both tables accept options-only construction followed by mount, or a container
(HTMLElement/CSS selector) plus options. They inherit BaseControl lifecycle,
state and focus methods. Constructor callback names remain the six BaseControl
callbacks; their source is typed as the concrete table. Use `events.on('rowClick',
handler)` rather than inventing an onRowClick constructor option.

`Grid<TItem, TId>` and `TreeGrid<TItem, TId>` default IDs from the record's id field.
Types can also be inferred from an injected DataStore. For a custom identity
field, specify the ID type and idField/getId as with DataStore. Columns use string
IDs independently of record IDs; field names are checked against the record.
The column ID may identify a computed column instead of a record field.

## Columns, summaries and callbacks

### Best fit and multiline titles

`autoSizeColumn` / the Best fit menu measure intrinsic **rendered** header, body
and footer content, including buttons, tree indentation and cell padding. They
can shrink an oversized column and repeated calls are stable. `minWidth` and
`maxWidth` still apply. Virtualized/offscreen rows not mounted in the DOM are
not scanned; Best fit is not a full-dataset maximum. Wait for rendering after
changing data before measuring. For initial programmatic sizing with web fonts,
also await `document.fonts.ready`; subsequent font changes can change text width.
Unsorted headers do not reserve a sort arrow.

There is no `headerLines` / `headerWrap` JavaScript option. Both controls support
multiline titles through a scoped CSS class and the existing header height token:

```js
new Grid({ css: 'three-line-headers', columns: [
  { id: 'price', title: 'Current\nunderlying\nprice', width: 130 }
] }); // The same options work with TreeGrid.
```

```css
.three-line-headers { --dui-grid-header-height: 64px; }
.three-line-headers .dui-grid__header-title { white-space: pre-line; }
```

Use `white-space: normal` for automatic word wrapping instead of explicit
newlines. Set header height to accommodate two or three lines at the chosen
font/line-height. Height is not automatically derived from the title. Best fit
uses natural content width; automatic wrapping alone does not impose a width
limit (use `maxWidth` or manual column sizing when wrapping is desired).

The Grid and TreeGrid table menu's Columns submenu stays open while visibility
checkboxes are toggled, including with Space/Enter. Checkmarks and the last-visible
column guard update immediately. Escape or an outside click dismisses the menu;
other column commands retain their normal close-after-action behavior.

GridColumn adds typed filtering, search, custom sorting and summary options to
the shared editing/presentation contract. TreeGridColumn exposes the options
TreeGrid actually consumes, without Grid's summaries or custom comparator.
Normalized columns returned by getColumn have default sizing fields; Grid also
normalizes summary configuration. Missing columns return null. Runtime changes
use setColumns, column methods or the model rather than direct field assignment.

Grid sort callbacks receive records and a context with data/view, column, columnId,
direction and grid. Column value/render callbacks retain the shared editor
contract; factory contexts and setters are still reusable across both tables.
Those shared helper types intentionally expose a common subset of the grid API.
TreeGrid's value callback receives an **optional** row index: rendering and edit
creation supply one, while tree sorting/filtering may omit it. Handle undefined
when a computed tree column depends on that index.

Summaries support count, total, min, max, average and custom, with page/filtered/
all/selection scope. Numeric aggregates require a numeric column. Custom values
can be content or a `(rows, column, grid)` callback; summaryFormat receives the
numeric value and typed grid/column/kind context. `getColumnSummaryValue()` returns
formatted footer content, such as `Total 40`, or custom content. Its return type
is unknown; it is not a numeric aggregate getter. The workbook exporter similarly
returns a workbook-shaped object, not encoded XLSX bytes.

Row formatting rules and detail renderers receive typed records and Grid context.
A detail/renderer result may be a Node or a value rendered as text. DOM creation
belongs inside such rendering implementations; application composition continues
to use live Tæt UI controls. Offscreen detail DOM may be released; keep durable
application state outside it. See [rendering](../spec/32-grid-rendering.md).

## Differences between the tables

| Contract | Grid | TreeGrid |
| --- | --- | --- |
| Projection | DataView with filtering, sorting and paging | TreeDataView with hierarchy |
| getSortState | First sort rule or null | Array of sort rules |
| getSortModel | Array of sort rules | Array of sort rules (single sibling rule) |
| Column filters | ColumnFilterInput; clearColumnFilter removes one | ColumnFilterInput plus legacy string/callback; clearColumnFilter or null clears one |
| Search | GridSearchModel, panel and match navigation | setSearchQuery |
| Paging and remote loading | Supported | Not exposed |
| Grouping, detail rows and summaries | Supported | Not exposed |
| Layout state | Columns, sort, summaries, page size, search, groups, details | Columns and expanded IDs |
| Edit start veto | beforeEditStart | beforeEditStart |
| Edit commit fields | changed and writeResult | changed/writeResult plus legacy cancel |

Column layout operations and editing methods are shared, but equivalent-looking
methods do not imply event parity. TreeGrid sort/filter methods honor silent
options while keeping projection and header/search UI synchronized.
Grid `groupChange.source` identifies the table; `groupModel`
provides the originating model. The event type is `groupChange`, while subscribing
directly to the model still gives a `change` event with the model as source.
Both tables retain the editor's validation result in `editReject.validation` when
validation fails. Other rejection reasons need not have that field. All mounted
editor rejection paths include columnId and commit-attempt metadata. commitEdit
defaults to api/false, honors silent, and stops subsequent phases if callbacks
close the table/editor. See [editor callback lifecycle](GRID_EDITOR_TYPES.md).

Selection models hold records; setSelectedIds/getSelectedIds provide the ID
interface. Selection is restricted to the current visible projection/page.
Selecting an off-page ID does not navigate to it. For TreeGrid, startEdit likewise
does not expand a collapsed ancestor automatically.

## Direct view sorting

With supplied DataView/TreeDataView classes, replacing the current table-created
comparator directly through view.setSort clears the table's column sort state
and indicators, including silent changes and replacements that keep row order.
An arbitrary function cannot be mapped back to column IDs/directions. Setting
the same current table comparator preserves its indicators. The next header
click starts a new column sort. Clear sorting in the column menu also clears
an external comparator.

Direct view setters retain view event semantics; they do not synthesize a table
sortChange event. A same-result replacement can return false without a projection
event while still clearing column indicators. Use table sortBy/setSortModel when
column state, serialized sorting and table sortChange notifications are needed.
Custom structural views retain their existing contract; this synchronization
requires the supplied view setters.

## Providers, exports and ownership

With the supplied DataView/TreeDataView classes, table and view setFilter/getFilter
share the global predicate. Column conditions and search compose with it using
AND even when changed directly through the view. Clearing the global predicate
preserves those conditions. Both tables accept clearAllFilters({search:false}) to retain search or
{search:true} to clear it. Omitted search retains the legacy defaults: Grid
keeps search, TreeGrid clears its query. clearFilter clears only the global
predicate; clearColumnFilter clears only one column.

One view supports one attached table filter owner. Use separate views over a
shared DataStore for independent tables. When the table closes, an external
view retains its latest global predicate and loses the table's local conditions.
See [data model ownership](DATA_MODEL_TYPES.md) for custom view limitations.

GridOptions types injected stores, views, selection/range/filter/search/group
models and a structural remote provider. Grid creates and owns its column model.
Injected models and providers remain the application's responsibility; destroying
the table removes its subscriptions but preserves those instances. A table-created
store/view/model is destroyed with the table.

GridRemoteRequest describes the built-in page/pageSize/sort/filters/search envelope.
The default pageSize can be null. A provider must accept that envelope, including
unpaged requests, or adapt it before invoking a stricter backend loader. The
createRemoteRequest helper preserves additional override fields in its result;
the reloadRemote declaration covers the standard envelope. Domain-specific remote
query typing is not a third Grid generic parameter in this version. Providers
should forward the supplied signal to asynchronous work. See [data model types](DATA_MODEL_TYPES.md).

`exportData()` preserves the exporter's return type, including custom exporters.

For spreadsheet-oriented CSV/TSV, pass `gridExporters.csv({ escapeFormulas: true })`
or the corresponding TSV option. Formula-like string values and headers receive
an apostrophe prefix; numeric values retain their type before serialization.
The default remains raw export. See [security boundaries](../SECURITY.md) for
the receiving-application and workbook-writer responsibilities.
The built-ins produce CSV/TSV strings or a GridWorkbook object. Export scope is
filtered (default), page or selection; includeHidden controls column inclusion.
Clipboard copy/cut/paste methods return Promise<boolean>; pasteClipboardText is
synchronous. Programmatic calls default to api/false and accept silent; native
clipboard events use user/true. clipboardPaste.changed is a numeric count of
accepted cell writes. See [editor contracts](GRID_EDITOR_TYPES.md) for validation,
rejections and batching.

Clipboard access depends on the browser environment: unavailable operations return
false; platform permission/read/write errors reject the promise. Async cut/paste
capture the visible records, columns and cell ranges before awaiting the platform.
If that target differs afterwards, or the table closes/becomes disabled/starts
editing, they return false without clearing or pasting into a new target. A cut
can therefore copy successfully while leaving the source untouched. copy returns
true after a successful platform write even if the table has since closed; late
table events are suppressed. Copy/cut events describe the original ranges, and cut
emits clipboardCut (including when clearing is subsequently aborted).

The GridCore and controller declarations cover their public methods for advanced
integrations. Concrete tables create their own controllers; applications normally
use table methods. Controller instances detach on destroy and do not own the table.
They expect a real Grid/TreeGrid owner with the internal integration hooks and
bound native DOM events where applicable. Declarations do not expose those private
hooks as an application API.

## Verification

Installed strict TS and JSDoc consumers compile under NodeNext and Bundler and
execute against an actual packed/installed package. They test inferred record IDs,
sort/filter/paging behavior, layout, formatted summaries, exports, remote responses,
tree expansion, ownership and rejected unsupported options. Existing reusable editor
and model consumers still compile against these concrete classes.

Chromium runs factories whose **constructors are compiled TypeScript**, then edits
both tables and checks paging, conditional formatting, summaries, details and tree
collapse. The earlier installed editor/model/control integrations remain in the
suite. An API audit compares value exports, public prototype methods, factory names
and statically emitted Grid/TreeGrid event names with the declarations. No blanket
any or declaration for an unimplemented method is used to fill coverage gaps.

## Selection, summaries and JSON boundaries

Row selection and cell ranges are separate: Ctrl/Meta toggles rows when
`multiSelect` is enabled; Shift-click extends the cell range. By default Shift-click does not
select a contiguous block of rows. Opt in with `rowRangeSelection: true` and
`multiSelect: true` on Grid or TreeGrid (see below). Row selection is constrained to the current
projection/page. Sorting retains selected record identity.

Numeric summaries skip null, undefined, empty/whitespace strings and non-finite
numeric conversions. Numeric strings and zero participate. An empty numeric set
produces an empty min/max/average and Total 0. Count retains its separate non-null,
non-empty-value semantics; custom summaries receive their documented rows.

Load JSON records with `grid.data.parse(JSON.parse(text))`. The constructor's
`data` option is a DataStore, not a raw array. `JSON.stringify(grid.data.all())`
saves the full local source; filtering does not remove source records. To serialize
the filtered projection, use `grid.exportData({ export: ({ rows }) =>
JSON.stringify(rows) })`. Remote data means only locally loaded records, not an
implicit download of the entire backend. There is no built-in JSON exporter.
Column callbacks/editors cannot be reconstructed from JSON. Plain layout state
round trips independently of record data; function-valued configurations require
application-owned reconstruction.

See expanded acceptance and DHTMLX comparison (historical evidence retained in the archive)
and run `npm run test:grid` for the dedicated three-engine browser suite.

## Opt-in row ranges

`rowRangeSelection: true` enables explorer-style row gestures. Defaults remain
unchanged; use it with `multiSelect: true` for more than one selected record.
Grid disables pointer and keyboard cell ranges in this mode, even if
`rangeSelection: true` is also supplied. Explicit `setCellRanges` remains usable.

- Click establishes the anchor. Ctrl/Meta-click toggles a row and moves the anchor.
- Shift-click replaces selection with the inclusive anchor-to-target range.
  Repeated Shift gestures can shrink or reverse that range.
- Ctrl/Meta+Shift unions the range with existing selection.
- Up/Down/Home/End select the target row; Shift extends, Ctrl/Meta moves only focus.
  Tree Left/Right retain expansion and parent navigation semantics.
- The anchor is an ID, not an array index or record reference. Current sorted,
  filtered, paged order is used, including offscreen virtual rows. Collapsed tree
  descendants and collapsed Grid groups are excluded.
- If the anchor is no longer visible, a Shift pointer gesture starts at its target.
  With no prior anchor, Shift keyboard navigation starts from the focused row.
- Selection mutations retain beforeChange cancellation and user provenance.
  Programmatic setSelectedIds/clearSelection do not establish a new gesture anchor.

See `browser-tests/grid-row-selection.spec.js`, `test/grid-row-selection.test.js`
and the live Row Selection documentation example. `rangeSelection: false` now
also suppresses Shift keyboard cell ranges, matching the pointer option.

## Local row reorder (Grid only)

Enable `rowReorder: true` to show a drag handle in the first visible column.
Drag a selected row's handle to move the selection, or an unselected row's handle
to move that row only. Drop above/below a target row. Focus a handle and use
Alt+Up/Down for the equivalent keyboard operation. Cell selection and editing
remain on the cell body. Near a body edge, dragging scrolls vertically; Escape,
leaving the target, dropping elsewhere and teardown stop scrolling/markers.

```js
grid.moveRows(["job-a", "job-c"], "job-d", { position: "after" });
```

`moveRows(ids, targetId, options)` also works without visible handles. `position`
is `before` (default) or `after`; mutation metadata/silent follow normal Grid
conventions. Stable IDs are required; index-derived IDs are rejected. Requested
rows retain their original source order and object identity, regardless of ID
array order. Duplicate requested IDs are deduplicated. Returns false for no-op,
missing IDs, target inside the moved set, veto or unsupported current state.
Invalid argument shape/position throws TypeError; destroyed Grid follows the usual
lifecycle error contract. Disabled or actively edited Grid rejects a move.

The target is resolved in the **complete local DataStore**, including under a
filter or pagination. Hidden rows are retained in their relative order; the moved
block is inserted immediately before/after the target in source order. This can
change which rows occupy the current page and therefore prune page-bound selection.
No remote fetch is implied. Active sort (including an external DataView comparator),
grouping and dataProvider disable both API and pointer moves.

`beforeRowReorder` is cancellable. `rowReorder` reports accepted moves; both contain
`ids`, `targetId`, `position`, `origin`, `userAction` and `source`. Event arrays are
copies. A single `data.parse` applies the new order; DataStore's beforeChange can
also veto it. Silent moves skip semantic events while synchronizing the view.
Callbacks that replace/update source data, change the visible projection or destroy
the owner abort the pending write. Nested moveRows calls are rejected. A callback
after the committed write can make further changes; true reports that the move
committed, not that later callbacks left that order untouched.

Dragging is local and cancels if data/projection changes during the gesture.
External drops and cross-grid transfer are not implemented. TreeGrid does not gain
moveRows or flat reorder handles; tree reparenting has a separate contract.
See the Row Selection live page and `grid-row-reorder` unit/browser regressions.

## Server-provided definitions

Experimental `compileGridDefinition` / `createGridFromJSON` compile versioned JSON into Grid options, editor factories and data. See [JSON definition contract](GRID_JSON.md). These are separate from DataStore.parse and do not update an existing Grid schema.

### Column replacement and nullish sorting

Grid.setColumns prunes sort rules whose columns disappeared or became unsortable,
retains valid rules in their original priority order, and rebuilds the comparator
from current columns. With no valid rules it clears sorting. This reconciliation
is silent (no sortChange), as before; selected IDs remain selected and active
editing is cancelled. Explicit setSortModel with an unknown column throws TypeError.

Default Grid sorting treats null and undefined as equal. Their stable input order
is preserved unless a secondary sort rule distinguishes them. Nullish values
remain last ascending / first descending. TreeGrid's existing placement
is unchanged; cross-component null-sort policy is separate.

TreeGrid now compares a pair of valid `Date` values by timestamp, matching Grid's
chronological order. Earlier previews compared their weekday-prefixed string
representations, so a Monday could precede the previous Sunday. Equal timestamps
keep source order within their sibling group, including descending sorting.
This is an observable correction; null placement and string locale are unchanged.

Use homogeneous valid Date values for chronological columns. Invalid Date values
and mixed Date/non-Date pairs retain TreeGrid's existing string fallback; they are
not parsed or coerced, and do not promise a chronological ordering for that mixed
column. TreeGrid still has no column-level custom comparator API. ISO date strings
remain strings; no new date parsing or universal cross-type order is introduced.

### Double-click events and formatting validation

Grid and TreeGrid expose `rowDoubleClick` and `cellDoubleClick` through `events.on`.
A data-cell double click emits the row event followed by the cell event, with the
same `item`, `id`, `nativeEvent`, `origin: "user"` and `userAction:true` as click
notifications. The cell event also supplies `column`, `columnId`, and `value`.
Both have mutable `cancel:false`; set it to true (or prevent the native event) to
suppress default edit/detail activation. Existing click notifications still occur.
Disabled controls and active editors do not emit these double-click events.
Header double clicks retain their column best-fit behavior. Applications no longer
need to infer a double click from `rowClick.nativeEvent.detail`.

Grid constructor `formatting` and `addFormattingRule` reject unknown `columnId`
(or `column` alias) with RangeError before applying the rule, including silent
writes. Hidden columns are valid; omitted/null IDs retain whole-row formatting.
A later schema replacement may leave an existing rule dormant until its column
returns; layout restore remains tolerant of obsolete IDs. TreeGrid does not expose
Grid's conditional-formatting rule API.

For the common keyboard/edit policy, silent selection notifications, explicit
filter-clear scopes, schema reconciliation and compatibility notes, see
[Common table contract](GRID_COMMON_CONTRACT.md). Try the runnable
[desktop workbench](../examples/grid-workbench/) and recipe 09.

The shared indicator gutter and local/global menu placement are described in
[Table menus](GRID_MENUS.md). The20px strip is presentation and does not alter
data-column indices, exports or ranges. See shared indicatorGutter/gridMenu options.

## Opt-in row transfer

For independent local Grid stores, use `rowTransfer:{drag:true,accept:true}` and
`setRowTransferMode('move'|'copy')`. `transferRowsTo(target,ids,options)` performs the
same operation without native drag. Different fields/IDs require an explicit
synchronous `mapItem`; native drag supports compatible bindings only. The full 10px service row gutter starts native pointer transfer; no extra data-cell
icon is added. Without a gutter, only the programmatic route is available. The
existing opt-in local row-reorder handle remains independent. Read the
[atomicity, rejection, event and history contract](GRID_TRANSFER.md) before adding
business veto hooks. Live example: `/examples/grid-transfer/`. TreeGrid is excluded.
