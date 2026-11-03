import { expect, test } from "@playwright/test";
import { capturePageErrors, expectNoPageErrors } from "./smoke-helpers.js";

test("lab22 Grid loads and supports selection, editing, and column menu", async ({ page }) => {
  const errors = capturePageErrors(page);
  await page.goto("/examples/labs/lab22.html");

  const grid = page.locator(".dui-lab22-grid");
  await expect(grid).toBeVisible();
  await expect(grid.locator(".dui-grid__header-cell")).toHaveCount(12);
  await expect(grid.locator(".dui-grid__row[data-dui-grid-row-id]").first()).toBeVisible();
  const pageIcons = grid.locator(".dui-grid__pagination .dui-grid__page-button .dui-icon");
  await expect(pageIcons).toHaveCount(4);
  expect(await pageIcons.first().evaluate(icon => getComputedStyle(icon).width)).toBe("14px");

  await grid.press("ArrowDown");
  const firstKeyboardRow = await grid.locator(".dui-grid__cell--active").locator("xpath=..")
    .getAttribute("data-dui-grid-row-id");
  await grid.press("ArrowDown");
  const secondKeyboardRow = await grid.locator(".dui-grid__cell--active").locator("xpath=..")
    .getAttribute("data-dui-grid-row-id");
  expect(secondKeyboardRow).not.toBe(firstKeyboardRow);
  await grid.press("ArrowRight");
  await expect(grid.locator('.dui-grid__cell--active[data-dui-grid-column-id="customer"]')).toHaveCount(1);

  const owner = grid.locator('.dui-grid__cell[data-dui-grid-column-id="owner"]').first();
  await owner.dblclick();
  await expect(grid.locator(".dui-grid__cell--editing")).toHaveCount(1);

  const status = grid.locator('.dui-grid__cell[data-dui-grid-column-id="status"]').nth(1);
  await status.click();
  await expect(grid.locator(".dui-grid__cell--editing")).toHaveCount(0);
  await expect(status).toHaveClass(/dui-grid__cell--active/);
  await expect(status.locator("xpath=..")).toHaveClass(/dui-selected/);

  await grid.locator('.dui-grid__header-cell[data-dui-grid-column-id="status"] .dui-grid__column-menu-button').click();
  await expect(page.getByRole("menuitem", { name: "Condition..." })).toBeVisible();
  await page.keyboard.press("Escape");

  await expectNoPageErrors(errors);
});

test("lab22 Grid column resizer owns pointer tracking and cleanup", async ({ page }) => {
  const errors = capturePageErrors(page);
  await page.goto("/examples/labs/lab22.html");

  const grid = page.locator(".dui-lab22-grid");
  const header = grid.locator('.dui-grid__header-cell[data-dui-grid-column-id="id"]');
  const handle = header.locator(".dui-grid__resize-handle");
  const before = await header.boundingBox();
  const box = await handle.boundingBox();
  if (!before || !box) throw new Error("Grid resize geometry is unavailable.");

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect(grid).toHaveClass(/dui-grid--resizing/);
  await page.mouse.move(box.x + box.width / 2 + 36, box.y + box.height / 2);
  await page.mouse.up();

  const after = await header.boundingBox();
  expect(after?.width).toBeGreaterThan(before.width + 20);
  await expect(grid).not.toHaveClass(/dui-grid--resizing/);
  await expectNoPageErrors(errors);
});

test("lab22 Grid virtual renderer advances the DOM window on scroll", async ({ page }) => {
  const errors = capturePageErrors(page);
  await page.goto("/examples/labs/lab22.html");

  const grid = page.locator(".dui-lab22-grid");
  const body = grid.locator(".dui-grid__body");
  const rows = body.locator(".dui-grid__row[data-dui-grid-row-id]");
  await page.evaluate(() => {
    window.lab22.grid.rowDetail = null;
    window.lab22.grid._renderRows();
  });
  const firstId = await rows.first().getAttribute("data-dui-grid-row-id");
  expect(await rows.count()).toBeLessThan(200);

  await body.evaluate(element => { element.scrollTop = 2400; element.dispatchEvent(new Event("scroll")); });
  await expect.poll(async () => rows.first().getAttribute("data-dui-grid-row-id")).not.toBe(firstId);
  await expect(body.locator('.dui-grid__row-spacer[data-dui-grid-spacer="top"]')).toBeVisible();
  expect(await rows.count()).toBeLessThan(200);
  await expectNoPageErrors(errors);
});
