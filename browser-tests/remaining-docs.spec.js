import {docsCatalog as sourceCatalog} from '../docs/src/docsCatalog.js';
const remainingIds=new Set(['text-area', 'color-picker', 'label-text', 'readonly-text', 'text-layout', 'code-block', 'tooltip', 'popup', 'log-panel', 'mdi-workspace', 'icons', 'keyboard-shortcuts']);
const flattenDocs=groups=>groups.flatMap(g=>[...(g.pages??[]),...flattenDocs(g.groups??[])]);
const expectedRemaining=flattenDocs(sourceCatalog).filter(p=>remainingIds.has(p.id)).reduce((n,p)=>n+(p.examples?.length??0),0);
import { test, expect } from "@playwright/test";

const live = page => page.locator(".dui-example-host__live");
const output = page => page.locator(".dui-example-host__output");
async function navigate(page, id) {
  await page.evaluate(id => window.taetUiDocs.shell.navigate(id), id);
}

test("new input and display examples update values and text in both themes", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/docs/index.html#text-area");
  await live(page).getByRole("textbox", { name: "Notes", exact: true }).fill("First line\nSecond line");
  await live(page).getByRole("button", { name: "Submit notes" }).click();
  await expect(output(page)).toContainText('First line\\nSecond line');
  await live(page).getByRole("button", { name: "Toggle read-only" }).click();
  await expect(live(page).getByRole("textbox", { name: "Notes", exact: true })).toHaveAttribute("readonly", "");
  await navigate(page, "color-picker");
  await live(page).getByRole("button", { name: "Use orange" }).click();
  await expect(output(page)).toHaveText("Accent: #ff8800");
  await live(page).getByRole("button", { name: "Accent", exact: true }).click();
  await expect(page.locator(".dui-color-picker__popup")).toBeVisible();
  await page.keyboard.press("Escape");
  await live(page).getByRole("button", { name: "Clear color" }).click();
  await live(page).getByRole("button", { name: "Read color" }).click();
  await expect(output(page)).toHaveText('{"accent":""}');
  await navigate(page, "label-text");
  await live(page).getByRole("button", { name: "Select another" }).click();
  await expect(live(page)).toContainText("Selected items: 1");
  await navigate(page, "readonly-text");
  await live(page).getByRole("button", { name: "Show result" }).click();
  await expect(live(page)).toContainText("Export complete: 24 records.");
  await navigate(page, "text-layout");
  await expect(live(page).getByText("Sample records used to inspect the layout.")).toBeVisible();
  await live(page).getByRole("button", { name: "Mark ready" }).click();
  await expect(live(page).getByText("The sample passed validation.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Dark", exact: true }).click();
  await navigate(page, "code-block");
  await live(page).getByRole("button", { name: "Update JSON" }).click();
  await expect(live(page).locator("code")).toContainText('"rows": 24');
  expect(errors).toEqual([]);
});

test("TextLayout styles and reading scale stay local while headings and body scale together", async ({ page }) => {
  await page.goto("/docs/index.html#text-layout");
  await expect(page.locator(".dui-docs-reading-guide h2")).toHaveCSS("font-size", "24px");
  await expect(page.locator(".dui-docs-reading-guide h3")).toHaveCSS("font-size", "18px");
  await expect(page.locator(".dui-docs-bold-message .dui-text-layout__paragraph")).toHaveCSS("font-weight", "700");
  await expect(page.locator(".dui-docs-italic-note .dui-text-layout__paragraph")).toHaveCSS("font-style", "italic");
  const example = page.locator(".dui-example-host").filter({ has: page.locator(".dui-docs-scaled-text") });
  const body = example.locator(".dui-text-layout__paragraph");
  const heading = example.getByRole("heading", { name: "Choose a comfortable reading size" });
  const action = example.getByRole("button", { name: "A+ Larger", exact: true });
  const actionSize = await action.evaluate(element => getComputedStyle(element).fontSize);
  await expect(body).toHaveCSS("font-size", "15px");
  await expect(heading).toHaveCSS("font-size", "22.5px");
  for (let i = 0; i < 5; i++) await action.click();
  await expect(example.locator(".dui-example-host__output")).toHaveText("Text size: 200%");
  await expect(body).toHaveCSS("font-size", "30px");
  await expect(body).toHaveCSS("line-height", "48px");
  await expect(heading).toHaveCSS("font-size", "45px");
  await expect(action).toHaveCSS("font-size", actionSize);
  await expect(page.locator(".dui-docs-reading-guide h2")).toHaveCSS("font-size", "24px");
  await page.getByRole("button", { name: "Dark", exact: true }).click();
  await page.setViewportSize({ width: 600, height: 900 });
  const overflow = await example.locator(".dui-docs-scaled-text").evaluate(element => element.scrollWidth - element.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await example.getByRole("button", { name: "Reset 100%", exact: true }).click();
  await example.getByRole("button", { name: "A− Smaller", exact: true }).click();
  await example.getByRole("button", { name: "A− Smaller", exact: true }).click();
  await expect(example.locator(".dui-example-host__output")).toHaveText("Text size: 75%");
  await expect(body).toHaveCSS("font-size", "11.25px");
});

test("popup and tooltip keep focus and release their overlays on navigation", async ({ page }) => {
  await page.goto("/docs/index.html#tooltip");
  const target = live(page).getByRole("button", { name: "Export help", exact: true });
  await target.focus();
  await expect(page.getByRole("tooltip")).toContainText("Exports the current filtered rows");
  await expect(target).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator(".dui-tooltip:visible")).toHaveCount(0);
  await navigate(page, "popup");
  const anchor = live(page).getByRole("button", { name: "Quick filter", exact: true });
  // Safari mouse activation does not focus native buttons. Establish the
  // focus owner explicitly before testing the popup's restoration contract.
  await anchor.focus();
  await expect(anchor).toBeFocused();
  await anchor.press("Enter");
  await page.getByRole("textbox", { name: "Contains", exact: true }).fill("Ada");
  await page.getByRole("button", { name: "Apply filter", exact: true }).click();
  await expect(output(page)).toHaveText("Filter: Ada");
  await expect(anchor).toBeFocused();
  await anchor.click();
  await expect(page.getByRole("textbox", { name: "Contains", exact: true })).toHaveValue("Ada");
  await navigate(page, "log-panel");
  await expect(page.locator(".dui-popup")).toHaveCount(0);
  await live(page).getByRole("button", { name: "Append message" }).click();
  await live(page).getByRole("button", { name: "Append message" }).click();
  await expect(live(page).locator(".dui-log-panel__row").first()).toContainText("INFO 2");
  await live(page).getByRole("button", { name: "Clear log" }).click();
  await expect(live(page).locator(".dui-log-panel__row")).toHaveCount(0);
});

test("MDI windows retain edits through cascade and release when navigating", async ({ page }) => {
  await page.goto("/docs/index.html#mdi-workspace");
  await expect(live(page).locator(".dui-mdi-window")).toHaveCount(2);
  await live(page).getByRole("textbox", { name: "Title", exact: true }).last().fill("Retained title");
  await live(page).getByRole("button", { name: "Cascade", exact: true }).click();
  await expect(live(page).getByRole("textbox", { name: "Title", exact: true }).last()).toHaveValue("Retained title");
  await live(page).getByRole("button", { name: "New document", exact: true }).click();
  await expect(live(page).locator(".dui-mdi-window")).toHaveCount(3);
  await navigate(page, "introduction");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("icon registrations and scoped shortcuts are owned by their examples", async ({ page }) => {
  await page.goto("/docs/index.html#icons");
  await live(page).getByRole("button", { name: "save", exact: true }).click();
  await expect(output(page).first()).toHaveText('icon: "save"');
  expect(await page.evaluate(async () => (await import("/src/ui/index.js")).icons.has("docs-example-mark"))).toBe(true);
  await navigate(page, "keyboard-shortcuts");
  expect(await page.evaluate(async () => (await import("/src/ui/index.js")).icons.has("docs-example-mark"))).toBe(false);
  const query = live(page).getByRole("textbox", { name: "Query", exact: true });
  await query.fill("London");
  await query.press("Control+Enter");
  await expect(output(page)).toHaveText("Executed: London");
  await live(page).getByRole("button", { name: "Toggle command" }).click();
  await query.press("Control+Enter");
  await expect(output(page)).toHaveText("Command enabled: false");
  await live(page).getByRole("button", { name: "Toggle command" }).click();
  await page.getByPlaceholder("Find component").press("Control+Enter");
  await expect(output(page)).toHaveText("Command enabled: true");
  await navigate(page, "introduction");
  await page.getByPlaceholder("Find component").press("Control+Enter");
});

test("all new copyable factories reproduce live values and release owned models", async ({ page }) => {
  await page.goto("/browser-tests/recipes.html");
  const count = await page.evaluate(async () => {
    const ui = await import("/src/ui/all.js");
    const { docsCatalog } = await import("/docs/src/docsCatalog.js");
    const ids = new Set(["text-area", "color-picker", "label-text", "readonly-text", "text-layout", "code-block", "tooltip", "popup", "log-panel", "mdi-workspace", "icons", "keyboard-shortcuts"]);
    const collectPages = groups => groups.flatMap(group => [...(group.pages ?? []), ...collectPages(group.groups ?? [])]);
    const pages = collectPages(docsCatalog).filter(page => ids.has(page.id));
    const container = document.querySelector("#root");
    const log = { write() {} };
    const snapshot = control => ({ type: control.constructor.name, value: control.value?.get(), text: control.getText?.(), content: control.getContent?.(), fields: control.getFields?.().filter(field => !field.element).map(field => field.id), children: (control.getItems?.() ?? []).map(snapshot) });
    let count = 0;
    for (const doc of pages) for (const example of doc.examples) {
      const run = new Function(...Object.keys(ui), "log", `${example.source}\nreturn example;`);
      const states = [];
      for (const create of [() => example.create({ container, log }), () => run(...Object.values(ui), log)]) {
        const owner = create();
        states.push(JSON.stringify(snapshot(owner)));
        const owned = new Set();
        const collect = item => {
          if (!item || owned.has(item)) return;
          owned.add(item);
          for (const model of [item.data, item.fields, item.selection, item.rangeSelection, item.commands, item.editor, item.toolbar]) if (typeof model?.destroy === "function") collect(model);
          for (const child of item.getItems?.() ?? []) collect(child);
        };
        collect(owner);
        owner.destroy();
        if (container.childElementCount || [...owned].some(item => !item.destroyed)) throw new Error(`Leaked ${doc.id}`);
      }
      if (states[0] !== states[1]) throw new Error(`Source mismatch: ${doc.id}`);
      count++;
    }
    return count;
  });
  expect(count).toBe(expectedRemaining);
});
