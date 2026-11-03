import { Button, Form, Panel, TextArea, required } from "../../../src/ui/index.js";
import { ColorPicker } from "../../../src/ui/experimental.js";
import { apiRows, importsFor, liveExample } from "./pageHelpers.js";

export const textAreaPage = {
  id: "text-area", title: "TextArea", status: "stable",
  description: "A multiline text editor with wrapping, resize options and the same value and validation API as other fields.",
  keywords: ["multiline", "notes", "wrap", "resize"],
  imports: importsFor(["Button", "Form", "Panel", "TextArea", "required"]),
  paragraphs: ["Use TextArea for notes, descriptions and multiline source text. rows sets the initial height; resize controls the browser resize handle. wordWrap: false preserves long lines with horizontal scrolling.",
    "TextArea is a named Form field. Newlines remain in value.get(), and required() validates the entire string. readOnly permits selecting text while preventing editing; disabled removes interaction."],
  examples: [liveExample("Notes and unwrapped text", function createTextAreaExample({ container, log }) {
    const notes = new TextArea({ name: "notes", label: "Notes", rows: 3, resize: "vertical", placeholder: "Describe the change…", validators: [required("Add a note")] });
    const source = new TextArea({ name: "source", label: "Source", rows: 3, wordWrap: false, resize: "none", value: "customer_id,first_name,last_name,email,city,state,postal_code\n1001,Ada,Lovelace,ada@example.com,London,," });
    const form = new Form({ name: "textAreaForm", labelPosition: "top", width: "100%",
      onSubmit: event => log.write(JSON.stringify(event.value)),
      onValidationFail: event => log.write(event.errors.map(error => error.message).join(" | "))
    }).col(notes, source).row(
      new Button({ text: "Submit notes", onClick: () => form.submit({ origin: "user", userAction: true }) }),
      new Button({ text: "Toggle read-only", onClick: () => { notes.setReadOnly(!notes.isReadOnly()); log.write(`Read-only: ${notes.isReadOnly()}`); } })
    );
    return new Panel(container, { name: "textAreaExample", width: "100%" }).add(form);
  }, "Enter several lines and submit to inspect the JSON string with newlines. Notes can be resized vertically; Source keeps long lines unwrapped. Toggle read-only retains the value.")],
  options: apiRows([["rows / minRows", "number", "Initial visible rows and minimum row count."], ["resize", "'none' | 'vertical' | 'horizontal' | 'both'", "Allowed manual resize directions; default vertical."], ["wordWrap", "boolean", "Wrap long lines; default true."], ["placeholder / readOnly / validators", "string / boolean / Validator[]", "Empty hint, editing policy and shared field rules."]]),
  methods: apiRows([["value.get() / value.set(text, options)", "string / boolean", "Read or replace multiline text."], ["setReadOnly(value)", "EditorControl", "Change editing policy without losing text."], ["validate()", "ValidationResult", "Run configured rules."]]),
  events: apiRows([["change / afterChange", "ChangeEvent", "Text and mutation metadata."], ["validate / dirtyChange", "ControlEvent", "Validation result or change against the clean baseline."]]),
  notes: ["Destroy the example owner to release its Form and both editors."]
};

export const colorPickerPage = {
  id: "color-picker", title: "ColorPicker", status: "experimental",
  description: "Choose an RGB color with a swatch, saturation/value plane, hue slider, HEX and RGB inputs.",
  keywords: ["color", "colour", "RGB", "HEX", "palette"],
  imports: importsFor(["Button", "Form", "Panel"], ["ColorPicker"]),
  paragraphs: ["The value is an empty string or canonical lowercase #rrggbb. The picker uses its own popup and works as a Form field. HSV is transient picker state, not the serialized model. Alpha transparency is not supported.",
    "allowEmpty: true permits clearing the color. Set it to false when a color must always remain selected. Popup edits update the field as they are made; Enter accepts the current input and closes the popup; Escape closes it."],
  examples: [liveExample("Accent color", function createColorPickerExample({ container, log }) {
    const accent = new ColorPicker({ name: "accent", label: "Accent", value: "#2196f3", allowEmpty: true,
      onChange: event => log.write(`Accent: ${event.newValue || "empty"}`) });
    const form = new Form({ name: "colorForm", width: "100%", labelWidth: 72 }).row(accent).row(
      new Button({ text: "Use orange", onClick: () => accent.value.set("#ff8800", { origin: "user", userAction: true }) }),
      new Button({ text: "Clear color", onClick: () => accent.value.clear({ origin: "user", userAction: true }) }),
      new Button({ text: "Read color", onClick: () => log.write(JSON.stringify(form.value.get())) })
    );
    return new Panel(container, { name: "colorPickerExample", width: "100%" }).add(form);
  }, "Click the swatch to edit visually or enter HEX/RGB values, then press Enter to close. The buttons demonstrate normalized values and an empty selection.")],
  options: apiRows([["value", "string", "Initial RGB color; public values normalize to #rrggbb."], ["allowEmpty", "boolean", "Permit the empty value; default true."], ["popupPlacement", "string", "Popup alignment; default bottom-start."], ["readOnly / disabled", "boolean", "Prevent changes or disable interaction."]]),
  methods: apiRows([["value.get() / value.set(color, options)", "string / boolean", "Read or change the canonical color."], ["getRgb()", "{ r, g, b }", "Current RGB channels; an empty value reports black."], ["openPopup() / closePopup()", "boolean", "Control the picker popup."]]),
  events: apiRows([["beforeChange / change / afterChange", "ChangeEvent", "Cancellable value changes and committed values."], ["open / close", "ControlEvent", "Popup lifecycle."]]),
  notes: ["The ColorPicker owns its popup; destroying the Form closes it and releases listeners."]
};
