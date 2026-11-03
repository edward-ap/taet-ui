import { expect, test } from "@playwright/test";
import { capturePageErrors, expectNoPageErrors } from "./smoke-helpers.js";

test("lab13 TreeList reparents and reorders rows with drag and drop", async ({
  page
}) => {
  const errors = capturePageErrors(page);
  await page.goto("/examples/labs/lab13.html");

  const tree = page.locator(".dui-tree-list");
  const header = tree.locator('[data-dui-list-item-id="string:H"]');
  const detail = tree.locator('[data-dui-list-item-id="string:D"]');
  const trailer = tree.locator('[data-dui-list-item-id="string:T"]');

  await expect(tree).toBeVisible();
  await expect(detail).toHaveAttribute("draggable", "true");
  await expect(detail).toHaveAttribute("data-dui-tree-level", "1");

  await detail.dragTo(header, {
    targetPosition: { x: 80, y: 12 }
  });
  await expect
    .poll(() => page.evaluate(() => window.lab13.tree.data.get("D").parentId))
    .toBe("H");
  await expect(header).toHaveAttribute("aria-expanded", "true");
  await expect(detail).toHaveAttribute("data-dui-tree-level", "2");
  await expect(page.locator(".dui-log-panel")).toContainText(
    "move D inside H"
  );

  await detail.dragTo(trailer, {
    targetPosition: { x: 80, y: 2 }
  });
  await expect
    .poll(() => page.evaluate(() => window.lab13.tree.data.get("D").parentId))
    .toBe("records");
  await expect(detail).toHaveAttribute("data-dui-tree-level", "1");
  expect(
    await page.evaluate(() =>
      window.lab13.tree.treeView
        .entries()
        .filter(entry => entry.parentId === "records")
        .map(entry => entry.id)
    )
  ).toEqual(["H", "D", "T"]);
  await expect(page.locator(".dui-log-panel")).toContainText(
    "move D before T"
  );

  await expectNoPageErrors(errors);
});

