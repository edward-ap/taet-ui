# 07. Property Model

## Problem

Desktop-like editors and mappers need property panels.

A user selects something:

- source box
- target field
- join rule
- map step
- field connector
- transform node
- source window
- canvas link

The property grid should not know what any of those domain objects are. It should only know how to render and edit property definitions.

Without a property model, every inspector becomes a pile of type checks:

```ts
if (selected instanceof SourceBox) ...
if (selected instanceof JoinRule) ...
if (selected instanceof MapStep) ...
if (selected instanceof FieldConnector) ...
```

That does not scale.

## Finding From DHTMLX

DHTMLX provides many controls that could render property editors: Form, Grid, Layout, Combo, Checkbox, Input, Select.

But it does not expose a general desktop-style property schema primitive. There is no common contract like:

```ts
selectedObject.getProperties()
propertyGrid.bind(properties)
```

For mapper and design-tool applications, this is a missing layer. We should define it explicitly.

## Required Primitive

Inspectable objects expose:

```ts
interface PropertyProvider {
  getProperties(context?: PropertyContext): PropertyModel;
}
```

Property grid consumes:

```ts
propertyGrid.bind(selectedObject.getProperties());
```

Minimum model:

```ts
type PropertyModel = {
  source?: unknown;
  groups: PropertyGroup[];
};

type PropertyGroup = {
  id: string;
  title: string;
  properties: PropertyDef[];
};

type PropertyDef = {
  name: string;
  path?: string;
  label: string;
  type: PropertyType;
  value: unknown;
  readOnly?: boolean;
  options?: PropertyOption[];
  set?: (value: unknown, options?: MutationOptions) => void;
  command?: PropertyCommandBinding;
};
```

## Property Types

Minimum types:

```ts
type PropertyType =
  | "text"
  | "number"
  | "boolean"
  | "select"
  | "readonly";
```

Rules:

- `text` edits strings.
- `number` edits numeric values.
- `boolean` edits true/false values.
- `select` uses `options`.
- `readonly` displays but does not edit.
- `readOnly: true` can make any type non-editable.

Options:

```ts
type PropertyOption = {
  id: string;
  text: string;
};

type PropertyCommandBinding = {
  id: CommandId;
  target?: unknown;
  property?: string;
};

type PropertyEditRequest = {
  source?: unknown;
  group: PropertyGroup;
  property: PropertyDef;
  oldValue: unknown;
  newValue: unknown;
};
```

Example:

```ts
{
  name: "joinType",
  label: "Join Type",
  type: "select",
  value: "left",
  options: [
    { id: "inner", text: "Inner" },
    { id: "left", text: "Left" },
    { id: "full", text: "Full" }
  ]
}
```

## Property Grid

Property grid is a control specialized for property schemas.

```ts
interface PropertyGrid extends Control {
  bind(model: PropertyModel, options?: PropertyBindOptions): void;
  clear(options?: PropertyBindOptions): void;
  refresh(options?: PropertyBindOptions): void;

  getPropertyControl(pathOrName: string): PropertyRow | null;
  getSelectedProperty(): PropertyDef | null;
  getSelectedPropertyDescription(): string;
  setSortMode(mode: PropertySortMode, options?: MutationOptions): boolean;
  setShowCategories(show: boolean, options?: MutationOptions): boolean;
  setDefaultEditor(type: string, editor: PropertyEditor): void;
  removeDefaultEditor(type: string): boolean;

  readonly events: EventBus;
}

type PropertyBindOptions = MutationOptions;
type PropertySortMode = "categorized" | "alphabetical" | "none";
```

Usage:

```ts
const selected = canvas.selection.get()[0];

if (isPropertyProvider(selected)) {
  propertyGrid.bind(selected.getProperties());
} else {
  propertyGrid.clear();
}
```

## Property Identity

Property names are stable keys inside a provider.

Rules:

- `name` is machine-readable.
- `path` is the preferred stable machine address when the property can be saved, validated, or edited through commands.
- `PropertyGrid` uses `path` as the preferred row key when present.
- `label` is user-facing.
- `name` should not change when UI language changes.
- Group `id` is machine-readable.
- Group `title` is user-facing.
- A property can be addressed by `path`, or by `group.id + name` when no path exists.

## Editing Properties

A property model must not be read-only data only. It needs an update path.

Editable properties must provide an update path through `set` or `command`.

Example:

```ts
{
  name: "name",
  label: "Name",
  type: "text",
  value: this.name,
  set: value => {
    this.name = String(value);
  }
}
```

Rules:

- If `command` is present, PropertyGrid executes the command instead of calling `set` directly.
- When executing a command, PropertyGrid passes a context extended with `propertyEdit: PropertyEditRequest`.
- Direct `set` is allowed for simple, non-undoable, internal, or low-level properties.
- Public workbench property edits should preferably route through a command such as `property.set`.
- If `readOnly` is true or type is `readonly`, the grid must not edit it.
- If `set` is missing, the property is display-only unless the provider supports model-level updates.
- Mutation options must preserve `silent`, `origin`, and `userAction`.

## Property Change Events

Property edits use event objects.

```ts
interface PropertyChangeEvent extends UIEventObject<PropertyGrid> {
  property: PropertyDef;
  group: PropertyGroup;
  oldValue: unknown;
  newValue: unknown;
  userAction: boolean;
}

interface BeforePropertyChangeEvent extends PropertyChangeEvent {
  cancel: boolean;
}
```

Recommended events:

```ts
beforeChange
change
afterChange
bind
clear
```

Rules:

- `beforeChange` is cancellable.
- `change` includes property, old value, new value, and userAction.
- Property grid should update through the `ValueControl` pipeline of the editor control when possible.
- `silent: true` suppresses property grid events.

## Relation To Selection

Selection drives the property grid.

```ts
canvas.selection.events.on("change", e => {
  const selected = e.newSelection[0];

  if (isPropertyProvider(selected)) {
    propertyGrid.bind(selected.getProperties(), { silent: true, origin: "system" });
  } else {
    propertyGrid.clear({ silent: true, origin: "system" });
  }
});
```

Rules:

- No selection means empty property grid.
- Single selection usually shows that object's properties.
- Multi-selection may show common properties, mixed values, or a read-only summary.
- Multi-selection behavior must be documented by the property grid.

## Relation To Commands

Property editing should be command-backed in a workbench.

Example:

```ts
commands.execute("property.set", {
  ...appContext,
  propertyEdit: {
    source: model.source,
    group,
    property,
    oldValue,
    newValue
  }
}, {
  origin: "user",
  userAction: true
});
```

This is useful for undo/redo because property changes become named operations.

Recommended future command:

```ts
property.set
```

Context:

```ts
type SetPropertyContext = {
  propertyEdit: PropertyEditRequest;
};
```

Rules:

- If a property has both `command` and `set`, command wins for public UI editing.
- Generic `property.set` commands should use `property.path ?? property.name` as the editable address.
- Property command execution origin may be `"user"` while the mutation inside command should use `origin: "command"`.

## Relation To Validation

Property definitions can carry validation metadata later.

Future extension:

```ts
type PropertyValidationMetadata = {
  validation?: ValidationRule[];
  error?: string;
};
```

For now, property grid should preserve value metadata and call validators through the validation primitive when it exists.

## Relation To Description Panels

DevExpress pairs `PropertyGridControl` with `PropertyDescriptionControl`.

Our equivalent should stay compositional:

```ts
propertyGrid.events.on("propertyFocusChange", e => {
  descriptionPanel.setText(e.description);
});
```

Rules:

- Property rows may define `description` or `help`.
- `PropertyGrid.getSelectedPropertyDescription()` returns that text.
- `PropertyGrid` should not reserve permanent row space for descriptions.
- A future `PropertyInspector` can compose `PropertyGrid` and a description control.

## Multi-Selection

A property grid may bind multiple providers.

Future extension:

```ts
propertyGrid.bindMany(selectedObjects);
```

Possible behavior:

- show only common properties
- show mixed values as special readonly/mixed marker
- apply edits to every selected object

This should remain an extension. The base primitive is one selected object's `PropertyModel`.

## Acceptance Checklist

A property model can be accepted only if:

- Inspectable domain objects expose `getProperties()`.
- Property grid binds to `PropertyModel`, not concrete classes.
- Property model may include `source`.
- Property groups have stable `id` values.
- Properties have stable `name` values.
- Editable persisted properties should have stable `path` values.
- Properties have user-facing labels.
- Properties declare a known type.
- Editable properties provide a safe update path.
- Readonly properties cannot be edited.
- Select properties provide options.
- Property changes emit object-based events.
- Selection can drive property grid binding without type-specific UI code.

## Open Questions

- Should mixed multi-selection values be represented by a sentinel value?
- Should workbench-level property editing forbid direct `set` entirely after MVP?
