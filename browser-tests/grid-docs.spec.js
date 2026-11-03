import {docsCatalog as sourceCatalog} from '../docs/src/docsCatalog.js';
const expectedExampleCount=sourceCatalog.find(g=>g.id==='components').groups.find(g=>g.id==='grid-components').pages.reduce((n,p)=>n+(p.examples?.length??0),0);
import { openComponentGroup } from "./docs-helpers.js";
import { test, expect } from "@playwright/test";

const liveGrid = (page, name) => page.locator(`.dui-example-host__live [data-dui-control-id="${name}"]`);
const rowsOf = grid => grid.locator('.dui-grid__row[data-dui-grid-row-id]');
const cell = (grid, row, column) => grid.locator(`[data-dui-grid-row-id="string:${row}"] .dui-grid__cell[data-dui-grid-column-id="${column}"]`);

test("Grid docs demonstrate editing, filters, selection, virtualization and local paging", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/docs/index.html#grid");
  await openComponentGroup(page, "Grid");
  const nav = page.locator(".dui-docs-tree");
  await expect(nav.getByRole("treeitem", { name: "Grid", exact: true })).toHaveAttribute("aria-level", "2");
  for (const name of ["Basic Grid", "Editable Grid", "Sorting and Filtering", "Row Selection", "Large Data and Paging", "Lazy Loading", "PropertyGrid"]) {
    await expect(nav.getByRole("treeitem", { name, exact: true })).toHaveAttribute("aria-level", "3");
  }
  await expect(rowsOf(liveGrid(page, "basicGrid"))).toHaveCount(3);
  await expect(liveGrid(page, "basicGrid")).toContainText("$49.50");
  await nav.getByRole("treeitem", { name: "Editable Grid", exact: true }).click();
  const editable = liveGrid(page, "editableGrid");
  const field = cell(editable, "amount", "name");
  await field.dblclick();
  await expect(field.locator("input")).toHaveAttribute("placeholder", "Field 2");
  await field.locator("input").fill("Invoice amount");
  await field.locator("input").press("Enter");
  await expect(field).toHaveText("Invoice amount");
  await field.dblclick();
  await field.locator("input").fill("");
  await field.locator("input").press("Enter");
  await expect(page.locator(".dui-example-host__output")).toHaveText("Field name cannot be empty.");
  await field.locator("input").press("Escape");
  await expect(field).toHaveText("Invoice amount");
  await cell(editable, "amount", "required").click();
  await page.getByRole("button", { name: "Read Rows", exact: true }).click();
  await expect(page.locator(".dui-example-host__output")).toContainText('"name":"Invoice amount"');
  await expect(page.locator(".dui-example-host__output")).toContainText('"width":80,"required":true');

  await nav.getByRole("treeitem", { name: "Sorting and Filtering", exact: true }).click();
  const filtering = liveGrid(page, "filteringGrid");
  await page.getByRole("button", { name: "Ready Only", exact: true }).click();
  await expect(rowsOf(filtering)).toHaveCount(3);
  await page.getByRole("button", { name: "Highest Priority", exact: true }).click();
  await expect(rowsOf(filtering).first()).toContainText("Validate emails");
  await expect(page.locator(".dui-example-host__output")).toHaveText("3 visible / 6 source rows");
  await page.getByRole("button", { name: "Reset Filters", exact: true }).click();
  await expect(rowsOf(filtering)).toHaveCount(6);
  await expect(rowsOf(filtering).first()).toContainText("Import customers");

  await nav.getByRole("treeitem", { name: "Row Selection", exact: true }).click();
  const selection = liveGrid(page, "selectionGrid");
  await cell(selection, "orders", "name").click({ modifiers: ["ControlOrMeta"] });
  await expect(selection.locator(".dui-grid__row.dui-selected")).toHaveCount(2);
  await page.getByRole("button", { name: "Select All", exact: true }).click();
  await expect(selection.locator(".dui-grid__row.dui-selected")).toHaveCount(4);
  await page.getByRole("button", { name: "Clear Selection", exact: true }).click();
  await expect(page.locator(".dui-example-host").filter({ has: selection }).locator(".dui-example-host__output")).toHaveText("[]");

  await nav.getByRole("treeitem", { name: "Large Data and Paging", exact: true }).click();
  const virtual = liveGrid(page, "virtualGrid");
  await expect(rowsOf(virtual).first()).toContainText("Record 1");
  expect(await rowsOf(virtual).count()).toBeLessThan(60);
  await virtual.locator(".dui-grid__body").evaluate(element => { element.scrollTop = element.scrollHeight; element.dispatchEvent(new Event("scroll")); });
  await expect(rowsOf(virtual).last()).toContainText("Record 10000");
  expect(await rowsOf(virtual).count()).toBeLessThan(60);
  const paged = liveGrid(page, "pagedGrid");
  await expect(rowsOf(paged)).toHaveCount(10);
  await expect(paged.locator(".dui-grid__footer")).toContainText("Total 55");
  await paged.getByRole("button", { name: "Next page", exact: true }).click();
  await expect(rowsOf(paged).first()).toContainText("Shipment 11");
  await paged.getByRole("button", { name: "Last page", exact: true }).click();
  await expect(rowsOf(paged)).toHaveCount(5);
  await expect(paged.locator(".dui-grid__footer")).toContainText("Total 15");
  const wide = liveGrid(page, "wideGrid");
  expect(await wide.locator(".dui-grid__cell").count()).toBeLessThan(600);
  await wide.locator(".dui-grid__body").evaluate(node => { node.scrollLeft = 6000; node.scrollTop = 4800; });
  await expect(wide.locator('[data-dui-grid-row-id="number:201"] [data-dui-grid-column-id="c50"]')).toHaveText("R201 / C50");
  await expect(wide.locator('[data-dui-grid-row-id="number:201"] [data-dui-grid-column-id="id"]')).toBeVisible();
  await expect(wide.locator('[data-dui-grid-row-id="number:201"] [data-dui-grid-column-id="status"]')).toBeVisible();
  await page.getByRole("button", { name: "Dark", exact: true }).click();
  expect(errors).toEqual([]);
});

test("PropertyGrid docs preserve edited object values and support nested categories", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/docs/index.html#property-grid");
  const grid = liveGrid(page, "mappingProperties");
  const property = name => grid.locator(`[data-dui-property-name="${name}"]`);
  const source = property("source").locator("input");
  await source.fill("display_name");
  await source.press("Enter");
  await property("enabled").locator(".dui-property-grid__value").click();
  await property("owner").locator("select").selectOption({ label: "Chen" });
  await page.getByRole("button", { name: "Read Object", exact: true }).click();
  const output = page.locator(".dui-example-host__output");
  await expect(output).toContainText('"source":"display_name"');
  await expect(output).toContainText('"enabled":false');
  await expect(output).toContainText('"owner":"Chen"');
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(source).toHaveValue("display_name");
  await expect(property("enabled").locator("input")).not.toBeChecked();
  await expect(property("owner").locator("select option:checked")).toHaveText("Chen");
  await property("source").locator(".dui-property-grid__name").click();
  await expect(page.locator('[data-dui-control-id="propertyHelp"]')).toHaveText("Source field read from the input dataset.");
  await property("transform.options").locator(".dui-property-grid__property-toggle").click();
  await expect(grid.getByText("Trim input", { exact: true })).toHaveCount(0);
  await property("transform.options").locator(".dui-property-grid__property-toggle").click();
  await expect(grid.getByText("Trim input", { exact: true })).toBeVisible();
  await grid.getByText("Mapping", { exact: true }).click();
  await expect(source).toHaveCount(0);
  await grid.getByText("Mapping", { exact: true }).click();
  await expect(source).toHaveValue("display_name");
  await page.getByRole("button", { name: "Alphabetical", exact: true }).click();
  await expect(grid.locator(".dui-property-grid__category-row")).toHaveCount(0);
  await page.getByRole("button", { name: "Categorized", exact: true }).click();
  await expect(grid.locator(".dui-property-grid__category-row")).toHaveCount(2);
  const review = property("reviewMode");
  await review.locator(".dui-property-grid__value").dblclick();
  await review.getByText("Strict", { exact: true }).click();
  await review.locator(".dui-radio-group__content").press("Enter");
  await page.getByRole("button", { name: "Read Object", exact: true }).click();
  await expect(output).toContainText('"reviewMode":"strict"');
  await page.getByRole("button", { name: "Dark", exact: true }).click();
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(source).toHaveValue("display_name");
  expect(errors).toEqual([]);
});

test("Grid source examples match live data and release owned models and editors", async ({ page }) => {
  await page.goto("/browser-tests/recipes.html");
  const count = await page.evaluate(async () => {
    const ui = await import("/src/ui/all.js");
    const { docsCatalog } = await import("/docs/src/docsCatalog.js");
    const pages = docsCatalog.find(group => group.id === "components").groups.find(group => group.id === "grid-components").pages;
    const container = document.querySelector("#root");
    const log = { write() {} };
    const snapshot = control => ({ type: control.constructor.name, data: control.data?.all(),
      selected: control.getSelectedIds?.(), children: (control.getItems?.() ?? []).map(snapshot) });
    let count = 0;
    for (const doc of pages) for (const example of doc.examples) {
      const run = new Function(...Object.keys(ui), "log", `${example.source}\nreturn example;`);
      const states = [];
      for (const create of [() => example.create({ container, log }), () => run(...Object.values(ui), log)]) {
        const control = create();
        const remote = control.dataProvider ? control : control.getItems?.().find(item => item.dataProvider);
        if (remote) await new Promise(resolve => remote.events.on("remoteLoad", resolve));
        states.push(JSON.stringify(snapshot(control)));
        const owned = [];
        const collect = item => {
          owned.push(item, ...[item.data, item.view, item.selection, item.filters, item.search, item.ranges, item.dataProvider].filter(Boolean));
          for (const entry of item._inlineEditors ?? []) owned.push(entry.editor, entry.editor.control);
          for (const child of item.getItems?.() ?? []) collect(child);
        };
        collect(control);
        control.destroy();
        if (container.childElementCount || owned.some(item => !item.destroyed)) throw new Error(`Leaked ${doc.id}: ${owned.filter(item => !item.destroyed).map(item => item.constructor.name)}`);
      }
      if (states[0] !== states[1]) throw new Error(`Source mismatch: ${doc.id}`);
      count++;
    }
    return count;
  });
  expect(count).toBe(expectedExampleCount);
});

test("large dataset is created only on page activation and released on navigation", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/docs/index.html#introduction");
  await openComponentGroup(page, "Grid");
  await page.evaluate(async () => {
    const { largeGridPage } = await import("/docs/src/pages/Grid.page.js");
    const example = largeGridPage.examples[0];
    const create = example.create;
    window.largeDatasetAllocations = 0;
    example.create = context => {
      window.largeDatasetAllocations++;
      window.largeDatasetGrid = create(context);
      return window.largeDatasetGrid;
    };
  });
  const nav = page.locator(".dui-docs-tree");
  await expect(page.getByRole("heading", { name: "Introduction", level: 1 })).toBeVisible();
  expect(await page.evaluate(() => largeDatasetAllocations)).toBe(0);
  await nav.getByRole("treeitem", { name: "Basic Grid", exact: true }).click();
  expect(await page.evaluate(() => largeDatasetAllocations)).toBe(0);
  await nav.getByRole("treeitem", { name: "Large Data and Paging", exact: true }).click();
  await expect.poll(() => page.evaluate(() => largeDatasetGrid.data.all().length)).toBe(10000);
  expect(await page.evaluate(() => largeDatasetAllocations)).toBe(1);
  expect(await rowsOf(liveGrid(page, "virtualGrid")).count()).toBeLessThan(60);
  await nav.getByRole("treeitem", { name: "Large Data and Paging", exact: true }).click();
  expect(await page.evaluate(() => largeDatasetAllocations)).toBe(1);
  await nav.getByRole("treeitem", { name: "Basic Grid", exact: true }).click();
  expect(await page.evaluate(() => [largeDatasetGrid.destroyed, largeDatasetGrid.data.destroyed, largeDatasetGrid.view.destroyed])).toEqual([true, true, true]);
  await nav.getByRole("treeitem", { name: "Large Data and Paging", exact: true }).click();
  expect(await page.evaluate(() => largeDatasetAllocations)).toBe(2);
  await page.goto("/docs/index.html#grid-large-data");
  await expect(liveGrid(page, "virtualGrid")).toBeVisible();
  await expect(page.locator(".dui-example-host__output").first()).toHaveText("Loaded 10,000 records");
  expect(errors).toEqual([]);
});

test("Lazy Loading has its own page and requests only one 50-row batch", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/docs/index.html#grid");
  await openComponentGroup(page, "Grid");
  await page.locator(".dui-docs-tree").getByRole("treeitem", { name: "Lazy Loading", exact: true }).click();
  await expect(page).toHaveURL(/#grid-lazy-loading$/);
  const batch = page.locator('[data-dui-control-id="batchStatus"]');
  const grid = liveGrid(page, "lazyGrid");
  await expect(batch).toHaveText("Batch 1 / 200 · 50 rows in memory · 10000 total");
  expect(await page.evaluate(() => {
    const find = control => control.id === "lazyGrid" ? control : (control.getItems?.() ?? []).map(find).find(Boolean);
    const grid = find(window.taetUiDocs.shell);
    window.lazyLoadAudit = { grid, requests: [] };
    grid.dataProvider.events.on("loading", event => lazyLoadAudit.requests.push(event.request.page));
    return grid.data.all().length;
  })).toBe(50);
  await page.getByRole("button", { name: "Next Batch", exact: true }).click();
  await expect(rowsOf(grid).first()).toContainText("Record 51");
  await page.getByRole("button", { name: "Last Batch", exact: true }).click();
  await expect(batch).toContainText("Batch 200 / 200 · 50 rows in memory");
  await expect(rowsOf(grid).first()).toContainText("Record 9951");
  expect(await page.evaluate(() => ({ count: lazyLoadAudit.grid.data.all().length, requests: lazyLoadAudit.requests })))
    .toEqual({ count: 50, requests: [2, 200] });
  await page.getByRole("button", { name: "Dark", exact: true }).click();
  await page.getByRole("button", { name: "First Batch", exact: true }).click();
  await expect(rowsOf(grid).first()).toContainText("Record 1");
  await page.locator(".dui-docs-tree").getByRole("treeitem", { name: "Basic Grid", exact: true }).click();
  expect(await page.evaluate(() => [lazyLoadAudit.grid.destroyed, lazyLoadAudit.grid.dataProvider.destroyed])).toEqual([true, true]);
  expect(errors).toEqual([]);
});

test("Grid loading spinner follows pending requests, failure and destruction", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/browser-tests/recipes.html");
  await page.evaluate(async () => {
    const { Grid, GridDataProvider } = await import("/src/ui/all.js");
    window.spinnerFixture = { pending: [], errors: [] };
    const provider = new GridDataProvider((request, { signal }) => new Promise((resolve, reject) => {
      spinnerFixture.pending.push({ resolve, reject, signal });
    }));
    const grid = new Grid("#root", { name: "spinnerGrid", height: 220, width: 600, dataProvider: provider, columns: [{ id: "name", title: "Name", width: 250 }] });
    grid.data.parse([{ id: 1, name: "Existing row" }]);
    Object.assign(spinnerFixture, { grid, provider });
    spinnerFixture.load = () => grid.reloadRemote().catch(error => spinnerFixture.errors.push(error.name));
    void spinnerFixture.load();
  });
  const grid = page.locator('[data-dui-control-id="spinnerGrid"]');
  const indicator = grid.locator(".dui-grid__loading");
  await expect(grid).toHaveAttribute("aria-busy", "true");
  await expect(indicator).toBeVisible();
  await expect(indicator).toHaveText("Loading…");
  await expect(grid.locator(".dui-grid__spinner")).toHaveCSS("animation-name", "dui-grid-spin");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(grid.locator(".dui-grid__spinner")).toHaveCSS("animation-name", "none");
  await page.evaluate(() => { document.body.classList.add("dui-theme-dark-blue"); });
  await expect(indicator).toBeVisible();
  await page.evaluate(() => { void spinnerFixture.load(); spinnerFixture.pending[0].resolve({ items: [{ id: 2, name: "Stale" }] }); });
  await expect(grid).toHaveAttribute("aria-busy", "true");
  await expect(indicator).toBeVisible();
  await page.evaluate(() => spinnerFixture.pending[1].reject(new Error("offline")));
  await expect(indicator).toBeHidden();
  await expect(grid).not.toHaveAttribute("aria-busy");
  await expect(rowsOf(grid)).toHaveText("Existing row");
  await page.evaluate(() => { void spinnerFixture.load(); });
  await expect(indicator).toBeVisible();
  await page.evaluate(() => spinnerFixture.pending[2].resolve({ items: [{ id: 3, name: "Loaded" }], totalCount: 1 }));
  await expect(indicator).toBeHidden();
  await expect(rowsOf(grid)).toHaveText("Loaded");
  await page.evaluate(() => { void spinnerFixture.load(); spinnerFixture.grid.destroy(); spinnerFixture.pending[3].resolve({ items: [] }); });
  await expect(grid).toHaveCount(0);
  expect(await page.evaluate(() => spinnerFixture.pending[3].signal.aborted)).toBe(true);
  await page.evaluate(() => spinnerFixture.provider.destroy());
  expect(errors).toEqual([]);
});
