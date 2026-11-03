import {docsCatalog as sourceCatalog} from '../docs/src/docsCatalog.js';
const expectedExampleCount=sourceCatalog.find(g=>g.id==='components').groups.find(g=>g.id==='list-components').pages.reduce((n,p)=>n+(p.examples?.length??0),0);
import { openComponentGroup } from "./docs-helpers.js";
import { test, expect } from "@playwright/test";

test("List docs show icons, multiple roots, directory columns and checkbox selection", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/docs/index.html#basic-list");
  await openComponentGroup(page, "List");
  const nav = page.locator(".dui-docs-tree");
  await expect(nav.getByRole("treeitem", { name: "List", exact: true })).toHaveAttribute("aria-level", "2");
  for (const name of ["Basic List", "TreeList", "TreeTableList", "Check List"]) {
    await expect(nav.getByRole("treeitem", { name, exact: true })).toHaveAttribute("aria-level", "3");
  }
  const plain = page.getByRole("listbox", { name: "Messages", exact: true });
  await expect(plain.locator(".dui-list__icon")).toHaveCount(0);
  await plain.focus();
  await plain.press("ArrowDown");
  await plain.press("Enter");
  await expect(plain.getByRole("option", { name: "Drafts", exact: true })).toHaveAttribute("aria-selected", "true");
  const icons = page.getByRole("listbox", { name: "Workspace shortcuts", exact: true });
  await expect(icons.locator(".dui-list__icon")).toHaveCount(3);
  await icons.getByRole("option", { name: "Settings", exact: true }).click();
  await expect(page.locator(".dui-example-host__output").last()).toHaveText("Selected id: settings");

  await nav.getByRole("treeitem", { name: "TreeList", exact: true }).click();
  const hosts = page.locator(".dui-example-host");
  await hosts.first().getByRole("button", { name: "Expand All", exact: true }).click();
  const tree = page.getByRole("tree", { name: "Project hierarchy", exact: true });
  await expect(tree.getByRole("treeitem")).toHaveCount(6);
  await expect(tree.getByRole("treeitem", { name: "Components", exact: true })).toHaveAttribute("aria-level", "3");
  await hosts.first().getByRole("button", { name: "Collapse All", exact: true }).click();
  await expect(tree.getByRole("treeitem")).toHaveCount(2);
  const files = page.getByRole("tree", { name: "Files", exact: true });
  await expect(files.locator(".dui-list__icon")).toHaveCount(6);
  await files.getByRole("treeitem", { name: "Button.js", exact: true }).click();
  await expect(hosts.last().locator(".dui-example-host__output")).toHaveText("Selected: Button.js");
  await hosts.last().getByRole("button", { name: "Collapse All", exact: true }).click();
  await expect(files.getByRole("treeitem")).toHaveCount(2);
  await hosts.last().getByRole("button", { name: "Expand All", exact: true }).click();
  await expect(files.getByRole("treeitem")).toHaveCount(6);

  await nav.getByRole("treeitem", { name: "TreeTableList", exact: true }).click();
  const directory = page.locator('[data-dui-control-id="directoryTree"]');
  await expect(directory.locator(".dui-grid__header-cell")).toHaveCount(4);
  await expect(directory.locator(".dui-grid__row[data-dui-grid-row-id]")).toHaveCount(6);
  await expect(directory).toContainText("2026-08-03");
  await expect(directory).toContainText("12 KB");
  await page.getByRole("button", { name: "Collapse All", exact: true }).click();
  await expect(directory.locator(".dui-grid__row[data-dui-grid-row-id]")).toHaveCount(2);
  await page.getByRole("button", { name: "Expand All", exact: true }).click();
  await expect(directory.locator(".dui-tree-grid__node-icon")).toHaveCount(6);

  await nav.getByRole("treeitem", { name: "Check List", exact: true }).click();
  const checks = page.getByRole("listbox", { name: "Export contents", exact: true });
  await expect(checks).toHaveAttribute("aria-multiselectable", "true");
  await checks.getByRole("option", { name: "Mapping rules", exact: true }).click();
  await expect(checks.locator('[aria-selected="true"]')).toHaveCount(3);
  await checks.press("Space");
  await expect(checks.locator('[aria-selected="true"]')).toHaveCount(2);
  await page.getByRole("button", { name: "Select All", exact: true }).click();
  await expect(checks.locator('[aria-selected="true"]')).toHaveCount(4);
  await page.getByRole("button", { name: "Clear Selection", exact: true }).click();
  await expect(checks.locator('[aria-selected="true"]')).toHaveCount(0);
  await expect(page.locator(".dui-example-host__output")).toHaveText("[]");
  await page.getByRole("button", { name: "Dark", exact: true }).click();
  expect(errors).toEqual([]);
});

test("list source examples match live trees and release owned models", async ({ page }) => {
  await page.goto("/browser-tests/recipes.html");
  const count = await page.evaluate(async () => {
    const ui = await import("/src/ui/all.js");
    const { docsCatalog } = await import("/docs/src/docsCatalog.js");
    const pages = docsCatalog.find(group => group.id === "components").groups.find(group => group.id === "list-components").pages;
    const container = document.querySelector("#root");
    const log = { write() {} };
    const snapshot = control => ({ type: control.constructor.name, data: control.data?.all(),
      selected: control.selection?.get().map(item => item.id), expanded: control.treeView?.getExpandedIds(),
      children: (control.getItems?.() ?? []).map(snapshot) });
    let count = 0;
    for (const doc of pages) for (const example of doc.examples) {
      const run = new Function(...Object.keys(ui), "log", `${example.source}\nreturn example;`);
      const states = [];
      for (const create of [() => example.create({ container, log }), () => run(...Object.values(ui), log)]) {
        const control = create();
        states.push(JSON.stringify(snapshot(control)));
        const owned = [];
        const collect = item => {
          owned.push(item, ...[item.data, item.selection, item.treeView].filter(Boolean));
          for (const child of item.getItems?.() ?? []) collect(child);
        };
        collect(control);
        control.destroy();
        if (container.childElementCount || owned.some(item => !item.destroyed)) throw new Error(`Leaked ${doc.id}`);
      }
      if (states[0] !== states[1]) throw new Error(`Source mismatch: ${doc.id}`);
      count++;
    }
    return count;
  });
  expect(count).toBe(expectedExampleCount);
});

test("list icons and keyboard focus follow data and control state", async ({ page }) => {
  await page.goto("/browser-tests/recipes.html");
  await page.evaluate(async () => {
    const { List, TreeList, OptionList, Panel } = await import("/src/ui/all.js");
    const owner = new Panel("#root", { name: "listFixture" });
    const list = new List({ name: "list", iconField: "symbol" });
    const tree = new TreeList({ name: "tree", iconField: "symbol", nodeReorder: false });
    const checks = new OptionList({ name: "checks", multiSelect: true });
    owner.add(list, tree, checks);
    list.data.parse([{ id: 7, text: "Document", symbol: "file" }, { id: "7", text: "Folder", symbol: "folder" }]);
    tree.data.parse([{ id: "root", parentId: null, text: "Root", symbol: "folder" }, { id: "leaf", parentId: "root", text: "Leaf", symbol: "file" }, { id: "otherRoot", parentId: null, text: "Other root", symbol: "folder" }]);
    checks.data.parse([{ id: 1, text: "One", icon: "check" }, { id: 2, text: "Two" }]);
    window.listFixture = { owner, list, tree, checks };
  });
  const list = page.getByRole("listbox", { name: "list", exact: true });
  await expect(list).toHaveAttribute("tabindex", "0");
  await list.focus();
  await list.press("End");
  await list.press("Enter");
  expect(await page.evaluate(() => listFixture.list.selection.get().map(item => item.id))).toEqual(["7"]);
  const active = await list.getAttribute("aria-activedescendant");
  await expect(page.locator(`[id="${active}"]`)).toHaveText("Folder");
  await page.evaluate(() => listFixture.list.data.update(7, { text: "No icon", symbol: null }));
  await expect(list.locator(".dui-list__icon")).toHaveCount(1);
  await page.evaluate(() => listFixture.list.disable());
  await expect(list).toHaveAttribute("tabindex", "-1");
  await page.evaluate(() => listFixture.list.enable());
  await expect(list).toHaveAttribute("tabindex", "0");
  const tree = page.getByRole("tree", { name: "tree", exact: true });
  await tree.focus();
  await tree.press("ArrowRight");
  await expect(tree.locator(".dui-list__icon")).toHaveCount(3);
  await tree.press("ArrowLeft");
  await expect(tree.locator(".dui-list__icon")).toHaveCount(2);
  await tree.press("ArrowDown");
  await tree.press("Enter");
  await expect(tree.getByRole("treeitem", { name: "Other root", exact: true })).toHaveAttribute("aria-selected", "true");
  expect(await page.evaluate(() => listFixture.tree.selection.get().map(item => item.id))).toEqual(["otherRoot"]);
  await page.evaluate(() => listFixture.checks.value.set([1, 2], { silent: true }));
  const checks = page.getByRole("listbox", { name: "checks", exact: true });
  await expect(checks.locator('[aria-selected="true"]')).toHaveCount(2);
  await expect(checks.locator(".dui-list__icon")).toHaveCount(1);
  await page.evaluate(() => listFixture.list.data.parse([]));
  await expect(list).not.toHaveAttribute("aria-activedescendant", /.+/);
  await page.evaluate(() => listFixture.owner.destroy());
  await expect(page.locator("#root")).toBeEmpty();
});
