# 19. Container Hierarchy

## Problem

Controls rarely live as a flat list.

A desktop-like UI needs a stable object hierarchy:

```text
workbench/layout
  panel/cell
    form
      input/button/status
```

If parent/child ownership is not explicit, dynamic WebView screens leak DOM, listeners, command bindings, and stale object references.

## Required Primitive

Every control may have a parent:

```ts
interface Control {
  readonly parent: ContainerControl | null;

  getParent(): ContainerControl | null;
  isChildOf(parent: ContainerControl): boolean;
}
```

Containers are controls that own child controls:

```ts
interface ContainerControl extends Control {
  readonly items: readonly Control[];
  readonly controls: Record<string, Control>;

  add(...controls: Control[]): this;
  attach(control: Control, options?: AttachOptions): Control | null;
  remove(controlOrName: Control | string): Control | null;
  clear(): this;
  getItem(name: string): Control | null;
  getItems(): Control[];
  getItemAt(index: number): Control | null;
  hasItem(controlOrName: Control | string): boolean;
  indexOf(controlOrName: Control | string): number;
  isEmpty(): boolean;
}

type AttachOptions = {
  container?: HTMLElement;
};
```

Rules:

- A child has at most one parent.
- `parent.destroy()` destroys child controls.
- Terminal destruction bypasses cancellable child removal events and suppresses child mutation notifications. A removal veto applies to ordinary remove/clear, never to final ownership cleanup.
- `child.destroy()` unregisters the child from its parent.
- Containers register children by `id`.
- Containers also register children by `name` when present.
- Duplicate child keys are errors.
- `getItem(name)` returns a live child control or `null`.
- `controls[name]` is an inspection shortcut, not the preferred app API.

## Panel

`Panel` is the base container.

```ts
const panel = new Panel("#root");
panel.add(toolbar, form);
```

Rules:

- `Panel.add()` accepts live `Control` instances.
- `Panel.attach()` mounts one child into the panel's content element and registers ownership.
- `Panel.addControl()` may exist as a low-level registration hook for specialized containers.
- `Panel` does not interpret descriptors as its primary API.
- `Panel` emits `beforeChildAdd`, `childAdd`, `beforeChildRemove`, and `childRemove`.
- `beforeChildAdd` and `beforeChildRemove` are cancellable.
- `Panel` may expose simple appearance settings such as `bordered`, `scroll`, and `padding`.

## Layout

`Layout` is a structured container made of cells.

```ts
const layout = new Layout("#root", {
  cols: [
    { id: "left", width: 280 },
    { id: "main" }
  ]
});

layout.cell("main").attach(form);
```

Rules:

- `Layout` is a `Panel`.
- A layout owns `LayoutCell` children.
- `layout.cell(id)` returns a cell or throws.
- `layout.getCell(id)` returns a cell or `null`.
- A `LayoutCell` is also a container.
- `LayoutCell.attach(control)` attaches one primary child by default.
- Re-attaching a different child replaces and destroys the previous child unless explicitly disabled by a future option.

## DHTMLX Comparison

DHTMLX has the same broad idea:

```js
layout.getCell("main").attach(widget);
```

The difference is that our primary API accepts live `Control` objects only. String component names, factories, descriptors, and generated UI belong in adapters.

## Visibility

Parent visibility and child visibility are separate states.

If a parent container is hidden, the browser hides the child DOM subtree. The child may still return `true` from `child.isVisible()` because its own visibility flag is unchanged.

Computed effective visibility can be added later if needed.

## Resize

Containers should be resize-aware.

Rules:

- `Panel` observes its own root size by default.
- A panel emits `resize` when its own size changes.
- A panel propagates `parentResize` to direct children.
- Complex child controls decide whether `parentResize` should trigger `refresh()`, canvas relayout, grid recalculation, or nothing.
- Interactive splitter/drag resize belongs to `LayoutCell` and follows the `beforeResizeStart` / `resize` / `afterResizeEnd` sequence described in [20. Size / Resize](20-size-resize.md).

## Acceptance Checklist

- A form can be attached to a panel/layout cell.
- A form can still own input/button children.
- Destroying a parent destroys descendants.
- Destroying a child unregisters it from the parent.
- Duplicate child keys are rejected.
- Container resize is observable and can be propagated to children.
- No descriptor is required for normal object-first composition.
