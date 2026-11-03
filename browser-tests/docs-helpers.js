import { expect } from "@playwright/test";

export async function openComponentGroup(page, name) {
  const tree = page.locator(".dui-docs-tree");
  for (const title of ["Components", name]) {
    const node = tree.getByRole("treeitem", { name: title, exact: true });
    await expect(node).toBeVisible();
    if (await node.getAttribute("aria-expanded") === "false") {
      await node.locator("[data-dui-tree-toggle]").click();
    }
  }
}
