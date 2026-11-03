import { Button, Form, List, LogPanel, Panel } from "../../src/ui/all.js";

const initialItems = [
  { id: "source.customerId", text: "CustomerId", kind: "source" },
  { id: "source.customerName", text: "CustomerName", kind: "source" },
  { id: "target.clientId", text: "ClientId", kind: "target" },
  { id: "target.clientName", text: "ClientName", kind: "target" }
];

const list = new List({
  name: "fieldList",
  width: "min(360px, 100%)",
  height: 150,
  itemHeight: 24,
  textField: item => `${item.text}  (${item.kind})`
});

const log = new LogPanel({
  name: "log"
});

const selectFirstButton = new Button({
  name: "selectFirst",
  text: "Select First",

  onClick() {
    const first = list.data.all()[0];

    if (first) {
      list.selection.set([first], {
        origin: "api"
      });
    }
  }
});

const addButton = new Button({
  name: "add",
  text: "Add",

  onClick() {
    const id = `field.extra${list.data.all().length + 1}`;
    list.data.add(
      {
        id,
        text: `Extra${list.data.all().length + 1}`,
        kind: "runtime"
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
    const selected = list.selection.get()[0];

    if (!selected) {
      log.write("nothing selected");
      return;
    }

    list.data.update(
      selected.id,
      {
        text: `${selected.text}*`
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
    const selected = list.selection.get()[0];

    if (!selected) {
      log.write("nothing selected");
      return;
    }

    list.data.remove(selected.id, {
      origin: "api"
    });
  }
});

const actions = new Form({
  name: "listActions",
  width: "min(520px, 100%)"
}).row(selectFirstButton, addButton, updateButton, removeButton);

const panel = new Panel("#root", {
  name: "listPanel"
}).add(list, actions, log);

list.events.on("itemClick", event => {
  log.write(`itemClick ${event.id}`);
});

list.events.on("selectionChange", event => {
  const selected = event.items.map(item => item.id).join(", ") || "(none)";
  log.write(`selection ${selected}, origin=${event.origin}, user=${event.userAction}`);
});

list.events.on("activeChange", event => {
  log.write(`active ${event.id}`);
});

list.data.parse(initialItems, {
  origin: "import"
});

log.write("lab11 ready");

window.lab11 = {
  panel,
  list,
  actions,
  log
};
