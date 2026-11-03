import { Form, Grid, Panel, TextInput } from "../../src/ui/all.js";

export function createMasterDetail(container, customers) {
  const grid = new Grid({
    name: "customerGrid",
    width: "100%",
    height: 240,
    columns: [
      { id: "name", title: "Customer", minWidth: 180, sortable: true },
      { id: "email", title: "Email", minWidth: 220 }
    ]
  });

  const name = new TextInput({ name: "name", label: "Name" });
  const email = new TextInput({ name: "email", label: "Email" });
  const details = new Form({ name: "customerDetails", labelWidth: 72 })
    .row(name)
    .row(email);

  grid.data.parse(customers, { origin: "import" });
  grid.events.on("selectionChange", event => {
    const selected = event.items[0];
    if (selected) {
      details.value.set(selected, { origin: "selection", silent: true });
    }
  });

  return new Panel(container, { name: "customerMasterDetail" }).add(grid, details);
}
