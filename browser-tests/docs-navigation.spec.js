import {docsCatalog as sourceCatalog} from '../docs/src/docsCatalog.js';
import { test, expect } from "@playwright/test";
import { openComponentGroup } from "./docs-helpers.js";

test("documentation keeps introductory order and starts every component group collapsed", async ({ page }) => {
  await page.goto("/docs/index.html#toolbar");
  await expect(page.getByRole("heading", { name:"Toolbar", level:1 })).toBeVisible();
  const tree = page.locator(".dui-docs-tree");
  const node = name => tree.getByRole("treeitem", { name, exact:true });
  await expect(tree.locator('[role="treeitem"][aria-level="1"]')).toHaveText([
    "Getting Started", "Core Concepts", "Components"
  ]);
  await expect(node("Getting Started")).toHaveAttribute("aria-expanded", "true");
  await expect(node("Core Concepts")).toHaveAttribute("aria-expanded", "true");
  const introductoryPages = [
    "Introduction", "Quick Start", "Object Model", "Lifecycle and Ownership",
    "Events and Mutations", "Composition", "Themes and Density", "Icons", "Keyboard Shortcuts"
  ];
  await expect(node("Components")).toHaveAttribute("aria-expanded", "true");
  const groups = sourceCatalog.find(g=>g.id==='components').groups.map(g=>g.title);
  await expect(tree.locator('[role="treeitem"][aria-level="2"]')).toHaveText([...introductoryPages, ...groups]);
  for (const title of groups) {
    await expect(node(title)).toHaveAttribute("aria-expanded", "false");
    await node(title).locator("[data-dui-tree-toggle]").click();
    const titles = await tree.locator('[role="treeitem"][aria-level="3"] .dui-tree-list__text').allTextContents();
    expect(titles.length).toBeGreaterThan(0);
    expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b, "en")));
    if (title === 'Applications') expect(titles).toEqual(sourceCatalog.find(g=>g.id==='components').groups.find(g=>g.title===title).pages.map(p=>p.title));
    await node(title).locator("[data-dui-tree-toggle]").click();
  }
  await page.reload();
  await expect(node("Components")).toHaveAttribute("aria-expanded", "true");
  await expect(node("Applications")).toHaveAttribute("aria-expanded", "false");
});

test("search reveals matches and restores manually expanded branches when cleared", async ({ page }) => {
  await page.goto("/docs/index.html");
  const tree = page.locator(".dui-docs-tree");
  const node = name => tree.getByRole("treeitem", { name, exact:true });
  const search = page.getByPlaceholder("Find component");
  await search.fill("toolbar");
  await expect(node("Toolbar")).toBeVisible();
  await search.fill("");
  await expect(node("Components")).toHaveAttribute("aria-expanded", "true");
  await expect(node("Applications")).toHaveAttribute("aria-expanded", "false");

  await openComponentGroup(page, "Buttons");
  await search.fill("toolbar");
  await expect(node("Toolbar")).toBeVisible();
  await search.fill("masked");
  await expect(node("Masked")).toBeVisible();
  await search.fill("");
  await expect(node("Buttons")).toHaveAttribute("aria-expanded", "true");
  await expect(node("Button")).toBeVisible();
  await expect(node("Applications")).toHaveAttribute("aria-expanded", "false");
  await expect(node("Input Controls")).toHaveAttribute("aria-expanded", "false");
});
