# 20. Size / Resize

## Problem

Container controls are not complete without resize behavior.

Desktop-like controls such as grids, trees, canvases, splitters, preview panes, and mapping surfaces must know when their host size changes. Otherwise they render stale geometry after a panel is resized, a WebView window changes size, or a layout cell is adjusted.

## DHTMLX Finding

DHTMLX exposes two important resize ideas:

- A low-level `resizeHandler(container, handler)` built on `ResizeObserver` with an iframe fallback.
- Layout cell drag-resize events: `beforeResizeStart`, `resize`, and `afterResizeEnd`.

This means resize is not an incidental CSS concern. It is a UI primitive.

## Required Primitive

Every control may expose size:

```ts
type ControlSize = {
  width: number | string | null;
  height: number | string | null;
};

interface Control {
  getSize(): ControlSize;
  setSize(size: Partial<ControlSize>, options?: ResizeOptions): this;
  setSize(width: number | string | null, height: number | string | null, options?: ResizeOptions): this;
}

type ResizeOptions = {
  origin?: string;
  userAction?: boolean;
  silent?: boolean;
};
```

Rules:

- `getSize()` returns measured DOM size when mounted.
- `getSize()` returns configured size when not mounted.
- `setSize()` updates control state and root DOM size.
- `setSize()` emits `resize` unless `silent: true`.
- `onResize` constructor callback subscribes to the `resize` event.
- `onParentResize` constructor callback subscribes to `parentResize`.

## Resize Events

```ts
type ResizeEvent<TSource = Control> = {
  source: TSource;
  oldSize: ControlSize | null;
  newSize: ControlSize;
  width: number | string | null;
  height: number | string | null;
  origin: string;
  userAction: boolean;
};
```

Rules:

- `resize` means the control's own measured/configured size changed.
- `parentResize` means an ancestor/container changed size.
- `resize` is not cancellable. Cancellable resize belongs to interactive splitter/drag flows.
- Containers should observe their root size by default.
- Leaf controls may opt in with `observeResize: true` or `onResize`.
- Resize events must stop after `destroy()`.

## Layout Drag Resize

Resizable layout splitters use a separate interaction event sequence on the owning `Layout`:

```ts
layout.events.on("beforeResizeStart", e => {
  if (app.locked) e.cancel = true;
});

layout.events.on("resize", e => {});
layout.events.on("resizeEnd", e => {});
```

Rules:

- `beforeResizeStart` is cancellable.
- `resize` may fire repeatedly during drag.
- `resizeEnd` fires once when drag finishes.
- Drag-resize must update cell size through the same `setSize()` / `resize` pipeline.

## Acceptance Checklist

- A panel can emit `resize` when its DOM size changes.
- A panel can propagate `parentResize` to direct children.
- `setSize()` updates DOM width/height and emits `resize`.
- `onResize` constructor sugar works through `EventBus`.
- Destroying a control disconnects resize observers.
