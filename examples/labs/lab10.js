import { Button, Layout, LogPanel, Panel, PropertyGrid } from "../../src/ui/all.js";

class DemoField {
  constructor(values) {
    Object.assign(this, values);
  }

  getProperties() {
    return [
      {
        title: "Identity",
        properties: [
          {
            name: "id",
            label: "Id",
            type: "readonly",
            value: this.id
          },
          {
            name: "label",
            label: "Label",
            type: "text",
            value: this.label
          },
          {
            name: "kind",
            label: "Kind",
            type: "select",
            value: this.kind,
            options: [
              { id: "source", text: "Source" },
              { id: "target", text: "Target" },
              { id: "lookup", text: "Lookup" }
            ]
          }
        ]
      },
      {
        title: "Mapping",
        properties: [
          {
            name: "required",
            label: "Required",
            type: "boolean",
            value: this.required
          },
          {
            name: "priority",
            label: "Priority",
            type: "number",
            value: this.priority
          },
          {
            name: "expression",
            label: "Expression",
            type: "text",
            value: this.expression,
            readOnly: this.kind === "source"
          }
        ]
      }
    ];
  }

  setProperty(name, value) {
    this[name] = value;
  }
}

const fields = [
  new DemoField({
    id: "field.customerId",
    label: "CustomerId",
    kind: "source",
    required: true,
    priority: 10,
    expression: "trim(source.customer_id)"
  }),
  new DemoField({
    id: "field.customerName",
    label: "CustomerName",
    kind: "target",
    required: false,
    priority: 20,
    expression: "source.first_name + ' ' + source.last_name"
  })
];

const log = new LogPanel({
  name: "log"
});

const inspector = new PropertyGrid({
  name: "inspector",
  labelWidth: 82
});

let selectedField = fields[0];

function selectField(field) {
  selectedField = field;
  inspector.bind(field);
  log.write(`selected ${field.id}`);
}

const selectFirst = new Button({
  name: "selectFirst",
  text: "CustomerId",

  onClick() {
    selectField(fields[0]);
  }
});

const selectSecond = new Button({
  name: "selectSecond",
  text: "CustomerName",

  onClick() {
    selectField(fields[1]);
  }
});

const refreshButton = new Button({
  name: "refresh",
  text: "Refresh",

  onClick() {
    inspector.refresh();
    log.write(`refreshed ${selectedField.id}`);
  }
});

const objectPanel = new Panel({
  name: "objectPanel",
  className: "dui-object-list"
});

const inspectorPanel = new Panel({
  name: "inspectorPanel",
  className: "dui-inspector-panel"
});

const layout = new Layout("#root", {
  name: "inspectorLayout",
  cols: [
    { name: "objects", width: 160 },
    { name: "properties", flex: 1 }
  ]
});

layout.cell("objects").attach(objectPanel);
layout.cell("properties").attach(inspectorPanel);

objectPanel.add(selectFirst, selectSecond, refreshButton);
inspectorPanel.add(inspector, log);

inspector.events.on("beforePropertyChange", event => {
  if (event.name === "priority" && event.newValue != null && event.newValue < 0) {
    event.cancel = true;
    log.write("priority change canceled");
  }
});

inspector.events.on("propertyChange", event => {
  log.write(
    `${event.name}: ${formatValue(event.oldValue)} -> ${formatValue(event.newValue)}, origin=${event.origin}, user=${event.userAction}`
  );
});

selectField(selectedField);
log.write("lab10 ready");

window.lab10 = {
  layout,
  objectPanel,
  inspectorPanel,
  inspector,
  fields,
  log,
  selectField
};

function formatValue(value) {
  if (value == null || value === "") {
    return "(empty)";
  }

  return String(value);
}
