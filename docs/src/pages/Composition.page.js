import { importsFor } from "./pageHelpers.js";
import { Button, Form, TextInput } from "../../../src/ui/index.js";

const compositionSource = `const firstName = new TextInput({
  name: "firstName",
  label: "First name",
  value: "Ada"
});

const lastName = new TextInput({
  name: "lastName",
  label: "Last name",
  value: "Lovelace"
});

const save = new Button({
  name: "saveCustomer",
  text: "Read composed value",
  onClick() {
    log.write(JSON.stringify(form.value.get()));
  }
});

const form = new Form({
  name: "customerForm",
  labelWidth: 84
})
  .row(firstName)
  .row(lastName)
  .row(save);`;

export const compositionPage = {
  id: "composition",
  title: "Composition",
  status: "stable",
  keywords: ["panel", "form", "layout", "object graph", "container", "screen"],
  description: "Compose screens from named control instances and containers instead of descriptors or application-owned DOM.",
  imports: importsFor(["Button", "Form", "Panel", "TextInput"]),
  paragraphs: [
    "Tæt UI applications build an explicit graph of control objects. Create named controls, configure their behavior, then compose them through Panel, Form, Layout or DockLayout.",
    "Inheritance defines what a control can do; composition defines the screen. Form owns field geometry and values, Panel owns general flow content, Layout owns deterministic rows and columns, and DockLayout owns docking behavior.",
    "Composition before mount is control-specific. Form.row/col/columns and Toolbar.add support deferred composition and claim their children before DOM mounting. A plain Panel.add/attach requires a mounted Panel: pass a host to new Panel(container, options), or call panel.mount(container) before adding children. new Panel(options).add(...) is not deferred composition. Do not infer one container's pre-mount behavior from another.",
    "Business functions should remain separate from control construction. Controls expose values and semantic events while application services perform persistence, navigation and domain operations."
  ],
  examples: [
    {
      title: "Named form composition",
      source: compositionSource,
      create({ log }) {
        const firstName = new TextInput({
          name: "firstName",
          label: "First name",
          value: "Ada"
        });

        const lastName = new TextInput({
          name: "lastName",
          label: "Last name",
          value: "Lovelace"
        });

        const save = new Button({
          name: "saveCustomer",
          text: "Read composed value",
          onClick() {
            log.write(JSON.stringify(form.value.get()));
          }
        });

        const form = new Form({
          name: "customerForm",
          labelWidth: 84
        })
          .row(firstName)
          .row(lastName)
          .row(save);

        return form;
      }
    }
  ],
  tables: [
    {
      title: "Container Roles",
      rows: [
        { name:"Panel", type:"mounted general owner", description:"Mount or pass a constructor host before add/attach; owns controls in normal document flow." },
        { name:"Form", type:"deferred field owner", description:"row/col/columns can compose before mount; owns fields, geometry and aggregate values." },
        { name:"Toolbar", type:"deferred action owner", description:"add can compose before mount; pending children mount with the toolbar." },
        { name:"Layout", type:"deterministic geometry", description:"Defines resizable rows, columns and cells." },
        { name:"DockLayout", type:"workspace owner", description:"Adds docking, tab groups, collapse and auto-hide behavior." }
      ]
    }
  ],
  methods: [
    { name:"panel.add(...controls)", type:"Panel", description:"Adds general child controls to a mounted panel." },
    { name:"form.row(...controls)", type:"Form", description:"Defines controls sharing one horizontal form row." },
    { name:"form.col(...controls)", type:"Form", description:"Defines a vertical control group." },
    { name:"form.columns(...columns)", type:"Form", description:"Defines aligned form columns." },
    { name:"layout.cell(id).attach(control)", type:"Control", description:"Attaches content to a deterministic layout cell." }
  ],
  notes: [
    "Use stable domain names for controls and model ids for data rows.",
    "Do not describe standard controls with type strings, JSX or JSON component trees.",
    "Do not create application UI with document.createElement() when a Tæt UI control or container exists."
  ]
};
