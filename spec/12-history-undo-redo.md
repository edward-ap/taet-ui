# 12. History / Undo-Redo

## Problem

Undo/redo cannot be bolted on after commands, properties, values, data, and selection already mutate state directly.

Desktop-like tools need a central history model:

- property edits
- mapping link add/remove
- transform edits
- data edits
- layout operations, when meaningful
- command execution

## Required Primitive

```ts
interface HistoryModel {
  push(entry: HistoryEntry): void;
  transaction(label: string, run: (tx: HistoryTransaction) => void | Promise<void>): Promise<void>;
  undo(options?: HistoryOptions): Promise<void>;
  redo(options?: HistoryOptions): Promise<void>;
  canUndo(): boolean;
  canRedo(): boolean;
  clear(): void;

  readonly events: EventBus;
}

type HistoryOptions = MutationOptions;
```

This interface is part of Workbench v0. Advanced merge policies, persistent undo stacks, command coalescing, and cross-document history are extensions.

History entry:

```ts
type HistoryEntry = {
  id: string;
  label: string;
  undo(): void | Promise<void>;
  redo(): void | Promise<void>;
  mergeKey?: string;
};

interface HistoryTransaction {
  push(entry: HistoryEntry): void;
  rollback(): void | Promise<void>;
}
```

## Command Integration

Commands are the natural boundary for history.

```ts
commands.register("property.set", {
  label: "Set Property",
  run: ctx => {
    const oldValue = ctx.oldValue;
    const newValue = ctx.newValue;

    ctx.target.setProperty(ctx.property, newValue);

    history.push({
      id: "property.set",
      label: "Set Property",
      undo: () => ctx.target.setProperty(ctx.property, oldValue),
      redo: () => ctx.target.setProperty(ctx.property, newValue)
    });
  }
});
```

Rules:

- User-facing mutations should flow through commands or explicit history transactions.
- Undo/redo should call value/data/property APIs with `origin: "undo"` / `"redo"` and `userAction: false`.
- Undo/redo should not create duplicate history entries.

## Events

Recommended events:

```ts
push
beforeUndo
afterUndo
beforeRedo
afterRedo
clear
stateChange
```

Rules:

- Events use event objects.
- `stateChange` fires when `canUndo` or `canRedo` changes.
- Commands like `edit.undo` and `edit.redo` derive enabled state from history.

## Transactions

Complex operations need grouped history.

```ts
history.transaction("Create Mapping", tx => {
  tx.push(addSourceEntry);
  tx.push(addLinkEntry);
  tx.push(selectEntry);
});
```

Use cases:

- drag-create mapping link
- paste multiple fields
- apply transform template
- bulk property edit

Rules:

- A transaction commits one undo entry or a grouped entry.
- If transaction work fails, already-applied entries must be rolled back when possible.
- Selection-only changes usually do not belong in project history unless they are part of the user-facing operation semantics.
- `history.transaction()` may be implemented simply at first, but the API must exist before complex mapper actions.

## Acceptance Checklist

- History is centralized.
- Undo and redo are command-bindable.
- Entries have labels.
- Undo/redo use primitives, not private fields.
- Undo/redo are not userAction changes.
- History events use event objects.
- Multi-step operations can be grouped through `transaction()`.
