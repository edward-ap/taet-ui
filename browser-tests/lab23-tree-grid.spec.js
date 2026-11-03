import { expect, test } from "@playwright/test";
import { capturePageErrors, expectNoPageErrors } from "./smoke-helpers.js";

test("lab23 TreeGrid loads and preserves tree semantics", async ({ page }) => {
  const errors = capturePageErrors(page);
  await page.goto("/examples/labs/lab23.html");

  const tree = page.locator(".dui-lab23-grid");
  await expect(tree).toBeVisible();
  await expect(tree.locator(".dui-grid__header-cell")).toHaveCount(7);
  await expect(tree.locator(".dui-grid__column-menu-button")).toHaveCount(7);
  await expect(tree.locator(".dui-tree-grid__node-icon").first()).toBeVisible();

  const search = tree.locator(".dui-grid__search-input");
  await search.fill("Asset 1.2.3");
  await expect(tree.locator(".dui-grid__row[data-dui-grid-row-id]")).toHaveCount(3);
  await expect(tree.locator(".dui-grid__row[data-dui-grid-row-id]").nth(0)).toContainText("Workspace 1");
  await expect(tree.locator(".dui-grid__row[data-dui-grid-row-id]").nth(1)).toContainText("Folder 2");
  await expect(tree.locator(".dui-grid__row[data-dui-grid-row-id]").nth(2)).toContainText("Asset 1.2.3");

  await search.fill("");
  await search.press("Control+A");
  await search.press("Backspace");
  await expect(tree.locator(".dui-grid__status-bar")).toContainText("Total 1260");

  await tree.press("ArrowDown");
  const firstKeyboardRow = await tree.locator(".dui-grid__cell--active").locator("xpath=..")
    .getAttribute("data-dui-grid-row-id");
  await tree.press("ArrowDown");
  const secondKeyboardRow = await tree.locator(".dui-grid__cell--active").locator("xpath=..")
    .getAttribute("data-dui-grid-row-id");
  expect(secondKeyboardRow).not.toBe(firstKeyboardRow);
  await tree.press("Home");
  const firstVisibleRow = await tree.locator(".dui-grid__row[data-dui-grid-row-id]").first()
    .getAttribute("data-dui-grid-row-id");
  expect(await tree.locator(".dui-grid__cell--active").locator("xpath=..")
    .getAttribute("data-dui-grid-row-id")).toBe(firstVisibleRow);

  const owner = tree.locator('.dui-grid__cell[data-dui-grid-column-id="owner"]').first();
  await owner.dblclick();
  await expect(tree.locator(".dui-grid__cell--editing")).toHaveCount(1);
  const status = tree.locator('.dui-grid__cell[data-dui-grid-column-id="status"]').nth(1);
  await status.click();
  await expect(tree.locator(".dui-grid__cell--editing")).toHaveCount(0);
  await expect(status).toHaveClass(/dui-grid__cell--active/);

  await tree.locator('.dui-grid__header-cell[data-dui-grid-column-id="status"] .dui-grid__column-menu-button').click();
  await expect(page.getByRole("menuitem", { name: "Filter values" })).toBeVisible();
  await page.keyboard.press("Escape");

  await expectNoPageErrors(errors);
});

test("lab23 TreeGrid uses the shared column resizer", async ({ page }) => {
  const errors = capturePageErrors(page);
  await page.goto("/examples/labs/lab23.html");

  const tree = page.locator(".dui-lab23-grid");
  const header = tree.locator('.dui-grid__header-cell[data-dui-grid-column-id="name"]');
  const handle = header.locator(".dui-grid__resize-handle");
  const before = await header.boundingBox();
  const box = await handle.boundingBox();
  if (!before || !box) throw new Error("TreeGrid resize geometry is unavailable.");

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect(tree).toHaveClass(/dui-grid--resizing/);
  await page.mouse.move(box.x + box.width / 2 + 32, box.y + box.height / 2);
  await page.mouse.up();

  const after = await header.boundingBox();
  expect(after?.width).toBeGreaterThan(before.width + 18);
  await expect(tree).not.toHaveClass(/dui-grid--resizing/);
  await expectNoPageErrors(errors);
});
