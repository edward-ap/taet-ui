# 22. Interactive Control

`Control` defines lifecycle and ownership. It is intentionally broad: panels, layouts, labels, grids, buttons, and editors are all controls.

Interactive UI needs one more low-level primitive for keyboard focus, keyboard events, and user navigation. This primitive sits between `Control` and specialized APIs such as `ValueControl`, `SelectionModel`, or text editing.

## Required Primitive

```ts
interface InteractiveControl extends Control {
  getFocusElement(): HTMLElement | null;
  canFocus(): boolean;
  focus(options?: FocusOptions): boolean;
  blur(options?: FocusOptions): boolean;
  isFocused(): boolean;

  setTabIndex(tabIndex: number | null): this;
  getTabIndex(): number | null;
}

type FocusOptions = {
  preventScroll?: boolean;
  origin?: ChangeOrigin;
  userAction?: boolean;
};
```

All visual controls may implement `InteractiveControl`. For passive controls, `canFocus()` may return `false`.

## Focus Target

Each control has one primary focus target.

Rules:

- If an element inside the control has `data-dui-focus-target`, that element is the focus target.
- Otherwise the root `control.element` is the focus target.
- Composite controls may choose a nested target.
- External code must not depend on private DOM structure to find focusable children.

Example:

```ts
const input = field.getFocusElement();
field.focus();
```

## Focus Events

`InteractiveControl` emits:

```ts
focus
blur
```

Payload:

```ts
interface FocusEventObject<TSource = InteractiveControl> extends UIEventObject<TSource> {
  nativeEvent?: FocusEvent;
  relatedTarget?: EventTarget | null;
}
```

Rules:

- `focus` fires when focus enters the control.
- `blur` fires when focus leaves the whole control.
- Moving focus between internal elements of the same control must not emit public `blur` followed by `focus`.
- Programmatic `focus()` uses `origin: "api"` unless specified otherwise.
- Native user focus uses `origin: "user"` and `userAction: true`.

## Keyboard Events

`InteractiveControl` emits:

```ts
keyDown
keyUp
```

Payload:

```ts
interface KeyEventObject<TSource = InteractiveControl> extends UIEventObject<TSource> {
  key: string;
  code: string;
  altKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  metaKey: boolean;
  repeat: boolean;
  nativeEvent: KeyboardEvent;
  cancel: boolean;
}
```

Rules:

- `keyDown` and `keyUp` are object events, not DOM events exposed directly.
- `keyDown` is cancellable with `event.cancel = true`.
- If cancelled, the implementation calls `preventDefault()` and stops propagation.
- Concrete controls may still implement their own keyboard behavior.
- Generic keyboard events are for integration, command routing, and custom behavior hooks.

Prefer `keyDown` / `keyUp`. Do not add `keyPress` to the core primitive; it is legacy browser vocabulary.

## Tab Index

`tabIndex` is part of interaction, not layout.

```ts
control.setTabIndex(0);
control.setTabIndex(-1);
control.setTabIndex(null);
```

Rules:

- `null` means "do not force a tab index".
- `0` means normal tab order.
- `-1` means programmatic focus only.
- Composite controls may apply tab index to their primary focus target.
- Controls with internal roving tab index may override or ignore this API, but must document it.

## Relationship To Other Primitives

`InteractiveControl` is low-level and broad.

Belongs here:

- focus
- blur
- focused state
- focus target
- tab index
- keyboard event surface

Does not belong here:

- `value.get/set/clear`
- `readOnly`
- `required`
- `validate`
- text selection / caret
- data binding
- selection model
- commands

Those belong to higher layers:

```ts
Control
  -> InteractiveControl
      -> ValueControl<T>
          -> EditableValueControl<T>
              -> TextEditControl
```

`Button`, `List`, `Grid`, `TreeGrid`, `TabBar`, `Menu`, and `DockPanel` can be interactive without being value controls.

`TextInput`, `NumberInput`, `SelectInput`, `CheckBox`, future `DateInput`, and grid editors are both interactive and value controls.

## Acceptance Checklist

A control satisfies `InteractiveControl` when:

- it can report its focus target
- it can report whether focus is currently inside the control
- it can attempt focus and report success
- it can blur its own focus target
- it emits object-based `focus` and `blur`
- it emits object-based `keyDown` and `keyUp`
- cancellable `keyDown` can stop the DOM keyboard event
- it has a documented tab index policy
- `destroy()` removes all focus/keyboard listeners

