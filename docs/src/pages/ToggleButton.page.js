import { importsFor } from "./pageHelpers.js";
import { Button, Form } from "../../../src/ui/index.js";
import { CheckButton } from "../../../src/ui/experimental.js";
import { inputExample } from "./inputExamples.js";

export const toggleButtonPage = {
  id: "toggle-button", title: "Toggle Button", status: "experimental",
  keywords: ["CheckButton", "toggle", "pressed", "checked", "two-state", "review", "boolean"],
  description: "A two-state button that stays pressed until toggled again, backed by a boolean value.",
  imports: importsFor(["Button", "Form", "CheckButton"]),
  paragraphs: [
    "Use CheckButton for an on/off action that should keep its pressed appearance. This is the control used for Review in Lab 21. Click it again, or use Enter or Space, to release it.",
    "The value is true when pressed and false when released. Keep one caption with text, or provide checkedText/uncheckedText and state icons. The native button exposes aria-pressed and reserves room for both captions to keep its width steady."
  ],
  examples: [inputExample("Persistent state and Review", function createToggleButtonExample({ log }) {
    const pinned = new CheckButton({
      name: "pinned", label: "Pin", text: "Keep open", value: false,
      onChange: event => log.write("Pinned: " + event.newValue)
    });
    const reviewed = new CheckButton({
      name: "reviewed", label: "Review", text: "Review", value: false,
      checkedText: "Reviewed", uncheckedText: "Review",
      checkedIcon: "check", checkedIconColor: "#20a464",
      onChange: event => log.write("Reviewed: " + event.newValue)
    });
    const managed = new CheckButton({
      name: "managedReview", label: "Managed", text: "Reviewed", checkedIcon: "check", value: true, readOnly: true
    });
    const form = new Form({ name: "reviewActions", labelWidth: 96 }).row(pinned).row(reviewed).row(managed);
    form.row(new Button({ name: "readReview", text: "Read button values", onClick: () => log.write(JSON.stringify(form.value.get())) }));
    form.row(new Button({ name: "resetReview", text: "Release buttons", onClick() {
      pinned.value.set(false);
      reviewed.value.set(false);
      log.write("Editable buttons released");
    } }));
    return form;
  }, "Keep open uses the same caption in both positions. Review changes its caption and adds a checkmark when pressed. Managed shows a read-only pressed state; Release buttons resets the two editable values from code.")],
  options: [
    { name: "value / checked", type: "boolean", description: "Initial pressed state; value takes precedence, default false." },
    { name: "name / label", type: "string", description: "Form model key and field label beside the button." },
    { name: "text", type: "string", description: "Caption shared by both states." },
    { name: "checkedText / uncheckedText", type: "string", description: "Optional captions for pressed and released states." },
    { name: "icon / checkedIcon / uncheckedIcon", type: "string", description: "Registered Tæt UI icon names, shared or selected by state." },
    { name: "checkedIconColor / uncheckedIconColor", type: "string", description: "Optional icon colors for each state." },
    { name: "readOnly / disabled", type: "boolean", description: "Prevent user toggling." }
  ],
  methods: [
    { name: "value.get() / isChecked()", type: "boolean", description: "Read whether the button is pressed." },
    { name: "value.set(boolean, options) / setChecked(boolean, options)", type: "boolean", description: "Set the pressed state; returns whether it changed." },
    { name: "toggle(options)", type: "boolean", description: "Reverse the pressed state." },
    { name: "value.clear(options)", type: "boolean", description: "Release the button by setting false." }
  ],
  events: [
    { name: "beforeChange", type: "{ oldValue, newValue, cancel, origin, userAction }", description: "Cancellable boolean value change." },
    { name: "change / afterChange", type: "ChangeEvent", description: "Committed state change. Use onChange in the constructor for a local handler." }
  ],
  notes: [
    "CheckButton remains an experimental export. Its boolean value participates in Form.value.get() like other named editors.",
    "silent: true updates the pressed appearance without public value-change events. Destroy the owning form when the screen is removed."
  ]
};
