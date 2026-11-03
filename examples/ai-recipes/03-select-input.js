import { Form, Panel, SelectInput, required } from "../../src/ui/all.js";

export function createCountrySelector(container) {
  const country = new SelectInput({
    name: "country",
    label: "Country",
    valueField: "code",
    textField: "name",
    placeholder: "Select a country",
    validators: [required("Country is required")]
  });

  country.data.parse([
    { code: "US", name: "United States" },
    { code: "CA", name: "Canada" },
    { code: "GB", name: "United Kingdom" }
  ], { origin: "import" });

  const form = new Form({ name: "countryForm", labelWidth: 80 }).row(country);
  return new Panel(container, { name: "countryScreen" }).add(form);
}
