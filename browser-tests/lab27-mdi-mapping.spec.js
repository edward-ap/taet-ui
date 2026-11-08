import { expect, test } from "@playwright/test";
import { capturePageErrors, expectNoPageErrors } from "./smoke-helpers.js";

test("lab27 MDI windows keep Grid row connectors attached during move, resize, and scroll", async ({ page }) => {
  const errors = capturePageErrors(page);
  await page.goto("/examples/labs/lab27.html");

  const workspace = page.locator(".dui-mdi-workspace");
  const windows = workspace.locator(".dui-mdi-window");
  await expect(windows).toHaveCount(4);
  await expect(windows.filter({ hasText:"Customers" })).toBeVisible();
  await expect(windows.filter({ hasText:"Orders" })).toBeVisible();
  await expect(windows.filter({ hasText:"Project hierarchy" })).toBeVisible();
  await expect(windows.filter({ hasText:"Transformer" })).toContainText("TODO: Transformer Logic");
  await expect(workspace.locator('[data-dui-port-control-id="transformerWindow"][data-dui-port-side="left"]')).toHaveCount(3);
  await expect(workspace.locator('[data-dui-port-control-id="transformerWindow"][data-dui-port-side="right"]')).toHaveCount(2);
  const transformerPortGeometry = await page.evaluate(() => {
    const read = side => [...document.querySelectorAll(`[data-dui-port-control-id="transformerWindow"][data-dui-port-side="${side}"]`)]
      .map(port => Number(port.getAttribute("cy")));
    const left = read("left");
    const right = read("right");
    return {
      left,
      right,
      leftCenter:(left[0] + left.at(-1)) / 2,
      rightCenter:(right[0] + right.at(-1)) / 2
    };
  });
  expect(transformerPortGeometry.left[1] - transformerPortGeometry.left[0]).toBe(24);
  expect(transformerPortGeometry.right[1] - transformerPortGeometry.right[0]).toBe(24);
  expect(Math.abs(transformerPortGeometry.leftCenter - transformerPortGeometry.rightCenter)).toBeLessThanOrEqual(0.5);
  await expect(workspace.locator('[data-dui-port-control-id="projectWindow"][data-dui-port-item-id="crm"]')).toHaveCount(2);
  const customerWindow = windows.filter({ hasText:"Customers" });
  await expect.poll(async () => (await customerWindow.boundingBox())?.width).toBe(360);
  await customerWindow.locator(".dui-grid").click();
  await expect.poll(async () => (await customerWindow.boundingBox())?.width).toBe(360);
  const activeStack = await page.evaluate(() => ({
    active:Number(getComputedStyle(window.lab27.customersWindow.element).zIndex),
    connectors:Number(getComputedStyle(document.querySelector(".dui-connector-layer")).zIndex),
    inactive:Number(getComputedStyle(window.lab27.projectWindow.element).zIndex)
  }));
  expect(activeStack.active).toBeGreaterThan(activeStack.connectors);
  expect(activeStack.inactive).toBeGreaterThan(activeStack.connectors);
  expect(activeStack.active).toBeGreaterThan(activeStack.inactive);
  const firstHeader = customerWindow.locator('.dui-grid__header-cell[data-dui-grid-column-id="name"]');
  const secondHeader = customerWindow.locator('.dui-grid__header-cell[data-dui-grid-column-id="type"]');
  const divider = firstHeader.locator(".dui-grid__resize-handle");
  const firstBefore = await firstHeader.boundingBox();
  const secondBefore = await secondHeader.boundingBox();
  const dividerBox = await divider.boundingBox();
  if (!firstBefore || !secondBefore || !dividerBox) throw new Error("Column resize geometry is unavailable.");
  await page.mouse.move(dividerBox.x + 1, dividerBox.y + dividerBox.height / 2);
  await page.mouse.down();
  await page.mouse.up();
  expect(Math.abs((await firstHeader.boundingBox()).width - firstBefore.width)).toBeLessThanOrEqual(1);
  await page.mouse.move(dividerBox.x + 1, dividerBox.y + dividerBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(dividerBox.x - 29, dividerBox.y + dividerBox.height / 2);
  await page.mouse.up();
  const firstAfter = await firstHeader.boundingBox();
  const secondAfter = await secondHeader.boundingBox();
  expect(firstAfter.width).toBeLessThan(firstBefore.width - 20);
  expect(secondAfter.width).toBeGreaterThan(secondBefore.width + 20);
  expect(Math.abs((firstAfter.width + secondAfter.width) - (firstBefore.width + secondBefore.width))).toBeLessThanOrEqual(1);
  await page.evaluate(() => window.lab27.customersWindow.resizeTo(460, 310));
  const firstExpanded = await firstHeader.boundingBox();
  const secondExpanded = await secondHeader.boundingBox();
  expect(firstExpanded.width).toBeGreaterThan(firstAfter.width + 25);
  expect(secondExpanded.width).toBeGreaterThan(secondAfter.width + 25);
  expect(Math.abs((firstExpanded.width + secondExpanded.width) - (firstAfter.width + secondAfter.width) - 100)).toBeLessThanOrEqual(2);
  await page.evaluate(() => window.lab27.customersWindow.resizeTo(360, 310));
  await customerWindow.getByRole("button", { name:"Column menu for Field" }).click();
  const columnMenu = page.locator(".dui-overlay-root .dui-context-menu");
  await expect(columnMenu).toBeVisible();
  const overlayOrder = await page.evaluate(() => ({
    connectors:Number(getComputedStyle(document.querySelector(".dui-connector-layer")).zIndex),
    popup:Number(getComputedStyle(document.querySelector(".dui-overlay-root")).zIndex)
  }));
  expect(overlayOrder.popup).toBeGreaterThan(overlayOrder.connectors);
  await page.keyboard.press("Escape");
  await expect(columnMenu).toBeHidden();

  const paths = workspace.locator(".dui-connector-layer__connection");
  await expect(paths).toHaveCount(2);
  const customerPath = workspace.locator('path[data-dui-connector-id="customer-orders"]');
  await expect(customerPath).toHaveAttribute("data-dui-source-status", "visible");
  await expect(customerPath).toHaveAttribute("data-dui-target-status", "visible");
  const originalPath = await customerPath.getAttribute("d");

  await page.evaluate(() => window.lab27.ordersWindow.collapse());
  const collapsedOrderPorts = workspace.locator('[data-dui-port-control-id="ordersWindow"].dui-connector-layer__port--aggregate');
  await expect(collapsedOrderPorts).toHaveCount(2);
  await expect(workspace.locator('[data-dui-port-control-id="ordersWindow"][data-dui-port-side="left"]')).toHaveClass(/dui-connected/);
  await expect(customerPath).toHaveAttribute("data-dui-target-status", "collapsed");
  const collapsedTargets = await page.evaluate(() => [...document.querySelectorAll('path[data-dui-target-status="collapsed"]')].map(path => {
    const point = path.getPointAtLength(path.getTotalLength());
    return { x:Math.round(point.x), y:Math.round(point.y) };
  }));
  expect(new Set(collapsedTargets.map(point => `${point.x}:${point.y}`)).size).toBe(1);
  await page.evaluate(() => window.lab27.ordersWindow.expand());
  await expect(customerPath).toHaveAttribute("data-dui-target-status", "visible");

  const customersHeader = windows.filter({ hasText:"Customers" }).locator(".dui-mdi-window__header");
  const headerBox = await customersHeader.boundingBox();
  await page.mouse.move(headerBox.x + 120, headerBox.y + 10);
  await page.mouse.down();
  await page.mouse.move(headerBox.x + 220, headerBox.y + 55);
  await page.mouse.up();
  await expect.poll(() => customerPath.getAttribute("d")).not.toBe(originalPath);

  await page.evaluate(() => window.lab27.ordersWindow.resizeTo(370, 180));
  const columnAlignment = await page.evaluate(() => {
    const grid = window.lab27.orders;
    const header = grid._header.querySelector('[data-dui-grid-column-id="name"]');
    const row = grid._body.querySelector('[data-dui-grid-row-id]');
    const cell = row?.querySelector('[data-dui-grid-column-id="name"]');
    return {
      scrollbar: grid._body.offsetWidth - grid._body.clientWidth,
      headerRight: header?.getBoundingClientRect().right,
      cellRight: cell?.getBoundingClientRect().right
    };
  });
  expect(Math.abs(columnAlignment.headerRight - columnAlignment.cellRight)).toBeLessThanOrEqual(1);
  const regionPath = workspace.locator('path[data-dui-connector-id="region-orders"]');
  await expect(regionPath).toHaveAttribute("data-dui-target-status", "below");

  await page.evaluate(() => {
    const body = window.lab27.orders._body;
    body.scrollTop = body.scrollHeight;
    body.dispatchEvent(new Event("scroll"));
  });
  await expect(regionPath).toHaveAttribute("data-dui-target-status", "visible");

  await customerPath.click({ force:true });
  await expect(page.locator("#status")).toContainText("customersWindow.customer_id");

  const sourcePort = workspace.locator('[data-dui-port-control-id="customersWindow"][data-dui-port-item-id="email"][data-dui-port-side="right"]');
  const targetPort = workspace.locator('[data-dui-port-control-id="ordersWindow"][data-dui-port-item-id="warehouse_id"][data-dui-port-side="left"]');
  // Selection renders asynchronously and replaces the port nodes.
  await expect(customerPath).toHaveClass(/dui-selected/);
  let sourceBox, targetBox;
  await expect.poll(async () => {
    sourceBox = await sourcePort.boundingBox();
    targetBox = await targetPort.boundingBox();
    return [sourceBox, targetBox].every(box => box && box.width > 0 && box.height > 0);
  }).toBe(true);
  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2);
  await page.mouse.up();
  await expect(paths).toHaveCount(3);
  await expect(sourcePort).toHaveClass(/dui-connected/);
  await expect(targetPort).toHaveClass(/dui-connected/);

  await page.evaluate(() => {
    const bounds = window.lab27.customersWindow.getBounds();
    window.lab27.projectWindow.setBounds({ x:bounds.x, y:bounds.y, width:bounds.width, height:bounds.height });
    window.lab27.workspace.activateWindow(window.lab27.customersWindow);
  });
  await expect(workspace.locator('[data-dui-port-control-id="projectWindow"]')).toHaveCount(0);
  await expect(workspace.locator('[data-dui-port-control-id="customersWindow"]')).not.toHaveCount(0);

  await page.evaluate(() => {
    const bounds = window.lab27.customersWindow.getBounds();
    window.lab27.projectWindow.setBounds({ x:bounds.x, y:bounds.y, width:bounds.width, height:bounds.height });
    window.lab27.workspace.activateWindow(window.lab27.projectWindow);
    window.lab27.workspace.activateWindow(window.lab27.ordersWindow);
  });
  await expect(workspace.locator('[data-dui-port-control-id="customersWindow"][data-dui-port-item-id="email"]')).toHaveCount(0);
  const coveredSourceStack = await page.evaluate(() => ({
    cover:Number(getComputedStyle(window.lab27.projectWindow.element).zIndex),
    source:Number(getComputedStyle(window.lab27.customersWindow.element).zIndex),
    lines:Number(getComputedStyle(document.querySelector(".dui-connector-layer")).zIndex)
  }));
  expect(coveredSourceStack.cover).toBeGreaterThan(coveredSourceStack.source);
  expect(coveredSourceStack.lines).toBeLessThan(coveredSourceStack.source);

  await page.getByRole("button", { name:"Cascade" }).click();
  await expect.poll(() => page.evaluate(() => window.lab27.customersWindow.getBounds().x)).toBe(24);
  await expectNoPageErrors(errors);
});
