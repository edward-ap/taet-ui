import { Grid } from "../../src/ui/all.js";

export function createReadonlyGrid(container, rows) {
  const grid = new Grid({
    name: "customerGrid",
    width: "100%",
    height: "100%",
    rowHeight: 24,
    filterable: true,
    statusBar: { visible: true, showRowPosition: true, showTotalCount: true },
    columns: [
      { id: "name", title: "Customer", minWidth: 180, sortable: true },
      { id: "country", title: "Country", width: 120, sortable: true },
      { id: "active", title: "Active", width: 72, align: "center" }
    ]
  });

  grid.data.parse(rows, { origin: "import" });
  grid.mount(container);
  return grid;
}
