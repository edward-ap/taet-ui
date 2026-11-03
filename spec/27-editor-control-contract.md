# 27. Editor Control Contract

This document defines the shared contract for simple field editors used by `Form`, `Grid`, and future `PropertyGrid` editors.

Goal: every value editor should behave the same at the API level, even if its DOM and value type are different.

## Base Class

`EditorControl` is the shared base for simple value editors.

Current descendants:

- `TextField`
- `TextInput`
- `NumberInput`
- `SelectInput`
- `CheckBox`
- `TextArea`
- `DateInput`
- `TimeInput`
- `DateTimeInput`

## Required Surface

```ts
interface EditorControl<T> extends Control {
  value: {
    get(): T;
    set(value: T, options?: MutationOptions): boolean;
    clear(options?: MutationOptions): boolean;
    reset(options?: MutationOptions): boolean;
  };

  validation: {
    getErrors(): ValidationError[];
    clear(options?: MutationOptions): void;
  };

  getName(): string;
  getLabel(): string;
  setLabel(label: string, options?: MutationOptions): this;
  setLabelPosition(position: "left" | "top" | null): this;
  setLabelWidth(width: number | string | null): this;
  setIndent(indent: number | string | null): this;

  isReadOnly(): boolean;
  setReadOnly(readOnly: boolean, options?: MutationOptions): this;
  isRequired(): boolean;
  setRequired(required: boolean, options?: MutationOptions): this;

  getErrors(): ValidationError[];
  setValidators(validators: Validator[]): this;
  addValidator(validator: Validator): this;
  validate(context?: object): ValidationResult;
  isValid(): boolean;
  clearValidation(options?: MutationOptions): this;

  isDirty(): boolean;
  setCleanValue(value?: T): this;
  reset(options?: MutationOptions): boolean;
}
```

## Label Geometry

Every editor accepts optional `labelPosition`, `labelWidth`, and `indent` settings. A numeric width or indent is measured in pixels; a string may use any valid CSS length.

- `labelPosition: "left"` keeps the compact desktop property-form layout.
- `labelPosition: "top"` places the label above its editor.
- omitted `labelPosition` inherits the containing `Form` policy.
- an explicit field value overrides the Form policy.
- `indent` applies to one editor without changing sibling geometry.

## Value Rules

- `TextField`, `TextInput`, and `TextArea` return strings.
- `NumberInput` returns `number | null`.
- `SelectInput` returns the item id type.
- `CheckBox` returns boolean.
- `DateInput` returns `YYYY-MM-DD` or an empty string.
- `TimeInput` returns `HH:mm` or an empty string.
- `DateTimeInput` returns `YYYY-MM-DDTHH:mm` or an empty string.
- `value.clear()` resets to the control's empty value.
- `value.reset()` resets to the clean value.
- user-origin changes are blocked when the editor is disabled or readonly.
- programmatic changes can still update readonly controls.

## Events

All editors emit object-based events:

```ts
beforeChange
change
afterChange
dirtyChange
validate
validationClear
labelChange
```

Rules:

- `beforeChange` is cancellable.
- `change` and `afterChange` expose `oldValue`, `newValue`, `origin`, and `userAction`.
- `dirtyChange` fires only when dirty state toggles.
- `validate` returns `ok`, `errors`, and validated `value`.
- `validationClear` fires when validation is cleared unless `silent: true`.

## Dirty State

Each editor tracks a clean baseline:

```ts
field.isDirty();
field.setCleanValue();
field.value.reset();
```

Rules:

- initial constructor value is clean.
- `Form.initialValue` becomes clean baseline after being applied.
- `Form.reset()` restores initial values and marks fields clean.
- dirty controls get the `dui-dirty` state class.

## Validation

Validators receive:

```ts
validator(value, {
  control,
  value,
  form
});
```

Validation state:

- first error sets `dui-invalid`.
- first warning sets `dui-warning`.
- error/warning text is exposed through the field hint/title without pushing layout.

## Form Integration

`Form` must not know concrete editor classes.

It detects fields by checking:

```ts
control.value.get
control.value.set
control.value.clear
```

Then it can aggregate:

```ts
form.getValue();
form.setValue({ name: "Customer" });
form.clearValues();
form.value.clear();
form.reset();
form.submit();
```

## Acceptance Checklist

- every simple editor exposes the same value API.
- every simple editor exposes readonly, required, validation, and dirty APIs.
- `Form` can collect and set values without checking editor class names.
- user changes are blocked when readonly.
- programmatic changes still work in readonly mode.
- `NumberInput` emits numeric event values.
- `TextArea` and `TextField` update their rendered labels through `setLabel()`.
- `CheckBox` updates its display text through `setText()`.

## Standalone choice declaration boundary

The typed inputs entry includes stable SelectInput and RadioGroup. Choice records
are generic, while values remain unknown to preserve unmatched and configurable
empty values. Select owns its default DataStore and borrows injected data; unlike
the Grid factory, standalone Select does not parse items/options arrays. Value
events add nullable oldItem/newItem record references. search/filter/searchable
enable the searchable popup. The injected InputOverlayService is borrowed.

RadioGroup normalizes items/options into wrappers with key/value/text/marker/
disabled/raw. Selected-item accessors copy wrappers, retaining raw references.
setItems reconciles missing values through the cancellable value pipeline without
rolling back the item list. Destroying the group in that pipeline suppresses the
later itemsChange. appearanceChange uses value rather than newValue.

Select's value override follows EditorControl teardown behavior: destruction in
beforeChange aborts the write; destruction in change/afterChange preserves an
applied write and skips later phases. Native/popup interaction stops after such
teardown, as does keyboard opening when an open listener destroys the control.
Current EventBus snapshots and arbitrary renderer/service callbacks are separate
concerns. See docs/INPUT_TYPES.md and the installed choice-input-consumer fixture.

## Multiline and marker variants

Stable TextArea declares lines.get/set/append, get/setSelection, selectAll,
insertText and calcAutoHeight alongside inherited string values and validation.
The lines API is distinct from the string value; selection and measured height
require a native textarea. enterKey and tabInsert use value, not newValue, and
are subscribed through events.on. Tab insertion emits tabInsert only for an
applied write on a live control; caret and Tab follow-up work stop after teardown.

Stable CheckLetter preserves boolean values and adds string marker changes;
RadioLetter preserves RadioGroup values and normalized raw items while fixing
letter marker style. Marker text is presentation rather than the selected value.
Experimental DropDownList and MultiSelectDropDown declarations reuse the popup
presentation/store/service contracts; the latter has array values and plural
oldItems/newItems payloads. See spec/35-multi-select-dropdown.md.

## Specialized value controls

Experimental FilePicker declares nullable single metadata or an array for multiple
mode. Actual browser File handles are separate through getFiles(). Accepted native
writes synchronize handles before change events; veto preserves prior handles.
API metadata/clear/reset writes discard handles; reset restores metadata only.
Dirty comparison uses ordered name/size/type/lastModified/relativePath fields.

Experimental TrackBar declares numeric values and range/movement methods. Snapping
is relative to min and preserves fractional bounds/scientific-notation steps within
number precision. step: 0 is continuous. clear targets the current minimum, including
after setRange. setRange/setStep report value changes; veto does not undo configuration.

Both retain the shared validation/value-event contract. See docs/INPUT_TYPES.md and
the installed specialized-input-consumer fixture; ColorPicker's RGB/popup contract
is documented in spec/38-color-picker.md.

## Indicator and list boundaries

ProgressBar keeps the numeric editor contract, including range normalization, clean
baseline/reset and validation. setText synchronizes visual and accessible custom text.
StepProgressBar uses BaseControl and index selection; it has no editor value API.
OptionList extends List with ID get/set/clear, without editor reset/dirty/validation.
Selection veto belongs to its SelectionModel. These experimental declarations live in
taet-ui/inputs; docs/INPUT_TYPES.md records their complete options and event shapes.

Built-in DataStore invalidation synchronizes List/OptionList silent data changes and
pending OptionList IDs; injected models remain borrowed. SelectionModel destruction
in beforeChange aborts the write, while destruction in change stops later phases
without undoing the applied selection. OptionList stops subsequent value/native-click
work after teardown. General renderer callback reentry remains a separate audit.
