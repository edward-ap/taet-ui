# 18. Object-First UI Composition

## Problem

The primary UI API must not become JSON-schema rendering or "React without React".

The toolkit is built around live controls:

- real classes
- constructors
- methods
- events
- lifecycle
- value APIs
- command binding

Plain object descriptors may exist later as an adapter for generated UI, saved UI, or low-code tooling. They are not the primary application API.

## Primary UI Composition Model

The primary public UI construction model is object-first.

Applications create live `Control` instances and compose them directly. `Form`, `Panel`, and `Layout` arrange existing controls. They must not require JSON descriptors for normal use.

```ts
const sourceName = new TextInput({
  name: "sourceName",
  label: "Project Name",
  value: "Customer Mapping",

  onChange(event) {
    documentState.markDirty({
      origin: event.origin,
      userAction: event.userAction,
      path: "project.name"
    });
  }
});

const saveButton = new Button({
  name: "save",
  text: "Save",
  command: "project.save"
});

const form = new Form("#root")
  .row(saveButton, importButton, status)
  .row(sourceName)
  .row(log);
```

Pre-mount composition is valid:

```ts
const form = new Form({ name: "projectForm" })
  .row(saveButton, status)
  .row(sourceName);

layout.cell("main").attach(form);
```

Composition can also be nested through containers:

```ts
const layout = new Layout("#root", {
  cols: [{ id: "main" }]
});

const form = new Form();
layout.cell("main").attach(form);

form.row(saveButton, status).row(sourceName);
```

Rules:

- `Form.row()` accepts `Control` instances only.
- `Form.col()` accepts `Control` instances only.
- `Form` arranges controls; it does not need to interpret JSON for normal app code.
- `Form` must not create controls from `{ type: "..." }`.
- `Panel` / `LayoutCell` attach controls as parent containers.
- `form.controls[name]` stores live controls by `name`.
- `form.getItem(name)` returns a control or `null`.
- Parent destroy destroys child controls.

## Constructor Event Sugar

Constructor callbacks are convenience syntax over the standard `EventBus`.

```ts
const field = new TextInput({
  name: "sourceName",
  onBeforeChange(event) {},
  onChange(event) {},
  onAfterChange(event) {}
});

const button = new Button({
  name: "import",
  text: "Import",
  onClick(event) {}
});
```

Rules:

- Callback options must subscribe to `control.events`.
- `events.on()` remains the canonical event API.
- Constructor callbacks must be disposed when the control is destroyed.

## Buttons

A button has one primary action.

```ts
new Button({ text: "Save", command: "project.save" });
new Button({ text: "Import", onClick() {} });
```

Rules:

- `command` is a command-backed action.
- `onClick` is a direct local action.
- Providing both `command` and `onClick` is an error.

## Descriptor Adapter Boundary

Descriptor APIs are allowed only as secondary adapters outside the primary UI module:

```ts
import { createUiFromDescriptor } from "./ui/descriptor/index.js";
```

Use cases:

- generated forms
- project-loaded UI
- low-code designer output
- schema-driven property panels

Rules:

- Descriptor code must not live inside `Form`.
- Descriptor code must not be exported from the main `src/ui/index.js`.
- Core demos must not use descriptors except descriptor-specific demos.
- Descriptor factories may create controls internally, but app code should normally create controls explicitly.

## Acceptance Checklist

- Lab/demo UI can be built from live control instances.
- No `{ type: "button" }` descriptors are required in the primary example.
- `Form` contains no `{ type: "..." }` creation path.
- `Form.row()` / `Form.col()` work before mount.
- No raw HTML buttons are required in the lab page.
- Constructor callbacks and `events.on()` both work.
- Command-backed buttons and direct-action buttons are distinct.
- Destroying the form destroys all child controls.
