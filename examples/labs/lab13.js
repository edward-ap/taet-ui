import {
  Button,
  Form,
  LabelText,
  LogPanel,
  Panel,
  TreeList
} from "../../src/ui/all.js";

const INITIAL_TREE_ITEMS = [
  { id: "records", text: "Header/detail records" },
  { id: "H", parentId: "records", text: "H · Header" },
  { id: "D", parentId: "records", text: "D · Detail" },
  { id: "T", parentId: "records", text: "T · Trailer" },
  { id: "sources", text: "Sources" },
  { id: "source.customer", parentId: "sources", text: "Customer" },
  {
    id: "source.customer.id",
    parentId: "source.customer",
    text: "CustomerId"
  },
  {
    id: "source.customer.name",
    parentId: "source.customer",
    text: "CustomerName"
  },
  { id: "source.order", parentId: "sources", text: "Order" },
  { id: "source.order.id", parentId: "source.order", text: "OrderId" },
  { id: "targets", text: "Targets" },
  { id: "target.client", parentId: "targets", text: "Client" },
  {
    id: "target.client.id",
    parentId: "target.client",
    text: "ClientId"
  },
  {
    id: "target.client.name",
    parentId: "target.client",
    text: "ClientName"
  }
];

const tree = new TreeList({
  name: "mappingTree",
  width: "min(420px, 100%)",
  height: 300,
  itemHeight: 24,
  textField: item => item.text,
  expandedIds: ["records", "sources", "targets"],
  nodeReorder: true
});

const log = new LogPanel({
  name: "log"
});

resetTree();

const expandAllButton = new Button({
  name: "expandAll",
  text: "Expand All",

  onClick() {
    tree.expandAll({
      origin: "api"
    });
  }
});

const collapseAllButton = new Button({
  name: "collapseAll",
  text: "Collapse All",

  onClick() {
    tree.collapseAll({
      origin: "api"
    });
  }
});

const addChildButton = new Button({
  name: "addChild",
  text: "Add Child",

  onClick() {
    const parent = tree.selection.get()[0] ?? tree.data.get("sources");
    const parentId = tree.data.idOf(parent);
    const index = tree.data.all().filter(item => item.parentId === parentId).length + 1;
    const id = `${parentId}.extra${index}`;

    tree.data.add(
      {
        id,
        parentId,
        text: `Extra${index}`
      },
      {
        origin: "api"
      }
    );

    tree.expand(parentId, {
      origin: "api"
    });
  }
});

const resetButton = new Button({
  name: "resetTree",
  text: "Reset",

  onClick() {
    resetTree();
    tree.collapseAll({ silent: true, origin: "system" });
    ["records", "sources", "targets"].forEach(id =>
      tree.expand(id, { silent: true, origin: "system" })
    );
    log.write("tree reset");
  }
});

const actions = new Form({
  name: "treeActions",
  width: "min(520px, 100%)"
}).row(expandAllButton, collapseAllButton, addChildButton, resetButton);

const panel = new Panel("#root", {
  name: "treePanel"
}).add(
  new LabelText({
    text:
      "Drag a row onto the middle of another row to make it a child. " +
      "Use the top or bottom edge to place it before or after."
  }),
  tree,
  actions,
  log
);

tree.events.on("selectionChange", event => {
  const selected = event.items.map(item => item.id).join(", ") || "(none)";
  log.write(`selection ${selected}, origin=${event.origin}`);
});

tree.events.on("expand", event => {
  log.write(`expand ${event.id}`);
});

tree.events.on("collapse", event => {
  log.write(`collapse ${event.id}`);
});

tree.events.on("activeChange", event => {
  log.write(`active ${event.id}`);
});

tree.events.on("nodeMove", event => {
  log.write(
    `move ${event.id} ${event.position} ${event.targetId}; ` +
    `parent=${event.parentId ?? "(root)"}, index=${event.index}`
  );
});

log.write("lab13 ready");

window.lab13 = {
  panel,
  tree,
  actions,
  log
};

function resetTree() {
  tree.data.parse(
    INITIAL_TREE_ITEMS.map(item => ({ ...item })),
    {
      origin: "import"
    }
  );
}
