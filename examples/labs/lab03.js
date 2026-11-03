import { Button, FieldGroup, Form, LogPanel, Panel, TextInput } from "../../src/ui/all.js";

const firstName = new TextInput({
  name: "firstName",
  label: "First Name",
  value: "Ada"
});

const lastName = new TextInput({
  name: "lastName",
  label: "Last Name",
  value: "Lovelace"
});

const email = new TextInput({
  name: "email",
  label: "Email",
  value: "ada@example.test"
});

const company = new TextInput({
  name: "company",
  label: "Company",
  value: "Analytical Engine"
});

const log = new LogPanel({
  name: "log"
});

const okButton = new Button({
  name: "ok",
  text: "OK",

  onClick() {
    log.write(
      `OK: ${firstName.value.get()} ${lastName.value.get()} <${email.value.get()}> @ ${company.value.get()}`
    );
  }
});

const nameGroup = new FieldGroup({
  name: "nameGroup",
  title: "Name"
})
  .row(firstName)
  .row(lastName);

const contactGroup = new FieldGroup({
  name: "contactGroup",
  title: "Contact"
})
  .row(email)
  .row(company);

const form = new Form({
  name: "personForm",
  width: "min(760px, 100%)",
  labelWidth: 82
})
  .columns(
    Form.column(nameGroup),
    Form.column(contactGroup)
  )
  .row(okButton);

const panel = new Panel("#root", {
  name: "personPanel"
}).add(form, log);

log.write("lab03 ready");

window.lab03 = {
  panel,
  form,
  firstName,
  lastName,
  email,
  company,
  nameGroup,
  contactGroup,
  okButton,
  log
};
