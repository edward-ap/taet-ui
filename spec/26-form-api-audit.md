# 26. Form API Audit

This document compares our `Form` container with DHTMLX Form and DevExpress WinForms form/editor architecture.

Goal: treat `Form` as a value-aware container for editor controls. Individual inputs remain separate controls.

## Current State

`Form` is already a structured container:

```ts
const form = new Form({
  labelWidth: 96,
  labelPosition: "left",
  padding: "8px 0 8px 8px",
  initialValue: {
    name: "Customer"
  }
});

form.row(nameField, activeCheckBox);
form.columns(
  Form.column(firstName, lastName),
  Form.column(email, phone)
);
```

Current responsibilities:

- owns controls through `Panel`
- supports rows, columns, and label alignment
- binds commands into child buttons
- validates child controls
- aggregates values from child value-controls
- emits form-level value, validation, submit, clear, and reset events

Form geometry options:

- `labelPosition: "left" | "top"` defines the default label placement for all editor children.
- `labelWidth` aligns left-positioned labels.
- `fieldIndent` adds a common inset from the Form's left edge.
- inherited Panel `padding` controls the Form's outer top, right, bottom, and left insets; CSS shorthand strings are supported.
- editor-level `labelPosition`, `labelWidth`, and `indent` override the shared defaults where needed.

## DHTMLX Baseline

DHTMLX Form exposes the form itself as a value and validation unit:

```ts
form.setValue(object);
form.getValue();
form.clear();
form.validate();
form.getItem(id);
form.forEach(callback);
form.disable();
form.enable();
```

Useful DHTMLX events:

```ts
change
buttonClick
validationFail
beforeSend
afterSend
beforeShow / afterShow
beforeHide / afterHide
```

Useful finding: DHTMLX makes `clear`, `setValue`, `getValue`, and `validate` first-class Form APIs. This is the correct direction, but our event payloads must remain object-based instead of positional arguments.

## DevExpress Baseline

DevExpress does not model every data-entry screen as one monolithic `Form` class. It separates:

- editors with `EditValue`
- layout managers
- validation providers / error providers
- standard container/form controls
- data binding

Useful concepts:

- editor value lives on the editor (`EditValue`)
- changing value has before/after events
- validation errors are associated with specific controls
- forms/layouts aggregate editors but should not own every editor-specific behavior
- error text should be available as a hint/tooltip instead of pushing layout around

Finding: our `Form` should aggregate value and validation, while each editor keeps its own value, parsing, formatting, and validation state.

## Required Runtime Surface

`Form` should expose:

```ts
interface Form extends Panel {
  value: {
    get(): Record<string, unknown>;
    set(value: Record<string, unknown>, options?: MutationOptions): boolean;
    clear(options?: MutationOptions): boolean;
    reset(options?: MutationOptions): boolean;
  };

  getFields(): ValueControl<unknown>[];
  forEach(callback: (control: Control, name: string, index: number, form: Form) => void): this;

  getValue(): Record<string, unknown>;
  getValues(): Record<string, unknown>;
  setValue(value: Record<string, unknown>, options?: MutationOptions): boolean;
  setValues(value: Record<string, unknown>, options?: MutationOptions): boolean;
  clear(): this;
  clearValues(options?: MutationOptions): boolean;
  reset(options?: MutationOptions): boolean;
  resetValues(options?: MutationOptions): boolean;
  setInitialValue(value?: Record<string, unknown>): this;

  validate(context?: object): FormValidationResult;
  isValid(): boolean;
  clearValidation(options?: MutationOptions): void;
  focusFirstInvalid(options?: FocusOptions): boolean;

  submit(options?: SubmitOptions): boolean;

  isDirty(): boolean;
  setCleanValue(value?: Record<string, unknown>, options?: MutationOptions): this;
  setReadOnly(readOnly: boolean, options?: MutationOptions): this;
  isReadOnly(): boolean;
}
```

Rules:

- Form value includes only controls that implement `value.get/set/clear`.
- Simple field controls should implement [27. Editor Control Contract](27-editor-control-contract.md).
- Field keys use `control.name`, falling back to `control.id`.
- Buttons and labels are not form values.
- `setValue()` ignores unknown keys.
- `clear()` keeps the container contract inherited from `Panel`: it removes/destroys child controls.
- `clearValues()` clears field values.
- `form.value.clear()` is the canonical value-API path for clearing field values.
- `submit()` validates before emitting `submit`.
- failed submit emits `validationFail` and may focus the first invalid field.
- `disable()` / `enable()` cascade to child controls.
- `setReadOnly()` cascades readonly state to value fields.
- `initialValue` and `reset()` mark editor clean baselines so dirty-state does not lie.
- `isDirty()` aggregates child editor dirty-state.

## Events

Form-level events:

```ts
beforeValueSet
valueSet
change
validate
validationFail
validationClear
beforeClear
clear
afterClear
beforeReset
reset
afterReset
beforeSubmit
submit
afterSubmit
readOnlyChange
```

Rules:

- all event payloads are objects.
- `beforeValueSet`, `beforeClear`, `beforeReset`, and `beforeSubmit` are cancellable.
- child field changes are re-emitted as a form-level `change`.
- batched `setValue`, `clearValues`, and `reset` emit one form-level `change`.
- `submit` does not fire when validation fails.
- validation result includes `errors`, `ok`, and current `value`.

## Boundary

`Form` should not own:

- date parsing
- select item lookup
- checkbox semantics
- textarea resizing
- button activation
- grid/property-grid editing
- layout splitters
- docking

Those belong to child controls or specialized containers.

## Recommended Next Pass

1. Add `Button.activate()` and `submit` button behavior so form buttons can call `form.submit()`.
2. Add `FormData` export only if browser-native submit/upload becomes a real requirement.
3. Add a dedicated `FieldHint/Tooltip` primitive and make validation hints use it.
4. Add editor-specific audits for date/time/file/radio/button-edit families before adding those controls.

## Acceptance Checklist

`Form` is healthy when:

- it can collect values from all value-controls.
- it can set values without knowing concrete editor classes.
- clear/reset/submit are cancellable.
- submit validates before firing.
- invalid submit focuses the first invalid field.
- validation errors remain tied to individual controls.
- form-level change events identify the changed field.
- `Form.clear()` removes child controls like `Panel.clear()`.
- `Form.clearValues()` clears field values without removing controls.
