# Typed Grid editor integration

This page documents the typed npm package; its package imports are intentional.
For portable JavaScript application setup, use the consolidated bundle as described
in [BUILD](BUILD.md). Standalone bundles do not currently ship flattened declarations.

`taet-ui/grid/editors` exports the original `gridEditors`,
`createGridEditorFactory`, `ControlCellEditor` and `isGridEditorFactory` values
with declarations. The first three retain their identity with the exports from
`taet-ui/grid`; the predicate is the existing factory-brand check. Grid and
TreeGrid remain experimental; the common edit policy is documented below.
See the [tested editor matrix, codecs and popup limits](GRID_EDITOR_MATRIX.md).

This is a bounded integration contract. `GridEditorColumn<TItem, TId>` covers
editing, value/render callbacks and basic column presentation. It is **not** the
complete filtering, aggregation or column schema. `GridEditorHost<TItem, TId>`
describes the common data/editing/event surface, not a new class or the entire
Grid API. [Grid/TreeGrid constructors](GRID_TYPES.md) are now declared separately
through `taet-ui/grid`; these shared helper contracts remain reusable subsets.

## Reusable typed columns

An application can author its editor configuration in TypeScript and consume
the emitted module from its existing JavaScript Grid/TreeGrid bootstrap:

```ts
import { gridEditors, type GridEditorColumn } from 'taet-ui/grid/editors';

interface Customer { id: number; name: string; maxNameLength: number }

const nameEditor = gridEditors.text<Customer>(context => ({
  placeholder: `Row ${context.rowIndex + 1}`,
  maxLength: context.item.maxNameLength,
  validators: [value => value.trim() ? null : 'Enter a name']
}));

export const columns: GridEditorColumn<Customer>[] = [
  { id: 'name', title: 'Customer', width: 240, editor: nameEditor }
];
```

The existing JavaScript bootstrap uses public imports:

```js
import { Grid } from 'taet-ui/grid';
import { columns } from './compiled/customer-columns.js';

const grid = new Grid({ name: 'customers', columns });
grid.data.parse([{ id: 1, name: 'Ada', maxNameLength: 80 }]);
grid.mount('#root');
// When the owning screen closes:
grid.destroy();
```

Grid and TreeGrid constructors are also typed through `taet-ui/grid`. The editor
module remains reusable by existing JavaScript applications.

JavaScript editor modules can instead use checked JSDoc:

```js
// @ts-check
import { gridEditors } from 'taet-ui/grid/editors';
/** @typedef {{ id: number, name: string }} Customer */
/** @type {import('taet-ui/grid/editors').GridEditorFactory<Customer>} */
const editor = gridEditors.text(context => ({ placeholder: context.item.name }));
/** @type {import('taet-ui/grid/editors').GridEditorColumn<Customer>[]} */
export const columns = [{ id: 'name', editor }];
```

## Context and values

`GridCellEditorContext<TItem, TId>` provides typed `item` and `id`, the common
`source`/`grid` editing surface, `column`, `columnId`, and the creation-time
`rowIndex`. IDs default to the record's string/number `id` type; supply the
second generic parameter for custom identities. The index has the projection
semantics in [the editor specification](../spec/31-grid-cell-editor-api.md).

`context.value` is `unknown`: a column may read an arbitrary field or compute
its value, and normalization happens inside the selected control. Narrow it
when writing a custom editor. Built-in cell-editor `getValue()` results are:

| Factories | Result |
| --- | --- |
| text, date, time, dateTime | `string` (including the empty string) |
| number | `number \| null` |
| checkbox, switch | `boolean` |
| select, radio | `unknown` (application-defined choice/initial values) |

Option declarations cover ordinary text/mask/password, numeric, choice-item,
boolean and date/time configuration, plus value callbacks and validators.
Select also declares borrowed data, custom choice identity/rendering/filtering,
and overlay service injection; date/time factories accept the same overlay
protocol. The inherited BaseControl options and callbacks are included. Full
standalone UI classes remain outside this recipe subset; no permissive index
signature hides that boundary. Built-in factories override `label` with `''` and `value` with the
cell value, even when options contain those properties.

## Select choices and borrowed services

`gridEditors.select<TRow, TRowId, TChoice, TChoiceId>()` keeps table records and
choice records independent. Existing zero/two-generic calls remain supported.
Choice defaults are Record<string, unknown> and its default ID type; specify the
third/fourth parameters when the choice schema differs from the Grid schema.
SelectGridEditorOptions uses the same four parameters. The factory result's value
remains unknown: the control can retain an initial value absent from its choices.

```ts
import { DataStore } from 'taet-ui/core';
import { gridEditors, type GridEditorOverlayService } from 'taet-ui/grid/editors';

interface Customer { id: number; country: string }
interface Country { code: string; label: string; region: string }

function countryEditor(choices: DataStore<Country, string>, overlays: GridEditorOverlayService) {
  return gridEditors.select<Customer, number, Country, string>({
    data: choices, textField: 'label', searchable: true, overlayManager: overlays,
    filterPredicate: (country, query) => country.region.includes(query),
    renderItem: (country, context) => `${context.id}: ${country.label}`
  });
}
```

External data is borrowed: the factory does not parse items/options into it or
destroy it when editing ends. The supplied store defines choice identity; valueField
and getId configure only an internally created store. Without data, the factory
parses items/options into its owned store. getId receives a choice record and an
index (possibly -1 for lookups); use a stable record field as identity. Primitive
choices normalize to `{ id, text }`; use full records for a custom choice schema.
An empty value should not collide with a valid choice ID.

filterPredicate receives the trimmed lowercase query and the live Select source.
renderItem receives source, choice id, index within the filtered choices, selected
and active flags. The source exposes its typed choice data and getSelectedItem(),
which returns a choice or null. These are choice positions/IDs, not Grid row
positions/IDs. Renderers run synchronously; strings are inserted as text, and a
returned Node is appended to the option row. Create a fresh Node per call if used.
The selected display still uses textField; renderItem customizes popup rows only.
Use searchable: true for this popup recipe; renderItem alone does not switch a
native select into the custom popup implementation.

GridEditorOverlayService describes only the existing getRoot/open/close protocol,
not a new service constructor. Select and date/time editors register their own
popup, then unregister/remove it when cancelled or destroyed. They never destroy
the injected manager. Applications keep borrowed stores/services alive for the
editor lifetime and destroy them after their tables. Standalone OverlayManager
constructor declarations remain separate work.

A column editor **resolver** is distinct from a factory option callback:
`editor(item, column, grid)` also runs during editability checks. Grid passes
`null` there; TreeGrid leaves the argument `undefined`. Check it before use.
`createCellEditor(context)` and built-in option callbacks receive the real
source. Shared column setters return `boolean | void` synchronously; narrow
their `value` before writing through the typed DataStore.

## Cancellation provenance

For both tables, cancelEdit defaults to origin: "api" and userAction: false.
Explicit metadata and reason describe the cancellation, without inheriting the
metadata that opened the editor. Escape supplies user/true; projection cleanup
uses the triggering mutation's metadata. A silent projection that removes the
edited row closes its editor without editCancel. Destruction also stays silent.
The value in editCancel is the original value, not the discarded draft.
Commit attempts use the metadata contract below.

## Commit attempts and callback lifecycle

commitEdit defaults to api/false, independently of the action that opened the
editor. Explicit options describe the attempt; standard mutation normalization
makes origin: "user" imply userAction: true. Enter supplies user/true. Validation
rejection, beforeCellChange, write rejection, cellChange and editCommit use this
same attempt metadata. Both tables include columnId on every editReject.

beforeCellChange can cancel or replace newValue. Changing identity, oldValue or
provenance in that event does not redirect the write. TreeGrid now uses the
committed record in cellChange/editCommit, matching Grid's record semantics.
A custom column setter must finish synchronously; both tables reject a Promise.

Silent commits still validate and update the value/UI but skip table semantic
events, including the beforeCellChange veto phase. Built-in writes forward silent
to DataStore. Custom setters receive context.silent and must forward it when
mutating their own source. Control-level validation callbacks still run.

A validator/getValue/beforeCellChange callback may cancel the editor or destroy
the table: the pending commit then returns false before writing. If the setter
already accepted a write, closing the editor/table preserves that result and
skips later phases. Destruction during rejection does not refocus the editor;
completed cleanup does not destroy a replacement editor. Recursive commitEdit
calls during an attempt return false; exceptions release that guard and propagate.
A synchronous exception does not roll back custom side effects.

The EventBus current dispatch snapshot remains unchanged. These guards stop
subsequent phases, not remaining listeners in the phase already being dispatched.
This section covers committing a mounted editor. Activation is covered below;
Grid clipboard and toggle editing are covered below.

## Activation, mounting and cleanup

startEdit requires a mounted, live table outside its destruction phase and returns true only if this attempt's
editor remains active after mount/editStart callbacks. It returns false if a
callback closes the table, cancels or replaces the editor, or invalidates the
captured record, visible position or column. The replacement editor survives.
Calling startEdit during resolver/factory/mount/beforeEditStart execution returns
false; commit is blocked until mounting completes. Once editStart runs, its
handler may deliberately commit, cancel or open another editor.

Both tables release a returned editor if mounting fails or activation is aborted.
A mount/editStart exception propagates after cleanup; the table can retry while
it remains alive. Raw cell editors must provide mount/getValue/validate/focus/
destroy before mounting. Invalid factory results exposing destroy are also
released. A factory that throws before returning a resource must clean up its
own allocations; neither table can recover a resource it never received.
Factories and mounts remain synchronous contracts.

Deferred focus belongs to the specific session. A cancelled Grid frame is
cancelled; TreeGrid's queued microtask checks that its original session survived.
No global adapter listeners are installed after destruction during control.mount.
ControlCellEditor destruction is idempotent, including reentrant destruction
from its control's hook. Raw editor ownership also releases each session once,
without requiring a custom destroy method to be idempotent.

Silent startEdit suppresses beforeEditStart/editStart; mounting and deferred
focus still occur. Both tables emit the same cancellable beforeEditStart. EventBus
current-dispatch snapshots are unchanged. Callbacks used during general row
rendering remain outside this activation audit.

## Grid clipboard and immediate toggle writes

Grid paste/cut and checkbox/switch activation use a temporary, unmounted editor
for normalization and validation, then release it before beforeCellChange/write.
Only beforeCellChange.newValue and cancel alter the pending write; identity and
provenance stay bound to the captured cell and current action. Parse failure,
validation failure, veto and writer rejection emit editReject with reasons
clipboard-parse, validation, before-cell-change and write-rejected respectively.
Parse failures expose error (unknown); validation failures expose validation.
Read-only/missing cells and unchanged values are skipped without a rejection.

Programmatic clipboard calls default to api/false; native clipboard and pointer/
keyboard toggles use user/true. silent suppresses table and default-store semantic
events while preserving validation and UI synchronization. Custom setters receive
silent and must forward it to their own writes. Paste emits cellChange per accepted
cell, then clipboardPaste with changed: number. Fast toggles emit cellChange and
editCommit on a changed value, without opening a mounted editing session.

Paste and cut clearing batch accepted writes into one DataStore undo entry.
Rejected cells do not prevent other cells from being applied. Each column reads
the latest record, including earlier writes to that row. Closing/disabling the
table or opening a mounted editor interrupts remaining work; returned temporary
editors are released once and replacement editors survive. Recursive immediate
writes are blocked. Exceptions propagate after cleanup; live DataStore.batch
rolls back its records on an exception, but custom effects and already dispatched
cell events are not rolled back. Destroying the store keeps its state terminal.

TreeGrid has no clipboard or immediate toggle path; its checkbox/switch editors
continue to use the mounted-editor lifecycle.

## Custom editors and events

Built-in factory options inherit BaseControlOptions, including observeResize and
onFocus/onBlur/onKeyDown/onKeyUp/onResize/onParentResize. Their source is typed as
GridBuiltinEditorControl<TValue>: a live BaseControl plus the editor value API.
It identifies the editor control, while the factory context identifies the table.
The custom-control factory still accepts the smaller GridValueControl contract;
it does not require every custom adapter to inherit BaseControl.

```ts
const editor = gridEditors.text<Customer>({
  observeResize: true,
  onFocus: event => console.log(event.source.value.get()),
  onKeyDown: event => {
    if (event.key === 'F2') event.cancel = true;
  }
});
```

Cancelling the inherited key event prevents the native default and propagation.
Use it deliberately, since table navigation and editing shortcuts also depend on
keyboard events. onParentResize requires actual Control parent composition;
mounting an editor into a Grid cell alone does not establish a Control parent.
Full standalone editor classes remain separate typing work. These declarations
describe existing runtime callbacks and the service protocols above.

`gridEditors.custom(createControl)` accepts one argument.
`createGridEditorFactory(createControl, { activation, filterType })` additionally
sets factory metadata. Both accept either a live `GridValueControl` or a raw
`CellEditor`. The former has `value.get/set`, mount/focus/destroy and optional
validation; `ControlCellEditor` supplies a successful result if it has no
validator. A raw cell editor supplies **all** of mount/getValue/validate/focus/
destroy. The grids call its `validate()` during commit. Do not return a control
descriptor. Cleanup belongs to the editor instance and its owning grid.

`SharedGridEditingEvents` declares the common event fields, using `unknown` for
heterogeneous cell values. The separate maps describe existing differences:

| Contract | Grid | TreeGrid |
| --- | --- | --- |
| beforeEditStart | Cancellable event | Not emitted |
| editCommit | `changed`, `writeResult` booleans | No such flags; includes `cancel` |
| editReject.columnId | Present | Present, including validation rejection |
| editReject.validation | Editor result on validation failure | Editor result on validation failure |

Use `GridEditingEvents` or `TreeGridEditingEvents` only for the corresponding
component. Their event maps do not declare every unrelated Grid event. A shared
listener cannot assume Grid-only commit flags. Editor events do not universally
contain the factory's `rowIndex`; store the creation context when needed.

## Verification

`npm run test:types` checks TS and JSDoc consumers from an installed tarball with
strict NodeNext and Bundler resolution. It compares all four value exports and
all ten `gridEditors` factory names with runtime exports. Negative cases reject
incorrect IDs, fields, numeric options, invalid descriptors, asynchronous
setters, missing editor methods, unsafe resolver access and unsupported events.

`npm run test:types:browser` additionally runs that compiled shared editor in
both Grid and TreeGrid. It verifies sorted/flattened context, validation, veto,
event-adjusted values, commit flags, cancellation and destruction while keeping
an external store alive. It mounts all nine built-in controls and checks their
values, the optional-validation adapter and raw editor identity. Both commands
run in `npm run test:all`; the runtime remains dependency-free.

## Common desktop keyboard policy

Both tables support Enter/F2 start, Escape cancel and Enter commit. Tab/Shift+Tab
commit and visit visible editable cells, skipping hidden/readonly/noneditable cells.
At the first/last editable cell focus exits in that direction instead of wrapping.
Rejected validation/veto retains editor focus. Composing/default-prevented keys
remain owned by the editor. Both tables emit beforeEditStart and commit
changed/writeResult; TreeGrid retains legacy cancel. Silent start suppresses
active/edit semantic notifications as well as beforeEditStart. See
[table migration notes](GRID_COMMON_CONTRACT.md).

When no tabbable element exists outside the table, boundary Tab commits and
releases table focus to the document body. This is an explicit cross-engine
fallback; programmatic code does not attempt to focus browser chrome.
