import { importsFor } from "./pageHelpers.js";
import { Button, Form, SelectInput } from "../../../src/ui/index.js";
import { MultiSelectDropDown } from "../../../src/ui/experimental.js";
import { inputExample } from "./inputExamples.js";

const selectInputSource = `const status = new SelectInput({
  name: "status",
  label: "Status",
  placeholder: "Select status",
  value: "ready"
});

status.data.parse([
  { id: "ready", text: "Ready" },
  { id: "review", text: "Review" },
  { id: "blocked", text: "Blocked" }
], { origin: "import" });
status.events.on("change", event => log.write(\`selected: \${event.newItem?.text ?? "(none)"}\`));`;

export const selectInputPage = {
  id: "select-input",
  title: "SelectInput",
  status: "stable",
  keywords: ["select", "data", "datastore", "dropdown", "choice", "country", "flag", "image", "icon", "DropDownList", "MultiSelectDropDown", "multiple", "regions", "tokens"],
  description: "Selectors backed by DataStore: single choices, item icons and searchable multiple selection.",
  imports: importsFor(["Button", "Form", "SelectInput", "MultiSelectDropDown"]),
  paragraphs: [
    "SelectInput separates its selected value from its option data. Populate or replace choices through data.parse(), and use the same value API as other editors.",
    "Set imageField to the item property containing an image URL, or iconField to the property containing a registered Tæt UI icon name. The image or icon appears in the list and beside the selected value. An image takes priority when both are provided.",
    "imageField, iconField or searchable: true selects the custom popup when the control is constructed. Without these options, SelectInput keeps its native compact select presentation. Both use the same value, DataStore and event contracts.",
    "DropDownList remains available for existing applications and advanced custom item rendering. It shares the popup implementation with SelectInput; the country example needs only the stable import.",
    "For multiple choices, use the experimental MultiSelectDropDown. Its value is an array of unique item ids, and the field displays removable tokens. It is the Regions selector from Lab 21."
  ],
  examples: [
    {
      title: "Data-bound choices",
      source: selectInputSource,
      create({ log }) {
        const status = new SelectInput({
          name: "status",
          label: "Status",
          placeholder: "Select status",
          value: "ready"
        });
        status.data.parse([
          { id:"ready", text:"Ready" },
          { id:"review", text:"Review" },
          { id:"blocked", text:"Blocked" }
        ], { origin:"import" });
        status.events.on("change", event => log.write(`selected: ${event.newItem?.text ?? "(none)"}`));
        return status;
      }
    },
    inputExample("Custom lookup fields and missing values", function createSelectorExample({ log }) {
      const country = new SelectInput({ name: "country", label: "Country", valueField: "code", textField: "name", value: "CA", placeholder: "Choose country", clearValueOnMissingData: true });
      country.data.parse([{ id: 1, code: "CA", name: "Canada" }, { id: 2, code: "US", name: "United States" }], { origin: "import" });
      country.events.on("change", event => log.write("Country: " + (event.newValue || "(empty)")));
      const form = new Form({ name: "countryLookup", labelWidth: 112 }).row(country);
      form.row(new Button({ name: "replaceCountries", text: "Replace choices", onClick() {
        country.data.parse([{ id: 2, code: "US", name: "United States" }], { origin: "import" });
        log.write("Selected after replacement: " + (country.value.get() || "(empty)"));
      } }));
      return form;
    }, "The selected value is a country code, while DataStore uses the separate id property. Replacing choices removes Canada and clears the missing selection."),
    inputExample("Country flags", function createCountryFlagExample({ log }) {
      // Small SVG flag images are embedded so the example needs no external assets.
      const flag = shapes => "data:image/svg+xml," + encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 16" width="24" height="16">${shapes}</svg>`
      );
      const country = new SelectInput({
        name: "flagCountry", label: "Country", value: "FR",
        valueField: "code", textField: "name", imageField: "flag",
        searchable: true, searchPlaceholder: "Find country", popupHeight: 180,
        onChange: event => log.write("Country code: " + event.newValue)
      });
      country.data.parse([
        { code: "FR", name: "France", flag: flag('<path fill="#fff" d="M0 0h24v16H0z"/><path fill="#002654" d="M0 0h8v16H0z"/><path fill="#ed2939" d="M16 0h8v16h-8z"/>') },
        { code: "DE", name: "Germany", flag: flag('<path fill="#ffce00" d="M0 0h24v16H0z"/><path fill="#d00" d="M0 0h24v10.667H0z"/><path fill="#000" d="M0 0h24v5.333H0z"/>') },
        { code: "IT", name: "Italy", flag: flag('<path fill="#fff" d="M0 0h24v16H0z"/><path fill="#009246" d="M0 0h8v16H0z"/><path fill="#ce2b37" d="M16 0h8v16h-8z"/>') },
        { code: "JP", name: "Japan", flag: flag('<path fill="#fff" d="M0 0h24v16H0z"/><circle fill="#bc002d" cx="12" cy="8" r="4.8"/>') }
      ], { origin: "import" });
      return country;
    }, "Open the list or search for a country. Flags are decorative; the country name remains visible, and value.get() returns a stable country code such as FR or JP. You can replace the embedded images with your own local SVG or PNG URLs."),
    inputExample("Multiple selection: Regions", function createMultiSelectorExample({ log }) {
      const regions = new MultiSelectDropDown({
        name: "regions", label: "Regions", value: ["north", "east"],
        placeholder: "Select regions", searchable: true, searchPlaceholder: "Find region",
        onChange: event => log.write(JSON.stringify(event.newValue))
      });
      regions.data.parse([
        { id: "north", text: "North" }, { id: "south", text: "South" },
        { id: "east", text: "East" }, { id: "west", text: "West" },
        { id: "central", text: "Central" }
      ], { origin: "import" });
      return new Form({ name: "regionChoices", labelWidth: 112 }).row(regions)
        .row(new Button({ name: "clearRegions", text: "Clear regions", onClick: () => regions.value.clear() }));
    }, "Select several options without closing the popup. Click a selected option again or remove its token to deselect it. Search filters the choices without clearing selected values; Clear regions sets the value to [].")
  ],
  options: [
    { name: "imageField", type: "string", description: "Item image-URL property; setting it enables the custom popup." },
    { name: "iconField", type: "string", description: "Item icon-name property; setting it enables the custom popup." },
    { name: "searchable / searchPlaceholder", type: "boolean / string", description: "Enable popup search and set its hint." },
    { name: "popupHeight", type: "number | string", description: "Maximum custom-popup height; default 180px." },
    { name:"value", type:"unknown", description:"Initially selected option id." },
    { name:"data", type:"DataStore", description:"Optional shared store; an owned store is created by default." },
    { name:"valueField", type:"string", description:"Option field used as the stable value; defaults to id." },
    { name:"textField", type:"string", description:"Option field displayed to the user; defaults to text." },
    { name:"placeholder", type:"string", description:"Native empty choice or custom-popup empty display hint." },
    { name:"emptyValue", type:"unknown", description:"Value represented by the empty choice." },
    { name:"clearValueOnMissingData", type:"boolean", description:"Clears a value removed from the option store." }
  ],
  methods: [
    { name:"data.parse(items, options)", type:"void", description:"Replaces selectable option data." },
    { name:"value.get()", type:"unknown", description:"Returns the selected option id." },
    { name:"value.set(id, options)", type:"boolean", description:"Selects an option with mutation metadata." },
    { name:"getSelectedItem()", type:"object | null", description:"Returns the selected DataStore item." },
    { name:"openPopup() / closePopup()", type:"SelectInput", description:"Open or close the custom popup." },
    { name:"setFilter(query, options)", type:"SelectInput", description:"Filter the custom popup's items." }
  ],
  events: [
    { name:"beforeChange", type:"{ oldItem, newItem, cancel, origin, userAction }", description:"Cancellable selection change." },
    { name:"change", type:"{ oldValue, newValue, oldItem, newItem }", description:"Reports the committed selection." },
    { name:"afterChange", type:"ChangeEvent", description:"Runs after normal change observers." },
    { name:"open / close / filterChange", type:"ControlEvent", description:"Custom-popup visibility and filtering notifications." }
  ],
  notes: [
    "Use stable ids for values instead of storing display text in the project model.",
    "Pass a shared DataStore when multiple selectors use the same lookup data.",
    "The API tables above describe single-value SelectInput. MultiSelectDropDown uses value.get()/set(ids) with arrays; getSelectedItems() returns the matching records. addValue(id) and removeValue(id) update individual selections and return whether the value changed.",
    "MultiSelectDropDown keeps the popup open by default; closeOnSelect: true closes it after each option click. clearValueOnMissingData: true removes selected ids that disappear from its data."
  ]
};
