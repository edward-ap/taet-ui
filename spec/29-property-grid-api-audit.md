# 29. PropertyGrid API Audit

## Goal

Compare our schema-driven `PropertyGrid` with DevExpress WinForms `PropertyGridControl` and decide which ideas belong in this WebView desktop UI toolkit.

DevExpress is reflection/object-descriptor driven:

- `SelectedObject` and `SelectedObjects` choose the inspected target.
- categories are derived from property metadata.
- nested properties can be expandable when the object model marks them as expandable.
- default editors can be registered by value type.
- a separate `PropertyDescriptionControl` can display description/help for the selected property.
- property ordering can be category-based or alphabetic.

Our toolkit should not copy .NET reflection. The correct primitive here is explicit property schema:

```ts
propertyGrid.bind({
  source: selectedObject,
  groups: selectedObject.getProperties().groups
});
```

This keeps host-language bridges predictable. A Python, Rust, C#, or JS object can produce the same schema without depending on browser-side reflection.

## Current Reference Implementation

Implemented now:

- extends `BaseControl` directly and does not inherit Grid behavior;
- owns a vertical property renderer with category and property row geometry;
- owns a draggable name/value splitter;
- accepts `PropertyModel` objects with `{ source, groups }`;
- accepts raw `PropertyGroup[]` for simple cases;
- accepts objects with `getProperties()`;
- supports category/group rows;
- supports `showCategories: false`;
- supports `sortMode: "categorized" | "alphabetical" | "none"`;
- supports `defaultEditors` by property type;
- supports per-property `editor`;
- uses `path` as the preferred stable property key;
- exposes `getSelectedProperty()`;
- exposes `getSelectedPropertyDescription()`;
- supports collapsible categories with stable category ids;
- supports programmatic property selection by `path` or `name`;
- emits `propertyFocusChange` when selection moves to another property;
- emits cancellable `beforePropertyChange`, then `propertyChange` and `afterPropertyChange`.

## API Shape

```ts
type PropertyGridOptions = GridOptions & {
  source?: PropertyModel | PropertyGroup[] | PropertyProvider;
  labelWidth?: number | string;
  showCategories?: boolean;
  sortMode?: "categorized" | "alphabetical" | "none";
  defaultEditors?: Record<string, PropertyEditor>;
};

interface PropertyGrid extends Control {
  bind(source: PropertyModel | PropertyGroup[] | PropertyProvider, options?: MutationOptions): this;
  clear(options?: MutationOptions): this;
  refresh(options?: MutationOptions): this;

  getPropertyControl(pathOrName: string): PropertyRow | null;
  getSelectedProperty(): PropertyDef | null;
  getSelectedPropertyDescription(): string;
  selectProperty(pathOrName: string, options?: MutationOptions): boolean;
  clearPropertySelection(options?: MutationOptions): boolean;

  collapseCategory(id: string, options?: MutationOptions): boolean;
  expandCategory(id: string, options?: MutationOptions): boolean;
  toggleCategory(id: string, options?: MutationOptions): boolean;
  isCategoryCollapsed(id: string): boolean;
  getCollapsedCategories(): string[];

  setSortMode(mode: "categorized" | "alphabetical" | "none", options?: MutationOptions): boolean;
  setShowCategories(show: boolean, options?: MutationOptions): boolean;
  setDefaultEditor(type: string, editor: PropertyEditor): this;
  removeDefaultEditor(type: string): boolean;
}
```

`PropertyGrid` intentionally does not expose Grid sorting, filtering, paging, range-selection,
column menus, summaries, or header APIs. It reuses only the shared `DataStore`,
`SelectionModel`, and editor factories.

## Property Definition Additions

Category/property toggles and explicit editing mutations respect `silent`:
state and cells update without cancellable or completion events. A silent
commit still validates and calls the property setter with `silent: true` and
the mutation provenance. Invalid values leave the editor open.

Destroying the control from an event, validator or setter stops subsequent
phases. Before callbacks that cancel editing or replace the bound model abort
the old edit. Category changes refresh the visible-row index so following
inline edits address the current rows.

```ts
type PropertyDef = {
  name: string;
  path?: string;
  label: string;
  type: PropertyType;
  value: unknown;
  readOnly?: boolean;
  description?: string;
  help?: string;
  editor?: PropertyEditor | ((property: PropertyDef, row: PropertyRow, grid: PropertyGrid) => PropertyEditor);
  options?: PropertyOption[];
  set?: (value: unknown, options?: MutationOptions) => void;
  command?: PropertyCommandBinding;
  children?: PropertyDef[];
};
```

Rules:

- `path` wins over `name` for stable identity.
- `name` remains a convenient local key.
- `description`/`help` is not rendered inside the grid row. It is exposed for an inspector description panel.
- `editor` overrides the default editor for that one property.
- `defaultEditors` maps property `type` to an editor definition.
- built-in property types include `text`, `number`, `integer`, `boolean`, `switch`,
  `select`, `radio`, `date`, `time`, `dateTime`, and `readonly`.
- `children` creates an explicit expandable property hierarchy without reflection.
- expandable state is keyed by `path`; generated parent/child paths are used when `path` is omitted.

## What Not To Copy Yet

Do not implement these until the mapper/workbench needs them:

- reflection-based automatic property discovery;
- printable/exportable property grid;
- advanced row drag/drop customization;
- tabbed property pages;
- collection editors;
- full descriptor/attribute filtering.

These are useful in DevExpress because it lives inside .NET WinForms with design-time infrastructure. In our toolkit they would add weight before the host bridge and command/undo model are stable.

## PropertyInspector Composition

`PropertyInspector` is a thin facade over `PropertyGrid`:

- `bind`, `clear`, `refresh`, and property-selection methods delegate to the grid;
- property focus and change events are forwarded by the inspector;
- `beforePropertyChange` remains cancellable when handled on the inspector;
- no description or footer panel is rendered;
- PropertyGrid is content-sized and ends immediately after its last visible property row.

Unused space below the PropertyGrid belongs to its parent Panel or DockPanel.
