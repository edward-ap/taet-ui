import { importsFor } from "./pageHelpers.js";
import { Button, Panel, Toolbar } from "../../../src/ui/index.js";
import { Grid, gridEditors, GridDataProvider } from "../../../src/ui/experimental.js";

export function gridExample(title, create, description) {
  return { title, create, description,
    source: `${create.toString()}\n\nconst example = ${create.name}({ container: "#root", log });\n// Replace log.write with your application action.\n// On screen teardown: example.destroy();` };
}
const imports = importsFor(["Button", "Panel", "Toolbar", "Grid", "gridEditors"]);
const notes = ["Use unique, stable row ids and mutate records through grid.data. Grid owns its default data, view and selection; externally supplied models remain caller-owned. Destroy the example owner on screen teardown."];

export const gridPage = {
  id: "grid", title: "Basic Grid", status: "experimental", imports,
  keywords: ["Grid", "TableGrid", "table", "columns", "rows"],
  description: "A compact table of records with resizable columns and formatted values.",
  paragraphs: ["Grid is the component name and the name of this documentation group. Use it for tabular records; use PropertyGrid for the properties of one object. TreeTableList under List covers the hierarchical TreeGrid variant.",
    "Column ids read matching row properties. A render function changes presentation without changing data. Columns without editors are read-only. Drag a header boundary to resize a column."],
  examples: [gridExample("A read-only product table", function createBasicGrid({ container, log }) {
    const grid = new Grid(container, { name: "basicGrid", width: "100%", height: 170, columnMenu: false, statusBar: true,
      columns: [{ id: "name", title: "Product", width: 240 }, { id: "quantity", title: "Quantity", width: 100, align: "right" },
        { id: "price", title: "Unit price", width: 120, align: "right", render: value => "$" + value.toFixed(2) },
        { id: "available", title: "Available", width: 120, render: value => value ? "In stock" : "Back order" }]
    });
    grid.data.parse([{ id: "keyboard", name: "Keyboard", quantity: 12, price: 49.5, available: true },
      { id: "mouse", name: "Mouse", quantity: 24, price: 19.9, available: true },
      { id: "monitor", name: "Monitor", quantity: 0, price: 249, available: false }], { origin: "import" });
    grid.events.on("selectionChange", event => log.write("Selected: " + event.items.map(item => item.name).join(", ")));
    return grid;
  }, "Prices remain numbers and availability remains boolean in the source data. Select a row to inspect its selection event.")],
  options: [{ name: "columns", type: "GridColumn[]", description: "Column id, title, width, align, render and optional editor." },
    { name: "data / view", type: "DataStore / DataView", description: "Optional external source and projection." },
    { name: "width / height", type: "number | string", description: "Viewport dimensions; a bounded height enables vertical scrolling." },
    { name: "columnMenu / columnReorder", type: "boolean", description: "Header commands and column dragging; enabled by default." },
    { name: "statusBar", type: "boolean | object", description: "Row position, counts and optional pagination." }],
  methods: [{ name: "data.parse(rows, options)", type: "boolean", description: "Replace source records." },
    { name: "data.update(id, changes, options)", type: "boolean", description: "Update a record and synchronize its projection." },
    { name: "setColumns(columns)", type: "Grid", description: "Replace the column schema." },
    { name: "getLayoutState()", type: "object", description: "Read column layout for application-controlled persistence." },
    { name: "restoreLayoutState(state, options)", type: "Grid", description: "Apply saved layout separately from row data." }],
  events: [{ name: "columnResizeEnd", type: "GridColumnResizeEvent", description: "Final column width after resizing." }], notes
};

export const editableGridPage = {
  id: "editable-grid", title: "Editable Grid", status: "experimental", imports,
  keywords: ["edit", "text", "number", "select", "checkbox", "validation"],
  description: "Typed cell editors that write changes back to the row data.",
  paragraphs: ["Double-click a text, number or select cell to edit. Enter commits, Escape cancels. Boolean cells toggle directly. ID has no editor and remains read-only.",
    "gridEditors creates Tæt UI controls inside cells. beforeCellChange supports cancellable application rules; cellChange reports a successful write.",
    "Built-in editor options can be a function of { source, grid, item, id, rowIndex, column, columnId, value }; custom factories receive the same context in Grid and TreeGrid. This example uses rowIndex to choose an empty-field hint.",
    "rowIndex is captured when editing starts: the zero-based position on Grid's current sorted/filtered page, or in TreeGrid's flattened visible hierarchy. It is independent of the mounted viewport. Use id for record identity; a preserved draft retains its original context."],
  examples: [gridExample("Editable field schema", function createEditableGrid({ container, log }) {
    const owner = new Panel(container, { name: "editableGridExample" });
    const grid = new Grid({ name: "editableGrid", width: "100%", height: 180, statusBar: true,
      columns: [{ id: "id", title: "ID", width: 125 },
        { id: "name", title: "Field", width: 190, editor: gridEditors.text(context => ({ placeholder: `Field ${context.rowIndex + 1}` })) },
        { id: "type", title: "Type", width: 110, editor: gridEditors.select({ options: ["string", "number", "date"] }) },
        { id: "width", title: "Width", width: 95, align: "right", editor: gridEditors.number({ min: 1, max: 500 }) },
        { id: "required", title: "Required", width: 100, align: "center", editor: gridEditors.checkbox(), render: value => value ? "Yes" : "No" }]
    });
    owner.add(new Toolbar().add(new Button({ text: "Read Rows", onClick: () => log.write(JSON.stringify(grid.data.all())) })), grid);
    grid.data.parse([{ id: "customerId", name: "Customer ID", type: "string", width: 120, required: true },
      { id: "amount", name: "Amount", type: "number", width: 80, required: false },
      { id: "created", name: "Created", type: "date", width: 100, required: true }], { origin: "import" });
    grid.events.on("beforeCellChange", event => {
      if (event.columnId === "name" && !String(event.newValue).trim()) {
        event.cancel = true;
        log.write("Field name cannot be empty.");
      }
    });
    grid.events.on("cellChange", event => log.write(`${event.columnId}: ${event.oldValue} → ${event.newValue}`));
    return owner;
  }, "Rename Amount, change its type or width, and toggle Required. Read Rows shows actual records. Empty field names are rejected.")],
  options: [{ name: "columns[].editor", type: "GridEditorFactory", description: "gridEditors.text, number, select, checkbox, switch, date, time, dateTime, radio or custom." }],
  methods: [{ name: "startEdit(rowId, columnId)", type: "boolean", description: "Activate the configured editor." },
    { name: "commitEdit(options) / cancelEdit(options)", type: "boolean", description: "Commit a valid edit or discard the draft." }],
  events: [{ name: "beforeCellChange", type: "{ columnId, newValue, cancel }", description: "Set cancel = true to reject the write." },
    { name: "cellChange", type: "{ id, columnId, oldValue, newValue }", description: "Notification after a successful data update." }], notes
};

export const filteringGridPage = {
  id: "grid-filtering", title: "Sorting and Filtering", status: "experimental", imports,
  keywords: ["Grid", "sort", "filter", "search", "header menu"],
  description: "Sort and filter the visible projection while keeping source records intact.",
  paragraphs: ["Click column headings to sort, or use header menus for value and condition filters. The toolbar demonstrates the corresponding API.",
    "Search has its own query and mode. Reset Filters clears column/global filters and sorting; clear a search query separately in the search panel."],
  examples: [gridExample("Task queue", function createFilteringGrid({ container, log }) {
    const owner = new Panel(container, { name: "filteringGridExample" });
    const grid = new Grid({ name: "filteringGrid", width: "100%", height: 270, filterable: true, searchPanel: true, statusBar: true,
      columns: [{ id: "task", title: "Task", width: 260, sortable: true }, { id: "status", title: "Status", width: 140, sortable: true },
        { id: "priority", title: "Priority", width: 120, sortable: true, align: "right", filterType: "number" }]
    });
    const action = { origin: "user", userAction: true };
    owner.add(new Toolbar().add(
      new Button({ text: "Ready Only", onClick: () => grid.setColumnFilter("status", { kind: "values", values: ["Ready"] }, action) }),
      new Button({ text: "Highest Priority", onClick: () => grid.sortBy("priority", "desc", action) }),
      new Button({ text: "Reset Filters", onClick: () => { grid.clearAllFilters(action); grid.clearSort(action); } })
    ), grid);
    grid.data.parse([{ id: 1, task: "Import customers", status: "Ready", priority: 2 },
      { id: 2, task: "Map addresses", status: "Draft", priority: 1 }, { id: 3, task: "Validate emails", status: "Ready", priority: 5 },
      { id: 4, task: "Resolve duplicates", status: "Blocked", priority: 4 }, { id: 5, task: "Export contacts", status: "Ready", priority: 3 },
      { id: 6, task: "Archive source", status: "Draft", priority: 2 }], { origin: "import" });
    const report = () => log.write(`${grid.view.all().length} visible / ${grid.data.all().length} source rows`);
    grid.events.on("filterChange", report);
    grid.events.on("sortChange", report);
    return owner;
  }, "Ready Only leaves three records. Highest Priority puts Validate emails first. Reset restores all six records and their original order.")],
  options: [{ name: "filterable / searchPanel", type: "boolean", description: "Enable header filters and the search panel." },
    { name: "columns[].sortable / filterType", type: "boolean / string", description: "Allow sorting and specify filter value type." }],
  methods: [{ name: "sortBy(id, direction, options)", type: "boolean", description: "Sort asc / desc; additive: true adds a sort rule." },
    { name: "setColumnFilter(id, filter, options)", type: "boolean", description: "Apply a values or condition filter." },
    { name: "clearAllFilters(options) / clearSort(options)", type: "boolean", description: "Reset projection without removing source rows." }],
  events: [{ name: "filterChange / sortChange", type: "GridEvent", description: "Reports a committed projection change." }], notes
};

export const selectionGridPage = {
  id: "grid-selection", title: "Row Selection", status: "experimental", imports,
  keywords: ["Grid", "multiple", "selection", "rows", "ids"],
  description: "Single-row selection by default, with optional multiple selection and commands using stable ids.",
  paragraphs: ["Enable multiSelect for Ctrl/Cmd-click. Add rowRangeSelection for Shift-click and Shift+Up/Down/Home/End row ranges. Ctrl/Cmd+Shift adds a range; Ctrl/Cmd+Up/Down moves focus without replacing selection. Ordinary Up/Down selects one row in this mode. Grid cell ranges remain the default when rowRangeSelection is omitted.",
    "Projection reconciliation is silent: a filter, page change or removal can prune getSelectedIds() without a table selectionChange event. After an application filter action, re-read the selected IDs before keeping a separate form/current-record context. For one technical subscription that also covers silent writes, use grid.selection.events.on(\"invalidate\", callback) and dispose it with the screen owner. Keep business selection notifications separate; do not duplicate the same side effect on both channels."],
  examples: [gridExample("Select export jobs", function createSelectionGrid({ container, log }) {
    const owner = new Panel(container, { name: "selectionGridExample" });
    const grid = new Grid({ name: "selectionGrid", width: "100%", height: 200, multiSelect: true, rowRangeSelection: true, statusBar: true,
      columns: [{ id: "name", title: "Export job", width: 280 }, { id: "format", title: "Format", width: 160 }]
    });
    owner.add(new Toolbar().add(
      new Button({ text: "Select All", onClick: () => grid.setSelectedIds(grid.view.all().map(row => row.id), { origin: "user", userAction: true }) }),
      new Button({ text: "Clear Selection", onClick: () => grid.clearSelection({ origin: "user", userAction: true }) }),
      new Button({ text: "Read Selection", onClick: () => log.write(JSON.stringify(grid.getSelectedIds())) })
    ), grid);
    grid.data.parse([{ id: "customers", name: "Customers", format: "CSV" }, { id: "orders", name: "Orders", format: "JSON" },
      { id: "products", name: "Products", format: "CSV" }, { id: "audit", name: "Audit trail", format: "JSON" }], { origin: "import" });
    grid.setSelectedIds(["customers"], { silent: true });
    grid.events.on("selectionChange", () => log.write(JSON.stringify(grid.getSelectedIds())));
    return owner;
  }, "Customers starts selected. Click Customers, then Shift-click Audit trail to select a block. Ctrl/Cmd-click toggles individual jobs. Shift+Up shrinks the block."),
    gridExample("Reorder local rows", function createRowReorderGrid({ container, log }) {
      const grid = new Grid(container, { name: "rowReorderGrid", width: "100%", height: 220,
        multiSelect: true, rowRangeSelection: true, rowReorder: true,
        columns: [{ id: "name", title: "Job", width: 280 }, { id: "status", title: "Status", width: 150 }] });
      grid.data.parse(Array.from({ length: 12 }, (_, i) => ({ id: i, name: `Job ${i + 1}`, status: "Pending" })));
      grid.events.on("rowReorder", event => log.write(`Moved ${event.ids.join(", ")} ${event.position} ${event.targetId}`));
      return grid;
    }, "Select a block, then drag its first-column handle above or below another row. Focus a handle and press Alt+Up/Down for keyboard movement. Local Grid only; sorting, grouping and remote data disable reordering.")],
  options: [{ name: "multiSelect", type: "boolean", description: "Allow several selected records; false by default." },
    { name: "rowRangeSelection", type: "boolean", description: "Opt-in row block selection for Grid/TreeGrid. Disables Grid pointer and keyboard cell ranges; false by default." },
    { name: "rowReorder", type: "boolean", description: "Grid-only local row drag handles and Alt+Up/Down; false by default." }],
  methods: [{ name: "getSelectedIds()", type: "unknown[]", description: "Read selected stable identifiers." },
    { name: "setSelectedIds(ids, options) / clearSelection(options)", type: "boolean", description: "Set or clear row selection." }],
  events: [{ name: "selectionChange", type: "{ items, oldItems, origin, userAction }", description: "Selected data records after non-silent selection writes; projection pruning is silent." }], notes
};

export const largeGridPage = {
  id: "grid-large-data", title: "Large Data and Paging", status: "experimental",
  imports: importsFor(["Button", "Panel", "Toolbar", "Grid", "gridEditors", "GridDataProvider"]),
  keywords: ["Grid", "virtual", "scroll", "pagination", "pageSize", "summary"],
  description: "Show the table immediately, load 10,000 records asynchronously with a spinner, then scroll through a virtual row window.",
  paragraphs: ["The documentation navigation creates this example only when Large Data and Paging is opened, including through its direct URL. Starting on another page or expanding the Grid navigation group does not allocate these records. Leaving this page destroys the grid and its owned data; reopening it creates a fresh dataset.",
    "The loader lets the browser paint the page and spinner first, then generates local records in short chunks, yielding between chunks. After loading, all 10,000 records are in memory. Merely adding async would not move synchronous work off the main thread. In a network loader, await fetch and pass the supplied signal instead.",
    "Lazy Loading is a separate page demonstrating batches of 50 records. The second example below demonstrates local paging; neither local example requires a backend.",
    "Grid virtualizes both rows and body columns by default. Use fixed rowHeight and numeric or fractional column widths. Frozen columns stay mounted. Grouping and expanded detail rows keep row virtualization; detail heights are measured as they enter the viewport.",
    "DataStore changes and semantic events are synchronous; their DOM updates share the next animation frame. Use grid.refresh() when immediate DOM synchronization is required. DataStore.batch remains useful because it also reduces model/projection work.",
    "Set virtualColumns: false to render every body column. Intrinsic auto/min-content/max-content widths also use all columns. Headers and summary footers always contain all columns. The paged example adds a sum of quantities on the current page."],
  examples: [gridExample("10,000 rows with virtual scrolling", function createVirtualGrid({ container, log }) {
    const provider = new GridDataProvider(async (request, { signal }) => {
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const items = [];
      for (let offset = 0; offset < 10000; offset += 500) {
        signal.throwIfAborted();
        for (let index = offset; index < offset + 500; index++) {
          items.push({ id: index + 1, name: `Record ${index + 1}`, quantity: (index * 7) % 100 });
        }
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      return { items, totalCount: items.length };
    });
    const grid = new Grid(container, { name: "virtualGrid", dataProvider: provider, width: "100%", height: 280, rowHeight: 24, statusBar: true,
      columns: [{ id: "id", title: "ID", width: 100 }, { id: "name", title: "Record", width: 260 }, { id: "quantity", title: "Quantity", width: 120, align: "right" }]
    });
    grid.disposables.add(() => provider.destroy());
    grid.events.on("selectionChange", () => log.write("Selected ids: " + grid.getSelectedIds().join(", ")));
    void grid.reloadRemote().then(() => {
      if (!grid.destroyed) log.write("Loaded 10,000 records");
    }).catch(error => {
      if (!grid.destroyed && error.name !== "AbortError") log.write(error.message);
    });
    return grid;
  }, "The page appears before loading completes. After the spinner disappears, drag the vertical scrollbar to Record 10000. Leaving the page cancels pending work."),
  gridExample("Pages and a quantity summary", function createPagedGrid({ container, log }) {
    const grid = new Grid(container, { name: "pagedGrid", width: "100%", height: 280,
      statusBar: { visible: true, pagination: { pageSize: 10, pageSizes: [10, 25, 50] } },
      columns: [{ id: "id", title: "ID", width: 100 }, { id: "name", title: "Shipment", width: 260 },
        { id: "quantity", title: "Quantity", width: 140, align: "right", dataType: "number", summary: { kind: "total", scope: "page" } }]
    });
    grid.data.parse(Array.from({ length: 125 }, (_, index) => ({ id: index + 1, name: `Shipment ${index + 1}`, quantity: index % 10 + 1 })), { origin: "import" });
    grid.events.on("selectionChange", () => log.write("Selected ids: " + grid.getSelectedIds().join(", ")));
    return grid;
  }, "Use the footer arrows to change page, or choose 25 / 50 rows per page. Quantity summarizes the current page."),
  gridExample("100 columns with frozen edges", function createWideGrid({ container, log }) {
    const columns = [{ id: "id", title: "Record", width: 100, frozen: "left" },
      ...Array.from({ length: 98 }, (_, c) => ({ id: `c${c + 1}`, title: `Column ${c + 1}`, width: 120 })),
      { id: "status", title: "Status", width: 100, frozen: "right" }];
    const grid = new Grid(container, { name: "wideGrid", width: "100%", height: 280, rowHeight: 24,
      virtualColumns: true, columns });
    grid.data.parse(Array.from({ length: 1000 }, (_, r) => Object.fromEntries([
      ["id", r + 1], ["status", r % 2 ? "Ready" : "Review"],
      ...Array.from({ length: 98 }, (_, c) => [`c${c + 1}`, `R${r + 1} / C${c + 1}`])
    ])));
    grid.events.on("selectionChange", () => log.write("Selected record: " + grid.getSelectedIds().join(", ")));
    return grid;
  }, "Scroll horizontally and vertically. Record and Status remain pinned, including on the selected row; only nearby body cells are mounted. All 1,000 source records remain in memory.")],
  options: [{ name: "dataProvider", type: "GridDataProvider", description: "Async loader. Grid displays a spinner while its request is pending." },
    { name: "height / rowHeight", type: "number", description: "Viewport height and fixed virtual row height." },
    { name: "virtualRows / virtualColumns", type: "boolean", description: "Both default to true. Disable either axis independently; this limits DOM, not source memory." },
    { name: "virtualOverscan", type: "number", description: "Extra rows above and below the viewport; default 6. Columns keep one extra track on each side." },
    { name: "statusBar.pagination", type: "object", description: "Initial page, pageSize and available pageSizes." },
    { name: "columns[].summary", type: "object", description: "Aggregation kind and scope: page, filtered, all or selection." }],
  methods: [{ name: "reloadRemote(overrides, options)", type: "Promise<Response>", description: "Load records asynchronously and clear the spinner on completion or failure." },
    { name: "setPage(page, options) / setPageSize(size, options)", type: "boolean", description: "Change local page or size. Pages are one-based." },
    { name: "getPageState()", type: "object", description: "Read current paging state." }], notes
};
