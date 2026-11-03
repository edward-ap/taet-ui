import { expect, test } from "@playwright/test";
import { capturePageErrors, expectNoPageErrors } from "./smoke-helpers.js";

test("lab18 Layout renders a shared blue header and optional border", async ({ page }) => {
  const errors = capturePageErrors(page);
  await page.goto("/examples/labs/lab18.html");

  const layout = page.locator('[data-dui-control-id="dockSeedLayout"]');
  const header = layout.locator(":scope > .dui-layout__header");
  const body = layout.locator(":scope > .dui-layout__body");

  await expect(header).toBeVisible();
  await expect(header).toContainText("Workbench Layout");
  await expect(layout).toHaveClass(/dui-layout--bordered/);

  const appearance = await layout.evaluate(element => {
    const headerElement = element.querySelector(".dui-layout__header");
    const bodyElement = element.querySelector(".dui-layout__body");
    const layoutRect = element.getBoundingClientRect();
    const headerRect = headerElement.getBoundingClientRect();
    const bodyRect = bodyElement.getBoundingClientRect();
    const probe = document.createElement("span");
    probe.style.color = "var(--dui-window-border)";
    document.body.append(probe);
    const windowBorder = getComputedStyle(probe).color;
    probe.remove();
    return {
      borderColor:getComputedStyle(element).borderLeftColor,
      windowBorder,
      headerBackground:getComputedStyle(headerElement).backgroundColor,
      headerToken:getComputedStyle(element).getPropertyValue("--dui-window-header-bg").trim(),
      bodyTop:bodyRect.top,
      headerBottom:headerRect.bottom,
      bodyBottom:bodyRect.bottom,
      layoutBottom:layoutRect.bottom
    };
  });
  expect(appearance.borderColor).toBe(appearance.windowBorder);
  expect(appearance.bodyTop).toBe(appearance.headerBottom);
  expect(appearance.bodyBottom).toBeLessThanOrEqual(appearance.layoutBottom);

  const leftCell = body.locator(':scope > [data-dui-layout-cell-id="left"]');
  const splitter = body.locator(':scope > [data-dui-layout-before="left"]');
  const leftBefore = await leftCell.boundingBox();
  const splitterBox = await splitter.boundingBox();
  await page.mouse.move(splitterBox.x + splitterBox.width / 2, splitterBox.y + splitterBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(splitterBox.x + 24, splitterBox.y + splitterBox.height / 2);
  await page.mouse.up();
  const leftAfter = await leftCell.boundingBox();
  expect(leftAfter.width).toBeGreaterThan(leftBefore.width);

  await page.getByRole("button", { name:"Toggle Header", exact:true }).click();
  await expect(header).toBeHidden();
  await page.getByRole("button", { name:"Toggle Border", exact:true }).click();
  await expect(layout).toHaveClass(/dui-layout--borderless/);

  await expectNoPageErrors(errors);
});
