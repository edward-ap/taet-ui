import { Button, Form, Grid, gridEditors, LogPanel, Panel } from "../../src/ui/all.js";

const grid = new Grid({
  name: "fieldGrid",
  width: "min(620px, 100%)",
  height: 190,
  rowHeight: 24,
  columns: [
    {
      id: "name",
      title: "Field",
      width: 170,
      minWidth: 110,
      editor: gridEditors.text(),
      footer: rows => `${rows.length} rows`
    },
    {
      id: "type",
      title: "Type",
      width: 100,
      minWidth: 80,
      editor: gridEditors.select({
        options: ["string", "number", "date", "boolean"]
      })
    },
    {
      id: "required",
      title: "Req",
      width: 64,
      minWidth: 52,
      maxWidth: 90,
      align: "center",
      editor: gridEditors.checkbox(),
      render: value => (value ? "On" : "Off"),
      footer: rows => rows.filter(row => row.required).length
    },
    {
      id: "length",
      title: "Length",
      width: 80,
      minWidth: 64,
      align: "right",
      editor: gridEditors.number({
        min: 0,
        step: 1
      }),
      footer: rows => rows.reduce((sum, row) => sum + row.length, 0)
    },
    {
      id: "source",
      title: "Source",
      minWidth: 140,
      editor: gridEditors.text(),
      footer: "Source path"
    }
  ]
});

const log = new LogPanel({
  name: "log"
});

grid.data.parse(
  [
    { id: "customerId", name: "CustomerId", type: "string", required: true, length: 32, source: "customer.id" },
    { id: "customerName", name: "CustomerName", type: "string", required: true, length: 120, source: "customer.name" },
    { id: "orderDate", name: "OrderDate", type: "date", required: false, length: 10, source: "order.date" },
    { id: "amount", name: "Amount", type: "number", required: false, length: 12, source: "order.amount" }
  ],
  {
    origin: "import"
  }
);

const selectFirstButton = new Button({
  name: "selectFirst",
  text: "Select First",

  onClick() {
    const first = grid.data.all()[0];

    if (first) {
      grid.selection.set([first], {
        origin: "api"
      });
    }
  }
});

const addButton = new Button({
  name: "add",
  text: "Add",

  onClick() {
    const index = grid.data.all().length + 1;
    grid.data.add(
      {
        id: `extra${index}`,
        name: `Extra${index}`,
        type: "string",
        required: false,
        length: 64,
        source: `runtime.extra${index}`
      },
      {
        origin: "api"
      }
    );
  }
});

const updateButton = new Button({
  name: "update",
  text: "Update Selected",

  onClick() {
    const selected = grid.selection.get()[0];

    if (!selected) {
      log.write("nothing selected");
      return;
    }

    grid.data.update(
      selected.id,
      {
        name: `${selected.name}*`
      },
      {
        origin: "api"
      }
    );
  }
});

const removeButton = new Button({
  name: "remove",
  text: "Remove Selected",

  onClick() {
    const selected = grid.selection.get()[0];

    if (!selected) {
      log.write("nothing selected");
      return;
    }

    grid.data.remove(selected.id, {
      origin: "api"
    });
  }
});

const actions = new Form({
  name: "gridActions",
  width: "min(620px, 100%)"
}).row(selectFirstButton, addButton, updateButton, removeButton);

const panel = new Panel("#root", {
  name: "gridPanel"
}).add(grid, actions, log);

grid.events.on("selectionChange", event => {
  const selected = event.items.map(item => item.id).join(", ") || "(none)";
  log.write(`selection ${selected}, origin=${event.origin}`);
});

grid.events.on("cellClick", event => {
  log.write(`cell ${event.id}.${event.columnId}=${formatValue(event.value)}`);
});

grid.events.on("activeChange", event => {
  log.write(`active ${event.id}`);
});

grid.events.on("columnResizeEnd", event => {
  log.write(`resize ${event.columnId}=${event.width}`);
});

grid.events.on("editStart", event => {
  log.write(`edit ${event.id}.${event.columnId}`);
});

grid.events.on("cellChange", event => {
  log.write(
    `change ${event.id}.${event.columnId}: ${formatValue(event.oldValue)} -> ${formatValue(event.newValue)}`
  );
});

grid.events.on("editCancel", event => {
  log.write(`cancel ${event.id}.${event.columnId}`);
});

log.write("lab14 ready");

window.lab14 = {
  panel,
  grid,
  actions,
  log
};

function formatValue(value) {
  return value == null || value === "" ? "(empty)" : String(value);
}
