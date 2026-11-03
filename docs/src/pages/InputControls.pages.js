import { importsFor } from "./pageHelpers.js";
import { Button, Form, TextInput, NumberInput, RadioGroup, RadioLetter, CheckBox, CheckLetter, required } from "../../../src/ui/index.js";
import { DateInput, DateTimeInput, TimeInput } from "../../../src/ui/experimental.js";
import { inputExample, inputOptions, inputMethods, inputEvents, inputNotes } from "./inputExamples.js";

export const numberInputPage = {
  id: "number-input", title: "NumberInput", status: "stable",
  keywords: ["integer", "decimal", "quantity", "spin", "form"],
  description: "Numeric values with range limits, integer or decimal precision, and spin increments.",
  imports: importsFor(["Button", "Form", "NumberInput"]),
  paragraphs: [
    "NumberInput returns a number, or null for an empty field. It uses the same value and validation contracts as TextInput.",
    "Use min/max for clamping, isInteger to discard the fractional part, and precision to round decimals. step controls spin increments; it does not round every entered number to a multiple of the step. Mouse-wheel spinning is opt-in."
  ],
  examples: [inputExample("Integer and decimal values", function createNumberExample({ log }) {
    const quantity = new NumberInput({ name: "quantity", label: "Quantity", value: 3, min: 0, max: 20, isInteger: true, step: 1 });
    const price = new NumberInput({ name: "price", label: "Unit price", value: 12.5, min: 0, precision: 2, step: 0.25 });
    const form = new Form({ name: "orderNumbers", labelWidth: 112 }).row(quantity).row(price);
    form.row(new Button({ name: "readNumbers", text: "Read numbers", onClick: () => log.write(JSON.stringify(form.value.get())) }));
    return form;
  }, "Try ArrowUp/ArrowDown and a value above 20. Read numbers shows numeric model values, not strings.")],
  options: [...inputOptions,
    { name: "value", type: "number | null", description: "Initial number; null represents an empty field." },
    { name: "min / max", type: "number", description: "Lower and upper clamping limits." },
    { name: "step", type: "number", description: "Increment used by spinUp/spinDown; default 1." },
    { name: "isInteger / precision", type: "boolean / number", description: "Integer truncation or decimal rounding." },
    { name: "clamp", type: "boolean", description: "Default true; false permits values outside the range." },
    { name: "allowSpinOnMouseWheel", type: "boolean", description: "Default false; enables wheel increments." }
  ],
  methods: [...inputMethods("number | null"),
    { name: "spinUp() / spinDown()", type: "boolean", description: "Increment/decrement unless disabled or read-only." }
  ], events: inputEvents, notes: inputNotes
};

export const passwordInputPage = {
  id: "password-input", title: "Password", status: "stable",
  keywords: ["TextInput", "password", "reveal", "hidden", "form"],
  description: "TextInput in password mode, with an optional reveal button.",
  imports: importsFor(["Form", "TextInput"]),
  paragraphs: [
    "Password is a TextInput configuration, not a separate exported class. isPassword hides the characters; showRevealButton defaults to true in this mode.",
    "The value API still returns the actual string. The example reports only visibility changes and does not print the entered password."
  ],
  examples: [inputExample("With and without reveal", function createPasswordExample({ log }) {
    const password = new TextInput({ name: "password", label: "Password", isPassword: true, value: "Demo-only" });
    password.events.on("passwordVisibilityChange", event => log.write(event.newValue ? "Password visible" : "Password hidden"));
    const confirmation = new TextInput({ name: "confirmation", label: "Confirm", isPassword: true, showRevealButton: false, placeholder: "Repeat password" });
    return new Form({ name: "passwordFields", labelWidth: 112 }).row(password).row(confirmation);
  })],
  options: [...inputOptions,
    { name: "isPassword", type: "boolean", description: "Use a password input; defaults to false." },
    { name: "showRevealButton", type: "boolean", description: "Default true in password mode; false hides the toggle." },
    { name: "value / placeholder", type: "string", description: "Initial text and empty-field hint." }
  ],
  methods: [...inputMethods("string"),
    { name: "setPasswordVisible(visible)", type: "boolean", description: "Show or hide characters without changing value." },
    { name: "togglePasswordVisible()", type: "boolean", description: "Toggle visibility; returns whether it changed." }
  ],
  events: [...inputEvents, { name: "passwordVisibilityChange", type: "{ oldValue, newValue, source }", description: "Visibility changed; value is a boolean." }],
  notes: inputNotes
};

export const maskedInputPage = {
  id: "masked-input", title: "Masked", status: "stable",
  keywords: ["TextInput", "mask", "phone", "format", "raw", "form"],
  description: "TextInput with a positional mask and a choice of formatted or raw model values.",
  imports: importsFor(["Button", "Form", "TextInput"]),
  paragraphs: [
    "Masked is a TextInput configuration. Mask tokens 0 and 9 accept digits, A and a accept ASCII letters, and * accepts letters or digits. Other characters are literals. The tokens do not distinguish required from optional positions.",
    "An empty masked field automatically shows its mask as a muted placeholder, including while focused. The hint disappears as you type and returns when you clear the field. Set placeholder to override it, or use an empty string to hide it. The hint is never part of the model value.",
    "By default value.get() includes formatting. unmaskValue: true stores only alphanumeric characters while preserving the formatted display. A mask filters characters; add validators when every position must be filled."
  ],
  examples: [inputExample("Formatted phone and raw reference", function createMaskExample({ log }) {
    const phone = new TextInput({ name: "phone", label: "Phone", mask: "+0 (000) 000-0000", value: "15551234567" });
    const reference = new TextInput({ name: "reference", label: "Reference", mask: "AA-0000", unmaskValue: true, value: "AB1234" });
    const form = new Form({ name: "maskedFields", labelWidth: 112 }).row(phone).row(reference);
    form.row(new Button({ name: "readMasked", text: "Read masked values", onClick() {
      log.write(JSON.stringify({ phone: phone.value.get(), reference: reference.value.get(), display: reference.getDisplayValue() }));
    } }));
    form.row(new Button({ name: "clearMasked", text: "Clear masked fields", onClick() {
      phone.value.clear();
      reference.value.clear();
      log.write("Fields cleared; the gray masks show the expected format.");
    } }));
    return form;
  }, "Clear the fields to see their automatic mask hints, then enter a phone number or reference. 0 marks a digit and A marks a letter; punctuation is inserted automatically.")],
  options: [...inputOptions,
    { name: "mask", type: "string", description: "Token pattern, for example AA-0000." },
    { name: "placeholder", type: "string", description: "Empty-field hint; defaults to the mask. An explicit empty string disables the hint." },
    { name: "unmaskValue", type: "boolean", description: "Default false; true stores alphanumeric text only." }
  ],
  methods: [...inputMethods("string"),
    { name: "getDisplayValue()", type: "string", description: "Formatted text shown by the editor." },
    { name: "getRawValue()", type: "string", description: "Alphanumeric content with punctuation removed." }
  ], events: inputEvents, notes: inputNotes
};

export const dateInputPage = {
  id: "date-input", title: "DateInput", status: "experimental",
  keywords: ["calendar", "date", "DateTimeInput", "datetime", "form"],
  description: "A date editor with a calendar, plus a combined date-and-time variant.",
  imports: importsFor(["Form", "required", "DateInput", "DateTimeInput"]),
  paragraphs: [
    "DateInput and DateTimeInput are experimental exports. DateInput stores YYYY-MM-DD; DateTimeInput stores YYYY-MM-DDTHH:mm. Empty values are empty strings.",
    "These are local calendar values without timezone information. Pass canonical strings when loading a model. A Date object is converted using its local calendar fields.",
    "Open the calendar to select a date. The combined picker stages changes until OK and supports Cancel. Normalization is not complete date validation; use validators for valid dates and business ranges."
  ],
  examples: [inputExample("Date and combined date/time", function createDateExample({ log }) {
    const startDate = new DateInput({ name: "startDate", label: "Start date", value: "2026-09-15", required: true, validators: [required("Choose a start date")],
      onChange: event => log.write("Start date: " + event.newValue) });
    const deadline = new DateTimeInput({ name: "deadline", label: "Deadline", value: "2026-09-16T14:30",
      onChange: event => log.write("Deadline: " + event.newValue) });
    return new Form({ name: "scheduleDates", labelWidth: 112 }).row(startDate).row(deadline);
  })],
  options: [...inputOptions,
    { name: "value", type: "string | Date", description: "Canonical local date or date-time value." },
    { name: "placeholder", type: "string", description: "Hint shown when the field is empty." },
    { name: "hour12", type: "boolean", description: "DateTimeInput: display a 12-hour time picker." }
  ], methods: inputMethods("string"), events: inputEvents,
  notes: [...inputNotes, "The calendar does not enforce min/max business ranges. Validate them explicitly before saving."]
};

export const timeInputPage = {
  id: "time-input", title: "TimeInput", status: "experimental",
  keywords: ["clock", "time", "12-hour", "24-hour", "AM", "PM", "form"],
  description: "Time-of-day input with 24-hour or AM/PM presentation and a staged time picker.",
  imports: importsFor(["Form", "TimeInput"]),
  paragraphs: [
    "TimeInput is experimental. Its model value is a 24-hour HH:mm string regardless of the displayed hour mode; an empty value is an empty string. It represents a time of day without a date or timezone.",
    "Use hour12: true for AM/PM display. stepMinutes sets the increment used by the step buttons. In the picker, OK commits the staged selection and Cancel discards it."
  ],
  examples: [inputExample("24-hour and AM/PM", function createTimeExample({ log }) {
    const officeTime = new TimeInput({ name: "officeTime", label: "24-hour time", value: "14:30", stepMinutes: 15,
      onChange: event => log.write("24-hour model: " + event.newValue) });
    const reminder = new TimeInput({ name: "reminder", label: "AM/PM time", value: "14:30", hour12: true, stepMinutes: 30,
      onChange: event => log.write("AM/PM model: " + event.newValue) });
    return new Form({ name: "scheduleTimes", labelWidth: 112 }).row(officeTime).row(reminder);
  })],
  options: [...inputOptions,
    { name: "value", type: "string | Date", description: "Time normalized to HH:mm." },
    { name: "hour12", type: "boolean", description: "AM/PM display; default false." },
    { name: "hourMode", type: '"0-23" | "1-24" | "12"', description: "Display mode; use without conflicting hour12 options." },
    { name: "stepMinutes", type: "number", description: "Step-button increment; default 15 minutes." }
  ], methods: inputMethods("string"), events: inputEvents, notes: inputNotes
};

export const radioInputPage = {
  id: "radio-group", title: "RadioGroup", status: "stable",
  keywords: ["radio", "choice", "single", "column", "flow", "form", "RadioLetter", "letter", "number", "marker"],
  description: "One selected value from a visible set of mutually exclusive choices.",
  imports: importsFor(["Form", "RadioGroup", "RadioLetter"]),
  paragraphs: [
    "RadioGroup owns a single value and an items array. Each item supplies value and text, with optional description and disabled state. Use setItems() to replace choices; unlike SelectInput, RadioGroup does not expose a DataStore.",
    "Use column for a vertical list and flow for a compact horizontal arrangement. Arrow keys move through enabled choices; Home and End select the first and last enabled choices.",
    "RadioLetter is the general-purpose circular-marker variant used by Training Questionary. It accepts letters or digits through each item's letter property. The marker is presentation; the selected model value remains the item's stable value.",
    "These controls also fit surveys, numbered choices and ordinary forms. Questionary owns question rendering, answer checking and scoring; none of that is required to use RadioLetter or CheckLetter."
  ],
  examples: [inputExample("Column and flow layouts", function createRadioExample({ log }) {
    const delivery = new RadioGroup({ name: "delivery", label: "Delivery", value: "standard", items: [
      { value: "standard", text: "Standard", description: "Regular delivery" },
      { value: "express", text: "Express", description: "Priority delivery" },
      { value: "pickup", text: "Pickup", disabled: true }
    ], onChange: event => log.write("Delivery: " + event.newValue) });
    const size = new RadioGroup({ name: "size", label: "Size", layout: "flow", value: "medium", items: [
      { value: "small", text: "Small" }, { value: "medium", text: "Medium" }, { value: "large", text: "Large" }
    ], onChange: event => log.write("Size: " + event.newValue) });
    return new Form({ name: "choiceFields", labelWidth: 112 }).row(delivery).row(size);
  }), inputExample("Circular letter and number markers", function createRadioLetterExample({ log }) {
    const section = new RadioLetter({ name: "section", label: "Choose one", value: "examples", items: [
      { value: "guide", text: "Guide", letter: "A" },
      { value: "examples", text: "Examples", letter: "B" },
      { value: "source", text: "Source code", letter: "C" },
      { value: "tests", text: "Tests", letter: "D" }
    ], onChange: event => log.write("Section: " + event.newValue) });
    const priority = new RadioLetter({ name: "priority", label: "Priority", layout: "flow", value: "high", items: [
      { value: "low", text: "Low", letter: "1" },
      { value: "normal", text: "Normal", letter: "2" },
      { value: "high", text: "High", letter: "3" },
      { value: "urgent", text: "Urgent", letter: "4" }
    ], onChange: event => log.write("Priority: " + event.newValue) });
    return new Form({ name: "markedChoices", labelWidth: 112 }).row(section).row(priority);
  }, "Each group allows at most one selected item. Markers are included in accessible names, for example A. Guide; arrow keys use the same RadioGroup behavior.")],
  options: [...inputOptions,
    { name: "items", type: "object[]", description: "Choices with value, text, description and disabled." },
    { name: "value / emptyValue", type: "unknown", description: "Selected item value; empty defaults to null." },
    { name: "layout / columns", type: '"column" | "flow" / number', description: "Choice arrangement and optional column count." },
    { name: "valueField / textField", type: "string", description: "Custom item properties for value and caption." },
    { name: "markerStyle", type: '"default" | "letter"', description: "Standard radio marker or letter marker." },
    { name: "markerField", type: "string", description: "Item marker key: marker in RadioGroup, letter in RadioLetter." }
  ], methods: [...inputMethods("unknown | null"),
    { name: "setItems(items, options)", type: "RadioGroup", description: "Replace choices; clear a selection that disappears." },
    { name: "getSelectedItem()", type: "object | null", description: "Copy of the selected normalized item." },
    { name: "setLayout(layout)", type: "RadioGroup", description: "Switch between column and flow." }
  ], events: [...inputEvents, { name: "itemsChange", type: "ItemsChangeEvent", description: "Choices changed through setItems()." }], notes: inputNotes
};

export const checkBoxPage = {
  id: "check-box", title: "CheckBox", status: "stable",
  keywords: ["checkbox", "boolean", "checked", "toggle", "form", "CheckLetter", "multiple choice", "letter", "rounded"],
  description: "An independent boolean field with a form label and an optional caption beside the checkbox.",
  imports: importsFor(["Button", "Form", "CheckBox", "CheckLetter"]),
  paragraphs: [
    "CheckBox stores true or false. value: true checks it; value.clear() sets false. label occupies the form's label column, while text sits beside the checkbox.",
    "Use separate CheckBox controls for independent choices and RadioGroup for mutually exclusive choices. This control has two states; it does not expose a mixed or indeterminate value.",
    "CheckLetter is the general-purpose marked variant used by Training Questionary for multiple choice. Its letter option accepts a letter or digit, drawn in a square with 4px corners. Each control still owns an independent boolean value.",
    "Keep stable field names separate from visible markers. Collect the checked field names when an application needs an array of selections. Question-specific grading belongs to Questionary, not to CheckLetter."
  ],
  examples: [inputExample("Boolean values and disabled state", function createCheckBoxExample({ log }) {
    const notifications = new CheckBox({ name: "notifications", label: "Notifications", text: "Email updates", value: true });
    const analytics = new CheckBox({ name: "analytics", label: "Analytics", text: "Share usage statistics", value: false });
    const managed = new CheckBox({ name: "managed", label: "Policy", text: "Managed by administrator", value: true, disabled: true });
    const form = new Form({ name: "preferences", labelWidth: 112 }).row(notifications).row(analytics).row(managed);
    form.row(new Button({ name: "readPreferences", text: "Read preferences", onClick: () => log.write(JSON.stringify(form.value.get())) }));
    return form;
  }), inputExample("Multiple choice with rounded markers", function createCheckLetterExample({ log }) {
    const choices = [
      new CheckLetter({ name: "guide", letter: "A", text: "Guide", value: true }),
      new CheckLetter({ name: "examples", letter: "B", text: "Examples" }),
      new CheckLetter({ name: "source", letter: "C", text: "Source code" }),
      new CheckLetter({ name: "tests", letter: "D", text: "Tests" })
    ];
    const form = new Form({ name: "includedSections", labelWidth: 0 }).col(...choices);
    form.row(new Button({ name: "readSections", text: "Read selected sections", onClick() {
      log.write(JSON.stringify(choices.filter(choice => choice.value.get()).map(choice => choice.name)));
    } }));
    return form;
  }, "Choose any combination of the four items. Click a marker or its caption; Space toggles a focused checkbox. Use letter: '3' for a numeric marker.")],
  options: [...inputOptions,
    { name: "value / checked", type: "boolean", description: "Initial checked state; value takes precedence." },
    { name: "text", type: "string", description: "Caption adjacent to the checkbox." },
    { name: "letter / marker", type: "string", description: "CheckLetter only: visible marker, for example A or 3." }
  ], methods: [...inputMethods("boolean"),
    { name: "setText(text)", type: "CheckBox", description: "Change the caption without changing the value." },
    { name: "getText()", type: "string", description: "Read the adjacent caption." },
    { name: "setLetter(marker)", type: "CheckLetter", description: "Change the marker and accessible name; preserve the value." },
    { name: "getLetter()", type: "string", description: "CheckLetter only: read the marker." }
  ], events: inputEvents, notes: inputNotes
};
