import { Grid } from "../src/ui/Grid.js";
import { gridEditors } from "../src/ui/GridEditors.js?v=0.3.6";

const result = document.querySelector("#result");

try {
  const grid = new Grid("#fixture", {
    name: "gridBrowserSmoke",
    width: "100%",
    height: "100%",
    rowHeight: 24,
    statusBar: {
      pagination: {
        pageSize: 100,
        pageSizes: [50, 100, 250]
      }
    },
    columns: [
      { id: "id", title: "ID", width: 100 },
      {
        id: "name",
        title: "Name",
        width: 180,
        editor: gridEditors.text({
          validators: [value => value === "" ? "Name is required" : null]
        }),
        sortable: true,
        filterable: true,
        filterType: "text"
      },
      { id: "active", title: "Active", width: 90, editor: gridEditors.checkbox(), filterable: true },
      { id: "reviewed", title: "Reviewed", width: 100, editor: gridEditors.switch() },
      {
        id: "amount",
        title: "Amount",
        width: 110,
        editor: gridEditors.number({ min: 0 }),
        filterable: true,
        summary: "total"
      },
      {
        id: "status",
        title: "Status",
        width: 120,
        editor: gridEditors.select({ options: ["draft", "active", "done"] }),
        filterable: true
      },
      { id: "updated", title: "Updated", width: 130, editor: gridEditors.date() },
      { id: "reminder", title: "Reminder", width: 130, editor: gridEditors.time({ hourMode: "1-24" }) },
      { id: "scheduled", title: "Scheduled", width: 190, editor: gridEditors.dateTime({ hourMode: "1-24" }) }
    ]
  });

  grid.data.parse(createRows(5000), { origin: "import" });

  const body = grid.element.querySelector(".dui-grid__body");
  assert(
    grid.element.getAttribute("aria-rowcount") === "102",
    "initial aria-rowcount"
  );
  assert(body.scrollHeight === 2400, "initial paged virtual height");
  assert(body.querySelectorAll(".dui-grid__row").length < 100, "virtual row count");
  assert(
    grid.element.querySelector(".dui-grid__status-position").textContent === "Row 1 / 100",
    "initial status row position"
  );
  assert(grid.getPageState().pageCount === 50, "initial page count");
  assert(grid.element.classList.contains("dui-grid--has-footer"), "initial total summary footer");

  grid.element.querySelector('[data-dui-grid-filter-column-id="amount"]').click();
  const summarySelect = document.querySelector(".dui-grid-filter__summary-select");
  assert(Boolean(summarySelect), "summary selector in filter popup");
  assert(Array.from(summarySelect.options).some(option => option.value === "total"), "numeric total summary option");
  summarySelect.value = "none";
  document.querySelector(".dui-grid-filter__apply").click();
  assert(!grid.element.classList.contains("dui-grid--has-footer"), "None hides empty summary footer");
  assert(getComputedStyle(grid.element.querySelector(".dui-grid__footer")).display === "none", "hidden footer leaves no implicit Grid row");

  grid.element.querySelector('[data-dui-grid-filter-column-id="amount"]').click();
  document.querySelector(".dui-grid-filter__summary-select").value = "total";
  document.querySelector(".dui-grid-filter__apply").click();
  assert(grid.element.classList.contains("dui-grid--has-footer"), "Total restores summary footer");
  assert(grid.element.querySelector('[data-dui-grid-column-id="amount"].dui-grid__footer-cell').textContent.startsWith("Total "), "total summary text");

  grid.element.querySelector(".dui-grid__page-button:not(:disabled):nth-child(5)").click();
  assert(grid.getPageState().page === 2, "next page control");
  assert(grid.view.all()[0].id === "row-101", "second page projection");
  grid.firstPage({ silent: true, origin: "system" });

  grid.setFilter(item => item.active, { silent: true, origin: "system" });
  assert(grid.view.all().length === 100, "silent filtered page projection");
  assert(grid.getPageState().filteredCount === 1000, "silent filtered count");
  assert(grid.getPageState().pageCount === 10, "silent filtered page count");
  assert(body.scrollHeight === 2400, "silent filtered page height");
  assert(
    grid.element.querySelector(".dui-grid__status-filtered").textContent === "Filtered 1,000",
    "filtered status count"
  );

  grid.clearFilter({ silent: true, origin: "system" });
  assert(grid.view.all().length === 100, "silent cleared page projection");
  assert(grid.getPageState().filteredCount === 5000, "silent cleared filtered count");
  assert(body.scrollHeight === 2400, "silent cleared page height");

  const filterButton = grid.element.querySelector('[data-dui-grid-filter-column-id="active"]');
  assert(Boolean(filterButton), "active filter button");
  filterButton.click();
  assert(Boolean(document.querySelector(".dui-grid-filter")), "filter popup opens");

  const falseValue = document.querySelector(
    '.dui-grid-filter__value input[data-dui-grid-filter-value-key="boolean:false"]'
  );
  assert(Boolean(falseValue), "false filter value");
  falseValue.click();
  document.querySelector(".dui-grid-filter__apply").click();
  assert(grid.view.all().length === 100, "popup applies value filter page");
  assert(grid.getPageState().filteredCount === 1000, "popup applies value filter count");
  assert(grid.filters.get("active").values[0] === true, "active filter model value");

  grid.element.querySelector('[data-dui-grid-filter-column-id="active"]').click();
  document.querySelector(".dui-grid-filter__clear").click();
  assert(grid.view.all().length === 100, "popup clears value filter page");
  assert(grid.getPageState().filteredCount === 5000, "popup clears value filter count");

  grid.element.querySelector('[data-dui-grid-filter-column-id="name"]').click();
  document.querySelector('[data-dui-grid-filter-mode="condition"]').click();
  assert(!document.querySelector(".dui-grid-filter__condition").hidden, "Condition tab panel opens");
  assert(document.querySelector('[data-dui-grid-filter-mode="condition"]').getAttribute("aria-selected") === "true", "Condition tab selected state");
  const operator = document.querySelector(".dui-grid-filter__operator");
  operator.value = "startsWith";
  operator.dispatchEvent(new Event("change", { bubbles: true }));
  document.querySelector(".dui-grid-filter__condition-value").value = "Row 1";
  document.querySelector(".dui-grid-filter__apply").click();
  assert(grid.view.all().length === 100, "popup applies typed text filter page");
  assert(grid.getPageState().filteredCount === 1111, "popup applies typed text filter count");
  assert(grid.filters.get("name").kind === "text", "typed filter reaches model");
  grid.clearColumnFilter("name", { silent: true, origin: "system" });

  grid.element.querySelector('[data-dui-grid-filter-column-id="status"]').click();
  const statusConditionTab = document.querySelector('[data-dui-grid-filter-mode="condition"]');
  assert(!statusConditionTab.hidden, "Status exposes Condition tab");
  statusConditionTab.click();
  const statusOperator = document.querySelector(".dui-grid-filter__operator");
  statusOperator.value = "startsWith";
  statusOperator.dispatchEvent(new Event("change", { bubbles: true }));
  document.querySelector(".dui-grid-filter__condition-value").value = "do";
  document.querySelector(".dui-grid-filter__apply").click();
  assert(grid.filters.get("status").kind === "text", "Status condition creates text filter");
  assert(grid.view.all().every(item => item.status === "done"), "Status startsWith condition applies");
  grid.clearColumnFilter("status", { silent: true, origin: "system" });

  body.scrollTop = 1200;
  grid._renderRows();
  const scrollTopBeforeClick = body.scrollTop;
  const visibleCell = body.querySelector('[data-dui-grid-row-index="55"] .dui-grid__cell');
  assert(Boolean(visibleCell), "visible cell for click navigation");
  visibleCell.click();
  assert(body.scrollTop === scrollTopBeforeClick, "cell click preserves vertical scroll position");
  const selectedRow = visibleCell.closest(".dui-grid__row");
  assert(getComputedStyle(selectedRow).outlineStyle === "none", "selected row has no outline");
  assert(
    getComputedStyle(selectedRow.querySelector(".dui-grid__cell"), "::before").width === "3px",
    "selected row has left accent"
  );
  assert(
    grid.element.querySelector(".dui-grid__status-position").textContent === "Row 56 / 100",
    "clicked row status position"
  );

  body.scrollTop = 0;
  grid._renderRows();

  const editRejects = [];
  grid.events.on("editReject", event => editRejects.push(event));

  assert(grid.startEdit("row-1", "name"), "start successful edit");
  setActiveEditorValue(grid, "");
  assert(!grid.commitEdit({ origin: "user", userAction: true }), "validation rejects empty edit");
  assert(editRejects.at(-1).reason === "validation", "validation rejection reason");
  assert(grid.element.querySelectorAll(".dui-grid__control-editor").length === 1, "validation keeps editor open");
  setActiveEditorValue(grid, "Changed");
  assert(grid.commitEdit({ origin: "user", userAction: true }), "commit successful edit");
  assert(grid.data.get("row-1").name === "Changed", "successful edit reaches model");

  assert(grid.startEdit("row-1", "amount"), "start number edit");
  setActiveEditorValue(grid, "42");
  assert(grid.commitEdit({ origin: "user", userAction: true }), "commit number edit");
  assert(grid.data.get("row-1").amount === 42, "NumberInput returns number");

  assert(grid.startEdit("row-1", "status"), "start select edit");
  const statusSelect = grid.element.querySelector(".dui-grid__editor-host select");
  statusSelect.value = Array.from(statusSelect.options).find(option => option.textContent === "done").value;
  statusSelect.dispatchEvent(new Event("change", { bubbles: true }));
  assert(grid.commitEdit({ origin: "user", userAction: true }), "commit select edit");
  assert(grid.data.get("row-1").status === "done", "SelectInput preserves option value");

  for (const [columnId, nextValue] of [
    ["updated", "2026-08-15"],
    ["reminder", "18:30"],
    ["scheduled", "2026-08-15 18:30"]
  ]) {
    assert(grid.startEdit("row-1", columnId), `start ${columnId} edit`);
    setActiveEditorValue(grid, nextValue);
    assert(grid.commitEdit({ origin: "user", userAction: true }), `commit ${columnId} edit`);
  }
  assert(grid.data.get("row-1").updated === "2026-08-15", "DateInput value");
  assert(grid.data.get("row-1").reminder === "18:30", "TimeInput value");
  assert(grid.data.get("row-1").scheduled === "2026-08-15T18:30", "DateTimeInput value");

  assert(grid.startEdit("row-1", "name"), "start Tab navigation edit");
  const tabInput = grid.element.querySelector(".dui-grid__editor-host input");
  tabInput.dispatchEvent(new KeyboardEvent("keydown", {
    key: "Tab",
    bubbles: true,
    cancelable: true
  }));
  assert(grid._editing?.column.id === "active", "Tab moves to next editable cell");
  assert(Boolean(grid.element.querySelector(".dui-grid__control-editor.dui-checkbox")), "CheckBox control editor mounted");
  grid.cancelEdit({ silent: true, origin: "system" });

  assert(grid.startEdit("row-1", "reviewed"), "start switch edit");
  assert(Boolean(grid.element.querySelector(".dui-grid__control-editor.dui-switch")), "Switch control editor mounted");
  grid.cancelEdit({ silent: true, origin: "system" });

  const veto = grid.data.events.on("beforeChange", event => {
    if (event.operation === "update") {
      event.cancel = true;
    }
  });

  assert(grid.startEdit("row-1", "name"), "start rejected edit");
  setActiveEditorValue(grid, "Rejected");
  assert(!grid.commitEdit({ origin: "user", userAction: true }), "reject vetoed edit");
  assert(grid.data.get("row-1").name === "Changed", "veto preserves model");
  assert(grid.element.querySelectorAll(".dui-grid__control-editor").length === 1, "veto keeps editor open");
  assert(Boolean(grid.element.getAttribute("aria-activedescendant")), "active cell descendant");

  veto.dispose();
  grid.cancelEdit({ silent: true, origin: "system" });
  result.dataset.status = "passed";
  result.textContent = "PASS: Grid v0.3.7 browser smoke";
} catch (error) {
  result.dataset.status = "failed";
  result.textContent = `FAIL: ${error.stack ?? error.message ?? String(error)}`;
  console.error(error);
}

function createRows(count) {
  return Array.from({ length: count }, (_, index) => ({
    id: `row-${index + 1}`,
    name: `Row ${index + 1}`,
    active: index % 5 === 0,
    reviewed: index % 3 === 0,
    amount: index * 10,
    status: ["draft", "active", "done"][index % 3],
    updated: "2026-07-10",
    reminder: "09:15",
    scheduled: "2026-07-10T09:15"
  }));
}

function setActiveEditorValue(grid, value) {
  const input = grid.element.querySelector(".dui-grid__editor-host input");
  assert(Boolean(input), "active control editor input");
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
