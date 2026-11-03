# 24. Layout API Audit

This document compares our `Layout` with DHTMLX Layout and DevExpress WinForms `LayoutControl`.

Goal: keep `Layout` as the base non-docking screen layout primitive, while leaving docking, auto-hide, tabbed dock groups, and drag/drop docking in `DockLayout`.

## Current State

`Layout` is already the right kind of primitive:

```ts
const layout = new Layout("#root", {
  title: "Workbench",
  header: true,
  bordered: true,
  cols: [
    { name: "left", width: 240, minSize: 120, collapsible: true },
    { name: "main", flex: 1 }
  ]
});

layout.cell("main").attach(workbench);
```

Current strengths:

- `Layout` extends `Panel`.
- `LayoutCell` is also a container.
- cells are created with `rows`, `cols`, or `cells`.
- cells support `width`, `height`, `flex` / `gravity`, `minSize`, `maxSize`.
- interactive splitter resize exists.
- cell collapse/expand exists.
- state serialization exists for cell size/collapsed state.

## DHTMLX Baseline

DHTMLX Layout exposes:

```ts
new dhx.Layout(container, {
  cols: [
    { id: "left", width: 240, resizable: true, collapsable: true },
    { id: "main" }
  ]
});
```

Useful DHTMLX properties:

- `rows`, `cols`, `views`
- `id`
- `width`, `height`, `gravity`
- `resizable`
- `collapsable`, `collapsed`
- `hidden`
- `header`, `headerIcon`, `headerImage`, `headerHeight`
- `padding`, `align`, `css`

Useful DHTMLX methods:

```ts
layout.addCell(config, index?);
layout.removeCell(id);
layout.getCell(id);
layout.cell(id);
layout.getId(index);
layout.forEach(callback);
cell.show();
cell.hide();
cell.isVisible();
cell.collapse();
cell.expand();
cell.toggle();
cell.attach(widget);
```

Useful DHTMLX events:

```ts
beforeResizeStart
resize
afterResizeEnd
beforeAdd / afterAdd
beforeRemove / afterRemove
beforeCollapse / afterCollapse
beforeExpand / afterExpand
beforeShow / afterShow
beforeHide / afterHide
```

Finding: DHTMLX treats resize/collapse/add/remove as first-class layout events, not incidental DOM operations. Our API should keep that.

## DevExpress Baseline

DevExpress `LayoutControl` is much larger than our first layout primitive. Useful concepts:

- a root layout model (`Root`)
- layout items and layout groups
- splitter items
- tabbed layout groups
- customization mode
- item add/remove/selection/dragging events
- layout update events
- layout serialization/restore
- layout upgrade/version handling

Do not copy directly:

- WinForms designer integration
- printing/export APIs on the layout itself
- registry persistence
- hundreds of inherited Windows control properties

Finding: for our WebView UI, DevExpress confirms the important boundary: `Layout` should own an inspectable model of cells/groups and should serialize layout state. Full designer customization and docking belong to higher-level components.

## Required Runtime Surface

`Layout` should expose:

```ts
interface Layout extends Panel {
  readonly direction: "rows" | "cols";

  getTitle(): string;
  setTitle(title: string, options?: MutationOptions): this;
  isHeaderVisible(): boolean;
  setHeaderVisible(visible: boolean, options?: MutationOptions): this;
  isBordered(): boolean;
  setBordered(bordered: boolean, options?: MutationOptions): this;

  addCell(config: LayoutCellConfig): LayoutCell | null;
  removeCell(idOrCell: string | LayoutCell, options?: MutationOptions): LayoutCell | null;
  getCell(id: string): LayoutCell | null;
  cell(id: string): LayoutCell;
  cellItems(): LayoutCell[];
  forEachCell(callback: (cell: LayoutCell, index: number, layout: Layout) => void): this;
  getCellId(index: number): string | null;

  isResizable(): boolean;
  isResizeable(): boolean;
  setResizable(resizable: boolean, options?: MutationOptions): this;

  setCellSize(id: string, size: number | string, options?: MutationOptions): this;
  collapseCell(id: string, options?: MutationOptions): boolean;
  expandCell(id: string, options?: MutationOptions): boolean;
  toggleCell(id: string, options?: MutationOptions): boolean;

  serializeState(): unknown;
  restoreState(state: unknown, options?: MutationOptions): this;
}
```

`LayoutCell` should expose:

```ts
interface LayoutCell extends Panel {
  setLayoutSize(size: number | string, options?: LayoutSizeOptions): this;
  getLayoutSize(): number | string | null;
  isResizable(): boolean;
  isResizeable(): boolean;
  setResizable(resizable: boolean, options?: MutationOptions): this;
  isCollapsed(): boolean;
  setCollapsed(collapsed: boolean, options?: MutationOptions): this;
}
```

Notes:

- Prefer `isResizable`.
- Keep `isResizeable` as a forgiving alias because this spelling is easy to type and appeared in discussion.
- `setResizable(false)` must remove existing splitters immediately.
- Per-cell `setResizable(false)` must also remove adjacent splitters.
- `title` implies a visible header unless `header: false` is explicit.
- the header uses the shared window-header tokens and does not overlay cells.
- `bordered: true` uses `--dui-window-border`; header, border, and cells form one solid component.
- header visibility, title, and bordered state are included in serialized layout state.

## Events

Layout-level events:

```ts
beforeResizeStart
resizeStart
resize
resizeEnd
beforeCellAdd
cellAdd
beforeCellRemove
cellRemove
beforeCellCollapse
cellCollapse
beforeCellExpand
cellExpand
cellResize
resizableChange
stateRestore
```

Rules:

- `beforeResizeStart` is cancellable.
- `resize` can fire repeatedly during splitter drag.
- `resizeEnd` fires once after splitter drag.
- `beforeCellAdd`, `beforeCellRemove`, `beforeCellCollapse`, `beforeCellExpand` are cancellable.
- event payloads are objects.
- user splitter drag uses `origin: "user"` and `userAction: true`.
- API changes use `origin: "api"` by default.

## Boundary With DockLayout

`Layout` should remain a deterministic splitter layout:

- rows/cols
- cells
- splitters
- collapse/expand
- serialize/restore

`DockLayout` should own:

- dock panel headers
- pin/unpin
- close buttons
- auto-hide landing areas
- draggable tabs/panels
- drop zones
- tabbed dock groups
- docking state model

Reason: if `Layout` becomes docking-aware, the base layout primitive becomes harder to reason about and harder to use for simple forms/workbenches.

## Recommended Next Pass

Later, not urgent:

1. Add optional cell headers to plain `LayoutCell`.
2. Add `hidden` / `show` / `hide` semantics at cell level if `Panel` visibility is not enough.
3. Add nested layout group metadata if PropertyGrid/Designer needs to inspect layout structure.
4. Add a migration hook for serialized layout state versions.
5. Decide whether event names should stay ours (`cellAdd`) or gain DHTMLX aliases (`afterAdd`).

## Acceptance Checklist

`Layout` is healthy when:

- cells can be added and removed without stale registry entries.
- `layout.isResizable()` reflects the current splitter mode.
- `layout.setResizable(false)` removes splitters from DOM.
- `cell.setResizable(false)` removes adjacent splitters from DOM.
- splitter drag emits `beforeResizeStart`, `resizeStart`, `resize`, `resizeEnd`.
- `beforeResizeStart` can cancel drag before DOM sizes mutate.
- collapse/expand remains cancellable.
- serialized state stores only layout UI state, not project model data.
