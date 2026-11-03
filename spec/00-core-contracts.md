# 00. Core Contracts

This document defines cross-cutting rules used by every primitive.

## Change Origin

`userAction` is useful, but it is not enough to explain why a mutation happened.

```ts
type ChangeOrigin =
  | "user"
  | "api"
  | "command"
  | "import"
  | "restore"
  | "undo"
  | "redo"
  | "host"
  | "system";
```

Rules:

- `origin: "user"` means direct user input.
- `origin: "command"` means a registered command caused the change.
- `origin: "import"` means project/business data was loaded.
- `origin: "restore"` means layout or UI state was restored.
- `origin: "undo"` and `"redo"` mean history replay.
- `origin: "host"` means the host-language bridge caused the change.
- `origin: "system"` means internal runtime maintenance.
- `userAction` is a convenience flag derived from origin.
- If `origin` is `"user"`, `userAction` must be `true`.
- If `userAction` is `true` and `origin` is omitted, origin is `"user"`.
- If both are omitted, origin defaults to `"api"`.

## Mutation Options

Most mutating APIs use the same option shape.

```ts
type MutationOptions = {
  silent?: boolean;
  userAction?: boolean;
  origin?: ChangeOrigin;
};
```

Reference helper:

```ts
type NormalizedMutationOptions = {
  silent: boolean;
  userAction: boolean;
  origin: ChangeOrigin;
};

function normalizeMutationOptions(options?: MutationOptions): NormalizedMutationOptions;
```

Rules:

- If `origin` is omitted and `userAction: true`, normalized origin is `"user"`.
- If both are omitted, normalized origin is `"api"`.
- If normalized origin is `"user"`, normalized `userAction` is `true`.
- Otherwise `userAction` is `options?.userAction === true`.
- `silent` normalizes to `options?.silent === true`.

Specialized APIs may extend it:

```ts
type ValidationOptions = MutationOptions & {
  scope?: "control" | "children" | "project";
  display?: "none" | "summary" | "inline";
};
```

## Meaning Of `silent`

This contract applies to APIs that accept MutationOptions or explicitly declare a silent option. Passing an undeclared option does not extend an API. BaseControl VisibilityOptions currently includes origin and userAction only; show/hide always emit their visibility events.

`silent: true` has one precise meaning:

```ts
silent: true suppresses public events.
```

It does not automatically mean:

- do not render
- do not validate
- do not update internal state
- do not refresh command state
- do not mark internal caches stale
- do not notify private implementation observers

If an operation needs finer control, use an explicit option or a batch/update scheduler.

Future extension:

```ts
type EffectOptions = MutationOptions & {
  emit?: boolean;
  render?: boolean;
  validate?: boolean;
  recordHistory?: boolean;
};
```

MVP uses `silent`, `userAction`, and `origin`. It must not overload `silent` with unrelated meanings.

## Base Event Object

Every public event payload is a single object.

```ts
interface UIEventObject<TSource = unknown> {
  source: TSource;
  type?: string;
  origin?: ChangeOrigin;
  userAction?: boolean;
  nativeEvent?: Event;
}
```

Rules:

- `source` is mandatory.
- `origin` should be copied from the mutation options.
- `userAction` should be derived from `origin` when not explicitly provided.
- `nativeEvent` may be present for DOM-originated events, but DOM events are not the primary public API.

## Identity Rules

Do not reuse one id concept for every layer.

| Identity | Meaning |
| --- | --- |
| `control.id` | Stable per live control instance |
| `commandId` | Stable public command id |
| Data item id | Stable within a `DataStore` |
| `property.path` | Stable property address inside a provider/model |
| Project object id | Durable id saved in project model |
| DOM id | Implementation detail |

Rules:

- DOM ids must not become business ids.
- Project object ids must survive save/load.
- Data item ids must stay stable for selection reconciliation.
- Command ids should not change when labels or menu locations change.
