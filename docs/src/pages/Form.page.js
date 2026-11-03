import { importsFor } from "./pageHelpers.js";
import { Button, Form, NumberInput, Panel, TextInput, email, required } from "../../../src/ui/index.js";
import { FieldGroup } from "../../../src/ui/experimental.js";

function formExample(title, create, description, styles) {
  return { title, create, description, styles,
    source: `${create.toString()}\n\nconst example = ${create.name}({ container: "#root", log });\n// Replace log.write with your application action.\n// On screen teardown: example.destroy();` };
}

export const formPage = {
  id: "form", title: "Form", status: "stable",
  keywords: ["application", "columns", "rows", "labels", "validation", "FieldGroup", "frame", "contact", "placeholder"],
  description: "Compose fields into rows and columns, align labels, validate values and collect one form snapshot.",
  imports: importsFor(["Button", "Form", "NumberInput", "Panel", "TextInput", "email", "required", "FieldGroup"]),
  paragraphs: [
    "Form is a value-aware container. Build it from live controls before mounting, then add it to a mounted Panel. Field names become keys in form.value.get(); use unique names across the whole form, including titled groups.",
    "Use row(field) repeatedly for a single column, row(first, last) for neighboring fields, or col(fieldA, fieldB) for a vertical stack. columns(Form.column(...), Form.column(...)) creates equal-width columns, each with its own vertical stack. Pair fields with row(left, right) when row-by-row alignment matters.",
    "labelPosition: 'left' is the default; labelWidth aligns captions. labelPosition: 'top' moves captions above inputs. Individual editors can override labelPosition and labelWidth. fieldIndent indents all fields; padding controls the form's outside spacing.",
    "Keep helpful labels, even in compact rows. A placeholder supplies a gray hint only while a field is empty; it is never a value. First and Last are free-text hints, while a mask such as 99999 constrains a fixed-format ZIP code. The compact example retains an accessible Last name label while visually hiding its separate caption.",
    "FieldGroup is the existing experimental framed container, implemented as a fieldset with a legend. Use it for a meaningful section such as Contact Information. Its fields participate in the parent Form's value snapshot and validation; the group does not create a nested object key."
  ],
  examples: [
    formExample("One column · labels on the left", function createSingleColumnForm({ container, log }) {
      const form = new Form({ name: "singleColumnForm", labelWidth: 88, width: "100%" })
        .row(new TextInput({ name: "fullName", label: "Full name", value: "Ada Lovelace" }))
        .row(new TextInput({ name: "email", label: "Email", value: "ada@example.com" }))
        .row(new TextInput({ name: "company", label: "Company", placeholder: "Organization" }));
      form.row(new Button({ text: "Read values", onClick: () => log.write(JSON.stringify(form.value.get())) }));
      return new Panel(container, { name: "singleColumnExample", width: "100%" }).add(form);
    }, "Each row(field) adds the next full-width field. labelWidth: 88 gives the input column a consistent left edge. Read values reports the named fields."),

    formExample("Two columns · labels on top", function createTwoColumnForm({ container, log }) {
      const form = new Form({ name: "twoColumnForm", labelPosition: "top", width: "100%", css: "dui-docs-two-column-form" })
        .columns(
          Form.column(
            new TextInput({ name: "firstName", label: "First name", placeholder: "First" }),
            new TextInput({ name: "email", label: "Email", placeholder: "name@example.com" })
          ),
          Form.column(
            new TextInput({ name: "lastName", label: "Last name", placeholder: "Last" }),
            new TextInput({ name: "phone", label: "Phone", mask: "(999) 999-9999" })
          )
        );
      form.row(new Button({ text: "Read values", onClick: () => log.write(JSON.stringify(form.value.get())) }));
      return new Panel(container, { name: "twoColumnExample", width: "100%" }).add(form);
    }, "Two virtual columns belong to the same Form and share one flat value object. Top labels leave more input width. The copyable CSS below stacks columns on narrow screens; Form.columns() itself keeps the requested column count.",
    "@media (max-width: 700px) {\n  .dui-docs-two-column-form > .dui-form__columns { grid-template-columns: minmax(0, 1fr); }\n}"),

    formExample("Compact rows · Name and address", function createCompactForm({ container, log }) {
      const form = new Form({ name: "compactContactForm", labelWidth: 48, width: "100%", css: "dui-docs-compact-form" })
        .row(
          new TextInput({ name: "firstName", label: "Name", placeholder: "First", autocomplete: "given-name" }),
          new TextInput({ name: "lastName", label: "Last name", placeholder: "Last", autocomplete: "family-name", css: "dui-docs-inline-name" })
        )
        .row(
          new TextInput({ name: "city", label: "City", placeholder: "City", autocomplete: "address-level2", css: "dui-docs-city" }),
          new TextInput({ name: "state", label: "State", placeholder: "NY", maxLength: 2, autocomplete: "address-level1" }),
          new TextInput({ name: "zip", label: "ZIP", mask: "99999", autocomplete: "postal-code" })
        );
      form.row(new Button({ text: "Read values", onClick: () => log.write(JSON.stringify(form.value.get())) }),
        new Button({ text: "Clear fields", onClick: () => { form.value.clear({ origin: "user", userAction: true }); log.write("Fields cleared; hints are visible again."); } }));
      return new Panel(container, { name: "compactFormExample", width: "100%" }).add(form);
    }, "The first row reads Name [First] [Last]; the second keeps City, State and ZIP together. row(...) uses flexible widths and wraps when space is insufficient. Scoped CSS gives City extra width and visually hides the Last name caption without removing its accessible label. ZIP uses a five-digit US mask; adapt it for your supported countries.",
    ".dui-docs-compact-form .dui-form__cols > .dui-form__item--fill { flex: 1 1 140px; }\n.dui-docs-compact-form .dui-form__cols > .dui-docs-city { flex-grow: 2; }\n.dui-docs-compact-form .dui-docs-inline-name { grid-template-columns: minmax(0, 1fr); }\n.dui-docs-compact-form .dui-docs-inline-name > .dui-text-field__label {\n  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;\n  overflow: hidden; clip-path: inset(50%); white-space: nowrap;\n}"),

    formExample("Validation · required, email and custom rules", function createValidatedForm({ container, log }) {
      const form = new Form({ name: "validatedForm", labelWidth: 100, width: "100%", css: "dui-docs-validation-form",
        onValidationFail: event => log.write(event.errors.map(error => `${error.path}: ${error.message}`).join(" | ")),
        onSubmit: event => log.write(`Submitted: ${JSON.stringify(event.value)}`)
      }).row(new TextInput({ name: "customer", label: "Customer", validators: [required("Customer is required")] }))
        .row(new TextInput({ name: "email", label: "Email", validators: [required("Email is required"), email("Enter a valid email address")] }))
        .row(new NumberInput({ name: "seats", label: "Seats", value: 0, validators: [
          value => Number.isInteger(value) && value >= 1 && value <= 50 ? true : "Choose a whole number from 1 to 50"
        ] }));
      form.row(new Button({ text: "Validate", onClick: () => {
        const result = form.validate({ origin: "user", userAction: true });
        if (result.ok) log.write("All values are valid. Nothing submitted.");
      } }), new Button({ text: "Submit", onClick: () => form.submit({ origin: "user", userAction: true }) }),
      new Button({ text: "Load valid sample", onClick: () => {
        form.value.set({ customer: "Ada Lovelace", email: "ada@example.com", seats: 3 }, { origin: "import" });
        form.clearValidation();
        log.write("Sample loaded. Validate or submit to run the rules.");
      } }));
      return new Panel(container, { name: "validationExample", width: "100%" }).add(form);
    }, "Try Submit with empty fields and Seats = 0: submission is rejected and the first invalid field receives focus. Validate only checks values. Submit validates again and fires onSubmit only on success. The event output lists errors; field errors are available on focus/hover. Custom synchronous validators return true, an error string, or an { ok, message, severity, code } result. Submission here only logs; application code handles persistence. The CSS below aligns the final button row to the right using justify-content: flex-end.",
    ".dui-docs-validation-form > .dui-form__cols:last-child { justify-content: flex-end; }"),

    formExample("FieldGroup · Contact Information", function createGroupedForm({ container, log }) {
      const contact = new FieldGroup({ name: "contactInformation", title: "Contact Information", labelWidth: 88 })
        .row(new TextInput({ name: "contactName", label: "Customer", placeholder: "Customer name", validators: [required("Customer is required")] }))
        .row(new TextInput({ name: "contactEmail", label: "Email", placeholder: "name@example.com", validators: [required("Email is required"), email()] }))
        .row(new TextInput({ name: "contactPhone", label: "Phone", mask: "(999) 999-9999" }));
      const form = new Form({ name: "groupedContactForm", width: "100%",
        onValidationFail: event => log.write(event.errors.map(error => `${error.path}: ${error.message}`).join(" | ")),
        onSubmit: event => log.write(`Contact saved: ${JSON.stringify(event.value)}`)
      }).col(contact);
      form.row(new Button({ text: "Save contact", onClick: () => form.submit({ origin: "user", userAction: true }) }),
        new Button({ text: "Read values", onClick: () => log.write(JSON.stringify(form.value.get())) }));
      return new Panel(container, { name: "groupedFormExample", width: "100%" }).add(form);
    }, "FieldGroup draws the frame and the Contact Information legend. It supports Form rows and columns. Save contact validates the group's fields through the outer Form; Read values demonstrates the flat snapshot. The outer owner destroys the group and all its fields.")
  ],
  options: [
    { name: "labelPosition", type: "'left' | 'top'", description: "Default caption placement for Form editors. Default: left. Individual editor options can override it." },
    { name: "labelWidth", type: "number | string", description: "Shared width of left captions, e.g. 88 or '6rem'." },
    { name: "fieldIndent / padding", type: "number | string", description: "Shared field inset and outer spacing." },
    { name: "initialValue", type: "object", description: "Initial field values keyed by name, also used by value.reset()." },
    { name: "validators (on each field)", type: "Validator[]", description: "Synchronous rules such as required(), email() and custom functions." },
    { name: "FieldGroup.title", type: "string", description: "Caption on the framed section. FieldGroup is experimental." }
  ],
  methods: [
    { name: "row(...controls) / col(...controls)", type: "Form", description: "Append neighboring controls or a vertical stack. Accepts live instances before or after mount." },
    { name: "columns(...columns)", type: "Form", description: "Append virtual columns built with Form.column(...controls)." },
    { name: "value.get() / value.set(model, options)", type: "object / boolean", description: "Read or update field values by unique name; nested groups remain flat." },
    { name: "value.clear(options) / value.reset(options)", type: "boolean", description: "Clear fields to their empty values or restore the initial model." },
    { name: "validate(context)", type: "{ ok, errors, value }", description: "Run field rules and expose each error's path, message and control without submitting." },
    { name: "submit(options)", type: "boolean", description: "Run cancellable beforeSubmit, validate and emit submit/afterSubmit on success. Focus the first invalid field unless focusInvalid is false." },
    { name: "clearValidation() / focusFirstInvalid()", type: "void / boolean", description: "Clear displayed errors or focus the first invalid field." },
    { name: "FieldGroup.setTitle(title)", type: "FieldGroup", description: "Update the legend without recreating fields." }
  ],
  events: [
    { name: "change", type: "FormChangeEvent", description: "Aggregated field changes and current value, with mutation origin." },
    { name: "validate / validationFail", type: "ValidationResult / ValidationEvent", description: "Validation outcome; validationFail reports blocking errors." },
    { name: "beforeSubmit", type: "FormSubmitEvent", description: "Set event.cancel = true to stop submission before validation." },
    { name: "submit / afterSubmit", type: "FormSubmitEvent", description: "Validated value and mutation metadata. Does not perform a network request." }
  ],
  notes: ["Form is stable; FieldGroup is an experimental export. The examples use existing controls and do not define a separate Frame class.",
    "Masks format and restrict entry; validators decide whether a completed value is acceptable. A mask or placeholder alone does not make a field required.",
    "Keep field names unique throughout the owner Form. Destroy the example owner to release all fields, groups and event subscriptions."]
};
