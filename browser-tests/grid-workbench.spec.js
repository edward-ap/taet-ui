import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  page.on("pageerror", error => { throw error; });
  await page.goto("/examples/grid-workbench/");
  await expect(page.locator(".grid-workbench__tasks .dui-grid__row")).toHaveCount(3);
});

const editor = page => page.locator(".grid-workbench__tasks .dui-grid__editor-host input");
const propertyEditor = page => page.locator(".grid-workbench__properties .dui-property-grid__value--editing input");
const selected = (page, id) => expect.poll(() => page.evaluate(() => workbench.selectedId)).toBe(id);

test("one screen owns live controls and borrowed views over the same source", async ({ page }) => {
  expect(await page.evaluate(() => ({
    shared: workbench.grid.data === workbench.data && workbench.tree.data === workbench.data,
    separate: workbench.grid.view !== workbench.tree.treeView,
    views: workbench.view.data === workbench.data && workbench.treeView.data === workbench.data,
    owned: workbench.grid.parent.parent === workbench.owner.getItemAt(2),
    selected: workbench.selectedId
  }))).toEqual({ shared: true, separate: true, views: true, owned: true, selected: "atlas" });
  await page.evaluate(() => workbench.destroy());
  await expect(page.locator(".grid-workbench")).toHaveCount(0);
  expect(await page.evaluate(() => [workbench.data.destroyed, workbench.view.destroyed,
    workbench.treeView.destroyed, workbench.grid.destroyed, workbench.tree.destroyed,
    workbench.properties.destroyed])).toEqual([true, true, true, true, true, true]);
});

test("keyboard-only passage edits a task and its properties without a focus trap", async ({ page }) => {
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Hierarchy", exact: true })).toBeFocused();
  await page.keyboard.press("Enter");
  const tree = page.locator(".grid-workbench__tree");
  await expect(tree).toBeFocused();
  await page.keyboard.press("Home");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Space");
  await selected(page, "design");
  await page.keyboard.press("Tab");
  await expect(tree.getByRole("button", { name: "\u041d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438 \u0442\u0430\u0431\u043b\u0438\u0446\u044b", exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(tree.getByRole("button", { name: "Column menu for Project / task", exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.locator(".grid-workbench__tasks")).toBeFocused();
  await page.keyboard.press("F2");
  await expect(editor(page)).toBeFocused();
  await page.keyboard.press("Control+A");
  await page.keyboard.type("Keyboard workflow");
  await page.keyboard.press("Tab");
  await expect(page.locator('.grid-workbench__tasks [data-dui-grid-column-id="hours"] input')).toBeFocused();
  await page.keyboard.press("Control+A");
  await page.keyboard.type("17");
  await page.keyboard.press("Enter");
  await page.keyboard.press("End");
  await page.keyboard.press("F2");
  await expect(page.locator('.grid-workbench__tasks [data-dui-grid-column-id="hours"] input')).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Edit selected properties" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(propertyEditor(page)).toBeFocused();
  await page.keyboard.press("Control+A");
  await page.keyboard.type("Property keyboard update");
  await page.keyboard.press("Enter");
  expect(await page.evaluate(() => ({ name: workbench.data.get("design").name,
    hours: workbench.data.get("design").hours, editors: workbench.activeEditorCount })))
    .toEqual({ name: "Property keyboard update", hours: 17, editors: 0 });
  await expect(page.locator(".grid-workbench__tasks")).toContainText("Property keyboard update");
  await expect(tree).toContainText("Property keyboard update");
});

test("invalid Grid draft vetoes cross-pane selection; a valid retry commits before switching", async ({ page }) => {
  await page.evaluate(() => { workbench.select("design"); workbench.grid.startEdit("design", "name"); });
  await editor(page).fill("x");
  await page.evaluate(() => workbench.select("keys"));
  await selected(page, "design");
  await expect(editor(page)).toBeFocused();
  await expect(editor(page)).toHaveAttribute("aria-invalid", "true");
  expect(await page.evaluate(() => ({ tree: workbench.tree.getSelectedIds(), grid: workbench.grid.getSelectedIds(),
    name: workbench.data.get("design").name, property: workbench.properties.getPropertyControl("name").value })))
    .toEqual({ tree: ["design"], grid: ["design"], name: "Design dense workflow", property: "Design dense workflow" });
  await editor(page).fill("Accepted before switching");
  await page.evaluate(() => workbench.select("keys"));
  await selected(page, "keys");
  expect(await page.evaluate(() => workbench.data.get("design").name)).toBe("Accepted before switching");
  await expect(editor(page)).toHaveCount(0);
});

test("invalid PropertyGrid draft retains context and the accepted write reaches both tables", async ({ page }) => {
  await page.evaluate(() => workbench.select("design"));
  await page.getByRole("button", { name: "Edit selected properties" }).click();
  await propertyEditor(page).fill("x");
  await page.evaluate(() => workbench.select("keys"));
  await selected(page, "design");
  await expect(propertyEditor(page)).toBeFocused();
  await propertyEditor(page).fill("Accepted property write");
  await page.evaluate(() => workbench.select("keys"));
  await selected(page, "keys");
  expect(await page.evaluate(() => workbench.data.get("design").name)).toBe("Accepted property write");
  await expect(page.locator(".grid-workbench__tasks")).toContainText("Accepted property write");
  await expect(page.locator(".grid-workbench__tree")).toContainText("Accepted property write");
  await page.evaluate(() => {
    workbench.select("design");
    workbench.properties.events.once("propertyChange", () => workbench.properties.startEdit("hours"));
  });
  await page.getByRole("button", { name: "Edit selected properties" }).click();
  await propertyEditor(page).fill("Reentrant property edit");
  await page.keyboard.press("Enter");
  await expect(propertyEditor(page)).toBeFocused();
  await propertyEditor(page).fill("23");
  await page.keyboard.press("Enter");
  expect(await page.evaluate(() => ({ name: workbench.data.get("design").name,
    hours: workbench.data.get("design").hours }))).toEqual({ name: "Reentrant property edit", hours: 23 });
});

test("a queued context switch after commit cannot overwrite a newer selection", async ({ page }) => {
  await page.evaluate(() => { workbench.select("design"); workbench.grid.startEdit("design", "name"); });
  await editor(page).fill("Committed before newer intent");
  await page.evaluate(() => { workbench.select("keys"); workbench.select("docs"); });
  await selected(page, "docs");
  expect(await page.evaluate(() => ({ name: workbench.data.get("design").name,
    selected: workbench.tree.getSelectedIds(), grid: workbench.grid.getSelectedIds() })))
    .toEqual({ name: "Committed before newer intent", selected: ["docs"], grid: ["docs"] });
});

test("sort retains selection, filters and collapse clear hidden context without stale properties", async ({ page }) => {
  await page.evaluate(() => { workbench.select("design"); workbench.grid.sortBy("name", "desc"); });
  await selected(page, "design");
  expect(await page.evaluate(() => workbench.grid.getSelectedIds())).toEqual(["design"]);
  await page.evaluate(() => workbench.setFilter("keyboard"));
  await selected(page, null);
  await expect(page.locator(".grid-workbench__tasks .dui-grid__row")).toHaveCount(1);
  await expect(page.locator(".grid-workbench__properties .dui-property-grid__property-row")).toHaveCount(0);
  await page.evaluate(() => workbench.select("keys"));
  await selected(page, "keys");
  await page.evaluate(() => workbench.tree.collapse("atlas", { silent: true }));
  await selected(page, null);
  expect(await page.evaluate(() => ({ selected: workbench.grid.getSelectedIds(), collapsed: !workbench.tree.isExpanded("atlas") })))
    .toEqual({ selected: [], collapsed: true });
  await expect(page.locator(".grid-workbench__properties .dui-property-grid__property-row")).toHaveCount(0);
});

test("background silent writes retain a draft; import reconciles record identity and removes stale editors", async ({ page }) => {
  await page.evaluate(() => { workbench.select("design"); workbench.grid.startEdit("design", "name"); });
  await editor(page).fill("Uncommitted draft");
  const handle = await editor(page).elementHandle();
  await page.evaluate(() => workbench.silentUpdate("keys"));
  await expect(editor(page)).toHaveValue("Uncommitted draft");
  expect(await handle.evaluate(input => input.isConnected)).toBe(true);
  expect(await page.evaluate(() => workbench.data.get("keys").hours)).toBe(6);
  await page.evaluate(() => workbench.replaceRecords(workbench.data.all().map(row => row.id === "design" ? { ...row, name: "Imported record" } : row)));
  await expect(editor(page)).toHaveCount(0);
  await selected(page, "design");
  expect(await page.evaluate(() => ({ current: workbench.grid.selection.get()[0] === workbench.data.get("design"),
    property: workbench.properties.getPropertyControl("name").value }))).toEqual({ current: true, property: "Imported record" });
});

test("schema replacement and source removal reconcile views, editors and inspector", async ({ page }) => {
  await page.evaluate(() => {
    workbench.select("design");
    workbench.tree.sortBy("name", "asc");
    workbench.tree.setColumnFilter("name", "Design");
    workbench.tree.startEdit("design", "name");
    workbench.tree.setColumns([{ id: "hours", title: "Hours", sortable: true }]);
    workbench.grid.setColumnFilter("name", { kind: "text", value: "Design", operator: "contains" });
    workbench.grid.sortBy("name", "asc");
    workbench.grid.startEdit("design", "name");
    workbench.grid.setColumns([{ id: "hours", title: "Hours", sortable: true }]);
    workbench.data.update("design", { name: "New schema record" }, { silent: true });
  });
  expect(await page.evaluate(() => ({ gridSort: workbench.grid.getSortModel(), treeSort: workbench.tree.getSortModel(),
    editors: workbench.activeEditorCount }))).toEqual({ gridSort: [], treeSort: [], editors: 0 });
  await page.evaluate(() => workbench.restoreColumns());
  await expect(page.locator(".grid-workbench__tasks")).toContainText("New schema record");
  await page.evaluate(() => { workbench.select("design"); workbench.grid.startEdit("design", "name"); workbench.data.remove("design", { silent: true }); });
  await selected(page, null);
  await expect(editor(page)).toHaveCount(0);
  await expect(page.locator(".grid-workbench__properties .dui-property-grid__property-row")).toHaveCount(0);
});

test("destroying the screen from a commit callback stops later phases and releases borrowed models", async ({ page }) => {
  await page.evaluate(() => {
    workbench.select("design"); workbench.grid.startEdit("design", "name");
    window.lateCommits = 0;
    workbench.grid.events.on("beforeCellChange", () => workbench.destroy());
    workbench.grid.events.on("editCommit", () => window.lateCommits++);
  });
  await editor(page).fill("Never written");
  await page.keyboard.press("Enter");
  await expect(page.locator(".grid-workbench")).toHaveCount(0);
  expect(await page.evaluate(() => ({ destroyed: workbench.destroyed, data: workbench.data.destroyed,
    treeView: workbench.treeView.destroyed, view: workbench.view.destroyed, late: window.lateCommits })))
    .toEqual({ destroyed: true, data: true, treeView: true, view: true, late: 0 });
});

test("context and domain projection callbacks may close the screen without late model access", async ({ page }) => {
  const results = await page.evaluate(async () => {
    const { createGridWorkbench } = await import("/examples/ai-recipes/09-grid-workbench.js");
    const results = [];
    for (const action of ["select", "filter", "replace", "background", "properties", "clearProperties", "remove"]) {
      await Promise.resolve();
      const screen = workbench;
      const rows = screen.data.all();
      if (!["properties", "clearProperties", "remove"].includes(action)) screen.view.events.once("invalidate", () => screen.destroy());
      let error = null;
      try {
        if (action === "select") screen.select("package");
        if (action === "filter") screen.setFilter("keyboard");
        if (action === "replace") screen.replaceRecords(rows);
        if (action === "background") screen.silentUpdate("keys");
        if (action === "properties") {
          screen.properties.events.once("propertyFocusChange", () => screen.destroy());
          const button = screen.owner.getItemAt(2).getItemAt(2).getItemAt(1);
          button.events.emit("click", { source: button, origin: "api", userAction: false });
        }
        if (action === "clearProperties") {
          screen.properties.selectProperty("name");
          screen.properties.events.once("propertyFocusChange", () => screen.destroy());
          screen.properties.clearPropertySelection();
        }
        if (action === "remove") {
          screen.data.events.once("beforeChange", () => screen.destroy());
          const button = screen.owner.getItemAt(1).getItemAt(5);
          button.events.emit("click", { source: button, origin: "api", userAction: false });
        }
        if (!screen.destroyed) throw new Error("Expected a projection callback");
        if (screen.silentUpdate() !== false || screen.setFilter("") !== false || screen.replaceRecords([]) !== false) {
          throw new Error("Closed domain actions must reject without touching models");
        }
      } catch (failure) { error = failure.message; }
      results.push({ action, error, destroyed: screen.destroyed });
      screen.destroy();
      workbench = createGridWorkbench("#root");
    }
    return results;
  });
  expect(results).toEqual(["select", "filter", "replace", "background", "properties", "clearProperties", "remove"].map(action => ({ action, error: null, destroyed: true })));
});

test("global filter clearing keeps project scope and synchronizes the Find task field", async ({ page }) => {
  const taskGrid = page.locator(".grid-workbench__tasks");
  const find = page.getByRole("textbox", { name: "Find task", exact: true });
  const menu = taskGrid.getByRole("button", { name: "\u041d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438 \u0442\u0430\u0431\u043b\u0438\u0446\u044b", exact: true });
  for (const { project, query, ids } of [
    { project: "atlas", query: "keyboard", ids: ["design", "keys", "docs"] },
    { project: "boreal", query: "package", ids: ["package", "verify"] }
  ]) {
    await page.evaluate(project => workbench.select(project), project);
    await find.fill(query);
    await expect(taskGrid.locator(".dui-grid__row[data-dui-grid-row-id]")).toHaveCount(1);
    await menu.click();
    await page.getByRole("menuitem", { name: "Clear all filters", exact: true }).click();
    await expect(find).toHaveValue("");
    await expect(taskGrid.locator(".dui-grid__row[data-dui-grid-row-id]")).toHaveCount(ids.length);
    expect(await page.evaluate(() => ({ context: workbench.contextId,
      ids: workbench.view.all().map(row => row.id), kinds: workbench.view.all().map(row => row.kind) })))
      .toEqual({ context: project, ids, kinds: ids.map(() => "task") });
  }
});
