import { email, required } from "../../src/core/validators.js";
import { Button, Form, LogPanel, Panel, TextInput } from "../../src/ui/all.js";

const firstName = new TextInput({
  name: "firstName",
  label: "First Name",
  value: "Ada",
  required: true,
  validators: [required("First name is required")]
});

const lastName = new TextInput({
  name: "lastName",
  label: "Last Name",
  value: "Lovelace",
  required: true,
  validators: [required("Last name is required")]
});

const emailField = new TextInput({
  name: "email",
  label: "Email",
  value: "ada@example.test",
  required: true,
  validators: [required("Email is required"), email("Invalid email address")]
});

const log = new LogPanel({
  name: "log"
});

let form;

const okButton = new Button({
  name: "ok",
  text: "OK",

  onClick() {
    const result = form.validate();

    if (!result.ok) {
      log.write(`Validation failed: ${result.errors.length} error(s)`);

      for (const error of result.errors) {
        log.write(`${error.path}: ${error.message}`);
      }

      return;
    }

    log.write(
      `OK: ${firstName.value.get()} ${lastName.value.get()} <${emailField.value.get()}>`
    );
  }
});

form = new Form({
  name: "personForm"
})
  .row(firstName)
  .row(lastName)
  .row(emailField)
  .row(okButton);

const panel = new Panel("#root", {
  name: "validationPanel"
}).add(form, log);

log.write("lab04 ready");

window.lab04 = {
  panel,
  form,
  firstName,
  lastName,
  emailField,
  okButton,
  log
};
