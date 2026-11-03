# 01. Control Lifecycle

## Problem

A WebView desktop-like UI is usually dynamic: panels open and close, inspectors swap content, tabs recreate views, and host-language state can outlive DOM nodes.

Without a strict lifecycle primitive, the app leaks:

- DOM nodes
- event listeners
- timers
- references to host objects
- selection/value state
- child widgets

Therefore, a visual unit without `destroy()` is not a valid control.

## Finding From DHTMLX

DHTMLX Suite has lifecycle behavior, but it is not represented as one public `Control` primitive.

The base class is `View`, with:

```ts
mount(container, vnode?): void
unmount(): void
getRootView(): any
getRootNode(): HTMLElement
paint(): void
```

Concrete widgets then add their own methods such as:

```ts
destructor(): void
enable(): void
disable(): void
focus(): void
```

The cleanup method is named `destructor()`, not `destroy()`, and cleanup depth differs by component. Some components clear events and children; some only unmount.

Conclusion: the lifecycle primitive exists conceptually, but it is spread across several layers. Our API should make it explicit and mandatory.

## Required Primitive

Every interactive UI object must implement `Control`.

```ts
interface Control {
  readonly id: string;
  readonly element: HTMLElement | null;
  readonly parent: ContainerControl | null;
  readonly events: EventBus;
  readonly mounted: boolean;
  readonly disabled: boolean;
  readonly visible: boolean;
  readonly destroyed: boolean;

  mount(container: HTMLElement | string): this;
  refresh(): void;
  enable(): void;
  disable(): void;
  show(options?: VisibilityOptions): this;
  hide(options?: VisibilityOptions): this;
  isVisible(): boolean;
  getParent(): ContainerControl | null;
  isChildOf(parent: ContainerControl): boolean;
  getSize(): ControlSize;
  setSize(size: Partial<ControlSize>, options?: ResizeOptions): this;
  setSize(width: number | string | null, height: number | string | null, options?: ResizeOptions): this;
  focus(): boolean;
  destroy(): void;
}

type VisibilityOptions = {
  origin?: string;
  userAction?: boolean;
};

type ControlSize = {
  width: number | string | null;
  height: number | string | null;
};

type ResizeOptions = {
  origin?: string;
  userAction?: boolean;
  silent?: boolean;
};
```

## Method Rules

The implemented BaseControl now has package declarations in `taet-ui/core`;
see [typed control lifecycle](../docs/CONTROL_TYPES.md) for its exact signatures,
event payloads and return values. ContainerControl remains a conceptual contract;
the current BaseControl declaration exposes parents through their base surface.
The positional `setSize(width, null)` clears explicit height, just like the
object form. BaseControl itself disposes registered resources and DOM; concrete
containers implement descendant ownership and destruction.

### `mount(container)`

Mounts the control into a DOM container.

Rules:

- Accepts either `HTMLElement` or element id / selector string.
- Creates or attaches the root DOM node.
- Must not silently mount twice into different containers.
- If remounting is allowed later, it must be an explicit API, not accidental behavior.
- After successful mount, `element` must return the root HTMLElement.
- Returns `this` for convenient setup, but fluent chaining must not hide lifecycle errors.

### `refresh()`

Re-renders the current visual state.

Rules:

- Must not recreate the full control unless required by implementation.
- Must not reset value, selection, focus, or event subscriptions.
- Equivalent names such as `paint()` are implementation details. Public API should use `refresh()`.

### `enable()` / `disable()`

Switches user interactivity.

Rules:

- Must update both internal state and visible DOM state.
- Must be reflected by config/state as `disabled`.
- Disabled controls should not emit user-originated value/command events.
- Programmatic API calls may still work unless a specific control forbids them.

### `show()` / `hide()` / `isVisible()`

Switches the control's own visibility state.

Rules:

- Must update both internal state and visible DOM state.
- Must be reflected by config/state as `visible`.
- `isVisible()` returns the control's own visibility state.
- Parent/container visibility is separate. If a parent is hidden, the browser hides the subtree, but a child may still return `true` from `isVisible()` because its own visibility flag did not change.
- Controls that need computed visibility may expose a later `isEffectivelyVisible()` API, but that is not part of the base primitive yet.
- `show()` emits `beforeShow`, `show`, and `afterShow`.
- `hide()` emits `beforeHide`, `hide`, and `afterHide`.
- `beforeShow` and `beforeHide` are cancellable by setting `event.cancel = true`.
- Initial `hidden: true` / `visible: false` configuration applies DOM state during mount without emitting lifecycle events.

### `focus(): boolean`

Moves keyboard focus to the primary focus target.

Rules:

- Returns `true` when focus was applied.
- Returns `false` when focus could not be applied.
- Must return `false` when not mounted.
- Must return `false` when disabled, hidden, or destroyed.
- Composite controls decide their primary focus target internally.

### `destroy()`

Permanently disposes the control.

Rules:

- Mandatory for every control.
- Must be idempotent.
- Must unmount DOM.
- Must remove DOM/global event listeners.
- Must clear event bus subscriptions.
- Must cancel timers / animation frames / observers.
- Must destroy child controls.
- Must release references to heavy state, host objects, and DOM nodes.
- After `destroy()`, `destroy()` remains a no-op.
- After `destroy()`, read-only state getters may still work.
- After `destroy()`, mutating methods throw `LifecycleError` in the reference implementation.
- Production builds may no-op after destroy only when explicitly configured and documented.
- Destruction order matters: external resources first, child controls second, DOM last.
- A destroyed control must never be mounted again.

Reference shape:

```ts
destroy(): void {
  if (this.destroyed) return;

  this.destroyed = true;

  this.subscriptions.clear();
  this.events.clear();
  this.destroyChildren();
  this.unmountDom();

  this.elementRef = null;
}
```

Rationale: child controls may emit during their own destruction. The parent should not keep external listeners, timers, host handles, or public event subscriptions alive while children are being torn down.

## State Requirements

Minimum internal state:

```ts
type ControlState = {
  id: string;
  mounted: boolean;
  disabled: boolean;
  destroyed: boolean;
};
```

`destroyed` is terminal. A destroyed control must not be mounted again.

## Lifecycle Errors

```ts
class LifecycleError extends Error {
  readonly controlId: string;
  readonly operation: string;
}
```

Rules:

- Calling `mount()`, `refresh()`, `enable()`, `disable()`, or mutating child primitives after destroy throws in the reference implementation.
- Calling `destroy()` after destroy returns cleanly.
- Reading `id`, `mounted`, `disabled`, and `destroyed` remains valid.
- Reading `element` after destroy returns `null`.
- Throwing in development/reference builds is preferred because it exposes lifecycle bugs early.

## Element Ownership

`element` is exposed for inspection, positioning, integration, testing, and low-level adapters.

Rules:

- External code may read the root element.
- External code may place the root element in layout containers through documented APIs.
- External code must not mutate child DOM owned by the control.
- Direct `control.element.innerHTML = ""` breaks lifecycle and is outside the supported API.
- Adapters may perform low-level DOM work only when the concrete control explicitly allows it.

## Naming Decisions

Use these public names:

| Use | Avoid | Reason |
| --- | --- | --- |
| `destroy()` | `destructor()` | Common JS/UI terminology; clearer for app authors |
| `refresh()` | `paint()` | Describes intent, not renderer implementation |
| `element` | `getRootNode()` only | Root element should be easy to inspect |
| `events` | hidden event system | Event lifecycle is part of control lifecycle |
| `show()` / `hide()` / `isVisible()` | direct `element.hidden` mutation | Visibility is control state, not a stray DOM mutation |

Aliases may exist for compatibility, but the specification should define only the preferred names.

## Acceptance Checklist

A component can be accepted as a `Control` only if:

- It has a stable `id`.
- It exposes its root `element`.
- It exposes an `events` bus.
- It exposes `mounted`, `disabled`, and `destroyed`.
- It can be mounted.
- It can be refreshed.
- It can be enabled and disabled.
- It can be shown and hidden through `show()` / `hide()`.
- `isVisible()` reports its own visibility state.
- `focus()` returns whether focus was applied, or the control explicitly documents why focus is unsupported.
- It can be destroyed.
- `destroy()` is idempotent and clears DOM/listeners/events/children.
- `destroy()` releases external resources before child controls and DOM are torn down.
- Mutating methods after destroy throw `LifecycleError` in the reference implementation.

## Open Questions

- Should non-interactive visual primitives implement full `Control`, or a smaller `ViewControl` that still requires `destroy()`?
