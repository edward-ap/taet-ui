# Typed Grid state models

This page documents the typed npm package; its package imports are intentional.
For portable JavaScript application setup, use the consolidated bundle as described
in [BUILD](BUILD.md). Standalone bundles do not currently ship flattened declarations.

`taet-ui/core` declares and re-exports the existing GridColumnModel,
GridFilterModel, GridSearchModel and GridGroupModel. All four remain
**experimental**, as do their original `taet-ui/grid` exports. They need no
DOM and introduce no runtime dependencies. These are model declarations;
[Grid/TreeGrid constructors and column options](GRID_TYPES.md) are declared
separately through `taet-ui/grid`.

## Column layout

```ts
import { GridColumnModel } from 'taet-ui/core';
import type { GridEditorColumn } from 'taet-ui/grid/editors';

interface Row { id: number; name: string; amount: number }
const definitions: GridEditorColumn<Row>[] = [
  { id: 'name', title: 'Name', width: 180 },
  { id: 'amount', title: 'Amount', width: 100 }
];
const columns = new GridColumnModel(definitions);
columns.move('amount', 0);
columns.setFrozen('amount', 'left');
columns.setWidth('amount', 140);
const saved = columns.getState();
columns.restoreState(saved);
columns.destroy();
```

GridColumnModel is generic over the **column definition**, preserving custom
properties and editor callbacks. GridModelColumn describes only id, width,
hidden and frozen; it is not a complete Grid column declaration. Returned
GridManagedColumn values widen the mutable layout fields so an inferred
initial `hidden: false` does not incorrectly remain a false-only type.

The constructor and replace retain the supplied array; move/restore mutate its
order, and setters mutate column objects. Supply a mutable array. `all()` and
`visible()` copy the array but retain live column objects; `get()` returns a live
object or null. `getState()` creates separate layout records. The model supports
string or numeric IDs; Grid/TreeGrid integration normally uses strings.

`replace()` returns void. Move and individual setters return whether anything
changed; unknown IDs throw. `restoreState()` returns true and emits change even
for equivalent state. Restore entries can be partial: null/missing width keeps
the existing width, missing hidden becomes false, and missing frozen clears
freezing. Use `setWidth(id, null)` to clear width explicitly. This restore
behavior is different from BaseControl.setSize and is not changed by typing.

Grid and TreeGrid create and own their columnModel; there is no injected
`columnModel` constructor option. Use their public column/layout APIs, or the
existing `grid.columnModel`, for changes to an attached table. A standalone
model does not turn its array into a live Grid binding.

## Column filters

```ts
import { GridFilterModel } from 'taet-ui/core';

interface RecordRow { id: number; name: string; amount: number }
const filters = new GridFilterModel<RecordRow, 'name' | 'amount'>();
filters.set('amount', { kind: 'number', operator: 'between', value: 10, valueTo: 50 });
filters.set('name', { kind: 'text', operator: 'startsWith', value: 'A' });
const matches = filters.createPredicate((row, columnId) => row[columnId]);
const accepted = matches?.({ id: 1, name: 'Ada', amount: 25 });
filters.destroy();
```

Filters compose with AND. The second type parameter constrains nonempty string
column IDs; it can describe computed columns as well as record fields.
`ColumnFilterInput` describes constructor/set inputs; `ColumnFilter` describes
normalized snapshots and events. The variants are values, text, number, date
and boolean. Both numeric and date `between` require two endpoints. Narrow kind
and operator before reading variant fields such as values or valueTo.

Numeric strings normalize to finite numbers through Number; dates normalize
to UTC `YYYY-MM-DD`. Range endpoints may be reversed and are inclusive.
Boolean matching is strict. Value filters deduplicate using Object.is, or
milliseconds for Date pairs; includeEmpty matches null, undefined and empty
string. Snapshot maps and values arrays are copied, but value objects are not
deep-cloned. Normalized filters can be passed back into set.

`createPredicate()` returns null if there are no filters at creation. Otherwise
it returns a live predicate over this model, including later changes. Do not
call it after model destruction. `matches()` resolves the current column values
through the supplied callback; the model does not own records or a DataStore.

Events discriminate set/clear/clearAll. ClearAll has a null columnId and map
snapshots; individual operations have oldFilter/filter. BeforeChange can veto;
activeColumns belongs to applied events, and only invalidate includes silent.
Snapshot editing is not a supported substitute for set/clear operations.

## Search state

GridSearchModel stores query, mode (`highlight` or `filter`) and optional
columns. Grid performs matching, navigation and painting; the model has no
find/search execution method. Column IDs normalize to deduplicated strings.
State access returns copied column arrays. Clear resets only query;
restoreState resets omitted fields to defaults, including mode=highlight and
columns=null. An equivalent update returns false and emits nothing.

BeforeChange supports cancellation. Change/afterChange report applied state.
Every applied change emits technical `invalidate` before change/afterChange,
including silent changes. Its payload adds `silent` to the old/new state and
provenance. Grid listens to invalidate: query, mode and column changes update
the projection, highlights and search panel without a manual refresh. Silent
updates suppress searchChange and related view/page semantic notifications.
Cancelled and equivalent updates do not invalidate.

## Grouping projection

```ts
import { GridGroupModel } from 'taet-ui/core';

const groups = new GridGroupModel<RecordRow, 'name' | 'amount'>({
  rules: [{ columnId: 'name', summaries: [{ columnId: 'amount', kind: 'total' }] }]
});
const entries = groups.entries([{ id: 1, name: 'Ada', amount: 25 }], (row, key) => row[key]);
for (const entry of entries) {
  if (entry.type === 'group') console.log(entry.path, entry.count, entry.summaries);
  else console.log(entry.item, entry.rowIndex);
}
groups.destroy();
```

Rules accept a string ID or an object with columnId (column is an input alias),
optional label and summaries. Headers expose members and resolved summaries;
item entries keep their index in the original input array, even after grouping.
Grouping keys are stringified values, with null/undefined/empty mapped to
`(Empty)`; they are not object identities. Retain the emitted path for toggle.
Toggle returns the **new expanded state**, so false means it just collapsed.

Summaries support count, min, max, average and sum/total (sum is the default).
Values use Number conversion and discard non-finite results; an empty numeric
set gives null for min/max/average and zero for sum. Rules/state snapshots copy
rule wrappers but share nested summaries; do not treat them as deep clones.
Set/clear return true even for equivalent rules; restoreState returns void.
Rule changes do not clear remembered collapsed paths. A grouping projection
does not own or mutate the records supplied to entries.

## Notifications and ownership

| Model | Cancellable before event | Notification on silent mutation | Grid ownership |
| --- | --- | --- | --- |
| Columns | None | invalidate | Always owned internally |
| Filters | beforeChange | invalidate | Inject via filters; otherwise owned |
| Search | beforeChange | invalidate | Inject via searchModel; otherwise owned |
| Groups | None | invalidate (source and operation only) | Inject via groupModel; otherwise owned |

TreeGrid shares the column model but does not accept the other three injected
models; its search and filtering APIs have a different implementation.
Grid unsubscribes from externally supplied models on destruction and preserves
them. The application must destroy its models when their owner closes.
All four models expose read-only destroyed state and support repeated destroy.
Destruction releases their state/subscriptions; subsequent operational reads and
mutations throw an Error identifying the destroyed model, including silent
restoration. Check destroyed instead of reading all()/getState() after cleanup.
Column destruction releases its retained array without modifying caller-owned
column objects. Group restore checks lifecycle before inspecting its input.

If a beforeChange handler destroys a filter/search model, the pending mutation
returns false and does not apply. If destruction happens during invalidate or
change, the applied operation retains its result but skips subsequent event
phases. EventBus does not retract handlers already in the current dispatch
snapshot; these guards prevent the model from starting another phase afterward.

Column invalidate reports operation, old/new layout snapshots, provenance and
silent before any semantic change event. Grid and TreeGrid synchronize column
order, visibility, width and freezing even for silent changes; layoutChange is
suppressed. Their compound setColumns/restoreLayoutState/auto-size operations
defer redundant column paints until their coordinated state is ready. Silent
does not suppress technical model subscribers or provide a model transaction.

Installed strict TypeScript/JSDoc checks cover normalization, typed IDs, variant
narrowing, cancellation, snapshots, return values and lifecycle. Chromium uses
compiled model factories in Grid, including silent filter/search/group rendering,
collapse and external ownership, plus silent column changes in Grid/TreeGrid.
These rendering checks use model-driven updates without forcing refresh.
