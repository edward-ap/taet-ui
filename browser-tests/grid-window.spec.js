import { expect, test } from "@playwright/test";

const body = page => page.locator(".dui-grid__body");
const rows = page => body(page).locator(".dui-grid__row");
const cell = (page, row, col) => body(page).locator(`[data-dui-grid-row-id="string:r${row}"] [data-dui-grid-column-id="c${col}"]`);
const settle = page => page.evaluate(async () => { for (let i = 0; i < 4; i++) await new Promise(requestAnimationFrame); });

async function setup(page, options = {}) {
  await page.goto("/browser-tests/recipes.html");
  await page.evaluate(async options => {
    const { Grid, gridEditors } = await import("/src/ui/grid-api.js");
    const { DataStore } = await import("/src/core/DataStore.js");
    const { count = 1000, cols = 100, frozen = false, details = false, ...rest } = options;
    window.data = new DataStore();
    window.grid = new Grid({ name: "windowGrid", data, width: 800, height: 400, rowHeight: 24,
      columnMenu: false, columnReorder: false, ...rest,
      columns: Array.from({ length: cols }, (_, c) => ({ id: `c${c}`, title: `Column ${c}`, width: 120,
        editor: gridEditors.text(), frozen: frozen && c === 0 ? "left" : frozen && c === cols - 1 ? "right" : null })),
      rowDetail: details ? item => {
        const node = document.createElement("div"); node.style.height = "300px";
        node.textContent = `Detail ${item.id}`; return node;
      } : null
    }).mount(document.querySelector("#root"));
    data.parse(Array.from({ length: count }, (_, r) => Object.fromEntries([
      ["id", `r${r}`], ...Array.from({ length: cols }, (_, c) => [`c${c}`, `R${r} C${c}`])
    ])));
  }, options);
  await settle(page);
}

test("bursts paint once, retaining row/cell/text identity and synchronous model events", async ({ page }) => {
  await setup(page, { cols: 8 });
  const result = await page.evaluate(async () => {
    const row = grid._body.querySelector('[data-dui-grid-row-id="string:r5"]');
    const cell = row.querySelector('[data-dui-grid-column-id="c0"]'), text = cell.firstChild;
    let paints = 0;
    const render = grid._renderRows.bind(grid);
    grid._renderRows = () => { paints++; render(); };
    const events = [];
    grid.events.on("dataChange", event => events.push(event.origin));
    for (let i = 0; i < 20; i++) data.update(`r${i}`, { c0: `Updated ${i}` }, { origin: "import" });
    const immediate = { paints, events: events.length, value: data.get("r5").c0 };
    await new Promise(requestAnimationFrame);
    const after = { paints, sameRow: row === grid._body.querySelector('[data-dui-grid-row-id="string:r5"]'),
      sameCell: cell === row.querySelector('[data-dui-grid-column-id="c0"]'), sameText: text === cell.firstChild, text: cell.textContent };
    data.update("r5", { c0: "Silent" }, { silent: true });
    await new Promise(requestAnimationFrame);
    return { immediate, after, silent: cell.textContent, events };
  });
  expect(result.immediate).toEqual({ paints: 0, events: 20, value: "Updated 5" });
  expect(result.after).toEqual({ paints: 1, sameRow: true, sameCell: true, sameText: true, text: "Updated 5" });
  expect(result.silent).toBe("Silent");
  expect(result.events).toEqual(Array(20).fill("import"));
});

test("10k by 100 stays bounded in both axes and aligns frozen/header/footer cells", async ({ page }) => {
  await setup(page, { count: 10000, frozen: true });
  await page.evaluate(() => { grid.getColumn("c0").summary = "count"; grid.refresh(); });
  await settle(page);
  expect(await rows(page).count()).toBeLessThan(35);
  expect(await body(page).locator(".dui-grid__cell").count()).toBeLessThan(400);
  await body(page).evaluate(node => { node.scrollLeft = 6000; node.scrollTop = 24000; });
  await expect(cell(page, 1000, 50)).toHaveText("R1000 C50");
  await expect(cell(page, 1000, 0)).toBeVisible();
  await expect(cell(page, 1000, 99)).toBeVisible();
  await page.evaluate(() => grid.setSelectedIds(["r1000"], { silent: true }));
  const geometry = await page.evaluate(() => {
    const box = node => { const b = node.getBoundingClientRect(); return { x: b.x, right: b.right, width: b.width, height: b.height }; };
    return [0, 50, 99].map(c => ({
      header: box(grid._header.querySelector(`[data-dui-grid-column-id="c${c}"]`)),
      cell: box(grid._body.querySelector(`[data-dui-grid-row-id="string:r1000"] [data-dui-grid-column-id="c${c}"]`)),
      footer: box(grid._footer.querySelector(`[data-dui-grid-column-id="c${c}"]`))
    }));
  });
  for (const item of geometry) {
    expect(Math.abs(item.header.x - item.cell.x)).toBeLessThan(2);
    expect(Math.abs(item.footer.x - item.cell.x)).toBeLessThan(2);
    expect(item.cell.width).toBe(120);
  }
  const frozenColors = await page.evaluate(() => {
    document.body.classList.replace("dui-theme-light-blue", "dui-theme-dark-blue");
    const background = getComputedStyle(grid.element).backgroundColor;
    return [0, 99].map(c => getComputedStyle(grid._body.querySelector(`[data-dui-grid-row-id="string:r1001"] [data-dui-grid-column-id="c${c}"]`)).backgroundColor === background);
  });
  expect(frozenColors).toEqual([true, true]);
  await body(page).evaluate(node => { node.scrollTop = node.scrollHeight; node.scrollLeft = node.scrollWidth; });
  await expect(cell(page, 9999, 98)).toHaveText("R9999 C98");
  expect(await body(page).locator(".dui-grid__cell").count()).toBeLessThan(400);
});

test("grouping remains virtual and silent collapse/restore synchronize the window", async ({ page }) => {
  await setup(page, { cols: 8 });
  await page.evaluate(() => {
    data.batch(() => { for (let i = 0; i < 1000; i++) data.update(`r${i}`, { c0: i < 500 ? "A" : "B" }); }, { history: false });
    window.groupEvents = 0;
    grid.events.on("groupChange", () => groupEvents++);
    grid.setGroups(["c0"], { silent: true });
  });
  await expect(body(page).locator(".dui-grid__group-row").first()).toContainText("A (500)");
  expect(await rows(page).count()).toBeLessThan(35);
  await page.evaluate(() => grid.toggleGroup("/c0:A", { silent: true }));
  await expect(rows(page).first()).toContainText("R500 C1");
  await body(page).evaluate(node => { node.scrollTop = node.scrollHeight; });
  await expect(rows(page).last()).toContainText("R999 C1");
  await page.evaluate(() => { grid.groups.restoreState({ rules: [], collapsed: [] }, { silent: true }); grid._body.scrollTop = 0; });
  await expect(body(page).locator(".dui-grid__group-row")).toHaveCount(0);
  await expect(rows(page).first()).toContainText("R0 C1");
  expect(await page.evaluate(() => groupEvents)).toBe(0);
});

test("details measure dynamic height, survive refresh, and do not disable virtualization", async ({ page }) => {
  await setup(page, { cols: 8, details: true });
  expect(await rows(page).count()).toBeLessThan(35);
  await page.evaluate(() => grid.expandDetail("r0"));
  await settle(page);
  const measure = () => page.evaluate(() => {
    const detail = grid._body.querySelector(".dui-grid__detail-row");
    return { actual: detail.getBoundingClientRect().height, cached: grid._windowRenderer.details.get("string:r0")?.height };
  });
  let height = await measure();
  expect(height.cached).toBe(height.actual);
  expect(height.actual).toBeGreaterThanOrEqual(300);
  await body(page).locator(".dui-grid__detail-content > div").evaluate(node => { node.style.height = "500px"; });
  await settle(page);
  height = await measure();
  expect(height.cached).toBe(height.actual);
  expect(height.actual).toBeGreaterThanOrEqual(500);
  await page.evaluate(() => grid.refresh());
  await settle(page);
  height = await measure();
  expect(height.cached).toBe(height.actual);
  await body(page).evaluate(node => { node.scrollTop = node.scrollHeight; });
  await expect(rows(page).last()).toContainText("R999 C1");
  expect(await rows(page).count()).toBeLessThan(35);
  await page.evaluate(() => { grid.collapseDetail("r0"); grid._body.scrollTop = 0; });
  await expect(cell(page, 1, 1)).toHaveText("R1 C1");
  expect(await page.evaluate(() => grid._windowRenderer.details.size)).toBe(0);
});

test("offscreen editing materializes its cell and preserves the editor during resize", async ({ page }) => {
  await setup(page);
  const started = await page.evaluate(() => {
    data.update("r500", { c50: "Fresh" });
    return grid.startEdit("r500", "c50");
  });
  expect(started).toBe(true);
  const input = cell(page, 500, 50).locator("input");
  await expect(input).toHaveValue("Fresh");
  await input.fill("Edited");
  await page.evaluate(() => { window.editorNode = grid._editing.cell.querySelector("input"); grid.element.style.width = "420px"; });
  await settle(page);
  expect(await page.evaluate(() => grid._editing?.cell.querySelector("input") === editorNode && editorNode.isConnected)).toBe(true);
  await input.press("Enter");
  expect(await page.evaluate(() => data.get("r500").c50)).toBe("Edited");
  await page.evaluate(() => grid.startEdit("r500", "c51"));
  await expect(cell(page, 500, 51).locator("input")).toBeVisible();
  await body(page).evaluate(node => { node.scrollLeft = 0; });
  await expect(body(page).locator(".dui-grid__cell--editing")).toHaveCount(0);
});

test("formatting cleanup and column changes retain correct cell content and geometry", async ({ page }) => {
  await setup(page, { cols: 8 });
  await page.evaluate(() => grid.addFormattingRule({ id: "test", columnId: "c0", when: value => value === "R0 C0", className: "test-accent", style: { color: "red" }, icon: "check" }));
  await expect(cell(page, 0, 0)).toHaveClass(/test-accent/);
  await page.evaluate(() => data.update("r0", { c0: "Changed" }));
  await expect(cell(page, 0, 0)).toHaveText("Changed");
  await expect(cell(page, 0, 0)).not.toHaveClass(/test-accent/);
  expect(await cell(page, 0, 0).evaluate(node => node.style.color)).toBe("");
  await page.evaluate(() => grid.setColumns([{ id: "c3", width: "1fr" }, { id: "c0", width: "2fr" }]));
  await settle(page);
  await expect(rows(page).first().locator(".dui-grid__cell")).toHaveText(["R0 C3", "Changed"]);
  expect(await cell(page, 0, 0).getAttribute("aria-colindex")).toBe("2");
  const widths = await rows(page).first().locator(".dui-grid__cell").evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().width));
  expect(Math.abs(widths[1] / widths[0] - 2)).toBeLessThan(0.02);
});

test("background updates preserve a Grid draft; replacement and projection changes cancel it", async ({ page }) => {
  await setup(page, { cols: 8 });
  await page.evaluate(() => {
    // Opaque filters still rebuild, even when the visible order stays the same.
    grid.setFilter(item => item.c0 !== 'hidden');
    grid.startEdit('r5', 'c1');
    window.draftNode = grid._editing.cell.querySelector('input');
  });
  await cell(page, 5, 1).locator('input').fill('Retained draft');
  await page.evaluate(() => {
    for (let i = 800; i < 820; i++) data.update(`r${i}`, { c2: 'Background' }, { silent: i % 2 === 0 });
    data.batch(() => data.update('r900', { c3: 'Batched' }));
  });
  await settle(page);
  expect(await page.evaluate(() => grid._editing?.cell.querySelector('input') === draftNode)).toBe(true);
  await expect(cell(page, 5, 1).locator('input')).toHaveValue('Retained draft');
  await cell(page, 5, 1).locator('input').press('Enter');
  expect(await page.evaluate(() => data.get('r5').c1)).toBe('Retained draft');
  await page.evaluate(() => { grid.startEdit('r5', 'c1'); data.update('r5', { c2: 'External replacement' }, { silent: true }); });
  expect(await page.evaluate(() => grid._editing)).toBeNull();
  await page.evaluate(() => { grid.startEdit('r5', 'c1'); data.update('r0', { c0: 'hidden' }); });
  expect(await page.evaluate(() => grid._editing)).toBeNull();
  await page.evaluate(() => { grid.startEdit('r5', 'c1'); grid.view.setSort((a, b) => b.id.localeCompare(a.id)); });
  expect(await page.evaluate(() => grid._editing)).toBeNull();
  await page.evaluate(() => { grid.view.setSort(null); grid.view.setPageSize(20); });
  expect(await page.evaluate(() => grid.startEdit('r5', 'c1'))).toBe(true);
  await page.evaluate(() => grid.view.setPage(2));
  expect(await page.evaluate(() => grid._editing)).toBeNull();
});

test("destroy cancels queued paints and detail observations without owning the external store", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await setup(page, { cols: 8, details: true });
  await page.evaluate(() => grid.expandDetail("r0"));
  await settle(page);
  const state = await page.evaluate(async () => {
    const renderer = grid._windowRenderer;
    data.update("r0", { c0: "Queued" });
    const pending = renderer.frame !== null;
    grid.destroy(); grid.destroy();
    data.update("r0", { c0: "After destroy" });
    await new Promise(requestAnimationFrame);
    return { pending, frame: renderer.frame, observer: renderer.observer, rows: renderer.rows.size,
      nodes: document.querySelector("#root").children.length, value: data.get("r0").c0 };
  });
  expect(state).toEqual({ pending: true, frame: null, observer: null, rows: 0, nodes: 0, value: "After destroy" });
  expect(errors).toEqual([]);
});

test("ranges follow hidden, moved and replaced columns without stale highlights", async ({ page }) => {
  await setup(page, { count: 8, cols: 6, frozen: true });
  const highlighted = () => body(page).locator(".dui-grid__cell--range-selected").evaluateAll(nodes =>
    nodes.map(node => `${node.parentElement.dataset.duiGridRowId}/${node.dataset.duiGridColumnId}`));
  const expected = (rowIds, columns) => rowIds.flatMap(r => columns.map(c => `string:r${r}/c${c}`));
  await page.evaluate(() => grid.setCellRanges([
    { anchor: { rowId: "r3", columnId: "c4" }, focus: { rowId: "r1", columnId: "c1" } },
    { anchor: { rowId: "r0", columnId: "c0" }, focus: { rowId: "r0", columnId: "c0" } }
  ]));
  expect(await highlighted()).toEqual([...expected([0], [0]), ...expected([1, 2, 3], [1, 2, 3, 4])]);
  await page.evaluate(() => grid.hideColumn("c2"));
  expect(await highlighted()).toEqual([...expected([0], [0]), ...expected([1, 2, 3], [1, 3, 4])]);
  await page.evaluate(() => grid.moveColumn("c4", 1));
  expect(await highlighted()).toEqual([...expected([0], [0]), ...expected([1, 2, 3], [4, 1])]);
  // A hidden endpoint invalidates its range, but not another valid range.
  await page.evaluate(() => grid.hideColumn("c1"));
  expect(await highlighted()).toEqual(expected([0], [0]));
  await page.evaluate(() => { grid.showColumn("c1"); grid.setColumns(["c4", "c0", "c1"].map(id => ({ id, width: 120 }))); });
  expect(await highlighted()).toEqual([...expected([0], [0]), ...expected([1, 2, 3], [4, 0, 1])]);
  await page.evaluate(() => grid.setCellRanges([
    { anchor: { rowId: "missing", columnId: "c4" }, focus: { rowId: "r3", columnId: "c1" } },
    { anchor: { rowId: "r1", columnId: "missing" }, focus: { rowId: "r3", columnId: "c1" } }
  ]));
  expect(await highlighted()).toEqual([]);
});

test("offscreen range endpoints select newly mounted cells and frozen edges", async ({ page }) => {
  await setup(page, { count: 10000, frozen: true });
  await page.evaluate(() => grid.setCellRanges([
    { anchor: { rowId: "r1010", columnId: "c99" }, focus: { rowId: "r990", columnId: "c49" } }
  ]));
  await body(page).evaluate(node => { node.scrollLeft = 6000; node.scrollTop = 24000; });
  await expect(cell(page, 1000, 50)).toHaveClass(/dui-grid__cell--range-selected/);
  await expect(cell(page, 1000, 99)).toHaveClass(/dui-grid__cell--range-selected/);
  await expect(cell(page, 1000, 0)).not.toHaveClass(/dui-grid__cell--range-selected/);
  await expect(cell(page, 1011, 50)).not.toHaveClass(/dui-grid__cell--range-selected/);
  await body(page).evaluate(node => { node.scrollLeft = 0; node.scrollTop = 0; });
  await expect(cell(page, 0, 0)).toBeVisible();
  await expect(body(page).locator(".dui-grid__cell--range-selected")).toHaveCount(0);
});

test("clearing ranges preserves row selection, active cell and accessible focus", async ({ page }) => {
  await setup(page, { cols: 6 });
  await cell(page, 2, 3).click();
  await expect(cell(page, 2, 3)).toHaveClass(/dui-grid__cell--range-selected/);
  const activeId = await cell(page, 2, 3).getAttribute("id");
  await page.evaluate(() => grid.clearCellRanges());
  await expect(body(page).locator(".dui-grid__cell--range-selected")).toHaveCount(0);
  await expect(cell(page, 2, 3)).toHaveClass(/dui-grid__cell--active/);
  await expect(body(page).locator('[data-dui-grid-row-id="string:r2"]')).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".dui-grid").first()).toHaveAttribute("aria-activedescendant", activeId);
  await page.evaluate(() => { grid.rangeSelectionEnabled = false; });
  await cell(page, 3, 1).click();
  await expect(cell(page, 3, 1)).toHaveClass(/dui-grid__cell--active/);
  await expect(body(page).locator(".dui-grid__cell--range-selected")).toHaveCount(0);
  await body(page).evaluate(node => { node.scrollTop = 2400; });
  await expect(cell(page, 100, 1)).toBeVisible();
  await expect(page.locator(".dui-grid").first()).not.toHaveAttribute("aria-activedescendant");
});

test("selection synchronization does not scan all columns for each mounted cell", async ({ page }) => {
  await setup(page, { frozen: true });
  await body(page).evaluate(node => { node.scrollLeft = 6000; });
  await expect(cell(page, 0, 50)).toBeVisible();
  const result = await page.evaluate(() => {
    let reads = 0;
    const descriptors = grid.columns.map(column => Object.getOwnPropertyDescriptor(column, "id"));
    const counts = [];
    try {
      grid.columns.forEach((column, index) => Object.defineProperty(column, "id", {
        configurable: true, get() { reads++; return descriptors[index].value; }
      }));
      for (const ranges of [[], [{ anchor: { rowId: "r0", columnId: "c0" }, focus: { rowId: "r10", columnId: "c99" } }]]) {
        grid.setCellRanges(ranges, { silent: true });
        reads = 0;
        grid._syncSelectionState();
        counts.push(reads);
      }
      return { counts, columns: grid.columns.length, cells: grid._body.querySelectorAll(".dui-grid__cell").length };
    } finally {
      grid.columns.forEach((column, index) => Object.defineProperty(column, "id", descriptors[index]));
    }
  });
  // Work may grow with columns plus mounted cells, never their product.
  for (const reads of result.counts) expect(reads).toBeLessThan(4 * (result.columns + result.cells));
});

test("virtual axes opt out independently and shrinking data clears stale windows", async ({ page }) => {
  await setup(page, { count: 60, cols: 30, virtualColumns: false });
  expect(await rows(page).count()).toBeLessThan(35);
  expect(await rows(page).first().locator(".dui-grid__cell").count()).toBe(30);
  await body(page).evaluate(node => { node.scrollTop = node.scrollHeight; });
  await expect(rows(page).last()).toContainText("R59 C0");
  await page.evaluate(() => data.parse([{ id: "r0", c0: "Replacement" }]));
  await expect(rows(page)).toHaveCount(1);
  await expect(cell(page, 0, 0)).toHaveText("Replacement");
  await page.evaluate(() => data.clear());
  await expect(rows(page)).toHaveCount(0);
  await expect(body(page).locator(".dui-grid__row-spacer")).toHaveCount(0);
  await page.evaluate(() => grid.destroy());
  await setup(page, { count: 60, cols: 30, virtualRows: false });
  await expect(rows(page)).toHaveCount(60);
  expect(await rows(page).first().locator(".dui-grid__cell").count()).toBeLessThan(12);
  await body(page).evaluate(node => { node.scrollTop = node.scrollHeight; node.scrollLeft = node.scrollWidth; });
  await expect(cell(page, 59, 29)).toHaveText("R59 C29");
});
