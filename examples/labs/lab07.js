import { CheckBox, Button, Form, LogPanel, Panel, TextInput } from "../../src/ui/all.js";

function mustBeChecked(message = "Must be checked") {
  return value =>
    value === true
      ? true
      : {
          ok: false,
          severity: "error",
          message,
          code: "mustBeChecked"
        };
}

const projectName = new TextInput({
  name: "projectName",
  label: "Project Name",
  value: "Customer Mapping"
});

const active = new CheckBox({
  name: "active",
  label: "Active",
  text: "Include in project",
  value: true
});

const confirmed = new CheckBox({
  name: "confirmed",
  label: "Confirm",
  text: "Mapping was reviewed",
  value: false,
  validators: [mustBeChecked("Review confirmation is required")]
});

const readOnlyFlag = new CheckBox({
  name: "readOnlyFlag",
  label: "Locked",
  text: "Read-only flag",
  value: true,
  readOnly: true
});

const log = new LogPanel({
  name: "log"
});

for (const control of [active, confirmed, readOnlyFlag]) {
  control.events.on("change", event => {
    log.write(
      `${control.name}: ${event.oldValue} -> ${event.newValue}, origin=${event.origin}, userAction=${event.userAction}`
    );
  });
}

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
      `OK: name=${projectName.value.get()}, active=${active.value.get()}, confirmed=${confirmed.value.get()}`
    );
  }
});

const silentButton = new Button({
  name: "silent",
  text: "Silent Set",

  onClick() {
    confirmed.value.set(true, {
      origin: "import",
      silent: true
    });

    log.write(`silent set confirmed=${confirmed.value.get()}`);
  }
});

const clearButton = new Button({
  name: "clear",
  text: "Clear",

  onClick() {
    active.value.clear();
    confirmed.value.clear();
    log.write(`cleared: active=${active.value.get()}, confirmed=${confirmed.value.get()}`);
  }
});

form = new Form({
  name: "checkboxForm"
})
  .row(projectName)
  .row(active)
  .row(confirmed)
  .row(readOnlyFlag)
  .row(okButton, silentButton, clearButton);

const panel = new Panel("#root", {
  name: "checkboxPanel"
}).add(form, log);

log.write("lab07 ready");

window.lab07 = {
  panel,
  form,
  projectName,
  active,
  confirmed,
  readOnlyFlag,
  okButton,
  silentButton,
  clearButton,
  log
};
