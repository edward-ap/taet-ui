import { test, expect } from "@playwright/test";

test("SelectInput shares typed values, cancellation and silent updates across native and icon presentations", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/browser-tests/recipes.html");
  await page.evaluate(async () => {
    const { SelectInput, TextField, DataStore } = await import("/src/ui/index.js");
    const data = new DataStore();
    data.parse([{ id: 1, text: "Save", icon: "save" }, { id: 2, text: "Validate", icon: "check" }]);
    const fixture = { data, changes: [], blocked: true };
    const observe = event => fixture.changes.push({ value: event.newValue, origin: event.origin,
      userAction: event.userAction, source: event.source.name });
    const cancel = event => { if (fixture.blocked && event.newValue === 2) event.cancel = true; };
    fixture.native = new SelectInput("#root", { name: "native", label: "Native", data, value: 1,
      clearValueOnMissingData: true, onBeforeChange: cancel, onChange: observe });
    fixture.icons = new SelectInput("#root", { name: "icons", label: "Actions", data, value: 1,
      iconField: "icon", imageField: "picture", clearValueOnMissingData: true,
      onBeforeChange: cancel, onChange: observe });
    fixture.compatible = fixture.icons instanceof SelectInput && fixture.icons instanceof TextField;
    window.selectFixture = fixture;
  });
  const native = page.getByRole("combobox", { name: "Native", exact: true });
  const icons = page.getByRole("combobox", { name: "Actions", exact: true });
  const field = page.locator('[data-dui-control-id="icons"]');
  const popup = page.locator(".dui-overlay-root > .dui-dropdown-list__popup");
  await expect(field.locator(".dui-dropdown-list__display-image svg")).toHaveCount(1);
  await native.selectOption("number:2");
  await expect(native).toHaveValue("number:1");
  await icons.click();
  await expect(popup.locator("[role=option] svg")).toHaveCount(2);
  await popup.getByRole("option", { name: "Validate", exact: true }).click();
  await expect(icons).toHaveText("Save");
  expect(await page.evaluate(() => window.selectFixture.changes)).toEqual([]);
  await page.evaluate(() => { window.selectFixture.blocked = false; });
  await icons.press("End");
  await icons.press("Enter");
  await expect(icons).toHaveText("Validate");
  expect(await page.evaluate(() => window.selectFixture.changes)).toEqual([
    { value: 2, origin: "user", userAction: true, source: "icons" }
  ]);
  await page.evaluate(() => window.selectFixture.data.update(2, {
    text: "Checked", picture: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="green"/></svg>'
  }, { silent: true, origin: "import" }));
  await expect(icons).toHaveText("Checked");
  await expect(field.locator(".dui-dropdown-list__display-image img")).toHaveCount(1);
  await expect(field.locator(".dui-dropdown-list__display-image svg")).toHaveCount(0);
  await expect(native.locator("option").last()).toHaveText("Checked");
  await icons.click();
  await expect(popup.getByRole("option", { name: "Checked", exact: true })).toBeVisible();
  await page.evaluate(() => window.selectFixture.icons.disable());
  await expect(popup).toBeHidden();
  await expect(field.getByRole("button", { name: "Open list" })).toBeDisabled();
  await page.evaluate(() => {
    const { icons, data } = window.selectFixture;
    icons.enable();
    icons.setReadOnly(true);
    data.parse([{ id: 1, text: "Saved", icon: "save" }], { silent: true, origin: "import" });
  });
  await expect(icons).toHaveAttribute("aria-readonly", "true");
  expect(await page.evaluate(() => window.selectFixture.icons.value.get())).toBe("");
  expect(await page.evaluate(() => window.selectFixture.changes.length)).toBe(1);
  expect(await page.evaluate(() => {
    const { native, icons, data, compatible } = window.selectFixture;
    icons.setReadOnly(false);
    icons.openPopup();
    icons.destroy();
    native.destroy();
    const result = { compatible, sharedAlive: !data.destroyed,
      empty: document.querySelector("#root").childElementCount === 0,
      popupGone: document.querySelectorAll(".dui-dropdown-list__popup").length === 0 };
    data.destroy();
    return result;
  })).toEqual({ compatible: true, sharedAlive: true, empty: true, popupGone: true });
  expect(errors).toEqual([]);
});
