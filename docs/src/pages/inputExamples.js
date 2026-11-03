// Display the same factory that the workbench runs, keeping copyable code in sync.
export function inputExample(title, create, description) {
  return {
    title,
    description,
    create,
    source: `${create.toString()}\n\n// log.write is the example output; replace it with your application action.\nconst example = ${create.name}({ log });\nexample.mount("#root");\n// On screen teardown: example.destroy();`
  };
}

export const inputOptions = [
  { name: "name / label", type: "string", description: "Form model key and visible field label." },
  { name: "readOnly / disabled", type: "boolean", description: "Prevent editing or disable interaction." },
  { name: "validators", type: "Validator[]", description: "Functions evaluated by validate() or Form validation." }
];

export function inputMethods(valueType) {
  return [
    { name: "value.get()", type: valueType, description: "Read the model value without accessing the DOM." },
    { name: "value.set(value, options)", type: "boolean", description: "Set with origin, userAction and silent metadata." },
    { name: "value.clear(options)", type: "boolean", description: "Restore this editor's empty value." },
    { name: "validate(context)", type: "{ ok, errors, value, source }", description: "Run validators and display validation state." },
    { name: "reset(options)", type: "boolean", description: "Restore the clean value baseline." },
    { name: "setReadOnly(value)", type: "EditorControl", description: "Change the editing state." }
  ];
}

export const inputEvents = [
  { name: "beforeChange", type: "ChangeEvent", description: "Cancellable value change with oldValue and newValue." },
  { name: "change / afterChange", type: "ChangeEvent", description: "Committed value with source, origin and userAction." },
  { name: "validate", type: "ValidationResult", description: "Result of running validate(), including errors." },
  { name: "dirtyChange", type: "DirtyChangeEvent", description: "Change relative to the clean value baseline." }
];

export const inputNotes = [
  "Compose named fields with Form.row() or Form.col(); Form.value.get() collects their values by name. The examples return an owner that destroys its children.",
  "Use value.set(value, { origin: 'import' }) to load data. silent: true updates the control while suppressing public value-change events.",
  "required: true marks the field; include required() in validators to enforce a required value during validation."
];
