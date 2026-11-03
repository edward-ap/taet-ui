# 04. DataStore

## Problem

Lists, trees, grids, combo boxes, menus, toolbars, charts, and file views all need structured item data.

If every control stores data differently, the system gets fragmented:

- loading data differs per widget
- selection cannot share item identity rules
- updates cannot be observed consistently
- import/export becomes control-specific
- grids, trees, and combos cannot reuse adapters
- host-language bridges need custom code for each control

Data-bound controls need one shared mutable primitive. Filtering, sorting, paging, and virtual visibility belong to a separate `DataView` projection, not to `DataStore`.

## Finding From DHTMLX

DHTMLX has a strong data primitive:

```ts
DataCollection<T>
TreeCollection<T>
```

The common API includes:

```ts
parse(data)
add(item, index?)
remove(id)
removeAll()
update(id, patch, silent?)
exists(id)
getItem(id)
map(callback)
serialize()
load(url, driver?)
filter(...)
sort(...)
```

Widgets such as Grid, List, Tree, Combobox, Chart, Vault, Toolbar, Ribbon, and Sidebar use `this.data`.

This is the right architecture. Our API should keep the idea but tighten names and define the minimal store contract:

- `getItem(id)` becomes `get(id)`.
- `removeAll()` becomes `clear()`.
- `serialize()` is useful but belongs to the serialization/project model primitive.
- `load()` belongs to import/export and adapters, not the minimal in-memory store.

## Required Primitive

Any data-bound control must implement:

```ts
interface DataBoundControl<TItem> extends Control {
  readonly data: DataStore<TItem>;
}
```

Preferred item shape:

```ts
type ItemId = string | number;

interface DataItem {
  id: ItemId;
}

type DataStoreOptions<TItem> = {
  idField?: keyof TItem;
  getId?: (item: TItem, index: number) => ItemId;
};
```

Minimum store API:

```ts
interface DataStore<TItem> {
  parse(items: TItem[], options?: DataMutationOptions): boolean;
  all(): readonly TItem[];
  get(id: ItemId): TItem | undefined;
  add(item: TItem, options?: DataMutationOptions): boolean;
  update(id: ItemId, patch: Partial<TItem>, options?: DataMutationOptions): boolean;
  remove(id: ItemId, options?: DataMutationOptions): boolean;
  clear(options?: DataMutationOptions): boolean;

  idOf(item: TItem): ItemId;

  readonly events: EventBus;
}

type DataMutationOptions = MutationOptions & {
  strict?: boolean;
};
```

Read-only projection API:

```ts
interface DataView<TItem> {
  all(): readonly TItem[];
  get(id: ItemId): TItem | undefined;
  has(id: ItemId): boolean;
  idOf(item: TItem): ItemId;
  indexOf(idOrItem: ItemId | TItem): number;

  setFilter(filter: DataFilter<TItem> | null, options?: MutationOptions): boolean;
  clearFilter(options?: MutationOptions): boolean;
  getFilter(): DataFilter<TItem> | null;

  setSort(sort: DataSort<TItem> | null, options?: MutationOptions): boolean;
  clearSort(options?: MutationOptions): boolean;
  getSort(): DataSort<TItem> | null;
  refresh(options?: MutationOptions): boolean;

  readonly events: EventBus;
}
```

Tree projection API:

```ts
interface TreeDataView<TItem> {
  all(): readonly TItem[];
  entries(): readonly TreeDataEntry<TItem>[];
  get(id: ItemId): TItem | undefined;
  getEntry(id: ItemId): TreeDataEntry<TItem> | null;
  has(id: ItemId): boolean;
  idOf(item: TItem): ItemId;
  parentIdOf(item: TItem): ItemId | null;
  hasChildren(id: ItemId): boolean;

  expand(idOrItem: ItemId | TItem, options?: MutationOptions): boolean;
  collapse(idOrItem: ItemId | TItem, options?: MutationOptions): boolean;
  toggle(idOrItem: ItemId | TItem, options?: MutationOptions): boolean;
  expandAll(options?: MutationOptions): boolean;
  collapseAll(options?: MutationOptions): boolean;
  isExpanded(idOrItem: ItemId | TItem): boolean;
  getExpandedIds(): ItemId[];

  readonly events: EventBus;
}

type TreeDataEntry<TItem> = {
  item: TItem;
  id: ItemId;
  parentId: ItemId | null;
  level: number;
  hasChildren: boolean;
  expanded: boolean;
};
```

Usage:

```ts
tree.data.parse(project.sources);
combo.data.parse(lookupValues);
grid.data.parse(previewRows);

const row = grid.data.get("row-42");
const updated = grid.data.update("row-42", { status: "ready" });
const removed = grid.data.remove("row-42");
grid.data.clear();

const view = new DataView({
  data: grid.data,
  filter: item => item.active,
  sort: (a, b) => a.name.localeCompare(b.name)
});

view.all(); // visible/projected items
```

## Method Rules

### Callback lifetime and nested writes

Mutation methods prepare against one store revision. An accepted nested write
from `beforeChange` (even with `silent: true`) supersedes that prepared operation:
the outer call returns `false`, keeps the nested write, and emits no obsolete
completion. This applies to parse/add/update/remove/clear and undo/redo replay.
There is no automatic merge or retry; even a nested write to another record
invalidates the older prepared operation. Nested no-ops and vetoes alone do not.

Identity callbacks must be pure. Observable store replacement/destruction during
identity evaluation also cancels the pending mutation. Direct object writes,
identity-schema changes and arbitrary getter recursion are not isolated or
tracked transactions. Recursive beforeChange notifications are bounded to eight
nested operations, after which an explicit error propagates.

Already accepted writes retain their success result, while a newer write during
invalidate/change prevents later phases of the older notification. Same-phase
EventBus snapshots retain their existing listener behavior. Listener exceptions
propagate without undoing an accepted write outside a batch.

Nested batches share the outer synchronous transaction. An outer callback error
restores its captured rows and ID map without re-running getId; destruction is
terminal and rollback must not resurrect records. Undo/redo return false while
a batch is active. Outside a batch, history transfer belongs only to the surviving
accepted replay, so nested undo/redo cannot transfer one entry twice. See
docs/TYPES.md for the shipped batch/history signatures.

### `parse(items)`

Replaces the store contents with a new item set.

Rules:

- Accepts an array of items.
- Requires stable item identity.
- Replaces existing data by default.
- Emits a data reset/load event unless `silent: true`.
- Data-bound controls refresh after parse unless explicitly suspended.
- Project model hydration should usually call `parse(items, { silent: true, origin: "import" })`.

### `all()`

Returns all current items.

Rules:

- Must return items in raw store order.
- Should return a readonly view or defensive copy.
- Must not expose internal mutable arrays unless mutation is intentionally supported.

### `get(id)`

Returns one item by id.

Rules:

- Returns `undefined` when missing.
- Must not throw for missing ids.
- Must use the same id identity rules as selection.

### `add(item)`

Adds one item.

Rules:

- Item must have stable identity.
- Duplicate id behavior must be documented.
- Emits an add/change event unless `silent: true`.
- Data-bound control refreshes affected region.

### `update(id, patch)`

Patches one item.

Rules:

- Returns `true` when mutation was applied.
- Returns `false` when id was missing, the update was cancelled, or the update was a no-op.
- With `strict: true`, missing id throws a documented error.
- Patch must merge into the existing item.
- Emits an update/change event unless `silent: true`.
- Must include both previous and next item data in event objects when possible.
- `update(id, patch)` is the MVP object-item API. Stores that manage immutable objects, class instances, nested graphs, or arrays may later add `replace(id, item)` or `mutate(id, updater)`.

### `remove(id)`

Removes one item.

Rules:

- Returns `true` when an item was removed.
- Returns `false` when id was missing or removal was cancelled.
- With `strict: true`, missing id throws a documented error.
- Emits remove/change events unless `silent: true`.
- Data-bound controls must reconcile selection/focus after remove.

Default behavior is non-throwing because UI reconciliation often removes items that may already be gone. Reference implementation tests should use `strict: true` for business/workbench operations where a missing id indicates a bug.

### `clear()`

Removes all items.

Rules:

- Emits clear/change events unless `silent: true`.
- Data-bound controls must clear selection and focus.
- Equivalent to DHTMLX `removeAll()`, but the public API should use `clear()`.

## Data Events

Data stores use the same `EventBus` event object rule.

```ts
type DataOperation = "parse" | "add" | "update" | "remove" | "clear";

interface DataStoreEvent<TItem> extends UIEventObject<DataStore<TItem>> {
  operation: DataOperation;
  userAction: boolean;
}

interface DataChangeEvent<TItem> extends DataStoreEvent<TItem> {
  id?: ItemId;
  item?: TItem;
  items?: readonly TItem[];
  oldItem?: TItem;
  newItem?: TItem;
  patch?: Partial<TItem>;
  cancel?: boolean;
}
```

Recommended event names:

```ts
beforeChange
change
afterChange
```

Rules:

- `beforeChange` is cancellable when the operation can be refused.
- `change` is the canonical broad event for controls that need to refresh.
- `afterChange` fires only after success.
- `operation` tells whether the mutation was `parse`, `add`, `update`, `remove`, or `clear`.
- Event objects include `source`, operation-specific fields, and `userAction`.
- `silent: true` suppresses store events.
- Convenience events such as `afterAdd` or `afterRemove` may be added later, but they are not required for MVP.

## DataBoundControl Rules

```ts
interface DataBoundControl<TItem> extends Control {
  readonly data: DataStore<TItem>;
}
```

Rules:

- The control renders from `data`.
- The control must subscribe to data changes and refresh itself.
- `destroy()` must dispose data subscriptions created by the control.
- The control may own the store or receive an external store.
- If the store is external, `destroy()` must not destroy the store unless ownership is explicit.

Examples:

```ts
const sourcesTree = new Tree({ data: new TreeDataStore() });
sourcesTree.data.parse(project.sources, { silent: true, origin: "import" });

const statusCombo = new ComboBox();
statusCombo.data.parse([
  { id: "new", label: "New" },
  { id: "done", label: "Done" }
]);

const previewGrid = new Grid();
previewGrid.data.parse(previewRows);
```

## Store Ownership

Data-bound controls need a clear ownership rule.

Recommended:

```ts
type DataStoreOwnership = "owned" | "external";
```

Rules:

- A control-created store is owned by the control.
- A caller-provided store is external by default.
- `destroy()` removes the control's subscriptions.
- `destroy()` only destroys/clears the store when the store is owned.

This prevents two controls sharing one store from breaking each other.

## Item Identity

Every item must have stable identity inside the store. The identity may come from:

- `item.id`
- configured `idField`
- configured `getId(item, index)`
- generated internal id, when the store owns identity

Rules:

- The store must expose `idOf(item)` for controls and selection models.
- Generated internal ids must remain stable while the item remains in the store.
- Selection and focus reconciliation must use store identity, not object reference.
- A store may reject duplicate ids or replace existing items, but the behavior must be documented.
- A store should not mutate external item objects just to add `id` unless ownership is explicit.

## Flat And Tree Stores

The minimum `DataStore<T>` is flat. Trees should extend it.

```ts
interface TreeDataItem extends DataItem {
  parentId?: ItemId | null;
  children?: TreeDataItem[];
}

interface TreeDataStore<TItem extends TreeDataItem> extends DataStore<TItem> {
  children(parentId: ItemId | null): readonly TItem[];
  parent(id: ItemId): TItem | undefined;
  move(id: ItemId, parentId: ItemId | null, index?: number, options?: DataMutationOptions): void;
}
```

The base methods remain the same:

```ts
tree.data.parse(project.sources);
tree.data.get(id);
tree.data.update(id, patch);
tree.data.remove(id);
tree.data.clear();
```

Tree-only behavior is additive.

## Relation To Value API

Data and value are different primitives.

Examples:

- Combo box `data` is the list of options.
- Combo box `value` is the selected id or ids.
- Grid `data` is rows.
- Grid selection is not the same as `data`.
- Form `value` is structured field values, not the option stores used by combo fields.

Do not overload `value` to mean item collection.

## Reference Implementation v0.5

The first data-bound value-control is `SelectInput`.

Rules proven by `lab05`:

- `SelectInput` exposes `data: DataStore`.
- The control may create its own store or receive an external store.
- A control-created store is destroyed by `SelectInput.destroy()`.
- An external store is not destroyed by `SelectInput.destroy()`.
- `data.parse(items)` renders native `<select>` options.
- `value.get()` returns the selected item id, not the whole item.
- `getSelectedItem()` returns the current item or `null`.
- `value.set(id, { silent: true, origin: "import" })` updates the selected option without public value events.
- `SelectInput.value` may exist without a matching data item. This preserves project values during async lookup reloads.
- If current value does not match any item, `getSelectedItem()` returns `null`.
- Data membership validation is optional and belongs to a validator such as `valueInData()`.
- `required()` only checks non-empty value; it does not require a matching item in `data`.
- If `clearValueOnMissingData: true` is enabled and a store mutation removes the current item id, the control resets value to its empty value silently with `origin: "system"`.
- `Form.validate()` works without select-specific form code because `SelectInput` implements the same value/validation surface as `TextInput`.

## Relation To Import / Export

The minimal store is in-memory.

Import/export belongs to adapters:

```ts
data.parse(csvDriver.parse(text));
const json = jsonDriver.serialize(data.all());
```

Future extension:

```ts
data.load(source, options);
data.export(driver, options);
```

But these should not be required for the minimal `DataStore`.

## Acceptance Checklist

A data-bound control can be accepted only if:

- It extends `Control`.
- It exposes `data`.
- `data` implements `parse`, `all`, `get`, `add`, `update`, `remove`, and `clear`.
- Data items have stable identity.
- Data mutations support `silent`.
- Data mutations support `origin`.
- `update()` and `remove()` return `boolean`.
- `strict: true` can expose missing-id bugs.
- Data events use event objects.
- The control refreshes from store changes.
- The control disposes store subscriptions in `destroy()`.
- External store ownership is documented.

## Open Questions

- Should `add()` return the added item id?
- Should `update()` return a richer mutation result later?
- Should `parse()` preserve selection when ids remain stable?
- Should `all()` return a copy or readonly live view?
- Should filtering/sorting be part of base `DataStore` or a higher-level `DataViewStore`?
## DataView Rules

`DataView` is a read-only projection over `DataStore`.

Rules:

- `DataStore` owns mutation.
- `DataView` owns filtering and sorting.
- `DataView.all()` returns visible/projected items.
- `DataView.get(id)` returns an item only when it is visible in the current projection.
- Source `DataStore` changes rebuild the projection and emit `change` when visible ids change.
- Grid renders `DataView` instead of pushing filter/sort logic into the visual control.

### Silent mutations and invalidation

`silent` suppresses public semantic events. It must not suppress dependency updates.

The data pipeline therefore has two event levels:

- `invalidate` is technical and is always emitted after an accepted mutation or projection rebuild;
- `change` / `afterChange` are public and are omitted when `silent: true`.

`DataView` listens to `DataStore.invalidate`. Grid listens to `DataView.invalidate`.
This guarantees that loading, restoring, filtering, or sorting with `silent: true` still updates the visible rows without reporting a user-facing change.
- List-style controls should follow the same projection pattern when filtering/sorting is added.

## TreeDataView Rules

`TreeDataView` is a read-only visible tree projection over flat `DataStore` data.

Rules:

- Source data remains in `DataStore`.
- Tree parent relationship is configured with `parentField` and `rootParentId`.
- `entries()` returns flattened visible nodes with `level`, `parentId`, `hasChildren`, and `expanded`.
- Expand/collapse changes emit view-level `change` events when visible ids change.
- TreeGrid and TreeList render `TreeDataView.entries()` instead of owning tree flattening logic.
- Tree view event arrays are captured at emission and materialized on first read. Later model changes or destruction cannot change their entry wrappers/order. They remain shallow snapshots of item references, enumerable and assignable; caller changes to arrays/wrappers do not mutate the projection.

## Virtual Rendering Rules

Virtual rendering belongs to visual controls, not to `DataStore`.

Rules:

- `DataStore` owns raw item mutation.
- `DataView` and `TreeDataView` own visible projection order.
- `Grid` and `TreeGrid` may render only the current viewport slice plus overscan.
- Fixed row height is required for the initial virtual renderer.
- Selection, active row, and keyboard navigation must use item ids and projection indexes, not DOM row indexes.
- Virtual rendering must not change `data.all()`, `view.all()`, or `treeView.entries()` results.

Current reference options:

```ts
type VirtualGridOptions = {
  rowHeight?: number | string;
  virtualRows?: boolean;     // default true
  virtualOverscan?: number;  // default 6
};
```

## Grid Projection API

`Grid` exposes convenience methods over `DataView`, but does not own projection logic.

Rules:

- `grid.setFilter(filter)` delegates to `grid.view.setFilter(filter)`.
- `grid.clearFilter()` delegates to `grid.view.clearFilter()`.
- `grid.sortBy(columnId, direction?)` creates a column comparator and delegates to `grid.view.setSort()`.
- `grid.clearSort()` delegates to `grid.view.clearSort()`.
- Sort state belongs to the visual grid header, while sort projection belongs to `DataView`.
- Columns are sortable only when explicitly configured with `sortable: true` or custom `sort(left, right, ctx)`.

```ts
const grid = new Grid({
  columns: [
    { id: "name", sortable: true },
    { id: "amount", sortable: true, align: "right" }
  ]
});

grid.setFilter(row => row.active);
grid.sortBy("name", "asc");
grid.clearSort();
```
