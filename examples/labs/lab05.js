import { required, valueInData } from "../../src/core/validators.js";
import { Button, Form, LogPanel, Panel, SelectInput, TextInput } from "../../src/ui/all.js";

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

const country = new SelectInput({
  name: "country",
  label: "Country",
  value: "US",
  required: true,
  textField: "name",
  valueField: "code",
  placeholder: "",
  validators: [required("Country is required"), valueInData("Unknown country")]
});

country.data.parse([
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "GB", name: "United Kingdom" }
]);

const log = new LogPanel({
  name: "log"
});

country.events.on("change", event => {
  log.write(
    `country change: ${event.oldValue || "(empty)"} -> ${event.newValue || "(empty)"}, origin=${event.origin}`
  );
});

let form;

const importButton = new Button({
  name: "import",
  text: "Silent Import",

  onClick() {
    country.value.set("CA", {
      origin: "import",
      silent: true
    });

    log.write(`silent import applied: ${country.value.get()}`);
  }
});

const clearDataButton = new Button({
  name: "clearData",
  text: "Clear Data",

  onClick() {
    country.data.clear();
    log.write(`data cleared, selected item=${country.getSelectedItem()}`);
  }
});

const okButton = new Button({
  name: "ok",
  text: "OK",

  onClick() {
    const result = form.validate();

    if (!result.ok) {
      log.write(`Validation failed: ${result.errors.length} error(s)`);
      return;
    }

    const selectedCountry = country.getSelectedItem();

    log.write(
      `OK: ${firstName.value.get()} ${lastName.value.get()}, country=${country.value.get()} (${selectedCountry?.name ?? "not found"})`
    );
  }
});

form = new Form({
  name: "personForm"
})
  .row(firstName)
  .row(lastName)
  .row(country)
  .row(okButton, importButton, clearDataButton);

const panel = new Panel("#root", {
  name: "dataBoundPanel"
}).add(form, log);

log.write("lab05 ready");

window.lab05 = {
  panel,
  form,
  firstName,
  lastName,
  country,
  okButton,
  importButton,
  clearDataButton,
  log
};
