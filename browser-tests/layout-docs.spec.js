import { openComponentGroup } from "./docs-helpers.js";
import { test, expect } from "@playwright/test";

test("Layout documentation composes frames, resizable IDE panes, tabs and accordion", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/docs/index.html#simple-layout");
  await openComponentGroup(page, "Layout");
  const tree = page.locator(".dui-docs-tree");
  await expect(tree.getByRole("treeitem", { name: "Layout", exact: true })).toHaveAttribute("aria-level", "2");
  for (const name of ["Simple Layout", "Border Layout", "Tabs", "Accordion"]) {
    await expect(tree.getByRole("treeitem", { name, exact: true })).toHaveAttribute("aria-level", "3");
  }
  await expect(page.locator('[data-dui-control-id="plain"]')).toHaveClass(/dui-layout--borderless/);
  await expect(page.locator('[data-dui-control-id="plain"] > .dui-layout__header')).toBeHidden();
  await expect(page.locator('[data-dui-control-id="framed"]')).toHaveClass(/dui-layout--bordered/);
  await expect(page.locator('[data-dui-control-id="titled"] > .dui-layout__header')).toBeVisible();
  await expect(page.locator('[data-dui-control-id="titledFramed"]')).toHaveClass(/dui-layout--bordered/);

  await tree.getByRole("treeitem", { name: "Border Layout", exact: true }).click();
  const workspace = page.locator('[data-dui-control-id="ideWorkspace"]');
  await expect(workspace.getByRole("separator")).toHaveCount(2);
  const explorer = page.locator('[data-dui-control-id="explorer"]');
  const before = await explorer.boundingBox();
  const drag = async (locator, dx, dy) => {
    const box = await locator.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + dx, box.y + box.height / 2 + dy, { steps: 6 });
    await page.mouse.up();
  };
  await drag(workspace.locator('[role="separator"][aria-orientation="vertical"]'), 70, 0);
  expect((await explorer.boundingBox()).width).toBeGreaterThan(before.width + 40);
  const bottom = workspace.locator('[data-dui-control-id="bottom"]');
  const bottomBefore = await bottom.boundingBox();
  await drag(workspace.locator('[role="separator"][aria-orientation="horizontal"]'), 0, -35);
  expect((await bottom.boundingBox()).height).toBeGreaterThan(bottomBefore.height + 20);
  const upperBox = await page.locator('[data-dui-control-id="upper"]').boundingBox();
  expect(Math.abs((await bottom.boundingBox()).width - upperBox.width)).toBeLessThan(2);
  await expect(page.locator('[data-dui-control-id="projectName"] input')).toHaveValue("Tæt UI");

  await tree.getByRole("treeitem", { name: "Tabs", exact: true }).click();
  await expect(page.locator('[data-dui-control-id="generalTab"] > .dui-dock-panel__header')).toBeHidden();
  const nameField = page.locator('[data-dui-control-id="tabName"] input');
  await nameField.fill("Grace");
  await page.getByRole("tab", { name: "Notes", exact: true }).click();
  await expect(page.locator('[data-dui-control-id="notesTab"] > .dui-dock-panel__header')).toBeHidden();
  await expect(nameField).toBeHidden();
  await expect(page.locator('[data-dui-control-id="tabNotes"] textarea')).toBeVisible();
  await page.getByRole("tab", { name: "General", exact: true }).click();
  await expect(nameField).toHaveValue("Grace");

  await tree.getByRole("treeitem", { name: "Accordion", exact: true }).click();
  const single = page.locator('[data-dui-control-id="settingsAccordion"]');
  await single.locator('input').first().fill("Grace");
  await single.getByRole("button", { name: "Connection", exact: true }).click();
  await expect(single.getByRole("button", { name: "General", exact: true })).toHaveAttribute("aria-expanded", "false");
  await single.getByRole("button", { name: "General", exact: true }).click();
  await expect(single.locator('[data-dui-control-id="accordionName"] input')).toHaveValue("Grace");
  const multiple = page.locator('[data-dui-control-id="detailsAccordion"]');
  await expect(multiple.getByRole("region")).toHaveCount(2);
  await multiple.getByRole("button", { name: "Source", exact: true }).click();
  await expect(multiple.getByRole("region")).toHaveCount(1);
  await expect(multiple.getByRole("button", { name: "Managed settings" })).toBeDisabled();
  await page.getByRole("button", { name: "Dark", exact: true }).click();
  expect(errors).toEqual([]);
});

test("layout snippets mount full ownership trees and release them on teardown", async ({ page }) => {
  await page.goto("/browser-tests/recipes.html");
  const count = await page.evaluate(async () => {
    const ui = await import("/src/ui/all.js");
    const { docsCatalog } = await import("/docs/src/docsCatalog.js");
    const pages = docsCatalog.find(group => group.id === "components").groups.find(group => group.id === "layout-components").pages;
    const container = document.querySelector("#root");
    const log = { write() {} };
    const snapshot = control => ({ type: control.constructor.name,
      value: control.value?.get(), expanded: control.getExpanded?.(),
      children: (control.getItems?.() ?? []).map(snapshot) });
    let count = 0;
    for (const doc of pages) for (const example of doc.examples) {
      const run = new Function(...Object.keys(ui), "log", `${example.source}\nreturn example;`);
      const values = [];
      for (const create of [() => example.create({ container, log }), () => run(...Object.values(ui), log)]) {
        const owner = create();
        values.push(JSON.stringify(snapshot(owner)));
        const descendants = [];
        const collect = control => {
          descendants.push(control);
          for (const child of control.getItems?.() ?? []) collect(child);
          if (typeof control.tabs?.destroy === "function") collect(control.tabs);
        };
        collect(owner);
        owner.destroy();
        if (container.childElementCount || descendants.some(control => !control.destroyed)) throw new Error(`Leaked ${doc.id}`);
      }
      if (values[0] !== values[1]) throw new Error(`Source mismatch: ${doc.id}`);
      count++;
    }
    return count;
  });
  expect(count).toBe(7);
});
