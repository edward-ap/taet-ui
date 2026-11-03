# 03. Value API

## Problem

Value controls are everywhere: fields, checkboxes, sliders, combo boxes, date pickers, color pickers, file selectors, grid editors, and property inspectors.

If every control invents its own value API, the rest of the system becomes unreliable:

- validation cannot tell why a value changed
- dirty-state becomes inaccurate
- undo / redo captures the wrong operations
- project loading looks like user edits
- refresh and data binding can accidentally fire business logic

The value primitive must be uniform.

## Finding From DHTMLX

DHTMLX uses the right general vocabulary on value-like controls:

```ts
getValue()
setValue(value)
clear()
```

Examples:

- Calendar: `setValue(value)`, `getValue(asDateObject?)`, `clear()`
- Combobox: `setValue(ids)`, `getValue(asArray?)`, `clear()`
- Form items: `setValue(value)`, `getValue()`, `clear()`
- Slider: `setValue(value)`, `getValue()`
- Timepicker: `setValue(value)`, `getValue(asObject?)`, `clear()`

But the API is not a single primitive:

- Methods live directly on each component.
- Options are component-specific.
- Change events use positional arguments.
- Some controls pass a boolean like `byClick`; others pass only the new value.
- There is no standard `silent` option.
- There is no standard distinction between user action, programmatic change, project model loading, and refresh-driven reset.

Conclusion: `getValue/setValue/clear` are proven useful, but they should be grouped under a strict `value` object and carry standard metadata.

## Required Primitive

Any control that owns a value must implement `ValueControl<T>`.

```ts
interface ValueControl<T> extends Control {
  readonly value: ValueApi<T>;
}

interface ValueApi<T> {
  get(): T;
  set(value: T, options?: SetValueOptions): boolean;
  clear(options?: SetValueOptions): boolean;
}

type SetValueOptions = MutationOptions;
```

Usage:

```ts
nameField.value.set("Customer Name");
const name = nameField.value.get();
nameField.value.clear();
```

Return rule:

- `true` means the requested value mutation was applied and changed the value.
- `false` means no value mutation was applied, or the value did not change.
- `false` may mean cancelled, unchanged, disabled, destroyed, or invalid input depending on the concrete control.
- Callers that need to distinguish reasons must use events or a future richer result type.

Possible future result:

```ts
type SetValueResult =
  | { ok: true; changed: boolean }
  | { ok: false; reason: "cancelled" | "disabled" | "destroyed" | "invalid" };
```

## Why `value.get()` Instead Of `getValue()`

Grouping value methods under `value` gives a stable API namespace:

```ts
control.value.get()
control.value.set(next)
control.value.clear()
```

This scales better when controls also have:

```ts
control.selection
control.commands
control.validation
control.data
```

The control surface stays organized by primitive instead of becoming a flat list of unrelated methods.

## SetValueOptions

```ts
type SetValueOptions = MutationOptions;
```

### `silent`

Suppresses public value events.

```ts
field.value.set(model.customerName, { silent: true, origin: "import" });
```

Rules:

- `silent: true` must not emit `beforeChange`, `change`, or `afterChange`.
- The value still changes.
- Rendering may still refresh.
- Validation may still recompute internal state.
- Command state and dirty-state services may still be refreshed by explicit integration code.
- `silent` must not be overloaded to mean "do not render" or "do not validate".

Use cases:

- loading project model
- hydrating UI from host state
- applying internal refresh
- initializing controls
- syncing from data binding without re-entering event handlers

### `userAction`

Marks whether the change came from direct user interaction.

```ts
field.value.set("abc", { userAction: true });
```

Rules:

- User-originated UI input must set `userAction: true`.
- Programmatic calls default to `userAction: false`.
- Project model loading should use `userAction: false` and usually `silent: true`.
- Event objects must copy this flag.

Use cases:

- dirty-state
- undo / redo
- validation timing
- command routing
- telemetry
- host-language synchronization

### `origin`

`origin` explains where the change came from.

```ts
field.value.set(project.customer.name, {
  origin: "import",
  silent: true
});

field.value.set(previousName, {
  origin: "undo"
});
```

Rules:

- `origin: "user"` implies `userAction: true`.
- `userAction: true` without origin implies `origin: "user"`.
- Omitted origin defaults to `"api"`.
- Undo/redo must use `origin: "undo"` / `"redo"`.
- Project loading must use `origin: "import"`.
- UI state restore must use `origin: "restore"`.

## Change Events

Value changes use the `EventBus` object rule.

```ts
interface ValueChangeEvent<T, TSource = ValueControl<T>> extends UIEventObject<TSource> {
  oldValue: T;
  newValue: T;
  origin: ChangeOrigin;
  userAction: boolean;
}

interface BeforeValueChangeEvent<T, TSource = ValueControl<T>>
  extends ValueChangeEvent<T, TSource> {
  cancel: boolean;
}
```

Only documented mutable event fields are honored by emitters. For `beforeChange` in v0.1, the only mutable field is `cancel`; changing `newValue` inside the event object must not transform the value. Value coercion or parsing should be a separate control-specific hook.

Recommended sequence:

```ts
const oldValue = control.value.get();

if (!options?.silent) {
  const before = control.events.emit("beforeChange", {
    source: control,
    oldValue,
    newValue,
    origin: normalizeMutationOptions(options).origin,
    userAction: options?.userAction === true,
    cancel: false
  });

  if (before.cancel) return false;
}

applyValue(newValue);
control.refresh();

if (!options?.silent) {
  control.events.emit("change", {
    source: control,
    oldValue,
    newValue,
    origin: normalizeMutationOptions(options).origin,
    userAction: options?.userAction === true
  });

  control.events.emit("afterChange", {
    source: control,
    oldValue,
    newValue,
    origin: normalizeMutationOptions(options).origin,
    userAction: options?.userAction === true
  });
}

return true;
```

## Clear Semantics

`clear()` resets to the control's empty value.

Examples:

| Control | Empty value |
| --- | --- |
| Text field | `""` |
| Checkbox | `false` |
| Number field | `null` or configured empty value |
| Combo single | `null` or `""`, decided by control spec |
| Combo multi | `[]` |
| Date picker | `null` |
| Slider | configured minimum/default |
| File list | `[]` |

Rules:

- `clear()` must use the same event pipeline as `set()`, unless `silent: true`.
- `clear()` accepts `SetValueOptions`.
- `clear()` returns `true` when the value changed.
- `clear()` returns `false` when the operation was cancelled or the value was already empty.
- Empty value must be documented by each concrete control.
- Clearing due to user action should use `{ userAction: true }`.
- Clearing during model load or refresh should usually use `{ silent: true, origin: "import" }` or `{ silent: true, origin: "system" }`.

Example:

```ts
nameField.value.clear({ userAction: true });
form.value.clear({ silent: true, origin: "import" });
```

## Reference Implementation v0.7: CheckBox

`CheckBox` is the first boolean value-control.

Rules:

- `value.get()` returns `boolean`.
- `value.set(value, options)` coerces only `true` to `true`; every other value becomes `false`.
- `value.clear()` resets to `false`.
- User clicks emit `beforeChange`, `change`, and `afterChange` with `origin: "user"` and `userAction: true`.
- `silent: true` updates checked state without public value events.
- `Form.validate()` works through the same `validate()` / `validation` surface used by text and select controls.
- Generic `required()` is not a checkbox acceptance validator, because `false` is still a valid boolean value. Use a dedicated validator such as `mustBeChecked()` when the user must explicitly accept something.

## Reference Implementation v0.7: TextArea

`TextArea` is the multiline text value-control.

Rules:

- `TextArea` uses the same string value API as `TextInput`.
- `value.get()` returns the full string including newline characters.
- `value.clear()` resets to `""`.
- User input emits the same `beforeChange`, `change`, and `afterChange` event objects as `TextInput`.
- `silent: true` updates the DOM textarea without public value events.
- Validation uses the same non-layout-shifting hint behavior as other dense fields.
- `rows` controls the initial compact height; `resize` may be `"vertical"`, `"horizontal"`, `"both"`, or `"none"`.

## Reference Implementation v0.8: NumberInput

`NumberInput` is the typed numeric value-control.

Rules:

- `value.get()` returns `number | null`.
- `value.set(number)` writes a finite number to the DOM input.
- `value.clear()` resets to empty DOM text and `value.get() === null`.
- User raw input is preserved in the DOM.
- If raw input is empty or not a finite number, `value.get()` returns `null`.
- `min`, `max`, and `step` map to native input attributes.
- Validation receives the typed `number | null` value, while the raw DOM string remains available in the native input if a future parser needs it.

The audited NumberInput container overload now mounts after numeric initialization.
spin/spinUp/spinDown use numeric step, or increment/default 1 when step is 'any';
they reject readonly/disabled controls even for API actions. value.set still allows
programmatic hydration. Numeric clear is fixed to null, and raw/display methods
return strings. The typed inputs entry also includes boolean CheckBox/Switch;
their empty value is false, and an explicit value overrides checked. Switch remains
experimental and its createIndicator helper returns DOM rather than a live Control.

## Reference Implementation v0.8: ReadonlyText

`ReadonlyText` is a display-control for non-editable values.

Rules:

- It extends `LabelText`.
- It has no `value` editor API and does not pretend to be mutable.
- It is styled as a dense readonly field value.
- It is intended for ids, generated values, computed status, and readonly PropertyGrid rows.

## Equality

Controls should not emit change events when the value did not actually change.

Rule:

```ts
if (isEqual(oldValue, newValue)) return;
```

Each control must define equality for its value type:

- primitives use strict equality
- dates compare timestamps or normalized value
- arrays compare item values in order unless the control declares unordered semantics
- objects compare by stable model identity or explicit comparator

## Programmatic Versus User Changes

The same `set()` method is used for all sources, but metadata must be correct.

Examples:

```ts
// User typed into an input.
field.value.set(input.value, { userAction: true });

// Project model loaded from disk.
field.value.set(project.customer.name, {
  silent: true,
  origin: "import",
  userAction: false
});

// Script updates a value and wants listeners to react.
field.value.set("Generated name");

// Refresh recalculates a derived value without triggering dirty-state.
summary.value.set(nextSummary, { silent: true, origin: "system" });
```

## Interaction With Dirty-State

Dirty-state should listen to value events, not monkey-patch controls.

Rules:

- `change` with `userAction: true` usually marks the document dirty.
- `change` with `userAction: false` may mark dirty only when the caller intends it.
- `silent: true` does not emit `change`, so it must not mark dirty through events.
- Project model hydration should not mark dirty.
- Dirty-state should prefer `origin` over raw `userAction` when the distinction matters.

## Interaction With Undo / Redo

Undo / redo should capture event objects:

```ts
field.events.on("change", e => {
  if (!e.userAction) return;
  undoStack.push({
    source: e.source.id,
    oldValue: e.oldValue,
    newValue: e.newValue
  });
});
```

Applying undo should be programmatic and usually not user-originated:

```ts
field.value.set(previousValue, {
  origin: "undo",
  userAction: false
});
```

If undo application should not create another undo record, the undo manager can use `silent: true` or its own command context. That decision belongs to the command/undo primitive, not to each widget.

## Interaction With Validation

Validation must know why a value changed.

Suggested default:

- User changes validate immediately or according to control policy.
- Programmatic changes may validate but should not show aggressive UI unless requested.
- Silent changes should not show validation messages.

Concrete validation rules will be defined in the validation primitive.

## Form Values

A form is also a `ValueControl<TModel>` when it owns a structured model.

```ts
interface CustomerFormValue {
  name: string;
  email: string;
  active: boolean;
}

const value = customerForm.value.get();
customerForm.value.set(project.customer, { silent: true, origin: "import" });
```

Rules:

- Child value controls feed the form value.
- Form-level `change` events should include the changed path when possible.
- Project model load should set the form silently.

Example form event:

```ts
customerForm.events.emit("change", {
  source: customerForm,
  path: "customer.name",
  oldValue: "Old",
  newValue: "New",
  userAction: true
});
```

## Acceptance Checklist

A value-like control can be accepted only if:

- It extends `Control`.
- It exposes `value.get()`.
- It exposes `value.set(value, options?)`.
- It exposes `value.clear(options?)`.
- It supports `silent`.
- It supports `userAction`.
- `value.set()` and `value.clear()` return `boolean`.
- `false` return is documented as "not applied or unchanged", not specifically "cancelled".
- It emits object-based `beforeChange`, `change`, and/or `afterChange` events.
- It includes `oldValue` and `newValue` in change events.
- It includes `origin` in change events.
- It does not emit change events for equal values.
- It documents its empty value.

## Audited standalone input subset

taet-ui/inputs declares EditorControl, TextInput, NumberInput, CheckBox and the
experimental Switch, retaining their existing constructor identities.
EditorControl is a generic value base with default emptyValue ''; non-string typed
specializations supply a compatible emptyValue explicitly. TextInput is string-valued.
value.reset/reset restore the clean baseline, while clear restores emptyValue.
Silent writes update dirty state and clear validation messages without public value
events. required alone does not install validation. See docs/INPUT_TYPES.md for the
implemented standalone contract rather than treating suggested policies above as
automatic runtime behavior.

EditorControl beforeChange supports cancellation but does not apply a replacement
event.newValue. Destruction during that event aborts before writing; destruction in
change/afterChange skips later phases and preserves the successful write result.
Same-phase EventBus snapshots and broader nested-write/subclass-hook behavior are
unchanged. Typed validators are synchronous; warning results do not make ok false.

## Open Questions

- Should controls expose `value.initial` or `value.default`?
- Should controls expose `value.empty()` or `value.default()` for generic tooling?
