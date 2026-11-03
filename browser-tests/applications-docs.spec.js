import {docsCatalog as sourceCatalog} from '../docs/src/docsCatalog.js';
const expectedExampleCount=sourceCatalog.find(g=>g.id==='components').groups.find(g=>g.id==='application-components').pages.reduce((n,p)=>n+(p.examples?.length??0),0);
import { openComponentGroup } from "./docs-helpers.js";
import { test, expect } from "@playwright/test";

const nav = page => page.locator(".dui-docs-tree");
const live = page => page.locator(".dui-example-host__live");

test("Applications menus and toolbar share action state and nested choices", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/docs/index.html#menu");
  await openComponentGroup(page, "Applications");
  await expect(nav(page).getByRole("treeitem", { name: "Applications", exact: true })).toHaveAttribute("aria-level", "2");
  for (const name of ["Menu", "Toolbar", "Docking", "StatusBar", "DialogBox"]) {
    await expect(nav(page).getByRole("treeitem", { name, exact: true })).toHaveAttribute("aria-level", "3");
  }
  const menu = page.getByRole("menubar", { name: "Application menu", exact: true });
  await menu.getByRole("menuitem", { name: "File", exact: true }).click();
  await expect(page.getByRole("menuitem", { name: "Save", exact: true })).toHaveAttribute("aria-disabled", "true");
  await page.keyboard.press("Escape");
  await live(page).getByRole("button", { name: "Mark Modified", exact: true }).click();
  await menu.getByRole("menuitem", { name: "File", exact: true }).click();
  await page.getByRole("menuitem", { name: "Save", exact: true }).click();
  await expect(page.locator(".dui-example-host__output").first()).toHaveText("Save executed");
  await expect(live(page).getByRole("button", { name: "Save", exact: true })).toBeDisabled();
  await menu.getByRole("menuitem", { name: "View", exact: true }).click();
  await page.getByRole("menuitem", { name: "Panels", exact: true }).hover();
  await page.getByRole("menuitemcheckbox", { name: "Properties", exact: true }).click();
  await expect(page.locator(".dui-example-host__output").first()).toHaveText("Properties hidden");
  await live(page).getByRole("button", { name: "Right-click for actions", exact: true }).click({ button: "right" });
  await page.getByRole("menuitem", { name: "Copy", exact: true }).hover();
  await page.getByRole("menuitem", { name: "Copy id", exact: true }).click();
  await expect(page.locator(".dui-example-host__output").last()).toHaveText("ID: mapping-1");
  await nav(page).getByRole("treeitem", { name: "Toolbar", exact: true }).click();
  const toolbar = page.getByRole("toolbar", { name: "Document toolbar", exact: true });
  await expect(toolbar.getByRole("button", { name: "Save document", exact: true })).toBeDisabled();
  await live(page).getByRole("textbox", { name: "Document", exact: true }).fill("Contacts");
  await toolbar.getByRole("button", { name: "Save document", exact: true }).click();
  await expect(page.locator(".dui-example-host__output")).toHaveText("Saved: Contacts");
  await toolbar.getByRole("combobox", { name: "Zoom", exact: true }).selectOption({ label: "125%" });
  await expect(page.locator(".dui-example-host__output")).toHaveText("Zoom: 125%");
  await toolbar.getByRole("button", { name: "Validate document", exact: true }).click();
  await expect(page.locator(".dui-example-host__output")).toHaveText("Validation requested");
  await page.getByRole("button", { name: "Dark", exact: true }).click();
  await expect(toolbar.locator(".dui-icon")).toHaveCount(3);
  expect(errors).toEqual([]);
});

test("Docking keeps content through moves and restore; StatusBar stays compact", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/docs/index.html#docking");
  await openComponentGroup(page, "Applications");
  await live(page).getByRole("textbox", { name: "Project", exact: true }).fill("Retained project");
  await live(page).getByRole("button", { name: "Collapse Explorer", exact: true }).click();
  const dock = page.locator('[data-dui-control-id="applicationDock"]');
  await expect(dock.locator('.dui-dock-strip--left .dui-dock-strip__button', { hasText: "Explorer" })).toBeVisible();
  await live(page).getByRole("button", { name: "Show Explorer", exact: true }).click();
  await expect(dock.getByRole("tree", { name: "Project files", exact: true })).toBeVisible();
  await live(page).getByRole("button", { name: "Output to Right", exact: true }).click();
  await expect(dock.getByRole("tab", { name: "Output", exact: true })).toBeVisible();
  await live(page).getByRole("button", { name: "Save Layout", exact: true }).click();
  await live(page).getByRole("button", { name: "Collapse Explorer", exact: true }).click();
  await live(page).getByRole("button", { name: "Restore Layout", exact: true }).click();
  await expect(dock.getByRole("tree", { name: "Project files", exact: true })).toBeVisible();
  await expect(live(page).getByRole("textbox", { name: "Project", exact: true })).toHaveValue("Retained project");
  await nav(page).getByRole("treeitem", { name: "StatusBar", exact: true }).click();
  const bar = page.getByRole("toolbar", { name: "Application status", exact: true });
  expect((await bar.boundingBox()).height).toBeLessThanOrEqual(33);
  await live(page).getByRole("button", { name: "Advance 25%", exact: true }).click();
  await expect(bar.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "25");
  await expect(bar).toContainText("25 / 100 rows");
  await live(page).getByRole("button", { name: "Complete", exact: true }).click();
  await expect(bar).toContainText("Completed");
  await expect(bar.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
  await live(page).getByRole("button", { name: "Reset", exact: true }).click();
  await expect(bar).toContainText("Ready");
  await page.getByRole("button", { name: "Dark", exact: true }).click();
  expect(errors).toEqual([]);
});

test("DialogBox validates content, returns results, restores focus and closes on navigation", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/docs/index.html#dialog-box");
  const opener = live(page).getByRole("button", { name: "Edit Settings", exact: true });
  await opener.click();
  const dialog = page.getByRole("dialog", { name: "Project settings", exact: true });
  await dialog.getByRole("textbox", { name: "Project", exact: true }).fill("");
  await dialog.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole("textbox", { name: "Project", exact: true }).fill("Contacts");
  await dialog.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
  await expect(page.locator(".dui-example-host__output")).toHaveText("Project: Contacts");
  await live(page).getByRole("button", { name: "Confirm Action", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(page.locator(".dui-example-host__output")).toHaveText("Dialog result: cancel");
  await live(page).getByRole("button", { name: "Show Message", exact: true }).click();
  await page.getByRole("dialog", { name: "Export complete", exact: true }).getByRole("button", { name: "OK", exact: true }).click();
  await expect(page.locator(".dui-example-host__output")).toHaveText("Dialog result: ok");
  await page.getByRole("button", { name: "Dark", exact: true }).click();
  await opener.click();
  await expect(dialog).toBeVisible();
  await page.evaluate(() => window.taetUiDocs.shell.navigate("menu"));
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".dui-overlay-backdrop")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("Applications snippets reproduce live state and destroy controls, models and commands", async ({ page }) => {
  await page.goto("/browser-tests/recipes.html");
  const count = await page.evaluate(async () => {
    const ui = await import("/src/ui/all.js");
    const { docsCatalog } = await import("/docs/src/docsCatalog.js");
    const pages = docsCatalog.find(group => group.id === "components").groups.find(group => group.id === "application-components").pages;
    const container = document.querySelector("#root");
    const log = { write() {} };
    const snapshot = control => ({ type: control.constructor.name, value: control.value?.get(), text: control.getText?.(),
      data: control.data?.all() ?? control.getResources?.(), children: (control.getItems?.() ?? []).map(snapshot) });
    let count = 0;
    for (const doc of pages) for (const example of doc.examples) {
      const run = new Function(...Object.keys(ui), "log", `${example.source}\nreturn example;`);
      const states = [];
      for (const create of [() => example.create({ container, log }), () => run(...Object.values(ui), log)]) {
        const owner = create();
        states.push(JSON.stringify(snapshot(owner)));
        const owned = new Set();
        const collect = item => {
          owned.add(item);
          for (const model of [item.data, item.selection, item.treeView, item.commands]) if (model) owned.add(model);
          for (const child of item.getItems?.() ?? []) collect(child);
          if (item.grid instanceof ui.TreeGrid) collect(item.grid);
          if (typeof item.tabs?.destroy === "function") collect(item.tabs);
        };
        collect(owner);
        owner.destroy();
        if (container.childElementCount || [...owned].some(item => !item.destroyed)) throw new Error(`Leaked ${doc.id}: ${[...owned].filter(item => !item.destroyed).map(item => item.constructor.name)}`);
      }
      if (states[0] !== states[1]) throw new Error(`Source mismatch: ${doc.id}`);
      count++;
    }
    return count;
  });
  expect(count).toBe(expectedExampleCount);
});
