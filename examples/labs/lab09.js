import { required } from "../../src/core/validators.js";
import { Button, CheckBox, Form, LogPanel, NumberInput, Panel, ReadonlyText, TextInput } from "../../src/ui/all.js";

function numberRange(message, min, max) {
  return value => {
    if (value == null) {
      return true;
    }

    if (value < min || value > max) {
      return {
        ok: false,
        severity: "error",
        message,
        code: "numberRange"
      };
    }

    return true;
  };
}

const idText = new ReadonlyText({
  name: "id",
  text: "field-001"
});

const name = new TextInput({
  name: "name",
  label: "Name",
  value: "CustomerId",
  validators: [required("Name is required")]
});

const priority = new NumberInput({
  name: "priority",
  label: "Priority",
  value: 10,
  min: 1,
  max: 999,
  step: 1,
  validators: [required("Priority is required"), numberRange("Priority must be 1..999", 1, 999)]
});

const scale = new NumberInput({
  name: "scale",
  label: "Scale",
  value: null,
  min: 0,
  max: 10,
  step: 0.1,
  placeholder: "Optional"
});

const enabled = new CheckBox({
  name: "enabled",
  label: "Enabled",
  text: "Participates in mapping",
  value: true
});

const log = new LogPanel({
  name: "log"
});

priority.events.on("change", event => {
  log.write(
    `priority: ${event.oldValue || "(empty)"} -> ${event.newValue || "(empty)"}, typed=${priority.value.get()}`
  );
});

let form;

const okButton = new Button({
  name: "ok",
  text: "OK",

  onClick() {
    const result = form.validate();

    if (!result.ok) {
      log.write(`Validation failed: ${result.errors.length} error(s)`);
      return;
    }

    log.write(
      `OK: id=${idText.text}, priority=${priority.value.get()}, scale=${scale.value.get()}, enabled=${enabled.value.get()}`
    );
  }
});

const silentButton = new Button({
  name: "silent",
  text: "Silent Set",

  onClick() {
    priority.value.set(42, {
      origin: "import",
      silent: true
    });

    log.write(`silent priority=${priority.value.get()}`);
  }
});

const clearButton = new Button({
  name: "clear",
  text: "Clear",

  onClick() {
    priority.value.clear();
    scale.value.clear();
    log.write(`cleared priority=${priority.value.get()}, scale=${scale.value.get()}`);
  }
});

form = new Form({
  name: "numberForm"
})
  .row(new ReadonlyText({ name: "idLabel", text: "Id" }), idText)
  .row(name)
  .row(priority)
  .row(scale)
  .row(enabled)
  .row(okButton, silentButton, clearButton);

const panel = new Panel("#root", {
  name: "numberPanel"
}).add(form, log);

log.write("lab09 ready");

window.lab09 = {
  panel,
  form,
  idText,
  name,
  priority,
  scale,
  enabled,
  okButton,
  silentButton,
  clearButton,
  log
};
