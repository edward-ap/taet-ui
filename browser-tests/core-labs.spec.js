import { expect, test } from "@playwright/test";
import { capturePageErrors, expectNoPageErrors } from "./smoke-helpers.js";

test("lab04 validates fields without changing form geometry", async ({ page }) => {
  const errors = capturePageErrors(page);
  await page.goto("/examples/labs/lab04.html");

  await expect(page.getByText("lab04 ready")).toBeVisible();
  const email = page.getByLabel("Email");
  const formBox = await page.locator(".dui-form").boundingBox();
  await email.fill("invalid-address");
  await page.getByRole("button", { name:"OK", exact:true }).click();
  await expect(page.getByText(/Validation failed: 1 error/)).toBeVisible();
  await expect(email).toHaveAttribute("aria-invalid", "true");
  expect((await page.locator(".dui-form").boundingBox())?.height).toBe(formBox?.height);
  await expectNoPageErrors(errors);
});

test("lab05 imports and clears data-bound SelectInput", async ({ page }) => {
  const errors = capturePageErrors(page);
  await page.goto("/examples/labs/lab05.html");

  await page.getByRole("button", { name:"Silent Import", exact:true }).click();
  await expect(page.getByText("silent import applied: CA")).toBeVisible();
  await page.getByRole("button", { name:"Clear Data", exact:true }).click();
  await expect(page.getByText(/data cleared, selected item=null/)).toBeVisible();
  await expectNoPageErrors(errors);
});

test("lab06 updates command state and executes Save", async ({ page }) => {
  const errors = capturePageErrors(page);
  await page.goto("/examples/labs/lab06.html");

  const save = page.getByRole("button", { name:/Save/ });
  await expect(save).toBeDisabled();
  await page.getByLabel("Project Name").fill("Updated Mapping");
  await expect(page.getByText("Dirty", { exact:true })).toBeVisible();
  await expect(save).toBeEnabled();
  await save.click();
  await expect(page.getByText("Saved", { exact:true })).toBeVisible();
  await expect(page.getByText("Clean", { exact:true })).toBeVisible();
  await expectNoPageErrors(errors);
});

test("lab19 loads DockLayout and collapses a panel", async ({ page }) => {
  const errors = capturePageErrors(page);
  await page.goto("/examples/labs/lab19.html");

  const projectPanel = page.locator(".dui-dock-panel").filter({ has:page.getByText("Project", { exact:true }) }).first();
  await expect(projectPanel).toBeVisible();
  const activeTab = page.locator(".dui-tabbar__tab.dui-active").last();
  await expect(activeTab).toBeVisible();
  const tabTheme = await activeTab.evaluate(element => {
    const probe = document.createElement("span");
    probe.style.color = "var(--dui-color-accent-bg)";
    document.body.append(probe);
    const accent = getComputedStyle(probe).color;
    probe.remove();
    return {
      background:getComputedStyle(element).backgroundColor,
      accent,
      closeIcons:element.querySelectorAll(".dui-tabbar__close .dui-icon").length
    };
  });
  expect(tabTheme.background).toBe(tabTheme.accent);
  expect(tabTheme.closeIcons).toBe(1);

  const selectedOption = page.locator(".dui-property-grid select option:checked").first();
  await expect(selectedOption).toHaveCount(1);
  const selectTheme = await selectedOption.evaluate(option => ({
    background:getComputedStyle(option).backgroundColor,
    accent:getComputedStyle(option.closest("select")).accentColor
  }));
  expect(selectTheme.background).toBe(selectTheme.accent);
  await projectPanel.getByRole("button", { name:"Collapse" }).click();
  await expect(page.getByText("collapse Project", { exact:true })).toBeVisible();
  await expect(page.getByRole("button", { name:"Project", exact:true })).toBeVisible();
  await expectNoPageErrors(errors);
});

test("lab17 Menu and ContextMenu use the shared overlay stack", async ({ page }) => {
  const errors = capturePageErrors(page);
  await page.goto("/examples/labs/lab17.html");

  await page.getByRole("menuitem", { name:"File" }).click();
  const popups = page.locator(".dui-overlay-root > .dui-menu-popup");
  await expect(popups).toHaveCount(1);
  await expect(popups.first()).toBeVisible();
  await popups.first().getByRole("menuitem", { name:/Validate/ }).click();
  await expect(page.getByText(/command validate Customer Mapping/)).toBeVisible();
  await expect(popups).toHaveCount(0);

  await page.getByRole("menuitem", { name:"View" }).click();
  await popups.first().getByRole("menuitem", { name:"Panels" }).hover();
  await expect(popups).toHaveCount(2);
  await expect(popups.getByRole("menuitemcheckbox", { name:/Output/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(popups).toHaveCount(0);

  const surface = page.getByText("Right-click this surface for the ContextMenu");
  await surface.click({ button:"right" });
  const context = page.locator(".dui-overlay-root > .dui-context-menu");
  await expect(context).toBeVisible();
  await context.getByRole("menuitem", { name:"Inspect" }).click();
  await expect(page.getByText("context inspect", { exact:true })).toBeVisible();
  await expect(context).toHaveCount(0);
  await expectNoPageErrors(errors);
});

test("lab21 DropDownList uses the shared overlay stack", async ({ page }) => {
  const errors = capturePageErrors(page);
  await page.goto("/examples/labs/lab21.html");

  const priority = page.getByLabel("Priority");
  await expect(priority).toBeVisible();
  expect(await priority.evaluate(input => getComputedStyle(input).textAlign)).toBe("left");

  const field = page.locator(".dui-dropdown-list").filter({ hasText:"Status" });
  const trigger = field.getByRole("button", { name:"Open list" });
  await trigger.click();
  const popup = page.locator(".dui-overlay-root > .dui-dropdown-list__popup");
  await expect(popup).toBeVisible();
  await expect(field.locator('.dui-dropdown-list__display')).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(popup).toBeHidden();
  await expect(field.locator('.dui-dropdown-list__display')).toHaveAttribute("aria-expanded", "false");

  await trigger.click();
  await page.locator("body").click({ position:{ x:4, y:4 } });
  await expect(popup).toBeHidden();

  await trigger.click();
  await popup.getByRole("option", { name:/Active/ }).click();
  await expect(field.locator('.dui-dropdown-list__display-text')).toHaveText("Active");
  await expect(popup).toBeHidden();
  await expectNoPageErrors(errors);
});

test("lab21 MultiSelectDropDown keeps popup open and renders removable tokens", async ({ page }) => {
  const errors = capturePageErrors(page);
  await page.goto("/examples/labs/lab21.html");

  const field = page.locator(".dui-multi-select-dropdown").filter({ hasText:"Regions" });
  await expect(field.getByText("North", { exact:true })).toBeVisible();
  await expect(field.getByText("East", { exact:true })).toBeVisible();

  await field.getByRole("button", { name:"Open list" }).click();
  const popup = page.locator(".dui-overlay-root > .dui-dropdown-list__popup");
  await expect(popup).toBeVisible();
  await expect(popup.getByRole("listbox")).toHaveAttribute("aria-multiselectable", "true");

  await popup.getByRole("option", { name:"South" }).click();
  await expect(popup).toBeVisible();
  await expect(field.getByText("South", { exact:true })).toBeVisible();

  await popup.getByRole("option", { name:"East" }).click();
  await expect(field.getByText("East", { exact:true })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await field.getByRole("button", { name:"Remove North" }).click();
  await expect(field.getByText("North", { exact:true })).toHaveCount(0);

  expect(await page.evaluate(() => window.lab21.fields.regions.value.get())).toEqual(["south"]);
  await expectNoPageErrors(errors);
});

test("lab21 date and time pickers use the shared overlay stack", async ({ page }) => {
  const errors = capturePageErrors(page);
  await page.goto("/examples/labs/lab21.html");

  const dateField = page.locator(".dui-date-time-input").filter({ hasText:"Start Date" });
  const dateTrigger = dateField.getByRole("button", { name:"Open calendar" });
  await dateTrigger.click();
  const datePopup = page.locator(".dui-overlay-root > .dui-date-picker");
  await expect(datePopup).toBeVisible();
  await expect(dateTrigger).toHaveAttribute("aria-expanded", "true");
  const dateTheme = await datePopup.evaluate(popup => {
    const probe = document.createElement("span");
    probe.style.color = "var(--dui-color-invalid-border)";
    probe.style.backgroundColor = "var(--dui-picker-button-bg)";
    popup.append(probe);
    const probeStyle = getComputedStyle(probe);
    const result = {
      weekend:getComputedStyle(popup.querySelector(".dui-date-time-picker__weekdays .dui-weekend")).color,
      invalid:probeStyle.color,
      todayBackground:getComputedStyle(popup.querySelector(".dui-date-time-picker__footer button:last-child")).backgroundColor,
      framed:probeStyle.backgroundColor
    };
    probe.remove();
    return result;
  });
  expect(dateTheme.weekend).toBe(dateTheme.invalid);
  expect(dateTheme.todayBackground).toBe(dateTheme.framed);
  await datePopup.getByRole("button", { name:"Today" }).click();
  await expect(datePopup).toBeHidden();

  const timeField = page.locator(".dui-date-time-input").filter({ hasText:"Time Picker" });
  const timeTrigger = timeField.getByRole("button", { name:"Focus time" });
  await timeTrigger.click();
  const timePopup = page.locator(".dui-overlay-root > .dui-time-picker");
  await expect(timePopup).toBeVisible();
  await expect(timePopup.locator(".dui-time-picker__modes .dui-active")).toHaveCount(1);
  await expect(timePopup.locator(".dui-time-picker__modes .dui-active")).toHaveText(/^(AM|PM)$/);
  const timeTheme = await timePopup.evaluate(popup => {
    const probe = document.createElement("span");
    probe.style.backgroundColor = "var(--dui-picker-button-bg)";
    probe.style.scrollbarWidth = "thin";
    probe.style.scrollbarColor = "var(--dui-scrollbar-thumb) transparent";
    popup.append(probe);
    const wheel = popup.querySelector(".dui-time-picker__wheel");
    const standard = getComputedStyle(wheel);
    const expected = getComputedStyle(probe);
    const webkit = CSS.supports("selector(::-webkit-scrollbar)");
    const result = {
      webkit,
      standardWidthSupported:CSS.supports("scrollbar-width", "thin"),
      standardColorSupported:CSS.supports("scrollbar-color", "red transparent"),
      scrollbar:webkit ? getComputedStyle(wheel, "::-webkit-scrollbar").width : null,
      standardWidth:standard.scrollbarWidth,
      standardColor:standard.scrollbarColor,
      expectedWidth:expected.scrollbarWidth,
      expectedColor:expected.scrollbarColor,
      okBackground:getComputedStyle(popup.querySelector(".dui-picker-actions__button")).backgroundColor,
      framed:getComputedStyle(probe).backgroundColor
    };
    probe.remove();
    return result;
  });
  expect(timeTheme.webkit || timeTheme.standardWidthSupported).toBe(true);
  if (timeTheme.webkit) expect(timeTheme.scrollbar).toBe("6px");
  // macOS Firefox computes native thin as none; compare with a native thin probe.
  if (timeTheme.standardWidthSupported) expect(timeTheme.standardWidth).toBe(timeTheme.expectedWidth);
  if (timeTheme.standardColorSupported) expect(timeTheme.standardColor).toBe(timeTheme.expectedColor);
  expect(timeTheme.okBackground).toBe(timeTheme.framed);
  await timePopup.locator('.dui-time-picker__wheel').first().getByRole("button", { name:"08" }).click();
  await expect(timePopup).toBeVisible();
  await timePopup.getByRole("button", { name:"Cancel" }).click();
  await expect(timePopup).toBeHidden();

  const dateTimeField = page.locator(".dui-date-time-input").filter({ hasText:"Deadline" });
  const dateTimeTrigger = dateTimeField.getByRole("button", { name:"Open date and time picker" });
  await dateTimeTrigger.click();
  const dateTimePopup = page.locator(".dui-overlay-root > .dui-date-time-picker:not(.dui-date-picker)");
  await expect(dateTimePopup).toBeVisible();
  await expect(dateTimePopup.locator(".dui-time-picker__modes .dui-active")).toHaveText("PM");
  await page.keyboard.press("Escape");
  await expect(dateTimePopup).toBeHidden();
  await expect(dateTimeTrigger).toHaveAttribute("aria-expanded", "false");
  await expectNoPageErrors(errors);
});
