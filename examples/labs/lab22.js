import { Button } from "../../src/ui/Button.js?v=22.13";
import { Grid } from "../../src/ui/Grid.js?v=22.16";
import { gridEditors } from "../../src/ui/GridEditors.js?v=22.13";
import { LabelText } from "../../src/ui/LabelText.js?v=22.13";
import { Layout } from "../../src/ui/Layout.js?v=22.13";
import { LogPanel } from "../../src/ui/LogPanel.js?v=22.13";
import { Panel } from "../../src/ui/Panel.js?v=22.13";
import { Switch } from "../../src/ui/Switch.js?v=22.13";

const themeClasses = ["dui-theme-light", "dui-theme-light-blue", "dui-theme-dark-blue"];
const statuses = [
  { id: "draft", text: "Draft" },
  { id: "active", text: "Active" },
  { id: "review", text: "Review" },
  { id: "blocked", text: "Blocked" },
  { id: "done", text: "Done" }
];
const owners = ["Nora", "Ivan", "Maya", "Alex", "Sophia", "Noah", "Liam", "Emma"];

const layout = new Layout("#root", {
  name: "lab22Layout",
  width: "100%",
  height: "100%",
  cols: [
    { name: "side", width: 230, minSize: 200 },
    { name: "main", flex: 1, minSize: 520 },
    { name: "log", width: 310, minSize: 240 }
  ]
});

const sidePanel = new Panel({
  name: "lab22SidePanel",
  className: "dui-lab22-side",
  bordered: true,
  scroll: "auto"
});

const mainPanel = new Panel({
  name: "lab22MainPanel",
  className: "dui-lab22-main",
  bordered: true
});

const titlePanel = new Panel({
  name: "lab22Title",
  className: "dui-lab22-title"
});

const log = new LogPanel({
  name: "lab22Log",
  height: "100%"
});

const rowCounter = new LabelText({
  name: "lab22Counter",
  text: ""
});

const grid = new Grid({
  name: "lab22Grid",
  className: "dui-lab22-grid",
  rowHeight: 24,
  virtualOverscan: 12,
  multiSelect: true,
  searchPanel: true,
  rowDetail: row => `Customer ${row.customer}; owner ${row.owner}; status ${row.status}; ${row.notes}`,
  formatting: [{
    id: "high-amount",
    columnId: "amount",
    when: value => Number(value) >= 3000,
    style: { color: "var(--dui-color-invalid-border)", fontWeight: "600" },
    icon: "warning"
  }],
  statusBar: {
    visible: true,
    showRowPosition: true,
    showFilteredCount: true,
    showTotalCount: true,
    pagination: {
      pageSize: 100,
      pageSizes: [25, 50, 100, 250, 500]
    }
  },
  columns: [
    {
      id: "id",
      title: "ID",
      width: 86,
      minWidth: 70,
      frozen: "left",
      sortable: true
    },
    {
      id: "customer",
      title: "Customer",
      width: 190,
      sortable: true,
      filterable: true,
      filterType: "text",
      summary: "count",
      editor: gridEditors.text({
        validators: [value => String(value).trim() === "" ? "Customer is required" : null]
      })
    },
    {
      id: "status",
      title: "Status",
      width: 118,
      sortable: true,
      filterable: true,
      filterType: "values",
      editor: gridEditors.select({
        options: statuses
      })
    },
    {
      id: "amount",
      title: "Amount",
      width: 110,
      align: "right",
      sortable: true,
      filterable: true,
      filterType: "number",
      editor: gridEditors.number({
        min: 0,
        step: 10
      }),
      summary: "total",
      summaryFormat: value => formatMoney(value),
      render: value => formatMoney(value),
      dataType: "number"
    },
    {
      id: "active",
      title: "Active",
      width: 78,
      align: "center",
      sortable: true,
      filterable: true,
      filterType: "boolean",
      filterText: value => (value ? "Yes" : "No"),
      editor: gridEditors.switch({
        onText: "",
        offText: ""
      }),
      render: value => Switch.createIndicator(value, {
        className: "dui-grid__switch-indicator",
        ariaLabel: value ? "Active" : "Inactive"
      })
    },
    {
      id: "priority",
      title: "Priority",
      width: 96,
      align: "right",
      sortable: true,
      filterable: true,
      filterType: "number",
      editor: gridEditors.number({
        min: 1,
        max: 10,
        step: 1
      })
    },
    {
      id: "owner",
      title: "Owner",
      width: 150,
      sortable: true,
      filterable: true,
      editor: gridEditors.select({
        options: owners
      })
    },
    {
      id: "updated",
      title: "Updated",
      width: 128,
      sortable: true,
      filterable: true,
      filterType: "date",
      editor: gridEditors.date()
    },
    {
      id: "reminder",
      title: "Reminder",
      width: 128,
      editor: gridEditors.time({
        hourMode: "1-24",
        stepMinutes: 15
      })
    },
    {
      id: "scheduled",
      title: "Scheduled",
      width: 190,
      editor: gridEditors.dateTime({
        hourMode: "1-24",
        stepMinutes: 15
      }),
      render: value => String(value ?? "").replace("T", " ")
    },
    {
      id: "reviewed",
      title: "Reviewed",
      width: 92,
      align: "center",
      editor: gridEditors.switch({
        onText: "",
        offText: ""
      }),
      render: value => value ? "Yes" : "No"
    },
    {
      id: "notes",
      title: "Notes",
      width: 260,
      editor: gridEditors.text()
    }
  ]
});

const lightThemeButton = new Button({
  name: "lightTheme",
  text: "Light Blue",
  onClick() {
    setTheme("dui-theme-light-blue", "light-blue");
  }
});

const darkThemeButton = new Button({
  name: "darkTheme",
  text: "Dark Blue",
  onClick() {
    setTheme("dui-theme-dark-blue", "dark-blue");
  }
});

const resetButton = new Button({
  name: "resetData",
  text: "Reset 5,000 Rows",
  onClick() {
    loadRows(5000);
  }
});

const activeFilterButton = new Button({
  name: "filterActive",
  text: "Filter Active",
  onClick() {
    grid.setFilter(row => row.status === "active", {
      origin: "user",
      userAction: true
    });
    updateCounter();
    log.write("filter status=active");
  }
});

const clearFilterButton = new Button({
  name: "clearFilter",
  text: "Clear Filter",
  onClick() {
    grid.clearAllFilters({
      origin: "user",
      userAction: true
    });
    updateCounter();
    log.write("filter cleared");
  }
});

const sortAmountButton = new Button({
  name: "sortAmount",
  text: "Sort Amount",
  onClick() {
    grid.sortBy("amount", undefined, {
      origin: "user",
      userAction: true
    });
    log.write(`sort=${JSON.stringify(grid.getSortState())}`);
  }
});

const clearSortButton = new Button({
  name: "clearSort",
  text: "Clear Sort",
  onClick() {
    grid.clearSort({
      origin: "user",
      userAction: true
    });
    log.write("sort cleared");
  }
});

const selectKnownButton = new Button({
  name: "selectKnown",
  text: "Select 42, 314, 2048",
  onClick() {
    grid.setSelectedIds(["row-42", "row-314", "row-2048"], {
      origin: "user",
      userAction: true
    });
    log.write(`selected=${grid.getSelectedIds().join(",")}`);
  }
});

const scrollBottomButton = new Button({
  name: "scrollBottom",
  text: "Scroll Bottom",
  onClick() {
    const body = grid.element?.querySelector(".dui-grid__body");

    if (body) {
      body.scrollTop = body.scrollHeight;
      log.write(`scrollTop=${Math.round(body.scrollTop)}`);
    }
  }
});

const clearSelectionButton = new Button({
  name: "clearSelection",
  text: "Clear Selection",
  onClick() {
    grid.clearSelection({
      origin: "user",
      userAction: true
    });
    log.write("selection cleared");
  }
});

const groupStatusButton = new Button({
  name: "groupStatus",
  text: "Group by Status",
  onClick() {
    grid.setGroups([{
      columnId: "status",
      summaries: [{ columnId: "amount", kind: "total" }]
    }], { origin: "user", userAction: true });
    log.write("group=status");
  }
});

const clearGroupsButton = new Button({
  name: "clearGroups",
  text: "Clear Groups",
  onClick() {
    grid.clearGroups({ origin: "user", userAction: true });
    log.write("groups cleared");
  }
});

layout.cell("side").attach(sidePanel);
layout.cell("main").attach(mainPanel);
layout.cell("log").attach(log);

sidePanel.add(
  new LabelText({ text: "Lab 22" }),
  new LabelText({ text: "Grid test bench" }),
  lightThemeButton,
  darkThemeButton,
  resetButton,
  activeFilterButton,
  clearFilterButton,
  sortAmountButton,
  clearSortButton,
  selectKnownButton,
  scrollBottomButton,
  clearSelectionButton,
  groupStatusButton,
  clearGroupsButton
);

mainPanel.add(
  titlePanel,
  grid
);
titlePanel.add(new LabelText({ text: "Virtual Grid" }), rowCounter);

grid.events.on("selectionChange", event => {
  log.write(`selection ${event.items.map(item => grid.data.idOf(item)).join(",") || "(none)"}`);
});

grid.events.on("activeCellChange", event => {
  log.write(`active ${event.id}.${event.columnId}`);
});

grid.events.on("cellChange", event => {
  log.write(`cell ${event.id}.${event.columnId}: ${JSON.stringify(event.oldValue)} -> ${JSON.stringify(event.newValue)}`);
});

grid.events.on("editReject", event => {
  log.write(`edit rejected ${event.id}.${event.columnId}: ${event.reason}`);
});

grid.events.on("viewChange", event => {
  updateCounter();
  log.write(`view change reason=${event.reason ?? ""}`);
});

grid.events.on("sortChange", event => {
  log.write(`sort ${event.columnId} ${event.direction ?? "none"}`);
});

grid.events.on("filterChange", event => {
  updateCounter();
  log.write(`column filters=${event.activeColumns.join(",") || "none"}`);
});

grid.events.on("pageChange", event => {
  updateCounter();
  log.write(`page ${event.pageState.page}/${event.pageState.pageCount}`);
});

loadRows(5000);
log.write("lab22 ready");

window.lab22 = {
  layout,
  sidePanel,
  mainPanel,
  grid,
  log,
  loadRows,
  setTheme
};

function loadRows(count) {
  grid.data.parse(createRows(count), {
    origin: "import"
  });
  grid.clearFilter({ silent: true, origin: "system" });
  grid.clearSort({ silent: true, origin: "system" });
  grid.clearSelection({ silent: true, origin: "system" });
  updateCounter();
  log.write(`loaded ${count} rows`);
}

function createRows(count) {
  const rows = [];

  for (let index = 1; index <= count; index += 1) {
    const status = statuses[index % statuses.length].id;
    rows.push({
      id: `row-${index}`,
      customer: `Customer ${String(index).padStart(4, "0")}`,
      status,
      amount: Math.round(((index * 37.91) % 25000) * 100) / 100,
      active: status === "active" || status === "review",
      priority: (index % 10) + 1,
      owner: owners[index % owners.length],
      updated: `2026-07-${String((index % 28) + 1).padStart(2, "0")}`,
      reminder: `${String((index * 3) % 24).padStart(2, "0")}:${String((index * 15) % 60).padStart(2, "0")}`,
      scheduled: `2026-07-${String((index % 28) + 1).padStart(2, "0")}T${String((index * 3) % 24).padStart(2, "0")}:${String((index * 15) % 60).padStart(2, "0")}`,
      reviewed: index % 3 === 0,
      notes: `Generated row ${index}`
    });
  }

  return rows;
}

function updateCounter() {
  const page = grid.getPageState();
  rowCounter.setText(
    `page rows ${page.pageItemCount} / filtered ${page.filteredCount} / total ${grid.data.all().length}`
  );
}

function setTheme(themeClass, themeName) {
  document.body.classList.remove(...themeClasses);
  document.body.classList.add(themeClass);
  document.body.dataset.theme = themeName;
  log.write(`theme ${themeName}`);
}

function formatMoney(value) {
  return Number(value ?? 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  });
}
