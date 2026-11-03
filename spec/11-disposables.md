# 11. Disposables

## Problem

Dynamic WebView UIs leak easily:

- DOM listeners
- EventBus subscriptions
- timers
- animation frames
- ResizeObserver / MutationObserver
- host-language handles
- child controls

`destroy()` is the public lifecycle rule. `Disposable` is the implementation discipline that makes it reliable.

## Required Primitive

```ts
interface Disposable {
  dispose(): void;
}

interface DisposableBag extends Disposable {
  add(disposable: Disposable): Disposable;
  clear(): void;
}
```

Convenience shape:

```ts
type DisposeFn = () => void;
```

Adapters:

```ts
function disposable(fn: DisposeFn): Disposable {
  return { dispose: fn };
}
```

## Control Integration

Controls should own a bag.

```ts
class BaseControl implements Control {
  protected readonly disposables = new DisposableBag();

  destroy(): void {
    if (this.destroyed) return;
    this.disposables.clear();
    this.events.clear();
    this.unmountDom();
    this.destroyed = true;
  }
}
```

Rules:

- Every subscription returned by `EventBus.on()` goes into a bag.
- Every global DOM listener goes into a bag.
- Timers/observers go into a bag.
- Child controls go into a bag or a child-control collection.
- `dispose()` must be idempotent.

## Examples

```ts
this.disposables.add(
  this.events.on("change", handler)
);
```

```ts
window.addEventListener("resize", onResize);
this.disposables.add(disposable(() => {
  window.removeEventListener("resize", onResize);
}));
```

```ts
const timer = window.setTimeout(run, 100);
this.disposables.add(disposable(() => {
  window.clearTimeout(timer);
}));
```

## Acceptance Checklist

- Disposable is a standard interface.
- Event subscriptions are disposable.
- Controls collect disposables.
- `destroy()` clears disposables.
- `dispose()` is idempotent.
- Timers, observers, global listeners, and host handles can be wrapped.

