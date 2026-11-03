# 05. Selection Model

## Current implementation versus target API

The current SelectionModel implements `multiple`, `get`, `set`, `clear`,
`hasAny`, `destroy` and `events`; `set`/`clear` return boolean. `get` returns a
copied array containing the original selected values/records. The mode/ids/
add/remove/toggle surface below is a **target**, not a shipped v0.x guarantee.
Do not generate calls to those methods until implemented. Shipped declarations
and installed-consumer examples are in [typed data models](../docs/DATA_MODEL_TYPES.md).

BeforeChange supports cancellation; silent writes skip all semantic events and
veto handlers. The standalone SelectionModel has no `invalidate` event or
DataStore subscription. Grid/TreeGrid reconcile selection and store **records**
in their selection model; their convenience APIs accept/return IDs.

## Problem

Selection appears everywhere:

- selected list row
- selected tree node
- selected grid row or cell
- selected form field
- selected mapping link
- selected canvas shape
- selected source window
- selected inspector target

If every component invents a different surface, the API degenerates into names such as:

```ts
selectedItem
currentNode
activeField
pickedThing
focusedRow
checkedNode
selectedCell
```

Selection must be one primitive.

## Finding From DHTMLX

DHTMLX has dedicated selection classes, which confirms the primitive is real:

- List/DataView selection has `getId()`, `getItem()`, `contains()`, `add()`, and `remove()`.
- Tree selection uses a data selection model with `getId()`, `getItem()`, `add()`, and `remove()`.
- Grid selection has `setCell()`, `getCell()`, and `getCells()`.
- Selection events include `beforeSelect`, `afterSelect`, `beforeUnSelect`, and `afterUnSelect`.

The weak point is that selection shape differs by component. Sometimes it is id-based, sometimes item-based, sometimes cell-based. Our API should use one shape: a `SelectionModel<T>` where `T` is the selected thing.

## Target Primitive

Selectable controls expose:

```ts
interface SelectableControl<TSelection> extends Control {
  readonly selection: SelectionModel<TSelection>;
}
```

Minimum API:

```ts
interface SelectionModel<T> {
  readonly mode: "single" | "multiple";

  get(): readonly T[];
  ids(): readonly ItemId[];
  set(items: readonly T[], options?: SelectionOptions): void;
  add(item: T, options?: SelectionOptions): void;
  remove(item: T, options?: SelectionOptions): void;
  toggle(item: T, options?: SelectionOptions): void;
  clear(options?: SelectionOptions): void;
  hasAny(): boolean;

  readonly events: EventBus;
}

type SelectionOptions = MutationOptions;
```

Usage:

```ts
tree.selection.set([node]);
const selected = tree.selection.get()[0];

canvas.selection.set([sourceField, targetField]);

if (grid.selection.hasAny()) {
  grid.selection.clear();
}
```

## Always Return An Array

`selection.get()` always returns an array.

Rules:

- Single-select returns `[]` or `[item]`.
- Multi-select returns `[]` or multiple items.
- Callers do not need to branch on scalar versus array.
- Single-select controls enforce max length internally.

Single-select example:

```ts
tree.selection.set([node]);
const node = tree.selection.get()[0];
```

Multi-select example:

```ts
canvas.selection.set([sourceField, targetField]);
const selectedObjects = canvas.selection.get();
```

## Selection Item Type

`T` is the selected thing, not necessarily a data item.

Examples:

```ts
type TreeSelection = TreeNode;
type ListSelection = ListItem;
type GridRowSelection = GridRow;
type GridCellSelection = GridCell;
type CanvasSelection = CanvasObject | MappingLink;
type WindowSelection = SourceWindow;
```

For data-bound controls, selection may expose full items while internally storing ids.

```ts
interface TreeNode {
  id: ItemId;
  label: string;
}

tree.selection.set([tree.data.get("node-1")!]);
```

The implementation may store `id`, but the public selection model should be typed by what the caller wants to work with.

For data-bound controls, selection identity is id-based.

Rules:

- `selection.ids()` returns selected ids without resolving item objects.
- `selection.get()` resolves current items at call time when possible.
- If a selected item was removed, `selection.get()` must not return a stale object.
- Selection must reconcile after `data.update()`, `data.remove()`, `data.clear()`, and `data.parse()`.

## Selection Options

```ts
type SelectionOptions = MutationOptions;
```

### `silent`

Suppresses selection events.

Use cases:

- project model hydration
- restoring selection after refresh
- clearing selection while destroying a control
- synchronizing mirrored views

### `userAction`

Marks direct user interaction.

Examples:

```ts
tree.selection.set([node], { userAction: true });
canvas.selection.clear({ userAction: true });
tree.selection.set(savedNodes, { silent: true, origin: "restore", userAction: false });
```

Rules:

- Mouse/keyboard selection uses `userAction: true`.
- Programmatic selection defaults to `userAction: false`.
- Project model restore usually uses `silent: true`.

## Events

Selection events follow the object event rule.

```ts
interface SelectionChangeEvent<T, TSource = SelectionModel<T>> extends UIEventObject<TSource> {
  oldSelection: readonly T[];
  newSelection: readonly T[];
  userAction: boolean;
}

interface BeforeSelectionChangeEvent<T, TSource = SelectionModel<T>>
  extends SelectionChangeEvent<T, TSource> {
  cancel: boolean;
}
```

Recommended events:

```ts
beforeChange
change
afterChange
beforeClear
afterClear
```

Optional item-level events:

```ts
beforeSelect
afterSelect
beforeUnselect
afterUnselect
```

Rules:

- `beforeChange` is cancellable.
- `change` includes old and new selection arrays.
- `afterChange` fires only after successful selection update.
- `silent: true` suppresses events.
- Item-level events are optional convenience events; the canonical event is `change`.

Recommended sequence:

```ts
const oldSelection = selection.get();
const newSelection = normalize(items);

if (!options?.silent) {
  const before = selection.events.emit("beforeChange", {
    source: selection,
    oldSelection,
    newSelection,
    userAction: options?.userAction === true,
    cancel: false
  });

  if (before.cancel) return;
}

applySelection(newSelection);

if (!options?.silent) {
  selection.events.emit("change", {
    source: selection,
    oldSelection,
    newSelection,
    userAction: options?.userAction === true
  });

  selection.events.emit("afterChange", {
    source: selection,
    oldSelection,
    newSelection,
    userAction: options?.userAction === true
  });
}
```

## Single Select

Single-select controls still use `SelectionModel<T>`.

Rules:

- `set([])` clears selection.
- `set([item])` selects one item.
- `set([a, b])` throws by default.
- Silent truncation is forbidden unless a concrete legacy adapter explicitly documents it.

Example:

```ts
const selectedNode = tree.selection.get()[0] ?? null;
tree.selection.set([node]);
tree.selection.clear();
```

## Multi Select

Multi-select controls use the same API.

Rules:

- Selection order must be stable and documented.
- For canvas-like controls, order may represent z-order or selection order.
- For list/grid controls, order should usually follow data/display order.

Example:

```ts
canvas.selection.set([sourceField, targetField], { userAction: true });
```

## Convenience Methods

`set()` and `clear()` are canonical. `add()`, `remove()`, and `toggle()` are convenience methods.

Rules:

- `add(item)` keeps existing selection and adds one item.
- `remove(item)` keeps existing selection and removes one item.
- `toggle(item)` adds when absent and removes when present.
- In single-select mode, `add(item)` behaves like `set([item])`.
- Convenience methods must use the same event pipeline as `set()`.

## Focus Is Not Selection

Focus and selection are related but separate.

Examples:

- A grid cell can be focused without being selected.
- A text field can be focused but not selected as an object.
- A canvas object can be selected while a side panel field has keyboard focus.

Do not overload `selection` to mean keyboard focus. Focus remains part of `Control`.

## Checked Is Not Selection

Tree checkbox state is not necessarily selection.

Examples:

- A tree node can be checked for inclusion in export.
- Another node can be selected for inspection.

Checked/marked state belongs to data/value/command-specific APIs unless the control explicitly defines check state as its selection model.

## Relation To DataStore

Data-bound controls often store selection by item id internally.

Rules:

- Selection identity must use the same id rules as `DataStore`.
- Removing an item from `data` must reconcile `selection`.
- `data.clear()` must clear selection.
- `data.parse()` should preserve selection only when ids remain stable and the control documents that behavior.
- Data-bound controls should expose id-based convenience methods such as `getSelectedIds()` and `setSelectedIds(ids)`.
- Id-based selection must select from the current visible projection. For `Grid` this means `DataView`; for `TreeGrid` this means `TreeDataView`.
- Hidden or filtered-out ids are ignored by `setSelectedIds(ids)` rather than becoming stale selected DOM rows.

Example:

```ts
grid.data.remove(row.id);
// grid.selection must not continue pointing at the removed row.
```

## Relation To Value API

Selection is not the same as value.

Examples:

- Combo box value is the selected id; internally it may use selection to choose an item.
- Grid selection is UI state, not grid value.
- Canvas selection is editing state, not project model data by itself.

Controls may bridge selection to value, but the primitives remain separate.

## Target Acceptance Checklist

A selectable control can be accepted only if:

- It extends `Control`.
- It exposes `selection`.
- It exposes `selection.mode`.
- `selection.get()` always returns an array.
- `selection.ids()` returns selected item ids when identity exists.
- `selection.set(items, options?)` replaces selection.
- `selection.add/remove/toggle` work as convenience methods.
- `selection.clear(options?)` clears selection.
- `selection.hasAny()` reports whether anything is selected.
- Selection mutations support `silent`.
- Selection mutations support `userAction`.
- Selection events use event objects.
- Single-select behavior is documented.
- Data-bound selection reconciles when data items are removed.

## Open Questions

- Should `get()` return readonly live state or a defensive copy?
- Should item-level `beforeSelect/afterSelect` be required or optional?
