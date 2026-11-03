import { Button, Form, LogPanel, Panel, TreeGrid } from "../../src/ui/all.js";

const treeGrid = new TreeGrid({
  name: "schemaTreeGrid",
  width: "min(720px, 100%)",
  height: 240,
  rowHeight: 24,
  expandedIds: ["sources", "source.customer", "targets", "target.client"],
  columns: [
    { id: "name", title: "Name", width: 230, minWidth: 140 },
    { id: "kind", title: "Kind", width: 100, minWidth: 80 },
    {
      id: "required",
      title: "Req",
      width: 64,
      minWidth: 52,
      maxWidth: 90,
      align: "center",
      render: value => (value == null ? "" : value ? "On" : "Off")
    },
    { id: "source", title: "Source", minWidth: 180 }
  ]
});

const log = new LogPanel({
  name: "log"
});

treeGrid.data.parse(
  [
    { id: "sources", name: "Sources", kind: "folder" },
    { id: "source.customer", parentId: "sources", name: "Customer", kind: "object" },
    {
      id: "source.customer.id",
      parentId: "source.customer",
      name: "CustomerId",
      kind: "string",
      required: true,
      source: "customer.id"
    },
    {
      id: "source.customer.name",
      parentId: "source.customer",
      name: "CustomerName",
      kind: "string",
      required: true,
      source: "customer.name"
    },
    { id: "source.order", parentId: "sources", name: "Order", kind: "object" },
    {
      id: "source.order.id",
      parentId: "source.order",
      name: "OrderId",
      kind: "string",
      required: true,
      source: "order.id"
    },
    {
      id: "source.order.amount",
      parentId: "source.order",
      name: "Amount",
      kind: "number",
      required: false,
      source: "order.amount"
    },
    { id: "targets", name: "Targets", kind: "folder" },
    { id: "target.client", parentId: "targets", name: "Client", kind: "object" },
    {
      id: "target.client.id",
      parentId: "target.client",
      name: "ClientId",
      kind: "string",
      required: true,
      source: "client.id"
    },
    {
      id: "target.client.name",
      parentId: "target.client",
      name: "ClientName",
      kind: "string",
      required: false,
      source: "client.name"
    }
  ],
  {
    origin: "import"
  }
);

const expandAllButton = new Button({
  name: "expandAll",
  text: "Expand All",

  onClick() {
    treeGrid.expandAll({
      origin: "api"
    });
  }
});

const collapseAllButton = new Button({
  name: "collapseAll",
  text: "Collapse All",

  onClick() {
    treeGrid.collapseAll({
      origin: "api"
    });
  }
});

const addChildButton = new Button({
  name: "addChild",
  text: "Add Child",

  onClick() {
    const parent = treeGrid.selection.get()[0] ?? treeGrid.data.get("sources");
    const parentId = treeGrid.data.idOf(parent);
    const index = treeGrid.data.all().filter(item => item.parentId === parentId).length + 1;
    const id = `${parentId}.extra${index}`;

    treeGrid.data.add(
      {
        id,
        parentId,
        name: `Extra${index}`,
        kind: "string",
        required: false,
        source: `runtime.${index}`
      },
      {
        origin: "api"
      }
    );

    treeGrid.expand(parentId, {
      origin: "api"
    });
  }
});

const actions = new Form({
  name: "treeGridActions",
  width: "min(720px, 100%)"
}).row(expandAllButton, collapseAllButton, addChildButton);

const panel = new Panel("#root", {
  name: "treeGridPanel"
}).add(treeGrid, actions, log);

treeGrid.events.on("selectionChange", event => {
  const selected = event.items.map(item => item.id).join(", ") || "(none)";
  log.write(`selection ${selected}, origin=${event.origin}`);
});

treeGrid.events.on("expand", event => {
  log.write(`expand ${event.id}`);
});

treeGrid.events.on("collapse", event => {
  log.write(`collapse ${event.id}`);
});

treeGrid.events.on("activeChange", event => {
  log.write(`active ${event.id}`);
});

treeGrid.events.on("cellClick", event => {
  log.write(`cell ${event.id}.${event.columnId}`);
});

treeGrid.events.on("columnResizeEnd", event => {
  log.write(`resize ${event.columnId}=${event.width}`);
});

log.write("lab16 ready");

window.lab16 = {
  panel,
  treeGrid,
  actions,
  log
};
