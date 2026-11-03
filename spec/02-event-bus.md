# 02. EventBus

## Problem

UI APIs become hard to reason about when events are split between:

- DOM events
- callback properties in options
- ad hoc function calls
- positional callback arguments
- custom cancellation rules per component

A desktop-like UI API needs one event primitive that works the same way for every control.

## Finding From DHTMLX

DHTMLX has a central event system:

```ts
events.on(name, callback, context?)
events.detach(name, context?)
events.fire(name, args?): boolean
events.clear()
```

Runtime behavior:

- Event names are normalized with `toLowerCase()`.
- Handlers are stored by event name.
- `fire(name, args)` calls each handler with `callback.apply(context, args)`.
- A cancellable event is cancelled when any handler returns `false`.
- There is no `once()`.
- There is no event object contract; payload is a positional argument list.

This proves the need for a central event bus, but the API should be stricter and more desktop-like.

## Required Primitive

Every `Control` exposes:

```ts
readonly events: EventBus;
```

Base API:

```ts
interface EventBus {
  on<TEvent extends UIEventObject>(
    name: string,
    handler: EventHandler<TEvent>
  ): Subscription;

  once<TEvent extends UIEventObject>(
    name: string,
    handler: EventHandler<TEvent>
  ): Subscription;

  off<TEvent extends UIEventObject>(
    name: string,
    handler: EventHandler<TEvent>
  ): void;

  emit<TEvent extends UIEventObject>(
    name: string,
    event: TEvent
  ): TEvent;

  clear(): void;
}

type EventHandler<TEvent extends UIEventObject> = (event: TEvent) => void;

interface Subscription {
  off(): void;
}
```

## Event Object Rule

Events must always be objects.

Do this:

```ts
field.events.emit("change", {
  source: field,
  oldValue: "abc",
  newValue: "def",
  userAction: true
});
```

Do not do this:

```ts
field.events.emit("change", ["abc", "def", true]);
field.events.emit("change", "abc", "def", true);
```

Base event:

```ts
interface UIEventObject<TSource = Control> {
  source: TSource;
  type?: string;
  origin?: ChangeOrigin;
  userAction?: boolean;
  nativeEvent?: Event;
}
```

`origin`, `userAction`, and `silent` follow [00. Core Contracts](00-core-contracts.md).

Value change event:

```ts
interface ValueChangeEvent<TValue, TSource = Control> extends UIEventObject<TSource> {
  oldValue: TValue;
  newValue: TValue;
}
```

## Cancellable Events

Cancellable events use an explicit `cancel` field.

```ts
interface CancellableEvent<TSource = Control> extends UIEventObject<TSource> {
  cancel: boolean;
}
```

Example:

```ts
field.events.on("beforeChange", e => {
  if (app.readOnly) {
    e.cancel = true;
  }
});
```

The emitter must inspect `event.cancel` after emitting:

```ts
const e = field.events.emit("beforeChange", {
  source: field,
  oldValue,
  newValue,
  userAction,
  cancel: false
});

if (e.cancel) return;
```

No handler should cancel by returning `false`. Return values from event handlers are ignored.

## Synchronous By Design

`EventBus.emit()` is synchronous.

Rules:

- Handlers are called during `emit()`.
- `emit()` returns the same event object after synchronous handlers have run.
- `emit()` does not await promises returned by handlers.
- Cancellable `beforeX` events can only be cancelled synchronously.
- Async work belongs to commands, services, dialogs, or explicit async APIs, not implicit event cancellation.

Do not write:

```ts
field.events.on("beforeChange", async e => {
  e.cancel = !(await confirmChange());
});
```

By the time the promise resolves, `emit()` has already returned. If async cancellation is needed later, it must be a separate `emitAsync()`-style API, not hidden inside the synchronous bus.

## Before / After Pattern

Use `beforeX` and `afterX` for state transitions and commands.

Examples:

```ts
beforeChange
change
afterChange

beforeOpen
afterOpen

beforeClose
afterClose

beforeSelect
afterSelect

beforeExecute
afterExecute
```

Rules:

- `beforeX` is cancellable when the operation can be refused.
- `afterX` is emitted only after the operation succeeds.
- The simple event name, such as `change`, is allowed for high-frequency or established value events, but it should still use an event object.
- Event names are case-sensitive in the specification. Do not silently lowercase them.

Recommended change sequence:

```ts
const before = events.emit("beforeChange", {
  source: control,
  oldValue,
  newValue,
  userAction,
  cancel: false
});

if (before.cancel) return false;

applyValue(newValue);

events.emit("change", {
  source: control,
  oldValue,
  newValue,
  userAction
});

events.emit("afterChange", {
  source: control,
  oldValue,
  newValue,
  userAction
});
```

## Subscription Lifecycle

`on()` and `once()` return a `Subscription`.

```ts
const subscription = field.events.on("change", e => {
  console.log(e.newValue);
});

subscription.off();
```

Rules:

- `off(name, handler)` removes a known handler.
- `subscription.off()` removes exactly that subscription.
- `once()` removes itself before or immediately after the first handler call.
- `clear()` removes every handler from the bus.
- `Control.destroy()` must call `events.clear()`.
- Parent controls must dispose subscriptions they create on child controls.

## DOM Events

DOM events are implementation details.

Wrong public API:

```ts
button.element.addEventListener("click", handler);
```

Right public API:

```ts
button.events.on("click", handler);
```

The control may include the original DOM event as `nativeEvent`:

```ts
button.events.emit("click", {
  source: button,
  userAction: true,
  nativeEvent: mouseEvent
});
```

## Options Callbacks

Do not use callback properties as the primary event API.

Avoid:

```ts
new Field({
  onChange(value) {}
});
```

Use:

```ts
const field = new Field();
field.events.on("change", e => {});
```

Configuration may contain initial event subscriptions only as sugar, but the canonical API is `control.events`.

## Typed Event Maps

Controls may publish typed event maps:

```ts
interface FieldEvents {
  beforeChange: CancellableValueChangeEvent<string, Field>;
  change: ValueChangeEvent<string, Field>;
  afterChange: ValueChangeEvent<string, Field>;
  focus: UIEventObject<Field>;
  blur: UIEventObject<Field>;
}

interface TypedEventBus<TEvents> {
  on<K extends keyof TEvents>(name: K, handler: (event: TEvents[K]) => void): Subscription;
  once<K extends keyof TEvents>(name: K, handler: (event: TEvents[K]) => void): Subscription;
  off<K extends keyof TEvents>(name: K, handler: (event: TEvents[K]) => void): void;
  emit<K extends keyof TEvents>(name: K, event: TEvents[K]): TEvents[K];
  clear(): void;
}
```

The runtime can still be string-based. The public TypeScript API should be typed.

## Acceptance Checklist

An event system can be accepted only if:

- Every control exposes `events`.
- The API supports `on`, `once`, `off`, `emit`, and `clear`.
- Every emitted payload is a single event object.
- Event objects include `source`.
- Event objects may include `origin`.
- User-originated events mark `userAction: true`.
- Cancellable events use `cancel: boolean`.
- Cancellation does not depend on handler return values.
- `emit()` is synchronous and does not await handlers.
- `beforeX` / `afterX` naming is used for operations with lifecycle.
- Subscriptions can be disposed individually.
- `Control.destroy()` clears local subscriptions.

## Open Questions

- Should `emit()` set `event.type = name` automatically?
- Should `on()` support an `{ signal: AbortSignal }` option?
- Should parent-created child subscriptions live in a standard `DisposableBag`?
- Should event names be string literals only in TypeScript APIs?
