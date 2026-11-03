import { importsFor } from "./pageHelpers.js";
import { Button, Panel, Toolbar } from "../../../src/ui/index.js";
import { PropertyInspector, StatusText } from "../../../src/ui/experimental.js";
import { gridExample } from "./Grid.page.js";

export const propertyGridPage = {
  id: "property-grid", title: "PropertyGrid", status: "experimental",
  keywords: ["PropertyInspector", "properties", "object", "inspector", "lab25", "categories", "editors"],
  description: "An object property editor with categories, nested settings and editors selected by property type.",
  imports: importsFor(["Button", "Panel", "Toolbar", "PropertyGrid", "PropertyInspector", "StatusText"]),
  paragraphs: [
    "PropertyGrid edits the properties of one object as Property / Value rows. PropertyInspector is the owning Panel wrapper used in Lab 25; its grid option configures the inner PropertyGrid, accessible as inspector.grid.",
    "The example adapts Lab 25's mapping inspector. getProperties() describes groups, types and current values; setProperty(name, value) writes changes to the object. Refresh reads that object again, so committed values survive rebuilding the editor.",
    "Click category rows or a property's triangle to collapse and expand. Most typed fields use inline controls that write on value changes. Boolean and switch properties toggle directly. Double-click Review mode to open the radio editor; Enter commits and Escape cancels. Selecting a property displays its description below the grid."
  ],
  examples: [gridExample("Mapping properties — based on Lab 25", function createPropertyInspector({ container, log }) {
    const owner = new Panel(container, { name: "propertyExample" });
    const values = {
      source: "customer_id", target: "client.id", transform: "Direct", trim: true, empty: false,
      owner: "Alice", enabled: true, status: "Ready", priority: 10, effectiveDate: "2026-08-01",
      runTime: "09:30", lastRun: "2026-08-02T16:45", autoRetry: true, reviewMode: "standard"
    };
    const property = (name, label, type, description, extra = {}) => ({ name, label, type, description, value: values[name], ...extra });
    const source = {
      getProperties() {
        return [{ id: "mapping", title: "Mapping", properties: [
          property("source", "Source", "text", "Source field read from the input dataset."),
          property("target", "Target", "text", "Destination field written by this mapping."),
          property("transform", "Transform", "select", "Transformation applied before writing the value.", { options: ["Direct", "Trim", "Uppercase", "Lookup"] }),
          { name: "options", path: "transform.options", label: "Transform options", type: "readonly", value: "",
            description: "Additional settings for the selected transformation.", children: [
              property("trim", "Trim input", "boolean", "Remove surrounding whitespace."),
              property("empty", "Allow empty", "boolean", "Accept empty values after transformation.")
            ] }
        ] }, { id: "execution", title: "Execution", properties: [
          property("owner", "Owner", "select", "Person responsible for reviewing this mapping.", { options: ["Alice", "Bruno", "Chen", "Daria"] }),
          property("enabled", "Enabled", "boolean", "Include this mapping in validation and execution."),
          property("status", "Status", "select", "Current review state.", { options: ["Draft", "Ready", "Blocked"] }),
          property("priority", "Priority", "integer", "Execution priority from 0 to 100.", { min: 0, max: 100 }),
          property("effectiveDate", "Effective date", "date", "Date when this mapping becomes active."),
          property("runTime", "Run time", "time", "Preferred daily execution time."),
          property("lastRun", "Last run", "dateTime", "Date and time of the latest execution."),
          property("autoRetry", "Auto retry", "switch", "Automatically retry a failed mapping."),
          property("reviewMode", "Review mode", "radio", "Double-click to expand the available choices.", {
            options: [{ value: "standard", text: "Standard" }, { value: "strict", text: "Strict" }, { value: "off", text: "Off" }]
          })
        ] }];
      },
      setProperty(name, value) { values[name] = value; }
    };
    const inspector = new PropertyInspector({ name: "mappingInspectorExample", width: "100%", height: 430,
      grid: { name: "mappingProperties", labelWidth: 190, expandedProperties: ["transform.options"] }
    });
    const help = new StatusText({ name: "propertyHelp", text: "Select a property to read its description." });
    owner.add(new Toolbar().add(
      new Button({ text: "Categorized", onClick: () => { inspector.grid.setShowCategories(true); inspector.grid.setSortMode("categorized"); } }),
      new Button({ text: "Alphabetical", onClick: () => { inspector.grid.setShowCategories(false); inspector.grid.setSortMode("alphabetical"); } }),
      new Button({ text: "Refresh", onClick: () => { inspector.refresh(); help.setText("Values reloaded from the object."); } }),
      new Button({ text: "Read Object", onClick: () => log.write(JSON.stringify(values)) })
    ), inspector, help);
    inspector.bind(source, { silent: true, origin: "import" });
    inspector.events.on("propertyFocusChange", event => help.setText(event.description || "Select a property to read its description."));
    inspector.events.on("propertyChange", event => log.write(`${event.name}: ${event.oldValue} → ${event.newValue}`));
    return owner;
  }, "Edit Source, toggle Enabled, change Priority or choose Review mode. Read Object shows committed values; Refresh preserves them. The object and metadata are self-contained in this example.")],
  options: [
    { name: "source", type: "object | PropertyModel | array", description: "Property groups, or an object exposing getProperties() and optionally setProperty()." },
    { name: "labelWidth", type: "number", description: "Property-name column width; the divider is draggable." },
    { name: "showCategories / sortMode", type: "boolean / string", description: "Category display and categorized / alphabetical ordering." },
    { name: "expandedProperties", type: "string[]", description: "Initially expanded property paths." }
  ],
  tables: [{ title: "Property descriptors", rows: [
    { name: "name / path / label", type: "string", description: "Write key, optional unique nested path and displayed caption." },
    { name: "type / value", type: "string / unknown", description: "Typed editor and current value. Use readonly for a non-editable row." },
    { name: "options / min / max", type: "array / number", description: "Choices or numeric editor constraints." },
    { name: "description / children", type: "string / Property[]", description: "Context help and nested property descriptors." }
  ] }],
  methods: [
    { name: "bind(source, options) / refresh(options)", type: "PropertyGrid | PropertyInspector", description: "Bind an object or rebuild descriptors from its current values." },
    { name: "clear(options)", type: "PropertyGrid | PropertyInspector", description: "Unbind the object and clear rows." },
    { name: "selectProperty(pathOrName, options)", type: "boolean", description: "Select a property and expose its description." },
    { name: "expandCategory(id) / collapseCategory(id)", type: "boolean", description: "Change category visibility on PropertyGrid or inspector.grid." },
    { name: "expandProperty(path) / collapseProperty(path)", type: "boolean", description: "Change nested row visibility on PropertyGrid or inspector.grid." },
    { name: "setSortMode(mode)", type: "boolean", description: "Switch ordering on PropertyGrid or inspector.grid." }
  ],
  events: [
    { name: "beforePropertyChange", type: "{ name, oldValue, newValue, cancel }", description: "Cancellable application rule before an object write." },
    { name: "propertyChange", type: "{ name, oldValue, newValue }", description: "Reports a committed property write." },
    { name: "propertyFocusChange", type: "{ property, description }", description: "Use to update contextual help for the selected property." }
  ],
  notes: ["For a standalone grid, use new PropertyGrid(container, { source, labelWidth: 190 }). PropertyInspector is useful when composing an inspector panel and forwards property events.",
    "In a Grid + inspector screen, bind an adapter for the selected row and write through grid.data.update(id, changes), as in Lab 25. The generic library does not depend on the mapping application.",
    "Destroy the example owner to release the inspector, its grid, inline editors and subscriptions. The bound application object remains application-owned."]
};
