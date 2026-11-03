# 25. Panel API Audit

This document compares our `Panel` with DHTMLX container/cell behavior and DevExpress WinForms `PanelControl`.

Goal: keep `Panel` as the smallest useful visual container. It should own child controls and basic appearance, but it should not become a layout manager or docking container.

## Current State

`Panel` is our base container:

```ts
const panel = new Panel("#root", {
  bordered: true,
  scroll: "auto",
  padding: 8
});

panel.add(toolbar, form, log);
```

Current responsibilities:

- owns child controls
- mounts child controls into a content element
- registers children by `id` and `name`
- destroys descendants when destroyed
- propagates resize to direct children
- exposes basic visual appearance: `bordered`, `scroll`, `padding`, `css`

## DHTMLX Baseline

DHTMLX does not expose a separate universal `Panel` primitive in the same way. The closest behavior appears in layout cells, windows, popups, forms, and other attachable containers.

Useful common ideas:

```ts
cell.attach(widget);
cell.attachHTML(html);
cell.show();
cell.hide();
cell.isVisible();
```

Layout cell config also has simple presentation/configuration fields:

```ts
css
padding
align
width
height
hidden
```

Finding: DHTMLX confirms that a container needs attach/visibility/size/appearance, but we should keep object-first composition instead of string widget factories.

## DevExpress Baseline

DevExpress `PanelControl` is described as a panel with or without a border, and as a control that contains other controls.

Useful concepts:

- child control ownership
- with-border / without-border appearance
- look-and-feel / appearance customization
- scrollable control ancestry
- control added / control removed events
- normal control lifecycle events: visible/enabled/size/focus

Do not copy directly:

- WinForms handle internals
- designer serialization attributes
- Windows-specific `Dock`, `Anchor`, `ControlCollection` details
- hundreds of inherited framework events

Finding: DevExpress keeps `PanelControl` simple. More structured layout is handled by `LayoutControl`, `SplitContainerControl`, `TablePanel`, `StackPanel`, and docking components. That matches our boundary: `Panel` is a plain container; `Layout` and `DockLayout` own spatial rules.

## Required Runtime Surface

`Panel` should expose:

```ts
interface Panel extends Control {
  readonly items: readonly Control[];
  readonly controls: Record<string, Control>;

  getContentElement(): HTMLElement | null;

  add(...controls: Control[]): this;
  attach(control: Control, options?: AttachOptions): Control | null;
  addControl(control: Control): Control;
  remove(controlOrName: Control | string): Control | null;
  clear(): this;

  getItem(name: string): Control | null;
  getItems(): Control[];
  getItemAt(index: number): Control | null;
  hasItem(controlOrName: Control | string): boolean;
  indexOf(controlOrName: Control | string): number;
  isEmpty(): boolean;

  isBordered(): boolean;
  setBordered(bordered: boolean, options?: MutationOptions): this;
  getScrollMode(): "visible" | "hidden" | "auto" | "x" | "y";
  setScrollMode(mode: "visible" | "hidden" | "auto" | "x" | "y", options?: MutationOptions): this;
  getPadding(): number | string | null;
  setPadding(padding: number | string | null, options?: MutationOptions): this;
}
```

## Events

Panel-level events:

```ts
beforeChildAdd
childAdd
beforeChildRemove
childRemove
appearanceChange
```

Rules:

- `beforeChildAdd` and `beforeChildRemove` are cancellable.
- child events include `control`, `controlId`, `controlName`, and `index`.
- `appearanceChange` is emitted by runtime appearance setters unless `silent: true`.
- `Panel` inherits `beforeShow`, `show`, `afterShow`, `beforeHide`, `hide`, `afterHide`, `resize`, `parentResize`, `focus`, `blur`, `keyDown`, and `keyUp` from `Control`.

## Boundary

`Panel` should not own:

- rows/cols splitters
- grid/table layout rules
- docking
- tab groups
- validation summaries
- command routing
- data binding

Those belong to specialized controls.

## Recommended Next Pass

Later, if needed:

1. Add `attachHTML()` only if we decide raw HTML is an accepted adapter path.
2. Add `suspendLayout()` / `resumeLayout()` only if bulk attach starts causing measurable redraw work.
3. Add `getEffectiveVisible()` at `Control` level if parent-hidden visibility becomes ambiguous.
4. Add `setCss()` / `addCss()` / `removeCss()` only after a general class mutation policy is defined.

## Acceptance Checklist

`Panel` is healthy when:

- it can own any `Control`.
- duplicate child keys are rejected.
- child destroy unregisters from parent.
- parent destroy destroys descendants.
- add/remove events are object-based.
- child add/remove can be cancelled before mutation.
- `bordered`, `scroll`, and `padding` can be configured and changed at runtime.
- `Panel` remains simpler than `Layout`.
