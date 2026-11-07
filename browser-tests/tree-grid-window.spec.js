import { expect, test } from "@playwright/test";
const body = page => page.locator(".dui-tree-grid .dui-grid__body");
const cell = (page, id, col) => body(page).locator(`[data-dui-grid-row-id="string:r${id}"] [data-dui-grid-column-id="c${col}"]`);
const frames = page => page.evaluate(async () => { for (let i = 0; i < 4; i++) await new Promise(requestAnimationFrame); });
async function setup(page) {
  await page.goto("/browser-tests/recipes.html");
  await page.evaluate(async () => {
    const { TreeGrid, gridEditors } = await import("/src/ui/grid-api.js");
    const { DataStore } = await import("/src/core/DataStore.js");
    window.data = new DataStore();
    window.tree = new TreeGrid({ data, width: 800, height: 400, rowHeight: 24, treeColumnId: "c0",
      columnMenu: false, columnReorder: false,
      expandedIds: Array.from({ length: 100 }, (_, i) => `r${i * 100}`),
      columns: Array.from({ length: 100 }, (_, c) => ({ id: `c${c}`, title: `C${c}`, width: 120,
        frozen: c === 0 ? "left" : c === 99 ? "right" : null, editor: gridEditors.text() }))
    }).mount(document.querySelector("#root"));
    data.parse(Array.from({ length: 10000 }, (_, r) => Object.fromEntries([
      ["id", `r${r}`], ["parentId", r % 100 ? `r${r - r % 100}` : null], ["icon", "folder"],
      ...Array.from({ length: 100 }, (_, c) => [`c${c}`, `R${r} C${c}`])
    ])));
  });
  await frames(page);
}

test("wide TreeGrid retains cells/tree glyphs and paints a silent burst once", async ({ page }) => {
  await setup(page);
  expect(await body(page).locator(".dui-grid__cell").count()).toBeLessThan(400);
  const result = await page.evaluate(async () => {
    const row = tree._body.querySelector('[data-dui-grid-row-id="string:r5"]');
    const cell = row.querySelector('[data-dui-grid-column-id="c0"]'), glyph = cell.firstElementChild.firstElementChild;
    let paints = 0, changes = 0;
    const render = tree._renderRows.bind(tree); tree._renderRows = () => { paints++; render(); };
    tree.events.on("treeViewChange", () => changes++);
    for (let i = 0; i < 20; i++) data.update(`r${i}`, { c1: `U${i}` }, { silent: true });
    await new Promise(requestAnimationFrame);
    return { paints, changes, row: row === tree._body.querySelector('[data-dui-grid-row-id="string:r5"]'),
      cell: cell === row.querySelector('[data-dui-grid-column-id="c0"]'), glyph: glyph === cell.firstElementChild.firstElementChild };
  });
  expect(result).toEqual({ paints: 1, changes: 0, row: true, cell: true, glyph: true });
  await expect(cell(page, 5, 1)).toHaveText("U5");
  await body(page).evaluate(node => { node.scrollTop = 24000; node.scrollLeft = 6000; });
  await expect(cell(page, 1001, 50)).toHaveText("R1001 C50");
  await expect(cell(page, 1001, 0)).toBeVisible(); await expect(cell(page, 1001, 99)).toBeVisible();
  await expect(cell(page, 1001, 0).locator("xpath=..")).toHaveAttribute("aria-level", "2");
  await expect(page.locator(".dui-tree-grid")).toHaveAttribute("aria-rowcount", "10001");
});

test("branch changes above the viewport preserve the visual anchor even near the bottom", async ({ page }) => {
  await setup(page);
  await body(page).evaluate(node => { node.scrollTop = node.scrollHeight; });
  await expect(cell(page, 9999, 0)).toBeVisible();
  const before = (await cell(page, 9990, 0).boundingBox()).y;
  await page.evaluate(() => tree.collapse("r0")); await frames(page);
  expect(Math.abs((await cell(page, 9990, 0).boundingBox()).y - before)).toBeLessThan(1);
  await page.evaluate(() => tree.expand("r0", { silent: true })); await frames(page);
  expect(Math.abs((await cell(page, 9990, 0).boundingBox()).y - before)).toBeLessThan(1);
  await expect(cell(page, 9999, 0)).toBeVisible();
});

test("offscreen editors survive resize/unrelated branch changes and cancel when hidden", async ({ page }) => {
  await setup(page);
  expect(await page.evaluate(() => tree.startEdit("r1001", "c50"))).toBe(true);
  const input = cell(page, 1001, 50).locator("input");
  await input.fill("Draft");
  await page.evaluate(() => { window.editorNode = tree._editing.cell.querySelector("input"); tree.collapse("r0"); tree.element.style.width = "500px"; });
  await frames(page);
  expect(await page.evaluate(() => tree._editing?.cell.querySelector("input") === editorNode && editorNode.isConnected)).toBe(true);
  await input.press("Enter"); expect(await page.evaluate(() => data.get("r1001").c50)).toBe("Draft");
  await page.evaluate(() => tree.startEdit("r1001", "c50"));
  await frames(page);
  await page.evaluate(() => tree.collapse("r1000")); await frames(page);
  expect(await page.evaluate(() => tree._editing)).toBeNull();
  expect(await page.evaluate(() => tree.startEdit("r1001", "c50"))).toBe(false);
});

test("keyboard expansion and teardown preserve tree behavior and external store ownership", async ({ page }) => {
  const errors = []; page.on("pageerror", error => errors.push(error.message));
  await setup(page);
  await cell(page, 0, 0).click();
  await page.locator(".dui-tree-grid").press("ArrowLeft");
  await expect(cell(page, 0, 0).locator("xpath=..")).toHaveAttribute("aria-expanded", "false");
  await page.locator(".dui-tree-grid").press("ArrowRight");
  await expect(cell(page, 0, 0).locator("xpath=..")).toHaveAttribute("aria-expanded", "true");
  const state = await page.evaluate(async () => {
    const renderer = tree._windowRenderer;
    data.update("r0", { c1: "Pending" }); tree.destroy(); tree.destroy();
    data.update("r0", { c1: "Still usable" }, { silent: true });
    await new Promise(requestAnimationFrame);
    return { frame: renderer.frame, rows: renderer.rows.size, nodes: document.querySelector("#root").children.length, value: data.get("r0").c1 };
  });
  expect(state).toEqual({ frame: null, rows: 0, nodes: 0, value: "Still usable" }); expect(errors).toEqual([]);
});

test("TreeList also consumes silent TreeDataView invalidations without semantic events", async ({ page }) => {
  await page.goto("/browser-tests/recipes.html");
  const result = await page.evaluate(async () => {
    const { TreeList } = await import("/src/ui/TreeList.js");
    const list = new TreeList({ textField: "text" }).mount(document.querySelector("#root"));
    let changes = 0; list.events.on("treeViewChange", () => changes++);
    list.data.parse([{ id: "root", text: "Root" }, { id: "leaf", parentId: "root", text: "Before" }], { silent: true });
    list.treeView.expand("root", { silent: true });
    list.data.update("leaf", { text: "After" }, { silent: true });
    const text = list.element.textContent;
    list.destroy();
    return { text, changes };
  });
  expect(result.text).toContain("After"); expect(result.text).not.toContain("Before"); expect(result.changes).toBe(0);
});

for (const axis of ["width", "height"]) {
  test(`editor survives ${axis} resize scroll before observer delivery, but later scroll cancels`, async ({ page }) => {
    await setup(page);
    expect(await page.evaluate(() => tree.startEdit("r501", "c50"))).toBe(true);
    await frames(page);
    const result = await page.evaluate(axis => {
      const editing = tree._editing, body = tree._body, input = editing.cell.querySelector("input");
      input.value = "Resize draft";
      const original = data.get("r501").c50;
      let resizes = 0;
      const resize = tree._afterResize.bind(tree);
      tree._afterResize = () => { resizes++; resize(); };
      // Force layout and the browser's possible focus/anchor scroll in the same
      // task, before ResizeObserver can reconcile the editor's scroll baseline.
      tree.element.style[axis] = axis === "width" ? "500px" : "250px";
      const dimension = axis === "width" ? "clientWidth" : "clientHeight";
      const scroll = axis === "width" ? "scrollLeft" : "scrollTop";
      const changed = body[dimension] !== editing[axis === "width" ? "viewportWidth" : "viewportHeight"];
      body[scroll] += 96;
      body.dispatchEvent(new Event("scroll"));
      const retained = tree._editing === editing && input.isConnected && input.value === "Resize draft";
      const reconciled = resizes;
      // No timeout/grace period: a second scroll at the same geometry is a real
      // viewport change, even in this task before observer delivery.
      body[scroll] += 24;
      body.dispatchEvent(new Event("scroll"));
      return { changed, retained, reconciled, canceled: tree._editing === null,
        unchanged: data.get("r501").c50 === original };
    }, axis);
    expect(result).toEqual({ changed: true, retained: true, reconciled: 1, canceled: true, unchanged: true });
  });
}
