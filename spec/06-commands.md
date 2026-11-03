# 06. Commands

## Problem

Desktop-like applications have the same action reachable from multiple places:

- toolbar button
- main menu item
- context menu item
- keyboard shortcut
- command palette
- automation / host-language call

If every button owns a local anonymous handler, the application becomes impossible to coordinate:

- enabled/disabled state is duplicated
- shortcuts drift from toolbar/menu behavior
- permissions are checked inconsistently
- command labels diverge
- undo/redo cannot understand user intent
- testing must click UI instead of executing named behavior

Actions need one primitive: `Command`.

## Finding From DHTMLX

DHTMLX toolbars and menus are data-driven and support item ids and hotkeys:

```ts
NavigationBarEvents.click
item.hotkey
keyManager.addHotKey(item.hotkey, () => ...)
```

This is useful, but it stops at UI item events. The application still has to handle `click(id)` and decide what id means. There is no central command registry that owns:

- label
- shortcut
- enabled state
- checked state
- execution
- shared binding across toolbar/menu/context/shortcuts

Our API should make command id the executable unit, not toolbar button id.

## Required Primitive

```ts
interface CommandRegistry<TContext = AppContext> {
  register(id: CommandId, command: Command<TContext>): Disposable;
  get(id: CommandId): RegisteredCommand<TContext> | undefined;
  setContextProvider(provider: AppContextProvider<TContext>): void;
  refreshState(): void;
  execute(id: CommandId, context?: TContext, options?: CommandRunOptions): Promise<CommandResult>;
  canExecute(id: CommandId, context?: TContext): boolean;
  state(id: CommandId, context?: TContext): CommandState;
  list(): readonly RegisteredCommand<TContext>[];

  readonly events: EventBus;
}

type CommandId = string;

interface Command<TContext = AppContext> {
  label: string;
  description?: string;
  shortcut?: string;
  icon?: string;
  group?: string;

  enabled?: boolean | ((context: TContext) => boolean);
  visible?: boolean | ((context: TContext) => boolean);
  checked?: boolean | ((context: TContext) => boolean);

  run(context: TContext, options?: CommandRunOptions): void | CommandResult | Promise<void | CommandResult>;
}
```

Usage:

```ts
commands.register("mapping.validate", {
  label: "Validate",
  shortcut: "Ctrl+Shift+V",
  enabled: ctx => !!ctx.project,
  run: (ctx, options) => validateMapping(ctx.project, options)
});
```

Then every UI surface binds by command id:

```ts
toolbar.addCommand("mapping.validate");
menu.addCommand("mapping.validate");
contextMenu.addCommand("mapping.validate");
shortcuts.bind(commands);
```

## Command Ids

Command ids are stable namespaced strings.

Examples:

```ts
project.open
project.save
mapping.validate
mapping.addLink
selection.delete
view.zoomIn
source.refresh
```

Rules:

- Use dot-separated namespaces.
- Ids are stable public API.
- UI labels may change; command ids should not.
- Command ids are not DOM ids and not toolbar item ids.

## Command Context

Commands run against a context object.

```ts
interface AppContext {
  project?: ProjectModel;
  selection?: SelectionModel<unknown>;
  activeControl?: Control;
  activeDocument?: unknown;
  documentState?: DocumentState;
  history?: HistoryModel;
}

interface AppContextProvider<TContext = AppContext> {
  getContext(): TContext;
  readonly events: EventBus;
}
```

Rules:

- The registry may have a default context provider.
- `execute(id, context?)` can override context.
- `enabled`, `visible`, `checked`, and `run` receive the same context.
- Context is read at execution time, not only registration time.
- Context provider emits `contextChange` when focus, selection, active document, validation, dirty-state, or permissions change.
- Command registry refreshes derived state after `contextChange`.

Example:

```ts
commands.register("selection.delete", {
  label: "Delete",
  shortcut: "Delete",
  enabled: ctx => ctx.selection?.hasAny() === true,
  run: ctx => deleteSelection(ctx.selection!.get())
});
```

## Command State

Every command has a derived state.

```ts
interface CommandState {
  id: CommandId;
  label: string;
  description?: string;
  shortcut?: string;
  icon?: string;
  enabled: boolean;
  visible: boolean;
  checked: boolean;
}
```

Rules:

- Toolbars, menus, context menus, and shortcuts render from command state.
- Disabled commands must not run through UI activation.
- `execute()` should also respect enabled state unless explicitly bypassed.
- State should update when context, selection, project, or permissions change.
- State refresh should be centralized through `refreshState()`, not manually duplicated in every toolbar.

## Execution

```ts
type CommandRunOptions = MutationOptions & {
  force?: boolean;
};

interface CommandResult {
  ok: boolean;
  message?: string;
  error?: unknown;
}
```

Execution pipeline:

```ts
const before = commands.events.emit("beforeExecute", {
  source: commands,
  commandId: id,
  context,
  origin: normalizeMutationOptions(options).origin,
  userAction: options?.userAction === true,
  cancel: false
});

if (before.cancel) return { ok: false, message: "Cancelled" };

if (!options?.force && !commands.canExecute(id, context)) {
  return { ok: false, message: "Command disabled" };
}

const result = await command.run(context, options);

commands.events.emit("afterExecute", {
  source: commands,
  commandId: id,
  context,
  result: normalizeResult(result),
  origin: normalizeMutationOptions(options).origin,
  userAction: options?.userAction === true
});
```

Rules:

- `beforeExecute` is cancellable.
- `afterExecute` fires after success or normalized failure.
- Command handlers should not directly inspect toolbar/menu state.
- Commands may be async.
- Command handlers receive `CommandRunOptions`.
- Errors should become command results or `error` events, not disappear in anonymous handlers.

## Execution Origin And Mutation Origin

Command execution origin explains why the command was invoked.

Mutation origin explains why a control/model value changed.

Rules:

- A toolbar click or shortcut invokes a command with `origin: "user"` and `userAction: true`.
- A host call may invoke a command with `origin: "host"`.
- A script may invoke a command with `origin: "api"`.
- Mutations performed inside a command should usually use `origin: "command"`.
- Downstream mutations may preserve `userAction: true` when the command was user-invoked.

Example:

```ts
commands.execute("customer.rename", ctx, {
  origin: "user",
  userAction: true
});

commands.register("customer.rename", {
  label: "Rename",
  run: (ctx, options) => {
    ctx.nameField.value.set(ctx.nextName, {
      origin: "command",
      userAction: options?.userAction === true
    });
  }
});
```

## Events

Command events use event objects.

```ts
interface CommandEvent<TContext = AppContext> extends UIEventObject<CommandRegistry<TContext>> {
  commandId: CommandId;
  context: TContext;
  userAction: boolean;
}

interface BeforeCommandExecuteEvent<TContext = AppContext> extends CommandEvent<TContext> {
  cancel: boolean;
}

interface AfterCommandExecuteEvent<TContext = AppContext> extends CommandEvent<TContext> {
  result: CommandResult;
}

interface CommandStateChangeEvent<TContext = AppContext> extends UIEventObject<CommandRegistry<TContext>> {
  commandId: CommandId;
  state: CommandState;
}
```

Recommended event names:

```ts
beforeExecute
afterExecute
stateChange
register
unregister
error
```

## Binding To UI Controls

Controls should bind command ids, not anonymous handlers.

Wrong:

```ts
toolbar.addButton({
  label: "Validate",
  onClick: () => validateMapping(project)
});
```

Right:

```ts
toolbar.addCommand("mapping.validate");
```

The toolbar resolves:

- label
- icon
- shortcut hint
- enabled
- visible
- checked
- click behavior

Menu and context menu do the same:

```ts
menu.addCommand("project.save");
contextMenu.addCommand("selection.delete");
```

Shortcuts bind to the registry:

```ts
shortcuts.bind(commands);
```

Commands own shortcut metadata. ShortcutManager owns keyboard dispatch, conflict handling, text-input exclusions, platform key names, and `preventDefault()` rules.

## Command-Aware Controls

```ts
interface CommandSurfaceControl extends Control {
  addCommand(commandId: CommandId, options?: CommandBindingOptions): void;
  removeCommand(commandId: CommandId): void;
}

interface CommandBindingOptions {
  label?: string;
  icon?: string;
  group?: string;
  order?: number;
}
```

Rules:

- Binding options may override presentation only.
- Binding options must not override command execution.
- If a command becomes disabled, every bound surface updates.
- If a command label changes, every bound surface updates unless locally overridden.

## Shortcuts

Shortcuts are command bindings, not independent handlers.

Rules:

- A shortcut triggers `commands.execute(id, context, { origin: "user", userAction: true })`.
- Disabled commands do not execute from shortcut.
- Shortcut conflicts are detected centrally.
- Shortcut display strings come from the command registry.

Example:

```ts
commands.register("project.save", {
  label: "Save",
  shortcut: "Ctrl+S",
  enabled: ctx => !!ctx.project,
  run: (ctx, options) => saveProject(ctx.project!, options)
});
```

## Relation To Selection

Commands often depend on selection.

```ts
commands.register("selection.delete", {
  label: "Delete",
  shortcut: "Delete",
  enabled: ctx => ctx.selection?.hasAny() === true,
  run: ctx => deleteItems(ctx.selection!.get())
});
```

Rules:

- Selection changes should trigger command state refresh.
- Commands should not hold stale selected objects.
- Context should provide the active selection model.

## Relation To Value And Data

Commands can mutate value/data, but they should use the primitives.

```ts
commands.register("customer.clearName", {
  label: "Clear Name",
  enabled: ctx => !!ctx.activeControl,
  run: (ctx, options) => {
    const field = ctx.activeControl as ValueControl<string>;
    field.value.clear({
      origin: "command",
      userAction: options?.userAction === true
    });
  }
});
```

Rules:

- Commands should use `value`, `data`, and `selection` APIs.
- Commands should not reach into private widget fields.
- Mutations caused by command execution should preserve correct `userAction`.
- Mutations caused by command execution should usually use `origin: "command"`.

## Undo / Redo

Commands are the natural unit for undo / redo.

Future command metadata may include:

```ts
undoable?: boolean;
undo?: (context: TContext, result: CommandResult) => void | Promise<void>;
```

For now, the important rule is that user-facing actions flow through `CommandRegistry`, so undo/redo has one place to observe intent.

## Acceptance Checklist

An application command layer can be accepted only if:

- Commands are registered by stable string id.
- Commands own label, shortcut, enabled state, and run handler.
- Command handlers receive execution options.
- Toolbar/menu/context/shortcut surfaces bind by command id.
- UI surfaces do not define anonymous business handlers.
- Disabled commands cannot execute through UI.
- `execute()` supports async commands.
- Command events use event objects.
- `beforeExecute` is cancellable.
- State changes are observable.
- Registry can consume an `AppContextProvider`.
- `refreshState()` recalculates command state for bound UI surfaces.
- Selection/value/data mutations go through their primitives.

## Reference Implementation v0.6

`lab06` proves the first reusable desktop command pattern:

- `Toolbar.addCommand(id)` creates a square `ToolButton`; ordinary `Button` remains for forms and dialogs.
- ToolButton label, icon, disabled state, visibility, checked state, and tooltip are derived from command state.
- `Toolbar.add(control)` accepts local controls next to command buttons.
- `Toolbar.addSeparator()` adds non-interactive visual separation.
- `Toolbar` is a real container control and uses the same child registry as `Panel`.
- `toolbar.getItem(name)`, `toolbar.controls[name]`, `toolbar.remove(name)`, and `toolbar.clear()` work for toolbar children.
- `addCommand(id, { name })`, `addToolButton({ name })`, and `addSeparator({ name })` can assign stable lookup keys without breaking fluent chaining.
- `DocumentState.dirtyChange` refreshes command state through context notification.
- `Ctrl+S` executes the same `project.save` command as the toolbar button.
- Destroying a toolbar destroys its child controls and command subscriptions.

## Implemented callback lifetime contract (0.4 hardening)

- A registration's disposer releases that exact registration. Removing and
  reusing its string ID does not transfer ownership to an old disposer; disposal
  is harmless after registry destruction. The `register(id, definition)` argument
  supplies the ID even if a JavaScript definition includes an `id` property.
- `execute` captures the registration and context-provider generation. Removal,
  replacement, provider replacement or destruction during context resolution,
  `beforeExecute` or state predicates returns `{ ok: false, message: "Cancelled" }`
  without starting `run`. `force` skips the disabled check, not these guards.
- Once `run` starts, its result still resolves for its caller. If its registration
  is removed/replaced or the registry is destroyed before completion, no later
  `error`, `afterExecute` or state refresh belongs to that obsolete registration.
  Changing context while an async command runs does not cancel its completion.
- State refresh visits a snapshot of registrations. A replaced/deleted command
  cannot write its old state back. Failed initial state evaluation rolls back
  only the registration that failed, preserving a replacement made by a callback.
- Context getters and state predicates should be pure. Nested `refreshState`
  calls during context/state evaluation or an active refresh do not start another
  pass. A recursive `state` query for the same command returns a copy of its last
  cached state, or an inactive initial state. A nested context lookup uses an
  empty context without invoking the provider again. An evaluation invalidated by teardown/replacement returns an
  inactive snapshot (`enabled`, `visible`, `checked` are false).
- If a predicate changes the context provider, the interrupted pass publishes no
  state from that old provider. Request a fresh `refreshState` after the outer
  call returns to update bound surfaces. No unbounded retry/microtask loop is
  scheduled on behalf of callbacks that keep changing their inputs.
- Subscription acquisition/disposal can reenter provider replacement or destroy
  the registry. The newest provider retains ownership; stale subscriptions are
  released and stale context notifications do nothing.

The guards do not swallow arbitrary consumer exceptions. Initial context/state
or event-listener errors still propagate; `run` errors are normalized as before.

## Open Questions

- Should command registry support command aliases?
- Should command ids be globally unique or scoped per workspace/window?
- Should `execute()` throw on failure or always return `CommandResult`?
- Should visible/checked be part of the base command, or a UI extension?
