import { expect, test } from "@playwright/test";
import { capturePageErrors, expectNoPageErrors } from "./smoke-helpers.js";

test("lab24 Popup handles switching, Escape, outside click, and focus restore", async ({ page }) => {
  const errors = capturePageErrors(page);
  await page.goto("/examples/labs/lab24.html");

  const first = page.getByRole("button", { name:"Open first popup" });
  const second = page.getByRole("button", { name:"Open second popup" });
  // Focus restoration is defined against actual focus, not browser-specific click focus.
  await first.focus();
  await first.press('Enter');
  await expect(page.getByText("First anchored popup", { exact:true })).toBeVisible();
  await expect(page.locator('[data-dui-overlay="popup"]:not([hidden])')).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(page.getByText("First anchored popup", { exact:true })).toBeHidden();
  await expect(first).toBeFocused();

  await first.click();
  await page.evaluate(() => lab24.secondPopup.events.once('beforeOpen', () => {
    window.popupRestoreTarget = document.activeElement;
  }));
  await second.click();
  await expect(page.locator('[data-dui-overlay="popup"]:not([hidden])')).toHaveCount(1);
  await expect(page.getByText("First anchored popup", { exact:true })).toBeHidden();
  await expect(page.getByText("Second popup aligned to the end", { exact:true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByText("Second popup aligned to the end", { exact:true })).toBeHidden();
  await expect.poll(() => page.evaluate(() => document.activeElement === popupRestoreTarget)).toBe(true);

  await first.click();
  await page.locator(".dui-lab24-panel").click({ position:{ x:400, y:160 } });
  await expect(page.getByText("First anchored popup", { exact:true })).toBeHidden();
  await expectNoPageErrors(errors);
});

test("lab24 Dialog and MessageBox return results and restore focus", async ({ page }) => {
  const errors = capturePageErrors(page);
  await page.goto("/examples/labs/lab24.html");

  const openDialog = page.getByRole("button", { name:"Open dialog" });
  await openDialog.focus();
  await openDialog.press('Enter');
  const dialog = page.getByRole("dialog", { name:"Edit mapping" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute("aria-modal", "true");
  await expect(page.locator(".dui-overlay-backdrop")).toBeVisible();
  await expect(page.getByRole("button", { name:"Apply" })).toBeFocused();
  await expect(page.getByRole("button", { name:"Unavailable" })).toBeDisabled();
  const dialogBeforeDrag = await dialog.boundingBox();
  const dialogHeader = dialog.locator("[data-dui-dialog-drag-handle='true']");
  const headerBox = await dialogHeader.boundingBox();
  if (!dialogBeforeDrag || !headerBox) {
    throw new Error("Dialog drag geometry is unavailable.");
  }
  await page.mouse.move(headerBox.x + 12, headerBox.y + headerBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(headerBox.x + 92, headerBox.y + headerBox.height / 2 + 40);
  await page.mouse.up();
  const dialogAfterDrag = await dialog.boundingBox();
  expect(dialogAfterDrag?.x).toBeGreaterThan(dialogBeforeDrag.x + 70);
  expect(dialogAfterDrag?.y).toBeGreaterThan(dialogBeforeDrag.y + 30);

  const appearance = await dialog.evaluate(element => {
    const header = getComputedStyle(element.querySelector(".dui-dialog__header"));
    const body = getComputedStyle(element.querySelector(".dui-dialog__body"));
    const footer = getComputedStyle(element.querySelector(".dui-dialog__footer"));
    const enabled = getComputedStyle(element.querySelector('[data-dui-dialog-result="apply"]'));
    const disabled = getComputedStyle(element.querySelector('[data-dui-dialog-result="unavailable"]'));
    const root = getComputedStyle(element);
    return {
      borderColor:root.borderTopColor,
      headerBackground:header.backgroundColor,
      headerColor:header.color,
      bodyBackground:body.backgroundColor,
      footerBackground:footer.backgroundColor,
      buttonBackground:enabled.backgroundColor,
      buttonColor:enabled.color,
      disabledBackground:disabled.backgroundColor,
      disabledColor:disabled.color
    };
  });

  expect(appearance.borderColor).toBe("rgb(95, 162, 217)");
  expect(appearance.headerBackground).toBe(appearance.borderColor);
  expect(appearance.headerColor).toBe("rgb(255, 255, 255)");
  expect(appearance.bodyBackground).toBe("rgb(255, 255, 255)");
  expect(appearance.footerBackground).toBe("rgb(238, 238, 238)");
  expect(appearance.buttonBackground).toBe(appearance.headerBackground);
  expect(appearance.buttonColor).toBe("rgb(255, 255, 255)");
  expect(appearance.disabledBackground).toBe("rgb(167, 202, 231)");
  expect(appearance.disabledColor).not.toBe(appearance.buttonColor);
  for (let index = 0; index < 8; index += 1) {
    await page.keyboard.press("Tab");
    expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
  }
  await page.getByRole("button", { name:"Apply" }).click();
  await expect(page.getByText("dialog result=apply", { exact:true })).toBeVisible();
  await expect(openDialog).toBeFocused();

  const confirm = page.getByRole("button", { name:"Confirm delete" });
  await confirm.focus();
  await confirm.press('Enter');
  await expect(page.getByRole("dialog", { name:"Confirm Delete" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByText("confirm result=cancel", { exact:true })).toBeVisible();
  await expect(confirm).toBeFocused();
  await expectNoPageErrors(errors);
});

test("lab24 Tooltip opens from hover and focus without stealing focus", async ({ page }) => {
  const errors = capturePageErrors(page);
  await page.goto("/examples/labs/lab24.html");

  const anchor = page.getByRole("button", { name:"Hover for help" });
  const tooltip = page.getByRole("tooltip");
  await anchor.hover();
  await expect(tooltip).toBeVisible();
  await expect(anchor).toHaveAttribute("aria-describedby", await tooltip.getAttribute("id"));

  await page.mouse.move(0, 0);
  await expect(tooltip).toBeHidden();
  await anchor.focus();
  await expect(tooltip).toBeVisible();
  await expect(anchor).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(tooltip).toBeHidden();
  await expectNoPageErrors(errors);
});
