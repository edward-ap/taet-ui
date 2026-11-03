# 10. Focus / Active Context

## Problem

`Control.focus()` is not enough for desktop-like applications.

Commands need to know what is active:

- active control
- active document
- active selection
- active property provider
- active workbench panel

Without a central active context, commands like copy, paste, delete, rename, validate, and property editing will use stale or local state.

## Required Primitive

```ts
interface FocusManager {
  activeControl(): Control | null;
  activeSelection(): SelectionModel<unknown> | null;
  activePropertyProvider(): PropertyProvider | null;
  activeDocument(): unknown;

  setActive(control: Control, options?: FocusOptions): void;
  clearActive(options?: FocusOptions): void;

  readonly events: EventBus;
}

type FocusOptions = MutationOptions;
```

## Active Context

Commands consume a context derived from focus.

```ts
interface AppContext {
  project?: unknown;
  activeControl?: Control;
  selection?: SelectionModel<unknown>;
  propertyProvider?: PropertyProvider;
  activeDocument?: unknown;
  documentState?: DocumentState;
  validation?: ValidationModel;
  history?: HistoryModel;
}

interface AppContextProvider<TContext = AppContext> {
  getContext(): TContext;
  readonly events: EventBus;
}
```

Rules:

- Focus manager is the source for active command context.
- AppContextProvider derives command context from focus, selection, document state, validation, and history.
- CommandRegistry should subscribe to `contextChange` and call `refreshState()`.
- A focused DOM element is not automatically a business active object.
- Controls can map focus to selection/property provider.
- Destroyed controls must be removed from active context.

## Events

```ts
interface ActiveControlChangeEvent extends UIEventObject<FocusManager> {
  oldControl: Control | null;
  newControl: Control | null;
  userAction: boolean;
}
```

Recommended events:

```ts
beforeActiveChange
activeChange
afterActiveChange
contextChange
```

Rules:

- `beforeActiveChange` is cancellable.
- Active changes use event objects.
- Commands should refresh state after active context changes.
- `contextChange` is emitted when any command-relevant context value changes, not only DOM focus.

## Selection Integration

When active control changes, active selection usually changes too.

```ts
const selection = focus.activeSelection();
```

Rules:

- If active control is selectable, its `selection` becomes active selection.
- If active control is inside a composite, the composite may provide selection.
- No active selection returns `null`.

## Acceptance Checklist

- Active control is globally observable.
- Active selection is globally accessible.
- AppContextProvider exposes a complete command context.
- Commands use active context instead of local button state.
- Destroying active controls clears or moves active context.
- Focus events use event objects.
- DOM focus and business active object are not confused.
