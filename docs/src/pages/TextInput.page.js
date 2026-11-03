import { importsFor } from "./pageHelpers.js";
import { Button, Form, TextInput, TextArea, required } from "../../../src/ui/index.js";
import { inputExample } from "./inputExamples.js";

const textInputSource = `const name = new TextInput({
  name: "customerName",
  label: "Customer",
  value: "Ada Lovelace",
  required: true,
  validators: [required("Customer is required")]
});

name.events.on("change", event => {
  log.write("value: " + (event.newValue || "(empty)"));
});`;

export const textInputPage = {
  id: "text-input",
  title: "TextInput",
  status: "stable",
  keywords: ["field", "editor", "value", "validation", "password", "mask"],
  description: "Single-line editor with the shared value API, validation, dirty state, labels, masks and password mode.",
  imports: importsFor(["Button", "Form", "TextInput", "TextArea", "required"]),
  paragraphs: [
    "TextInput implements the common editor contract used by Form and Grid editors. Programmatic changes carry an origin so validation, dirty state and undo logic can distinguish them from user input.",
    "Validation marks the field without changing form geometry. The error text is exposed as a hover or focus hint.",
    "Password and Masked pages describe TextInput modes. For multiline content use TextArea, shown below. Mount a field directly or compose named fields with Form; the owner handles their lifetime."
  ],
  examples: [
    {
      title: "Value and validation",
      source: textInputSource,
      create({ log }) {
        const field = new TextInput({
          name: "customerName",
          label: "Customer",
          value: "Ada Lovelace",
          required: true,
          validators: [required("Customer is required")]
        });
        field.events.on("change", event => log.write(`value: ${event.newValue || "(empty)"}`));
        return field;
      }
    },
    inputExample("Validate and reset", function createTextValidationExample({ log }) {
      const customer = new TextInput({ name: "customer", label: "Customer", value: "Ada", required: true, validators: [required("Customer is required")] });
      const form = new Form({ name: "customerEditor", labelWidth: 112 }).row(customer);
      form.row(
        new Button({ name: "validateCustomer", text: "Validate customer", onClick() {
          const result = customer.validate();
          log.write(result.ok ? "Valid" : "Customer is required");
        } }),
        new Button({ name: "resetCustomer", text: "Reset customer", onClick() {
          customer.reset();
          customer.clearValidation();
          log.write("Customer restored: " + customer.value.get());
        } })
      );
      return form;
    }, "Clear the field, validate it, then reset to the original value."),
    inputExample("Multiline text", function createTextAreaExample({ log }) {
      return new TextArea({ name: "notes", label: "Notes", rows: 3, value: "First line\nSecond line", wordWrap: true,
        onChange: event => log.write("Characters: " + event.newValue.length) });
    }, "TextArea shares the string value API. rows sets its initial height; wordWrap controls wrapping.")
  ],
  options: [
    { name:"name", type:"string", description:"Field name used by Form values." },
    { name:"label", type:"string", description:"Visible editor label." },
    { name:"value", type:"string", description:"Initial value and clean-state baseline." },
    { name:"placeholder", type:"string", description:"Hint displayed inside an empty editor." },
    { name:"required", type:"boolean", description:"Marks the field as required." },
    { name:"validators", type:"Validator[]", description:"Validation functions evaluated by validate()." },
    { name:"isPassword", type:"boolean", description:"Masks text and optionally displays a reveal button." },
    { name:"mask", type:"string", description:"Input mask using editable placeholder positions." },
    { name:"readOnly / disabled", type:"boolean", description:"Initial editing and interaction state." }
  ],
  methods: [
    { name:"value.get()", type:"string", description:"Returns the current normalized value." },
    { name:"value.set(value, options)", type:"boolean", description:"Changes value with origin, userAction and silent metadata." },
    { name:"value.clear(options)", type:"boolean", description:"Restores the empty string value." },
    { name:"validate(options)", type:"ValidationResult", description:"Runs configured validators and updates invalid state." },
    { name:"reset()", type:"boolean", description:"Restores the clean value baseline." },
    { name:"setReadOnly(value)", type:"EditorControl", description:"Changes runtime readonly state." }
  ],
  events: [
    { name:"beforeChange", type:"{ oldValue, newValue, cancel, origin, userAction }", description:"Cancellable event before the value is committed." },
    { name:"change", type:"{ oldValue, newValue, origin, userAction }", description:"Emitted after a successful value change." },
    { name:"afterChange", type:"ChangeEvent", description:"Desktop-style notification after change processing." },
    { name:"validate", type:"ValidationResult", description:"Reports the result of validate(), with ok and errors." },
    { name:"dirtyChange", type:"{ oldValue, newValue }", description:"Reports changes relative to the clean baseline." }
  ],
  notes: [
    "Use origin: import when loading a project model and origin: user for explicit user actions.",
    "Use silent only when the caller intentionally suppresses the public event contract."
  ]
};
