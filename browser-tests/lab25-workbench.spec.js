import { expect, test } from "@playwright/test";
import { capturePageErrors, expectNoPageErrors } from "./smoke-helpers.js";

test("lab25 mapping workbench composes dock, commands, grid, inspector, and overlays", async ({ page }) => {
  const errors = capturePageErrors(page);
  await page.goto("/examples/labs/lab25.html");

  const panelTitles = page.locator(".dui-dock-panel__title");
  await expect(panelTitles.filter({ hasText:"Project Explorer" })).toBeVisible();
  await expect(panelTitles.filter({ hasText:"Customer Mapping" })).toBeVisible();
  await expect(panelTitles.filter({ hasText:"Properties" })).toBeVisible();
  await expect(panelTitles.filter({ hasText:"Logs" })).toBeVisible();
  const propertiesHeader = panelTitles
    .filter({ hasText:"Properties" })
    .locator("xpath=ancestor::header");
  const headerActions = propertiesHeader.locator(".dui-header-action");
  await expect(headerActions).toHaveCount(3);
  await expect(headerActions.nth(0)).toHaveAttribute("data-dui-header-action", "unpin");
  await expect(headerActions.nth(0)).toHaveAttribute("aria-label", "Unpin");
  await expect(headerActions.nth(1)).toHaveAttribute("data-dui-header-action", "collapse");
  await expect(headerActions.nth(2)).toHaveAttribute("data-dui-header-action", "close");
  for (const action of await headerActions.all()) {
    await expect(action).toHaveText("");
    expect(await action.evaluate(element => getComputedStyle(element).width)).toBe("20px");
  }
  const scrollbarStyles = await page.evaluate(() => {
    const selectors = [
      ".dui-log-panel",
      ".dui-grid__body",
      ".dui-property-grid__body"
    ];
    return selectors.map(selector => {
      const element = document.querySelector(selector);
      const standard = getComputedStyle(element);
      const webkit = getComputedStyle(element, "::-webkit-scrollbar");
      return {
        selector,
        width:webkit.width,
        height:webkit.height,
        standardWidth:standard.scrollbarWidth
      };
    });
  });
  for (const scrollbar of scrollbarStyles) {
    expect(scrollbar, scrollbar.selector).toMatchObject({
      width:"6px",
      height:"6px",
      standardWidth:"thin"
    });
  }
  const grid = page.locator(".dui-workbench__grid");
  await expect(grid).toBeVisible();
  await expect(grid.locator(".dui-grid__row[data-dui-grid-row-id]")).toHaveCount(4);

  await grid.getByText("full_name", { exact:true }).click();
  await expect(page.getByText("Selected map-2", { exact:true })).toBeVisible();
  const inspector = page.locator(".dui-workbench__inspector");
  await expect(inspector.locator('[data-dui-property-name="source"] input')).toHaveValue("full_name");
  await expect(inspector.locator(".dui-property-grid")).toBeVisible();
  await expect(inspector.locator(".dui-property-description")).toHaveCount(0);
  expect(await inspector.locator(".dui-property-grid__body").evaluate(element =>
    getComputedStyle(element).backgroundImage
  )).not.toBe("none");
  const contentSizedGeometry = await inspector.evaluate(element => {
    const grid = element.querySelector(".dui-property-grid").getBoundingClientRect();
    const lastRow = element.querySelector(".dui-property-grid__row:last-child").getBoundingClientRect();
    const panel = element.closest(".dui-dock-panel__content").getBoundingClientRect();
    return { gridBottom:grid.bottom, lastRowBottom:lastRow.bottom, panelBottom:panel.bottom };
  });
  expect(Math.abs(contentSizedGeometry.gridBottom - contentSizedGeometry.lastRowBottom))
    .toBeLessThanOrEqual(1);
  expect(contentSizedGeometry.panelBottom).toBeGreaterThan(contentSizedGeometry.gridBottom);
  await expect.poll(() => page.evaluate(() => window.lab25.inspector.grid.data.all().length)).toBe(17);
  await expect(inspector.locator('[data-dui-property-name="transform.options"] .dui-property-grid__property-toggle'))
    .toHaveAttribute("aria-expanded", "true");
  const hierarchyColors = await inspector.evaluate(element => {
    const category = element.querySelector(".dui-property-grid__category-row");
    const gutter = element.querySelector(".dui-property-grid__gutter");
    return {
      category: getComputedStyle(category).backgroundColor,
      gutter: getComputedStyle(gutter).backgroundColor
    };
  });
  expect(hierarchyColors.gutter).toBe(hierarchyColors.category);
  const hierarchyGeometry = await inspector.evaluate(element => {
    const parent = element.querySelector('[data-dui-property-name="transform.options"]');
    const child = element.querySelector('[data-dui-property-name="transform.options.trim"]');
    const rects = row => ({
      gutterWidth: row.querySelector(".dui-property-grid__gutter").getBoundingClientRect().width,
      nameWidth: row.querySelector(".dui-property-grid__name").getBoundingClientRect().width,
      gutterBorderBottom: getComputedStyle(row.querySelector(".dui-property-grid__gutter")).borderBottomWidth
    });
    return { parent: rects(parent), child: rects(child) };
  });
  expect(hierarchyGeometry.child.gutterWidth).toBe(hierarchyGeometry.parent.gutterWidth);
  expect(hierarchyGeometry.child.nameWidth).toBe(hierarchyGeometry.parent.nameWidth);
  expect(hierarchyGeometry.child.gutterBorderBottom).toBe("0px");
  await expect(inspector.locator(".dui-property-grid__category-gutter")).toHaveCount(0);
  const categoryGeometry = await inspector.evaluate(element => {
    const grid = element.querySelector(".dui-property-grid").getBoundingClientRect();
    const category = element.querySelector(".dui-property-grid__category").getBoundingClientRect();
    return { gridLeft:grid.left, categoryLeft:category.left, gutter:parseFloat(getComputedStyle(element.querySelector(".dui-property-grid")).getPropertyValue("--dui-property-gutter")) };
  });
  expect(categoryGeometry.categoryLeft).toBe(categoryGeometry.gridLeft + 1 + categoryGeometry.gutter);
  await expect(inspector.locator('[data-dui-property-name="enabled"] .dui-property-grid__checkbox'))
    .toBeChecked();
  await expect(inspector.locator('[data-dui-property-name="autoRetry"] .dui-property-grid__switch'))
    .toBeVisible();
  const switchGeometry = await inspector
    .locator('[data-dui-property-name="autoRetry"] .dui-property-grid__switch')
    .evaluate(element => {
      const track = element.querySelector(".dui-switch__track").getBoundingClientRect();
      const thumb = element.querySelector(".dui-switch__thumb").getBoundingClientRect();
      return { trackLeft:track.left, trackRight:track.right, thumbLeft:thumb.left, thumbRight:thumb.right };
    });
  expect(switchGeometry.thumbLeft).toBeGreaterThanOrEqual(switchGeometry.trackLeft);
  expect(switchGeometry.thumbRight).toBeLessThanOrEqual(switchGeometry.trackRight);
  const propertyRowHeights = await inspector.evaluate(element => ({
    switchRow: element.querySelector('[data-dui-property-name="autoRetry"]').getBoundingClientRect().height,
    textRow: element.querySelector('[data-dui-property-name="owner"]').getBoundingClientRect().height
  }));
  expect(propertyRowHeights.switchRow).toBe(propertyRowHeights.textRow);
  const reviewMode = inspector.locator('[data-dui-property-name="reviewMode"]');
  await reviewMode.locator(".dui-property-grid__value").dblclick();
  await expect(reviewMode.locator(".dui-radio-group__input")).toHaveCount(3);
  await reviewMode.locator(".dui-radio-group__content").press("Escape");
  await expect(reviewMode.locator(".dui-radio-group__input")).toHaveCount(0);
  await inspector.getByText("Mapping", { exact:true }).click();
  await expect.poll(() => page.evaluate(() => window.lab25.inspector.grid.data.all().length)).toBe(11);
  await expect(inspector.locator(".dui-property-grid__category-row.dui-selected")).toHaveCount(0);
  await inspector.getByText("Mapping", { exact:true }).click();
  await expect.poll(() => page.evaluate(() => window.lab25.inspector.grid.data.all().length)).toBe(17);
  await inspector.getByText("Source", { exact:true }).click();
  const sourceValue = inspector
    .locator('[data-dui-property-name="source"]')
    .locator(".dui-property-grid__value");
  await sourceValue.dblclick();
  const sourceEditor = sourceValue.locator("input");
  await expect(sourceEditor).toBeVisible();
  await sourceEditor.fill("display_name");
  await sourceEditor.press("Enter");
  await expect(sourceEditor).toHaveValue("display_name");
  await expect.poll(() => page.evaluate(() => window.lab25.mappings.data.get("map-2").source))
    .toBe("display_name");

  await page.getByRole("button", { name:/Validate/ }).click();
  await expect(page.getByRole("dialog", { name:"Validation" })).toBeVisible();
  const dialogClose = page.getByRole("dialog", { name:"Validation" }).getByRole("button", { name:"Close" });
  await expect(dialogClose).toHaveAttribute("data-dui-header-action", "close");
  await expect(dialogClose).toHaveText("");
  await page.getByRole("button", { name:"OK" }).click();
  await expect(page.getByText(/validation complete:/)).toBeVisible();

  await grid.getByText("display_name", { exact:true }).click({ button:"right" });
  const context = page.locator(".dui-overlay-root > .dui-context-menu");
  await expect(context).toBeVisible();
  await expect(context.getByRole("menuitem", { name:/Delete mapping/ })).toBeEnabled();
  await page.keyboard.press("Escape");
  await expect(context).toHaveCount(0);
  await expectNoPageErrors(errors);
});

test("nested dock split keeps its trailing panel attached after viewport resize", async ({ page }) => {
  const errors = capturePageErrors(page);
  await page.goto("/examples/labs/lab25.html");

  expect(await page.evaluate(() => window.lab25.dock.splitPanel("inspector", "left", "bottom")))
    .toBe(true);

  const propertiesPanel = page
    .locator(".dui-dock-panel")
    .filter({ has:page.locator(".dui-dock-panel__title", { hasText:"Properties" }) });
  await expect(propertiesPanel).toBeVisible();

  const splitterBox = await propertiesPanel.evaluate(element => {
    const layout = element.closest(".dui-layout");
    const splitter = layout?.querySelector(":scope > .dui-layout__body > .dui-layout-splitter");
    return splitter?.getBoundingClientRect().toJSON() ?? null;
  });
  expect(splitterBox).not.toBeNull();

  await page.mouse.move(splitterBox.x + splitterBox.width / 2, splitterBox.y + splitterBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(splitterBox.x + splitterBox.width / 2, splitterBox.y - 80);
  await page.mouse.up();

  const beforeResize = await propertiesPanel.evaluate(element => {
    const layout = element.closest(".dui-layout").getBoundingClientRect();
    const panel = element.getBoundingClientRect();
    return { layoutBottom:layout.bottom, panelBottom:panel.bottom };
  });
  expect(Math.abs(beforeResize.layoutBottom - beforeResize.panelBottom)).toBeLessThanOrEqual(1);

  await page.setViewportSize({ width:1440, height:1040 });

  const afterResize = await propertiesPanel.evaluate(element => {
    const layoutElement = element.closest(".dui-layout");
    const layout = layoutElement.getBoundingClientRect();
    const panel = element.getBoundingClientRect();
    const cell = element.closest(".dui-layout-cell");
    return {
      layoutBottom:layout.bottom,
      panelBottom:panel.bottom,
      cellFlexGrow:Number.parseFloat(getComputedStyle(cell).flexGrow)
    };
  });
  expect(Math.abs(afterResize.layoutBottom - afterResize.panelBottom)).toBeLessThanOrEqual(1);
  expect(afterResize.cellFlexGrow).toBeGreaterThan(0);
  await expectNoPageErrors(errors);
});
