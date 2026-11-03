# 31. Grid Cell Editor API

## Implementation Status

Implemented in Grid v0.3.6:

- cell editors backed by the shared `EditorControl` / `ValueControl` contract;
- standard factories for text, number, select, checkbox, switch, date, time, and date-time controls;
- custom control factories;
- editor validation before `beforeCellChange` and model writes;
- deterministic mount, focus, commit/cancel, and destroy lifecycle;
- `Enter`, `Escape`, `Tab`, and `Shift+Tab` keyboard rules;
- fixed overlay positioning for calendar and time pickers;
- editor cancellation when projection changes or virtual scrolling replaces rows;
- factory-only column declarations without a parallel string or `{ type }` syntax.

## Declaration

Grid columns use editor factories rather than describing internal HTML inputs:

```js
import { gridEditors } from "./ui/GridEditors.js";

const columns = [
  {
    id: "name",
    editor: gridEditors.text({
      validators: [value => value === "" ? "Name is required" : null]
    })
  },
  {
    id: "amount",
    editor: gridEditors.number({ min: 0, step: 10 })
  },
  {
    id: "status",
    editor: gridEditors.select({ options: statusItems })
  },
  {
    id: "updated",
    editor: gridEditors.date()
  }
];
```

Standard factories:

```ts
gridEditors.text(options?);
gridEditors.number(options?);
gridEditors.select(options?);
gridEditors.checkbox(options?);
gridEditors.switch(options?);
gridEditors.date(options?);
gridEditors.time(options?);
gridEditors.dateTime(options?);
gridEditors.custom(createControl);
```

Factory options are the normal options of the corresponding global control. They may also be a function of the cell context.

The typed factory options include inherited BaseControl focus, keyboard and
resize callbacks. Their source is the live editor with its typed value API;
the factory context's source/grid remains the table. Keyboard cancel prevents
the native event default and propagation. This addition does not require custom
GridValueControl adapters to implement the full BaseControl surface.

The shipped [typed integration](../docs/GRID_EDITOR_TYPES.md) is available through
`taet-ui/grid/editors`. Its declarations cover factory signatures and a bounded
editing column/options subset. [Grid/TreeGrid constructor declarations](../docs/GRID_TYPES.md)
are now available through `taet-ui/grid`. Radio is also available as `gridEditors.radio(options?)`.

## Cell Context

```ts
type GridCellEditorContext = {
  source: Grid | TreeGrid;
  grid: Grid | TreeGrid;
  item: unknown;
  id: string | number;
  rowIndex: number;
  column: GridColumn;
  columnId: string;
  value: unknown;
};
```

Grid and TreeGrid supply the same context fields to `createCellEditor`, including
custom factories and built-in factory option callbacks. `source` and `grid` are
the originating control; `item`, its typed `id`, and `column` identify the edited
record and column. `value` is the result of `column.value(item, rowIndex)` when
provided, or the ordinary field value otherwise.

`rowIndex` is a zero-based **logical data-view position captured when the editor
is created**, not a stable record identity or a DOM/viewport row number:

- Grid uses its current `view.all()` order after sorting, filtering and local
  paging. Index 0 is the first record on the current page. Group headers and
  detail panels do not count; grouping does not replace the data-view index.
- TreeGrid uses its current flattened `treeView.all()` order after sibling
  sorting, filtering and expansion. Visible ancestor records count, including
  ancestors retained to expose filter matches. Children hidden by a collapsed
  branch are not editable.
- Virtualization does not restart the index at the first mounted row. An
  offscreen target receives its logical position when materialized for editing.

The context is a creation-time snapshot, not a live position accessor. Use `id`
to write or look up a record. A newly opened editor receives a fresh index after
projection changes. Existing draft preservation/cancellation follows the
[rendering contract](32-grid-rendering.md). Validation through ControlCellEditor
retains the creation context, including the index.

For example, the same factory can configure either component:

```js
const nameEditor = gridEditors.text(context => ({
  placeholder: `Row ${context.rowIndex + 1}`,
  maxLength: context.item.maxNameLength ?? 120
}));
// Use nameEditor as columns[].editor in Grid or TreeGrid.
```

The lifecycle and keyboard sections below describe Grid's behavior; this shared
context contract does not imply complete feature/event parity with TreeGrid.

Custom controls are explicit:

```js
editor: gridEditors.custom(context =>
  new MyValueControl({
    value: context.value,
    mode: context.item.mode
  })
)
```

The returned control must implement `mount()`, `focus()`, `destroy()`, and `value.get/set()`.

Alternatively a factory may return a raw cell editor implementing `mount()`,
`getValue()`, **`validate()`**, `focus()` and `destroy()`. Unlike live value
controls, raw cell editors are not wrapped to supply default validation. Both
grids invoke validation when committing. `gridEditors.custom` takes one creator;
use `createGridEditorFactory(creator, options)` to set activation/filter metadata.

The column resolver `editor(item, column, grid)` is called during editability
checks as well as activation. Its source argument can be null (Grid) or
undefined (TreeGrid). This does not weaken the creation-time context above.

## Lifecycle

```text
beforeEditStart
-> create cell editor
-> create global control
-> mount into editor host
-> focus
-> validate
-> beforeCellChange
-> write model
-> cellChange / editCommit
-> destroy
```

Failed validation, a cancelled `beforeCellChange`, or a rejected model write keeps the editor mounted and focused. `Escape`, external projection changes, virtual row replacement, and Grid destruction cancel and destroy the editor.

On failed validation, both tables emit `editReject` with `reason: "validation"`
and the original validation result in `validation`, including its errors. Other
rejection reasons need not include validation. Both tables provide `columnId`
and the current commit attempt metadata on validation rejection.

Grid's row/column window materializes offscreen edit targets synchronously. A delayed scroll event caused by positioning that target does not cancel the newly mounted editor. Viewport resize retains the same editor and draft value; subsequent scrolling or projection changes cancel it. See [rendering contract](32-grid-rendering.md).

## Cancellation metadata

Grid and TreeGrid cancelEdit(options) use the closing action's metadata, defaulting
to origin: "api" and userAction: false. The editor's opening metadata is not a
fallback. Explicit reason is forwarded by both tables; Escape uses user/true.
Projection removal forwards its mutation metadata, including silent, before
scheduled rendering can replace the row. Internal viewport cleanup uses system
metadata. Destroying a table disposes its editor without an editCancel event.
Commit also uses current-action metadata, defaulting to api/false; it does not
inherit edit-start metadata. It uses standard mutation normalization (user origin
implies userAction). Silent commit still validates but skips table semantic events
and forwards silence to its writer. Custom setters must forward context.silent.

## Commit callback boundaries

After validate, getValue and beforeCellChange, a cancelled/replaced editor or a
destroyed table aborts before writing with false. Once a setter accepts a write,
closing the table/editor preserves success and skips subsequent phases. Rejection
handlers may close the screen without a later focus call. A replacement opened
from editCommit survives final cleanup. Recursive commit calls return false;
exceptions propagate and release the attempt guard. No custom write rollback is
promised. Same-phase EventBus dispatch snapshots are unchanged.

Only beforeCellChange.newValue and cancel affect the write; identity and attempt
metadata remain fixed. Both table setters must be synchronous. TreeGrid reports
the committed record in editCommit, while retaining its existing cancel field
and remaining distinct from Grid's changed/writeResult flags. These rules cover
mounted-editor commit; clipboard and toggle paths remain distinct.

## Activation callback boundaries

startEdit on an unmounted/destroyed table returns false. Resolver/factory/mount
and Grid beforeEditStart callbacks cannot recursively start an editor. An existing
editor may still be committed when explicitly transitioning to another cell.
The captured record, visible position and column must survive preparation and
mounting. Otherwise the returned editor is released without editStart.

Returned raw editors must implement mount/getValue/validate/focus/destroy before
mounting. Factory/mount/editStart errors propagate after cleanup of returned
resources; a factory owns allocations it fails to return. ControlCellEditor does
not attach listeners after its control destroys it during mount and releases its
control once even under recursive destroy calls.

After mounting, editStart may cancel, commit, close the table or open a replacement.
startEdit returns true only if its own editor survives those callbacks. A prior
session's deferred focus never targets the replacement; released Grid frames are
cancelled and TreeGrid microtasks check the original session. Silent activation
suppresses table beforeEditStart/editStart, while retaining mount/focus behavior.
TreeGrid still does not implement beforeEditStart. Grid clipboard and toggle
activation follow the immediate-write rules below. General rendering uses
spec/32-grid-rendering.md.

## Immediate Grid Writes

Paste/cut and checkbox/switch toggles create an unmounted editor, validate and
normalize its candidate, release it, then apply beforeCellChange.newValue/cancel
and write. Rejections retain cell identity and current-action provenance; silent
keeps validation while suppressing semantic events and is forwarded to writers.
Temporary editor cleanup survives teardown/replacement/exception; recursive
immediate writes are blocked. Batch paste/cut reads fresh records for every cell
and skips rejected cells. Table closure or mounted editing stops remaining cells.

Programmatic clipboard provenance is api/false; native actions are user/true.
Paste reports cellChange per accepted cell and clipboardPaste.changed as a count.
Fast toggles report cellChange/editCommit without mounted-session start/end events.
Async cut/paste snapshot projection and ranges and abort on stale targets after
platform completion. cut emits clipboardCut; copy success describes the platform
write. Destroyed tables emit no late clipboard events. TreeGrid does not implement
clipboard or this immediate toggle path. General rendering follows the separate
[render lifetime contract](32-grid-rendering.md).

## Keyboard Rules

- `Enter` validates and commits the current editor.
- `Escape` cancels it without writing.
- Grid `Tab` commits and opens the next visible editable cell.
- Grid `Shift+Tab` commits and opens the previous visible editable cell.
- If validation or writing fails, navigation does not leave the current cell.
- Caret keys remain with the editor. Enter/Escape restore table focus after the
  session ends. TreeGrid supports Enter/Escape; it does not implement Grid's F2
  or adjacent-edit Tab traversal.

## Single Declaration Path

The typed Select factory has independent row/row-ID and choice/choice-ID generics.
It accepts borrowed data, getId for internal data, synchronous filterPredicate and
renderItem callbacks, and a structural overlayManager with getRoot/open/close.
Date/time factories share the overlay protocol. Choice callbacks receive the
Select source; their ID/index refer to choices, not Grid rows. Queries are trimmed
and lowercased; render strings become plain text and render Nodes are appended.
Use searchable: true to activate the custom popup recipe. The selected display
continues to use textField. Factory-owned stores are cleaned with the editor;
supplied stores/services remain application-owned and must outlive the editor.

Grid does not accept `editor: "text"` or `editor: { type: "number" }`. Columns use a `gridEditors.*` factory or an explicit resolver returning one. This keeps editor declaration tied to real global controls and avoids a second React-like component-description language.
