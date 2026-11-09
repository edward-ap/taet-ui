import { readdirSync } from "node:fs";
import { test, expect } from "@playwright/test";

const recipes = readdirSync(new URL("../examples/ai-recipes/", import.meta.url))
  .filter(file => /^\d{2}-.+\.js$/.test(file)).sort();

test("every AI recipe mounts and releases its owning controls", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/browser-tests/recipes.html");
  const { results, customWidgets } = await page.evaluate(async files => {
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
    const results = [], customWidgets = [];
    for (const file of files) {
      const factory = Object.values(await import(`/examples/ai-recipes/${file}`))[0];
      let result, widgetProof;
      if (file === '13-custom-editor.js') {
        // Native DOM is test infrastructure for the recipe's explicit widget port.
        const input = document.createElement('input');
        let released = 0, destroyed = 0;
        result = factory({
          mount(container) { container.appendChild(input); },
          writeDisplay(text) { input.value = text; },
          onInput(listener) {
            const handle = () => listener(input.value);
            input.addEventListener('input', handle);
            return () => { input.removeEventListener('input', handle); released++; };
          },
          destroy() { input.remove(); destroyed++; }
        }, { name: 'customWidget', value: 'initial' }).mount(host);
        result.value.set('loaded', { silent: true });
        const silentRendered = input.value === 'loaded';
        input.value = 'edited'; input.dispatchEvent(new Event('input', { bubbles: true }));
        const inheritedValue = result.value.get() === 'edited';
        widgetProof = () => ({ silentRendered, inheritedValue, released, destroyed });
      } else result = factory(host, args[file.slice(0, 2)]);
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
      if (widgetProof) customWidgets.push(widgetProof());
      results.push({ file, mounted, destroyed: owner.destroyed,
        descendantsDestroyed: descendants.every(child => child.destroyed),
        empty: host.childElementCount === 0 });
    }
    events.destroy();
    return { results, customWidgets };
  }, recipes);
  for (const result of results) {
    expect(result, result.file).toEqual({ file: result.file, mounted: true,
      destroyed: true, descendantsDestroyed: true, empty: true });
  }
  expect(customWidgets).toEqual([{ silentRendered: true, inheritedValue: true, released: 1, destroyed: 1 }]);
  expect(errors).toEqual([]);
});
