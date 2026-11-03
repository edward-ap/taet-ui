import { Button, Form, Panel, TextInput, email, required } from "../../src/ui/all.js";

export function createValidationForm(container, saveCustomer) {
  const name = new TextInput({
    name: "name",
    label: "Name",
    validators: [required("Name is required")]
  });

  const emailAddress = new TextInput({
    name: "email",
    label: "Email",
    validators: [required("Email is required"), email()]
  });

  const save = new Button({
    name: "saveCustomer",
    text: "Save",
    onClick() {
      if (form.submit({ origin: "user", userAction: true })) {
        saveCustomer(form.value.get());
      }
    }
  });

  const form = new Form({ name: "customerForm", labelWidth: 80 })
    .row(name)
    .row(emailAddress)
    .row(save);

  return new Panel(container, { name: "customerScreen" }).add(form);
}
