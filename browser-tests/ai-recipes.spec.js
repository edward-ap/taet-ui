import { readdirSync } from "node:fs";
import { test, expect } from "@playwright/test";

const recipes = readdirSync(new URL("../examples/ai-recipes/", import.meta.url))
  .filter(file => /^\d{2}-.+\.js$/.test(file)).sort();

test("every AI recipe mounts and releases its owning controls", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/browser-tests/recipes.html");
  const results = await page.evaluate(async files => {
    const { EventBus } = await import("/src/ui/all.js");
    const host = document.querySelector("#root");
    const rows = [{ id: "a", name: "Ada", email: "ada@example.test", country: "CA" }];
    const events = new EventBus();
    const args = {
      "01": () => {}, "02": () => {},
      "04": { events, isDirty: () => true, save: () => {} },
      "05": rows, "06": { name: "Demo", enabled: true }, "08": rows
      // Recipe09 uses its default project/task records; no deferred-reader input.
    };
    const results = [];
    for (const file of files) {
      const factory = Object.values(await import(`/examples/ai-recipes/${file}`))[0];
      const result = factory(host, args[file.slice(0, 2)]);
      const owner = result.screen ?? result.owner ?? result;
      const descendants = [];
      function collect(control) {
        for (const child of control.getItems?.() ?? []) {
          if (!child || typeof child.destroy !== "function") continue;
          descendants.push(child);
          collect(child);
        }
      }
      collect(owner);
      const mounted = owner.mounted && host.childElementCount > 0;
      result.destroy();
      results.push({ file, mounted, destroyed: owner.destroyed,
        descendantsDestroyed: descendants.every(child => child.destroyed),
        empty: host.childElementCount === 0 });
    }
    events.destroy();
    return results;
  }, recipes);
  for (const result of results) {
    expect(result, result.file).toEqual({ file: result.file, mounted: true,
      destroyed: true, descendantsDestroyed: true, empty: true });
  }
  expect(errors).toEqual([]);
});
