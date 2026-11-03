import { expect, test } from "@playwright/test";
import { capturePageErrors, expectNoPageErrors } from "./smoke-helpers.js";

test("open Popup and modal Dialog clean overlay state on destroy", async ({ page }) => {
  const errors = capturePageErrors(page);
  await page.goto("/examples/labs/lab24.html");

  await page.getByRole("button", { name:"Open first popup" }).click();
  await expect(page.getByText("First anchored popup", { exact:true })).toBeVisible();
  const popupState = await page.evaluate(() => {
    const popup = window.lab24.firstPopup;
    const manager = popup.manager;
    popup.destroy();
    return { destroyed:popup.destroyed, registered:manager.has(popup), mounted:popup.mounted };
  });
  expect(popupState).toEqual({ destroyed:true, registered:false, mounted:false });
  await expect(page.getByText("First anchored popup", { exact:true })).toHaveCount(0);

  const dialogState = await page.evaluate(async () => {
    const { Dialog, overlayManager } = await import("/src/ui/all.js");
    const dialog = new Dialog({
      title:"Lifecycle dialog",
      content:"Temporary content",
      buttons:[{ text:"OK", result:"ok", primary:true }]
    });
    const resultPromise = dialog.showModal();
    const registeredBefore = overlayManager.has(dialog);
    dialog.destroy();
    return {
      registeredBefore,
      registeredAfter:overlayManager.has(dialog),
      result:await resultPromise,
      destroyed:dialog.destroyed
    };
  });
  expect(dialogState).toEqual({
    registeredBefore:true,
    registeredAfter:false,
    result:null,
    destroyed:true
  });
  await expect(page.locator(".dui-overlay-backdrop, [data-dui-overlay=dialog]")).toHaveCount(0);
  await expectNoPageErrors(errors);
});

test("open DropDownList destroys popup, listeners, and owned data", async ({ page }) => {
  const errors = capturePageErrors(page);
  await page.goto("/examples/labs/lab21.html");

  const field = page.locator(".dui-dropdown-list").filter({ hasText:"Status" });
  await field.getByRole("button", { name:"Open list" }).click();
  await expect(page.locator(".dui-overlay-root > .dui-dropdown-list__popup")).toBeVisible();
  const state = await page.evaluate(() => {
    const control = window.lab21.fields.status;
    const data = control.data;
    const manager = control.overlayManager;
    control.destroy();
    return {
      destroyed:control.destroyed,
      dataDestroyed:data.destroyed,
      registered:manager.has(control),
      mounted:control.mounted
    };
  });
  expect(state).toEqual({ destroyed:true, dataDestroyed:true, registered:false, mounted:false });
  await expect(field).toHaveCount(0);
  await expect(page.locator(".dui-overlay-root > .dui-dropdown-list__popup")).toHaveCount(0);
  await expectNoPageErrors(errors);
});

test("Grid destroy closes editor and releases owned models and controllers", async ({ page }) => {
  const errors = capturePageErrors(page);
  await page.goto("/examples/labs/lab22.html");

  const gridElement = page.locator(".dui-lab22-grid");
  await gridElement.locator('.dui-grid__cell[data-dui-grid-column-id="owner"]').first().dblclick();
  await expect(gridElement.locator(".dui-grid__cell--editing")).toHaveCount(1);
  const state = await page.evaluate(() => {
    const grid = window.lab22.grid;
    const data = grid.data;
    const view = grid.view;
    const selection = grid.selection;
    const controllers = [
      grid._columnResizer,
      grid._columnReorderController,
      grid._keyboardController,
      grid._selectionController,
      grid._virtualRenderer
    ];
    grid.destroy();
    return {
      destroyed:grid.destroyed,
      dataDestroyed:data.destroyed,
      viewDestroyed:view.destroyed,
      selectionDestroyed:selection.destroyed,
      controllersReleased:controllers.every(controller => controller.grid == null),
      editing:grid._editing
    };
  });
  expect(state).toEqual({
    destroyed:true,
    dataDestroyed:true,
    viewDestroyed:true,
    selectionDestroyed:true,
    controllersReleased:true,
    editing:null
  });
  await expect(gridElement).toHaveCount(0);
  await expectNoPageErrors(errors);
});

test("TreeGrid destroy releases tree projection and active editor", async ({ page }) => {
  const errors = capturePageErrors(page);
  await page.goto("/examples/labs/lab23.html");

  const treeElement = page.locator(".dui-lab23-grid");
  await treeElement.locator('.dui-grid__cell[data-dui-grid-column-id="owner"]').first().dblclick();
  await expect(treeElement.locator(".dui-grid__cell--editing")).toHaveCount(1);
  const state = await page.evaluate(() => {
    const tree = window.lab23.tree;
    const data = tree.data;
    const treeView = tree.treeView;
    const selection = tree.selection;
    tree.destroy();
    return {
      destroyed:tree.destroyed,
      dataDestroyed:data.destroyed,
      treeViewDestroyed:treeView.destroyed,
      selectionDestroyed:selection.destroyed,
      controllerReleased:tree._virtualRenderer.grid == null,
      editing:tree._editing
    };
  });
  expect(state).toEqual({
    destroyed:true,
    dataDestroyed:true,
    treeViewDestroyed:true,
    selectionDestroyed:true,
    controllerReleased:true,
    editing:null
  });
  await expect(treeElement).toHaveCount(0);
  await expectNoPageErrors(errors);
});
