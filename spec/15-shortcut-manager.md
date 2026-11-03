# 15. Shortcut Manager

## Problem

Shortcuts are command bindings, but keyboard dispatch has rules that do not belong inside toolbar buttons or individual controls.

## Required Primitive

```ts
interface ShortcutManager {
  bind(commandId: CommandId, shortcut: string, options?: ShortcutOptions): Disposable;
  unbind(commandId: CommandId): void;
  bindCommands(commands: CommandRegistry): Disposable;
  handleKeyboardEvent(event: KeyboardEvent): boolean;

  readonly events: EventBus;
}

type ShortcutOptions = {
  scope?: "global" | "workbench" | "control";
  when?: (context: AppContext) => boolean;
};
```

## Rules

- Shortcut activation executes `commands.execute(commandId, context, { origin: "user", userAction: true })`.
- This is command execution origin. Mutations performed inside the command should usually use `origin: "command"` while preserving `userAction: true`.
- Disabled commands do not execute from shortcut.
- Shortcut conflicts are detected centrally.
- Text input focus must be respected.
- Platform names must be normalized (`Ctrl` / `Cmd`).
- `preventDefault()` is applied only when the shortcut is handled.
- Scope is metadata; use target/context/when for routing.

## Acceptance Checklist

- Shortcuts bind to command ids.
- No anonymous keyboard handlers own business logic.
- Conflicts are observable.
- Disabled commands cannot run through shortcuts.
- Text editing controls can keep standard editing keys.

## Reference Implementation v0.6

`ShortcutManager` is intentionally small:

- binds shortcuts to command ids;
- can bind all registered commands that expose `shortcut`;
- tracks later command `register` / `unregister` events after `bindCommands(commands)`;
- dispatches through `CommandRegistry.execute()`;
- checks `commands.canExecute()` before handling the keyboard event;
- ignores all shortcuts inside text-editing targets by default;
- allows text-editing dispatch only when binding option `allowInTextInput: true` is set;
- calls `preventDefault()` only when a command is actually executed;
- exposes shortcut conflicts through a cancellable `conflict` event;
- owns only keyboard subscriptions and shortcut bindings, not command business logic.

## 0.6 keyboard policy

Ignore defaultPrevented, isComposing and keyCode 229. Use semantic event.key, not physical code. Exact Meta wins; Ctrl/Cmd is portable fallback. Editor dispatch requires allowInTextInput/allowShortcutInTextInput. Scope is metadata, not a routing engine. No late event after manager teardown.
