import { Button, Form, Panel, TextInput } from "../../src/ui/all.js";

export function createBasicForm(container, saveCustomer) {
  const firstName = new TextInput({
    name: "firstName",
    label: "First Name",
    value: ""
  });

  const save = new Button({
    name: "saveCustomer",
    text: "Save",
    onClick() {
      saveCustomer(form.value.get());
    }
  });

  const form = new Form({ name: "customerForm", labelWidth: 96 })
    .row(firstName)
    .row(save);

  return new Panel(container, { name: "customerScreen" }).add(form);
}
