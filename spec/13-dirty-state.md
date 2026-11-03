# 13. Dirty State / Document State

## Problem

Save, close, reload, undo/redo, host synchronization, and project import need one source of truth for whether the current document has unsaved business changes.

Dirty-state must not be guessed independently by each field, grid, or command.

## Required Primitive

```ts
interface DocumentState {
  isDirty(): boolean;
  markDirty(reason?: DirtyReason): void;
  markClean(versionToken?: unknown): void;

  readonly events: EventBus;
}

type DirtyReason = {
  origin?: ChangeOrigin;
  commandId?: CommandId;
  path?: string;
  source?: unknown;
};
```

## Rules

- Project model mutations mark the document dirty.
- Layout/uiState changes do not mark the project dirty unless the app explicitly treats layout as part of the saved document.
- `origin: "import"` and `origin: "restore"` usually do not mark dirty.
- `origin: "undo"` and `"redo"` may change dirty state depending on version token.
- `markClean()` is called after successful save or after loading a project.
- Save command enabled-state should depend on `ctx.documentState?.isDirty()`.

## Events

```ts
interface DirtyStateChangeEvent extends UIEventObject<DocumentState> {
  dirty: boolean;
  reason?: DirtyReason;
}
```

Recommended events:

```ts
dirtyChange
markDirty
markClean
```

## Acceptance Checklist

- Dirty state is centralized.
- Save/close commands do not inspect random controls.
- Dirty reasons preserve `origin`.
- Project load can mark the document clean.
- Successful save can mark the document clean.
- Dirty changes can refresh command state through AppContextProvider.

