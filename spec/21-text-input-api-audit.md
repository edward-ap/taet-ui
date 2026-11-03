# 21. Text Input API Audit

This document compares the current `TextInput` / `TextField` API with DHTMLX Form Input and DevExpress client editors.

Goal: decide whether the core primitives are enough, and define the missing editor-level contract before changing implementation.

## Current State

`TextInput` is a thin alias:

```js
export class TextInput extends TextField {}
```

`TextField` already implements useful primitives:

- `Control`: `mount`, `refresh`, `enable`, `disable`, `show`, `hide`, `focus`, `destroy`
- `EventBus`: object-based `beforeChange`, `change`, `afterChange`
- `ValueControl<string>`: `value.get()`, `value.set(value, options)`, `value.clear(options)`
- `MutationOptions`: `silent`, `origin`, `userAction`
- basic validation: `validate()`, `isValid()`, `clearValidation()`, `validation.getErrors()`
- state flags: `readonly`, `required`, `invalid`, `warning`

This confirms that the first primitives were not wasted. `Control`, `EventBus`, and `ValueControl` are carrying real implementation weight.

## DHTMLX Baseline

DHTMLX Form Input exposes a compact direct API:

```ts
show(): void;
hide(init?: boolean): void;
isVisible(): boolean;
disable(): void;
enable(): void;
isDisabled(): boolean;
validate(): boolean;
clearValidate(): void;
clear(): void;
setValue(value: string): void;
getValue(): string;
setConfig(config: IInput): void;
```

Its input configuration includes:

```ts
type?: "input";
inputType?: string;
value?: string;
validation?: Validation | ValidationFn;
icon?: string;
placeholder?: string;
autocomplete?: boolean;
readOnly?: boolean;
maxlength?: string;
```

Shared form item configuration also includes:

- `name`, `id`
- `width`, `height`, `css`
- `disabled`, `hidden`, `required`
- `label`, `labelWidth`, `labelPosition`, `hiddenLabel`, `labelInline`
- `helpMessage`, `preMessage`, `successMessage`, `errorMessage`
- `cellCss`, `gravity`

Events are intentionally small:

```ts
change(value)
configUpdate(config)
show(id)
hide(id, init?)
```

Finding: DHTMLX is pragmatic and compact, but it mixes editor, layout, label, validation, and config mutation in one flat item contract. We should keep the useful property coverage, but not copy positional events or a flat method namespace.

## DevExpress Baseline

DevExpress splits the idea into layers:

- base control: visibility, size, main element, parent, init
- base edit: enabled, read-only, validation, value, input element
- text edit: text, selection/caret, keyboard and user input events

Relevant client methods on the base/editor layers include:

```ts
Focus()
GetInputElement()
GetMainElement()
GetParentControl()
GetVisible()
SetVisible(visible)
GetWidth()
SetWidth(width)
GetHeight()
SetHeight(height)
GetEnabled()
SetEnabled(value)
GetReadOnly()
SetReadOnly(readOnly)
GetValue()
SetValue(value)
GetText()
SetText(text)
SelectAll()
SetSelection(startPos, endPos, scrollToSelection)
SetCaretPosition(position)
Validate()
GetIsValid()
SetIsValid(isValid)
GetErrorText()
SetErrorText(errorText)
```

Relevant events include:

```ts
Init
GotFocus
LostFocus
KeyDown
KeyPress
KeyUp
UserInput
TextChanged
ValueChanged
Validation
```

Finding: DevExpress proves that editor controls need an intermediate primitive, not just `Control + ValueControl`. Focus, read-only, validation, raw user input, and keyboard events belong to the editor layer.

## What Is Missing In Our TextInput

### 1. Public Read-Only API

Current implementation has internal state:

```js
field.state.set("readonly", true)
```

But app code should not have to know the state flag name.

Recommended:

```ts
interface EditableControl extends Control {
  setReadOnly(readOnly: boolean, options?: MutationOptions): this;
  isReadOnly(): boolean;
}
```

Events:

```ts
beforeReadOnlyChange
readOnlyChange
afterReadOnlyChange
```

### 2. Focus Events

`Control.focus()` exists, but `TextInput` does not emit focus transitions.

Recommended event names:

```ts
focus
blur
```

Event payload:

```ts
{
  source: control,
  origin: "user" | "api",
  userAction: boolean,
  nativeEvent?: FocusEvent
}
```

Programmatic `focus()` should emit `focus` only when focus actually changes.

### 3. User Input Event

Current user typing goes straight through `value.set(..., { origin: "user" })` and emits `change`.

That is acceptable for simple input, but desktop editors usually distinguish:

- raw input while user types
- accepted/committed value change

Recommended:

```ts
userInput
beforeChange
change
afterChange
```

For now, `TextInput` can keep emitting `change` on every native `input`, but should also expose `userInput` so future masked/formatted editors do not have to break the API.

### 4. Keyboard Events

Needed for editor behavior, command routing, property grid editing, Enter/Escape commit/cancel, and validation timing.

Recommended:

```ts
keyDown
keyUp
```

Do not expose `keyPress` as a preferred API. It exists in older libraries, but modern browser work should route through `keydown` / `keyup`.

Payload:

```ts
{
  source: control,
  key: string,
  code: string,
  altKey: boolean,
  ctrlKey: boolean,
  shiftKey: boolean,
  metaKey: boolean,
  nativeEvent: KeyboardEvent,
  cancel: boolean
}
```

`keyDown` should be cancellable by setting `event.cancel = true`.

### 5. Text Selection / Caret API

This is not needed for every value control, but it is needed for text editors.

Recommended:

```ts
interface TextEditControl extends EditableControl, ValueControl<string> {
  text: {
    get(): string;
    set(text: string, options?: MutationOptions): boolean;
    selectAll(): void;
    getSelection(): { start: number; end: number };
    setSelection(start: number, end: number, options?: TextSelectionOptions): void;
    getCaret(): number;
    setCaret(position: number): void;
  };
}
```

For plain `TextInput`, `text.get()` may equal `value.get()`. The separate namespace becomes useful later for masked input, formatted number/date editors, combo text, and display text versus model value.

### 6. Runtime Property Setters

DHTMLX exposes `setConfig(config)`. DevExpress exposes specific setters.

We should not add one generic `setConfig()` first, because it becomes a dumping ground. Prefer explicit setters for properties that are safe at runtime:

```ts
setLabel(label: string): this;
setPlaceholder(placeholder: string): this;
setRequired(required: boolean, options?: MutationOptions): this;
setMaxLength(maxLength: number | null): this;
setInputType(inputType: string): this;
```

Maybe later:

```ts
configure(patch: Partial<TextInputConfig>, options?: MutationOptions): this;
```

But only after we define which config fields are mutable.

### 7. Missing Config Properties

Current `TextField` config should be extended with DHTMLX-proven fields:

```ts
inputType?: string;       // native input type, default "text"
autocomplete?: boolean | string;
maxLength?: number | null;
help?: string;
helpMessage?: string;
```

Already present:

```ts
name/id
label
placeholder
value
emptyValue
disabled
hidden/visible
readOnly/readonly
required
validators
width/height
css
```

Do not add everything immediately:

- `icon` belongs to an `InputButton/EditButton` feature, not the base text primitive.
- `preMessage/successMessage/errorMessage` belong to validation/message policy.
- `labelWidth/labelPosition` belongs to Form layout, not the field value primitive.

## Primitive Review

Keep:

- `Control`
- `EventBus`
- `ValueControl`
- `DataStore`
- `SelectionModel`
- `CommandRegistry`
- `PropertyModel`
- `Serialization/uiState`
- `DisposableBag`
- `Focus/active context`
- `ShortcutManager`
- `Size/resize`

Treat as real but not universal:

- `DataStore` applies to data-bound controls, not simple inputs.
- `SelectionModel` applies to selectable controls, not every input.
- `PropertyModel` applies to inspectable objects, not every control.
- `CommandRegistry` applies to app actions, not every widget method.

Add one missing primitive layer:

```ts
interface EditableControl extends Control {
  setReadOnly(readOnly: boolean, options?: MutationOptions): this;
  isReadOnly(): boolean;
}

interface TextEditControl extends EditableControl, ValueControl<string> {
  text: TextApi;
}
```

This layer is not overengineering. It prevents text-specific APIs from leaking into every `ValueControl`.

## Recommended Next Implementation Pass

Small step:

1. Add `TextField` config support: `inputType`, `autocomplete`, `maxLength`.
2. Add explicit methods: `setReadOnly`, `isReadOnly`, `setPlaceholder`, `setLabel`, `setRequired`.
3. Add focus/blur events from native input.
4. Add `userInput`, `keyDown`, `keyUp` events.
5. Add `text.selectAll()`, `text.getSelection()`, `text.setSelection()`, `text.getCaret()`, `text.setCaret()`.
6. Keep `value` as the canonical model value API.

Do not do yet:

1. Do not introduce a generic `setConfig()` until mutable config rules are clear.
2. Do not add icon buttons into base `TextInput`; make it a separate extension.
3. Do not add label positioning to `TextInput`; keep it in `Form`.
4. Do not add `keyPress` unless browser compatibility or a legacy adapter needs it.

## Acceptance Checklist For TextInput

A `TextInput` is complete enough when:

- it implements `Control`
- it implements `ValueControl<string>`
- it exposes readonly control through explicit API
- it exposes focus/blur events
- it exposes raw user input events
- it exposes keydown/keyup events
- it exposes text selection/caret API
- it supports placeholder, maxLength, autocomplete, and inputType
- it supports validation without shifting layout
- it uses object event payloads
- it preserves `origin`, `userAction`, and `silent`
- it can be destroyed without leaked DOM listeners

