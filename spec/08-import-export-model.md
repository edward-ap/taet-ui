# 08. Import / Export Model

## Problem

A WebView desktop-like application must save and restore work predictably.

Without a strict import/export model, each project starts saving state "as convenient":

- mapping rules mixed with expanded panels
- preview cache written into project files
- selected rows saved as business data
- column widths lost or stored in random places
- old files impossible to migrate
- undo/redo and dirty-state lie because hydration looks like user edits

Serialization needs a clear boundary between project data, UI state, and runtime state.

## Finding From DHTMLX

DHTMLX has useful pieces:

- `DataCollection.serialize()`
- `DataCollection.parse()`
- `DataCollection.load()`
- toolbar/ribbon-style `getState()` / `setState()`
- layout, tabbar, grid, tree, and window configs that contain visual state

But these pieces do not define a workbench-level import/export model. The library does not enforce where business data ends and UI/runtime state begins.

Our API must define that boundary.

## Three Kinds Of State

### Project Model

Business state of the user's project.

Examples:

- mapping source definitions
- target schema
- field connectors
- transform steps
- join rules
- validation configuration
- saved user-authored expressions

This is the durable document.

### Control / UI State

Visual state of the workbench and controls.

Examples:

- expanded/collapsed panels
- split sizes
- column widths
- column order
- active tab
- selected inspector section
- tree expanded nodes
- scroll position, when useful

This state helps restore the user's workspace, but it is not the business model.

### Runtime State

Temporary execution or preview state.

Examples:

- preview rows
- validation result cache
- active request ids
- transient loading flags
- temporary drag state
- hover state
- in-flight execution state

This generally should not be saved in project files.

## Workbench Serialization

Top-level shape:

```ts
type SerializedWorkbench = {
  version: number;
  project: unknown;
  layout?: unknown;
  uiState?: unknown;
};
```

Recommended stronger shape:

```ts
type SerializedWorkbench<TProject = unknown, TLayout = unknown, TUiState = unknown> = {
  version: number;
  project: TProject;
  layout?: TLayout;
  uiState?: TUiState;
  metadata?: SerializedMetadata;
};

type SerializedMetadata = {
  app?: string;
  createdAt?: string;
  updatedAt?: string;
  createdByVersion?: string;
};
```

Rules:

- `version` is mandatory.
- `project` is mandatory.
- `layout` is optional.
- `uiState` is optional.
- Runtime state is not part of the default serialized workbench.
- Unknown future fields must be ignored safely.

## Serializable Controls

Complex controls may expose:

```ts
interface SerializableControl<TState = unknown> extends Control {
  serializeState(): TState;
  restoreState(state: TState, options?: MutationOptions): void;
}
```

Examples:

```ts
const layoutState = workbenchLayout.serializeState();
workbenchLayout.restoreState(layoutState);
```

Rules:

- Control state means visual/control state only.
- Do not serialize business data through `serializeState()`.
- Do not serialize runtime preview data through `serializeState()`.
- `restoreState()` must tolerate missing and older fields.
- `restoreState()` must not emit user-action events.
- `restoreState()` should use `{ silent: true, origin: "restore", userAction: false }` when calling `value`, `data`, or `selection` primitives.

## What Goes Where

| Data | Place |
| --- | --- |
| Mapping links | `project` |
| Source/target schema | `project` |
| Transform expressions | `project` |
| Validation rules | `project` |
| Splitter sizes | `layout` |
| Docked panel placement | `layout` |
| Grid column widths/order | `uiState` or `layout` |
| Active tab | `uiState` |
| Expanded tree nodes | `uiState` |
| Current selection | usually `uiState`, sometimes not saved |
| Preview rows | runtime only |
| Validation errors from last run | runtime only, unless explicitly exported as report |
| Loading flags | runtime only |

## Import Pipeline

Recommended load sequence:

```ts
const saved = parseWorkbenchFile(text);
const migrated = migrations.apply(saved);

projectStore.value.set(migrated.project, {
  silent: true,
  origin: "import",
  userAction: false
});

if (migrated.layout) {
  workbenchLayout.restoreState(migrated.layout);
}

if (migrated.uiState) {
  uiState.restore(migrated.uiState);
}

commands.events.emit("afterImport", {
  source: commands,
  workbench: migrated,
  origin: "import",
  userAction: false
});
```

Rules:

- Validate version before applying data.
- Migrate old versions before binding controls.
- Hydrate project model silently.
- Import-origin mutations use `origin: "import"`.
- UI/layout restore mutations use `origin: "restore"`.
- Restore layout/ui state after project data exists.
- Do not restore runtime state unless the user explicitly opened a session snapshot.

## Export Pipeline

Recommended save sequence:

```ts
const workbench: SerializedWorkbench<ProjectModel> = {
  version: CURRENT_WORKBENCH_VERSION,
  project: projectStore.value.get(),
  layout: workbenchLayout.serializeState(),
  uiState: uiState.serialize(),
  metadata: {
    app: "js-ui",
    updatedAt: new Date().toISOString(),
    createdByVersion: APP_VERSION
  }
};

const text = JSON.stringify(workbench, null, 2);
```

Rules:

- Export project model from the project source of truth.
- Export layout/ui state from controls that own visual state.
- Do not call random controls and merge whatever they return.
- Do not include runtime caches by default.
- Save versioned data.

## Project Model Is Source Of Truth

Mapping values belong in the project model.

Example:

```ts
type MappingProject = {
  sources: SourceDef[];
  targets: TargetDef[];
  links: FieldLink[];
  transforms: TransformStep[];
};
```

These must not be hidden inside UI control state.

Wrong:

```ts
layout.serializeState() // contains mapping links
```

Right:

```ts
workbench.project.links
```

## UI State Is Optional

The project should remain valid without UI state.

Rules:

- Missing `layout` means use default layout.
- Missing `uiState` means use default UI state.
- Corrupt UI state should be recoverable without losing project data.
- Users should be able to reset layout without changing project.

Example:

```ts
const workbench = {
  version: 1,
  project
};
```

This must load.

## Runtime State Is Separate

Runtime state is not saved in normal project files.

If session snapshots are needed, use a separate shape:

```ts
type SerializedSession<TWorkbench = SerializedWorkbench, TRuntime = unknown> = {
  version: number;
  workbench: TWorkbench;
  runtime: TRuntime;
};
```

Rules:

- Session snapshot is not the same as project file.
- Runtime state must be explicitly opted in.
- Runtime state may be non-portable across app versions.

## Data Import / Export

DataStore import/export uses adapters.

```ts
const rows = csvDriver.parse(csvText);
grid.data.parse(rows);

const csv = csvDriver.serialize(grid.data.all());
```

Rules:

- `DataStore` remains in-memory.
- Drivers/adapters parse external formats.
- Project import/export chooses which stores become project model data.
- UI preview data should not become project model accidentally.

## Migration

Versioned files need migrations.

```ts
interface WorkbenchMigration {
  from: number;
  to: number;
  migrate(input: SerializedWorkbench): SerializedWorkbench;
}
```

Rules:

- Migrations operate on serialized data, not live controls.
- Migrations are deterministic.
- Migrations must not require DOM.
- Unknown versions should fail with a clear error.

## Events

Import/export events use event objects.

```ts
interface WorkbenchImportEvent extends UIEventObject {
  workbench: SerializedWorkbench;
  userAction: boolean;
}

interface WorkbenchExportEvent extends UIEventObject {
  workbench: SerializedWorkbench;
  userAction: boolean;
}
```

Recommended events:

```ts
beforeImport
afterImport
beforeExport
afterExport
importError
exportError
```

Rules:

- `beforeImport` and `beforeExport` are cancellable.
- Import/export triggered by file dialogs uses `userAction: true`.
- Autosave/export from host automation uses `userAction: false`.

## Acceptance Checklist

An import/export model can be accepted only if:

- Workbench files are versioned.
- Business data is stored under `project`.
- Visual layout/control state is stored under `layout` or `uiState`.
- Runtime/preview state is excluded by default.
- Complex controls may expose `serializeState()` and `restoreState()`.
- Control state serialization does not include project model data.
- Restore operations are silent and not user-originated.
- Missing UI state does not prevent project load.
- Migrations exist for version changes.
- Import/export events use event objects.

## Open Questions

- Should `layout` and `uiState` be separate, or should layout be a subkey of uiState?
- Should current selection be saved by default?
- Should project files include app/build metadata by default?
- Should `serializeState()` return JSON-safe values only, or can adapters handle richer types?
- Should session snapshots be a first-class primitive or an optional extension?
