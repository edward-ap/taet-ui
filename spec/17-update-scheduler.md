# 17. Update Scheduler / Batch

## Current implementation boundary

This document describes a toolkit-wide scheduler proposal. There is no shared public UpdateScheduler yet. Grid now owns a private animation-frame renderer: data/view/group invalidations, scroll and resize share one pending paint. DataStore/DataView state and public semantic events remain synchronous. `grid.refresh()` paints immediately, and edit/navigation paths materialize their targets synchronously. DataStore.batch also batches model/projection work; Grid's paint batching does not replace it. See [Grid rendering](32-grid-rendering.md).

## Problem

Project load and complex commands often change data, value, selection, validation, property grid binding, and command state together.

Without batching, the UI can do many redundant refreshes and emit cascades of intermediate state.

## Required Primitive

```ts
interface UpdateScheduler {
  batch<T>(fn: () => T): T;
  requestRefresh(control: Control): void;
  flush(): void;
}
```

## v0 Implementation

The first implementation may be intentionally simple.

```ts
class ImmediateUpdateScheduler implements UpdateScheduler {
  batch<T>(fn: () => T): T {
    return fn();
  }

  requestRefresh(control: Control): void {
    control.refresh();
  }

  flush(): void {}
}
```

This keeps the API stable without requiring a complex scheduler before the first controls exist.

## Rules

- `batch()` groups refresh requests.
- `requestRefresh(control)` schedules one refresh per control per batch.
- `flush()` applies pending refreshes.
- Batching must not change public mutation semantics.
- `silent` suppresses public events; batching suppresses refresh storms. They are separate concerns.
- Controls should call `requestRefresh()` where practical instead of hard-wiring immediate `refresh()` into every mutation path.

## Example

```ts
updates.batch(() => {
  tree.data.parse(project.sources, { silent: true, origin: "import" });
  tree.selection.set(savedSelection, { silent: true, origin: "restore" });
  propertyGrid.clear({ silent: true, origin: "restore" });
  commands.refreshState();
});
```

## Acceptance Checklist

- Loading a project does not cause repeated full refreshes.
- Batch behavior is explicit.
- `silent` is not used as a fake render-suppression flag.
- Controls can request refresh without immediately repainting.
