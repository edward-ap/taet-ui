# 23. Button API Audit

## Current variant update

Button now renders icons and supports setIcon/setIconPosition. The older audit
below records the original gaps and proposals; it is not the current inventory.
Stable IconButton extends ToolButton as an icon-only borderless action. It retains
native Enter/Space activation, disabled state, command binding, setters and owner
cleanup. text/label (or the bound command label) provides the accessible name and
fallback tooltip. The default hit area follows toolbar height; shape controls
square/rounded hover fill. No frame is painted at rest/hover/press; focus-visible
retains an outline. There is no showText constructor option. See
src/ui/display-contracts.d.ts and docs/src/pages/IconButton.page.js.

Experimental ToggleIconButton follows CheckButton rather than Button command
semantics. It has boolean value/dirty/reset/validation and cancellable change,
with checkedIcon/uncheckedIcon and hidden checkedText/uncheckedText action names.
It reuses the borderless hit-area styling and updates aria-pressed, aria-label
and tooltip without remounting. State changes do not add a permanent frame/fill.
Use change to drive application playback; silent values still synchronize icons.
The Play/Stop example is in docs/src/pages/ToggleIconButton.page.js. Group and
readOnly behavior remain inherited; command/onClick are not toggle options.

This document compares the current `Button` / `ToolButton` API with DHTMLX Form/Toolbar buttons and DevExpress WinForms button controls.

Goal: decide which properties and events belong to the base `Button`, which belong to toolbar/command buttons, and which belong to future editor buttons.

## Current State

`Button` currently extends `BaseControl`, so after the `InteractiveControl` pass it already has:

- lifecycle: `mount`, `refresh`, `enable`, `disable`, `show`, `hide`, `destroy`
- interaction: `focus`, `blur`, `isFocused`, `keyDown`, `keyUp`
- size: `width`, `height`, `setSize`
- events: `click`
- command binding: `bindCommand(commands, commandId)`

Current config:

```ts
type ButtonConfig = {
  name?: string;
  id?: string;
  label?: string;
  text?: string;
  value?: string;
  icon?: string;
  css?: string;
  disabled?: boolean;
  visible?: boolean;
  hidden?: boolean;
  width?: number | string;
  height?: number | string;
  command?: string;
  commands?: CommandRegistry;
  onClick?: (event: ButtonClickEvent) => void;
};
```

Current methods:

```ts
setLabel(label: string): void;
setText(text: string): void;
bindCommand(commands: CommandRegistry, commandId?: string): this;
```

`ToolButton` adds:

```ts
showText?: boolean;
tooltip?: string;
icon?: string;
```

Finding: the base is usable, but `Button` has an underdefined public surface. `icon` exists in config but is not rendered by `Button`; only `ToolButton` renders icons. There is no explicit activation method, no before-click cancellation, no runtime setters for icon/tooltip/style, and no checked/toggle state.

## DHTMLX Baseline: Form Button

DHTMLX Form Button exposes a small control-like API:

```ts
show(): void;
hide(init?: boolean): void;
isVisible(): boolean;
disable(): void;
enable(): void;
isDisabled(): boolean;
setValue(value: string): void;
```

Events:

```ts
click
show
hide
```

Form-level event:

```ts
buttonClick(id, mouseEvent)
```

Form button config includes:

```ts
type?: "button";
submit?: boolean;
url?: string;
value?: string;
icon?: string;
view?: "flat" | "link";
size?: "small" | "medium";
color?: "danger" | "secondary" | "primary" | "success";
full?: boolean;
circle?: boolean;
loading?: boolean;
```

Finding: DHTMLX treats button text as `value`, not as model value. We should not make `Button` a `ValueControl`; button label is presentation/state, not project model data.

## DHTMLX Baseline: Toolbar Button

DHTMLX Toolbar Button is richer:

```ts
type: "button";
hotkey?: string;
tooltip?: string;
count?: number;
countColor?: "danger" | "secondary" | "primary" | "success";
items?: IMenuElement[];
group?: string;
twoState?: boolean;
active?: boolean;
multiClick?: boolean;
icon?: string;
view?: "flat" | "link";
size?: "small" | "medium";
color?: "danger" | "secondary" | "primary" | "success";
full?: boolean;
circle?: boolean;
loading?: boolean;
value?: string;
```

Toolbar also has collection-level operations:

```ts
hide(id | id[])
show(id | id[])
disable(id | id[])
enable(id | id[])
isDisabled(id)
getState()
setState(state)
```

Finding: command/tool buttons need extra state that should not pollute every base button. `count`, `group`, `twoState`, `active`, `items`, and `hotkey` belong to `ToolButton` / `CommandButton`, not minimal `Button`.

## DevExpress Baseline

### SimpleButton

`SimpleButton` is the closest DevExpress match for our normal `Button`: a standalone clickable command surface.

Useful concepts to copy:

- text/caption
- image/glyph
- enabled/visible/focus
- tooltip/super tooltip
- appearance/style variants
- click/default activation
- dialog result in modal contexts

Do not copy WinForms-specific object model details directly.

### ButtonEdit

`ButtonEdit` is not a standalone button. It is an editor with one or more embedded buttons.

Useful concepts for later:

- an editor can own a collection of buttons
- each button has kind/glyph/tag
- `ButtonClick` tells which embedded button was pressed
- this is useful for search fields, file pickers, clear buttons, ellipsis buttons, and grid/property editors

This should become a separate future primitive, not part of base `Button`:

```ts
interface ButtonItem {
  id: string;
  icon?: string;
  text?: string;
  tooltip?: string;
  kind?: "normal" | "dropdown" | "ellipsis" | "clear" | "glyph";
  disabled?: boolean;
  visible?: boolean;
  tag?: unknown;
}

interface ButtonEditControl<T> extends EditableValueControl<T> {
  buttons: ButtonCollection;
}
```

## What Belongs To Base Button

Base `Button` should be a command/action control, not a value control.

Recommended config:

```ts
type ButtonVariant = "normal" | "flat" | "link" | "primary" | "danger" | "success";
type ButtonSize = "small" | "medium";

interface ButtonConfig extends ControlConfig {
  text?: string;
  label?: string;
  icon?: string;
  tooltip?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  full?: boolean;
  circle?: boolean;
  loading?: boolean;
  submit?: boolean;
  command?: string;
  commands?: CommandRegistry;
}
```

Recommended methods:

```ts
activate(options?: MutationOptions): boolean;
setText(text: string): this;
getText(): string;
setIcon(icon: string | null): this;
getIcon(): string | null;
setTooltip(tooltip: string | null): this;
getTooltip(): string | null;
setLoading(loading: boolean): this;
isLoading(): boolean;
```

`activate()` is important because keyboard shortcuts, tests, host bridges, and menu/toolbar routing need the same action path as a click.

## Events

Current:

```ts
click
```

Recommended:

```ts
beforeClick
click
afterClick
```

Payload:

```ts
interface ButtonClickEvent extends UIEventObject<Button> {
  nativeEvent?: MouseEvent | KeyboardEvent;
}

interface BeforeButtonClickEvent extends ButtonClickEvent {
  cancel: boolean;
}
```

Rules:

- User mouse click uses `origin: "user"` and `userAction: true`.
- Keyboard activation uses `origin: "user"` and `userAction: true`.
- Programmatic `activate()` defaults to `origin: "api"`.
- Disabled or loading buttons must not activate from user actions.
- `beforeClick` can cancel activation.
- Command-bound buttons should execute the command through the same pipeline.

## Keyboard Behavior

Because `Button` now inherits `InteractiveControl`, it already exposes `keyDown` and `keyUp`.

Button-specific behavior:

- `Enter` activates the button.
- `Space` activates the button.
- native `<button>` already does this in browsers, so implementation should avoid double execution.
- If a custom non-button host is ever used, it must implement equivalent keyboard activation.

## Command Binding

The current `bindCommand()` direction is correct:

```ts
new Button({ command: "project.save", commands });
```

Recommended additions:

- command label updates `text`
- command icon updates `icon`
- command shortcut updates `tooltip`
- command enabled updates `disabled`
- command visible updates visibility
- command checked updates pressed/toggle state when supported

Base button should not own shortcut registration. `ShortcutManager` owns shortcuts. Button only reflects command state.

## Toggle / Checked State

Do not add toggle behavior to base `Button` yet.

Add a separate control or option later:

```ts
class ToggleButton extends Button implements ValueControl<boolean>
```

or:

```ts
new ToolButton({ twoState: true, checked: true })
```

Reason: a normal action button and a two-state button have different semantics. Treating every button as a value control would be wrong.

## Recommended Implementation Pass

Small next step:

1. Add `tooltip`, `variant`, `size`, `full`, `circle`, `loading`, `submit` config to `Button`.
2. Render `icon` in base `Button`, or explicitly move icon support only to `ToolButton`. Do not leave `icon` accepted but unused.
3. Add runtime setters: `getText`, `setIcon`, `getIcon`, `setTooltip`, `getTooltip`, `setLoading`, `isLoading`.
4. Add `activate(options?)`.
5. Add `beforeClick` / `afterClick`.
6. Make click handling call `activate({ origin: "user", userAction: true, nativeEvent })`.
7. Ensure command-bound buttons execute commands from `activate()`.

Do not do yet:

1. Do not make `Button` a `ValueControl`.
2. Do not add toolbar `count/group/items/twoState` to base `Button`.
3. Do not add `ButtonEdit` embedded-button collection to base `Button`.
4. Do not add generic `setConfig()` until mutable config policy is defined.

## Acceptance Checklist

A base `Button` is complete enough when:

- it implements `Control`
- it implements `InteractiveControl`
- it exposes text, icon, tooltip, visual variant, size, loading state
- it exposes `activate()`
- it emits object-based `beforeClick`, `click`, and `afterClick`
- it supports command binding without anonymous local handlers
- disabled/loading user actions do not execute
- command state can update text/icon/enabled/visible/pressed tooltip
- it does not pretend to be a value control
