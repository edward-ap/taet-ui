# JSON Form definitions (experimental v1)

`createFormFromJSON` creates a normal Form containing live inputs and optional
FieldGroups. `compileFormDefinition` validates/copies a definition and returns
compiled options/groups/data without constructing controls. Both are experimental
exports in taet-ui/experimental, taet-ui/all and the full portable bundle.
The existing Form component remains stable.

```js
import {createFormFromJSON} from "./taet-ui.min.js";
// Link ./taet-ui.min.css once in the host document.
const form = createFormFromJSON({
  schemaVersion: 1,
  labelPosition: "top",
  groups: [{id: "contact", title: "Contact information", rows: [
    [
      {name: "first", label: "First name", editor: {type: "text", required: true, placeholder: "First"}},
      {name: "last", label: "Last name", editor: {type: "text", placeholder: "Last"}}
    ],
    [
      {name: "city", label: "City", editor: {type: "text"}},
      {name: "state", label: "State", editor: {type: "text"}},
      {name: "zip", label: "ZIP", editor: {type: "text"}}
    ]
  ]}],
  data: {first: "Ada", last: "Lovelace", city: "Toronto", state: "ON", zip: "M5V"}
}, {container: "#contact", width: "100%"});
form.events.on("submit", event => {
  // The host decides whether/how to persist event.value.
});
form.events.on("change", event => console.log(event.value));
const values = form.value.get();
form.value.set({city: "Ottawa"});
form.value.reset();
// On screen teardown: form.destroy();
```

## Schema and layout

- Root: schemaVersion=1, groups, optional data, labelPosition, labelWidth, width,
  height. No default fixed height: the Form naturally fits its content.
- Groups: unique id, optional title, rows, labelPosition/labelWidth overrides.
  A non-empty title creates FieldGroup; omit title for an unframed Form container.
- Rows: arrays of fields; one field is a full row, several share the row using
  existing Form.row layout/wrapping. Groups are stacked vertically.
- Fields: globally unique name, optional label (defaults to name), required editor
  descriptor, readOnly, disabled, labelPosition/labelWidth overrides.
- Label position is left/top, inherited root -> group -> field. Label width and
  dimensions are positive finite numbers up to 10000. Root width also accepts 100%.
- data is a flat object keyed by field name, including fields inside groups.
  Unknown keys, object/array field values, reserved names and duplicates are rejected.
  Values can be string/number/boolean/null; missing values use control defaults.
- Maximum 256 groups, 2000 total fields, 2000 rows per group, 24 fields per row.
  Shared JSON size/depth limits apply. No recursive layout trees, arbitrary CSS,
  condition expressions, executable callbacks or server-defined submit commands.

V1 editors reuse [Grid JSON descriptors](GRID_JSON.md): text, number, select,
checkbox, switch, radio, date, time, dateTime. required installs the control state
and standard required validator. min/max/step are number-only and use NumberInput
normalization. Select items have unique string/number values; radio also accepts
boolean. Their typed values are preserved. Other Tæt UI controls are not yet
part of this JSON schema; applications can still compose them through normal Form API.

## Existing Form behavior

- The result supports value.get/set/clear/reset, validate, submit, change and
  validationFail. getFields() includes fields in all groups. There is no extra
  JSON-specific value model or get-values adapter.
- Control normalization applies when loading initial values. The normalized initial
  snapshot becomes the clean/reset baseline, including defaults for omitted fields.
  Initial loading does not submit or run editor validation automatically.
- To deliver values separately, omit data then call form.value.set(values).
  Call form.setCleanValue() afterwards if the newly loaded values should become
  the reset baseline. Replacing the definition creates a new Form explicitly.
- readOnly/disabled follow the existing input contract; they are not backend
  authorization and do not remove fields from value.get() or validation.
- Required means non-empty according to the shared validator. A checkbox value
  false is present, not missing; an "accept terms" rule belongs in host validation.
- Buttons, event handlers, permissions, loading and persistence belong to the host.
  submit validates and emits events; it does not send a network request.
- A factory result may be created before mount. Mount it or add it to its owner,
  and eventually destroy it. Groups own fields; creation failures release controls.
- Host options are container, width, height. Host dimensions override the definition.
  Compiled editor options contain trusted validator functions, so compiled output
  is not intended for JSON serialization. Preserve the original definition instead.

Live example: Applications -> Form JSON Configuration (#form-json). Its Rebuild,
Read values, Submit and Reset buttons are host code outside the definition.
