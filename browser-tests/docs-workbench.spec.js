import { openComponentGroup } from "./docs-helpers.js";
import { test, expect } from "@playwright/test";

test("documentation workbench navigates, filters, runs examples, and changes theme", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));

  await page.goto("/docs/index.html");
  await expect(page.getByRole("heading", { name:"Introduction", level:1 })).toBeVisible();
  await expect(page.locator(".dui-docs-tree")).toBeVisible();
  await expect(page.locator(".dui-component-page__section").filter({ hasText:"Methods" }).locator(".dui-grid")).toBeVisible();
  await expect(page.getByRole("treeitem", { name:"Core Concepts" })).toBeVisible();

  const workspace = page.locator(".dui-docs-workspace-panel");
  const workspaceBeforeCollapse = await workspace.boundingBox();
  const widthBeforeCollapse = workspaceBeforeCollapse.width;
  expect(Math.abs(workspaceBeforeCollapse.x + workspaceBeforeCollapse.width - page.viewportSize().width)).toBeLessThanOrEqual(1);
  await page.locator(".dui-docs-navigation-panel [data-dui-dock-action='collapse']").click();
  await expect(page.locator(".dui-dock-strip--left .dui-dock-strip__button", { hasText:"Contents" })).toBeVisible();
  const widthAfterCollapse = (await workspace.boundingBox()).width;
  expect(widthAfterCollapse).toBeGreaterThan(widthBeforeCollapse + 150);
  await page.locator(".dui-dock-strip--left .dui-dock-strip__button", { hasText:"Contents" }).click();
  await expect(page.locator(".dui-docs-navigation-panel")).toBeVisible();

  await page.getByText("Object Model", { exact:true }).click();
  await expect(page).toHaveURL(/#object-model$/);
  await expect(page.getByRole("heading", { name:"Object Model", level:1 })).toBeVisible();
  const objectHierarchy = page.locator(".dui-component-page__section").filter({ hasText:"Object Hierarchy" });
  await expect(objectHierarchy.getByRole("tree")).toBeVisible();
  await expect(objectHierarchy.getByRole("treeitem", { name:"BaseControl", exact:true })).toHaveAttribute("aria-expanded", "true");
  await expect(objectHierarchy.getByRole("treeitem", { name:"ToolButton", exact:true })).toBeVisible();
  await expect(page.getByRole("heading", { name:"Live Example", level:2 })).toHaveCount(0);
  await expect(page.getByRole("heading", { name:"Code Example", level:2 })).toHaveCount(0);

  await page.getByText("Lifecycle and Ownership", { exact:true }).click();
  await expect(page.getByRole("heading", { name:"Lifecycle and Ownership", level:1 })).toBeVisible();
  await page.locator(".dui-example-host__live").getByRole("button", { name:"Destroy owned field" }).click();
  await expect(page.locator(".dui-example-host__output")).toHaveText("field.destroyed = true");

  await page.getByText("Events and Mutations", { exact:true }).click();
  await expect(page.getByRole("heading", { name:"Events and Mutations", level:1 })).toBeVisible();
  await page.locator(".dui-example-host__live").getByRole("button", { name:"Apply command value" }).click();
  await expect(page.locator(".dui-example-host__output")).toContainText("origin=command");

  await page.getByText("Composition", { exact:true }).click();
  await expect(page.getByRole("heading", { name:"Composition", level:1 })).toBeVisible();
  await page.locator(".dui-example-host__live").getByRole("button", { name:"Read composed value" }).click();
  await expect(page.locator(".dui-example-host__output")).toContainText('"firstName":"Ada"');

  await page.getByText("Themes and Density", { exact:true }).click();
  await expect(page.getByRole("heading", { name:"Themes and Density", level:1 })).toBeVisible();
  const themePreview = page.locator(".dui-example-host__live .dui-docs-theme-preview");
  await themePreview.getByRole("button", { name:"Use Dark Blue" }).click();
  await expect(themePreview).toHaveClass(/dui-theme-dark-blue/);

  await openComponentGroup(page, "Buttons");
  await page.getByText("Button", { exact:true }).click();
  await expect(page).toHaveURL(/#button$/);
  await expect(page.getByRole("heading", { name:"Button", level:1 })).toBeVisible();
  await page.locator(".dui-example-host__live").getByRole("button", { name:"Review" }).click();
  await expect(page.locator(".dui-example-host").filter({ has: page.getByRole("button", { name:"Review", exact:true }) }).locator(".dui-example-host__output")).toHaveText("Review requested");

  const search = page.getByPlaceholder("Find component");
  await search.fill("grid");
  await expect(page.getByRole("treeitem", { name:"Basic Grid", exact:true })).toBeVisible();
  await expect(page.getByText("TextInput", { exact:true })).toHaveCount(0);
  await page.getByRole("treeitem", { name:"Basic Grid", exact:true }).click();
  await expect(page.getByRole("heading", { name:"Basic Grid", level:1 })).toBeVisible();
  await expect(page.locator(".dui-example-host__live .dui-grid__row")).toHaveCount(3);
  await expect(page.getByRole("heading", { name:"Live Example", level:2 })).toBeVisible();
  await expect(page.getByRole("heading", { name:"Code Example", level:2 })).toBeVisible();

  const apiOverflow = await page.locator(".dui-docs-api-grid .dui-grid__body").evaluateAll(elements =>
    elements.map(element => ({
      horizontal: element.scrollWidth - element.clientWidth,
      vertical: element.scrollHeight - element.clientHeight
    }))
  );
  expect(apiOverflow.every(value => value.horizontal <= 1 && value.vertical <= 1)).toBe(true);

  await page.getByRole("button", { name:"Dark" }).click();
  await expect(page.locator("body")).toHaveClass(/dui-theme-dark-blue/);
  await expect(page.getByRole("button", { name:"Light Blue" })).toBeVisible();
  expect(errors).toEqual([]);
});
