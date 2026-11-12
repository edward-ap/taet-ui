import { openComponentGroup } from "./docs-helpers.js";
import { test, expect } from "@playwright/test";

test("button presentation setters preserve focus, keyboard actions and command state", async ({ page }) => {
  await page.goto("/browser-tests/recipes.html");
  await page.evaluate(async () => {
    const { Button, ToolButton, CommandRegistry } = await import("/src/ui/index.js");
    const commands = new CommandRegistry();
    let enabled = true;
    window.buttonClicks = 0;
    commands.register("save", { label: "Save", icon: "save", enabled: () => enabled,
      run: () => { window.buttonClicks++; } });
    const button = new Button("#root", { name: "caption", text: "Move", icon: "save",
      onClick: () => { window.buttonClicks++; } });
    const tool = new ToolButton("#root", { name: "tool", command: "save", commands,
      showText: true, iconPosition: "right", shape: "rounded" });
    window.buttonsFixture = { button, tool, commands, disable: () => { enabled = false; commands.refreshState(); } };
  });
  const button = page.getByRole("button", { name: "Move", exact: true });
  const tool = page.getByRole("button", { name: "Save", exact: true });
  await expect(tool).toBeVisible(); // Constructor with a container must mount ToolButton.
  await expect(tool).toHaveCSS("border-radius", "4px");
  await expect(tool.locator("span").first()).toHaveClass("dui-tool-button__text");
  await button.focus();
  await page.evaluate(() => window.buttonsFixture.button.setIconPosition("right"));
  await expect(button).toBeFocused();
  await expect(button.locator("span").first()).toHaveClass("dui-button__text");
  await button.press("Enter");
  await tool.press("Space");
  expect(await page.evaluate(() => window.buttonClicks)).toBe(2);
  await page.evaluate(() => {
    const { button, tool, disable } = window.buttonsFixture;
    button.setIconPosition("left").setIcon("");
    tool.setShape("square").setIconPosition("left");
    disable();
  });
  await expect(button.locator(".dui-button__icon")).toBeHidden();
  await expect(tool).toHaveCSS("border-radius", "0px");
  await expect(tool).toBeDisabled();
  expect(await page.evaluate(() => {
    const { button, tool, commands } = window.buttonsFixture;
    button.destroy(); tool.destroy(); commands.destroy();
    let rejected = 0;
    try { button.setIconPosition("right"); } catch { rejected++; }
    try { tool.setShape("rounded"); } catch { rejected++; }
    return { rejected, empty: document.querySelector("#root").childElementCount === 0 };
  })).toEqual({ rejected: 2, empty: true });
});

test("Buttons docs demonstrate custom colors, frames, icons and toolbar shapes in both themes", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/docs/index.html#button");
  await openComponentGroup(page, "Buttons");
  await openComponentGroup(page, "Input Controls");
  const components = page.getByRole("treeitem", { name: "Components", exact: true });
  const buttons = page.getByRole("treeitem", { name: "Buttons", exact: true });
  const buttonPage = page.getByRole("treeitem", { name: "Button", exact: true });
  await expect(components).toHaveAttribute("aria-level", "1");
  await expect(buttons).toHaveAttribute("aria-level", "2");
  await expect(buttonPage).toHaveAttribute("aria-level", "3");
  await buttons.locator("[data-dui-tree-toggle]").click();
  await expect(buttonPage).toHaveCount(0);
  await expect(page.getByRole("treeitem", { name: "TextInput", exact: true })).toBeVisible();
  await buttons.locator("[data-dui-tree-toggle]").click();
  await expect(buttonPage).toBeVisible();
  await components.locator("[data-dui-tree-toggle]").click();
  await expect(buttons).toHaveCount(0);
  await components.locator("[data-dui-tree-toggle]").click();
  await expect(buttonPage).toBeVisible();
  const publish = page.getByRole("button", { name: "Publish", exact: true });
  for (const theme of ["light", "dark"]) {
    if (theme === "dark") await page.getByRole("button", { name: "Dark", exact: true }).click();
    await expect(publish).toHaveCSS("background-color", "rgb(180, 83, 9)");
    await publish.hover();
    await expect(publish).toHaveCSS("background-color", "rgb(146, 64, 14)");
    await page.mouse.move(0, 0);
  }
  await expect(page.getByRole("button", { name: "Unavailable", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Enable Save", exact: true }).click();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.locator(".dui-example-host__output").last()).toHaveText("Saved");
  await page.getByRole("treeitem", { name: "Framed Button", exact: true }).click();
  await expect(page).toHaveURL(/#framed-button$/);
  const apply = page.getByRole("button", { name: "Apply", exact: true });
  for (const theme of ["dark", "light"]) {
    if (theme === "light") await page.getByRole("button", { name: "Light Blue", exact: true }).click();
    await page.mouse.move(0, 0);
    const normal = await apply.evaluate(el => getComputedStyle(el).backgroundColor);
    const borders = await apply.evaluate(el => {
      const css = getComputedStyle(el);
      return ["Top", "Right", "Bottom", "Left"].map(side => [css[`border${side}Width`], css[`border${side}Color`]]);
    });
    expect(borders).toEqual(Array(4).fill(["1px", "rgb(95, 162, 217)"]));
    await apply.hover();
    await expect.poll(() => apply.evaluate(el => getComputedStyle(el).backgroundColor)).not.toBe(normal);
  }
  await page.getByRole("treeitem", { name: "Button with Icon", exact: true }).click();
  await expect(page.locator(".dui-example-host style")).toHaveCount(0);
  const next = page.getByRole("button", { name: "Continue", exact: true });
  await expect(next.locator("span").first()).toHaveClass("dui-button__text");
  await next.click();
  await expect(page.locator(".dui-example-host__output").first()).toHaveText("Next step");
  await page.getByRole("treeitem", { name: "ToolButton", exact: true }).click();
  const tools = page.getByRole("toolbar", { name: "Editing tools", exact: true });
  for (const [name, radius] of [["Add item", "0px"], ["Edit item", "4px"]]) {
    const tool = tools.getByRole("button", { name, exact: true });
    await expect(tool).toHaveCSS("border-radius", radius);
    const size = await tool.boundingBox();
    expect(size.width).toBe(size.height);
    await expect(tool).toHaveAttribute("title", name);
    await tool.press("Enter");
    await expect(page.locator(".dui-example-host__output").first()).toHaveText(name);
  }
  await page.getByRole("toolbar", { name: "Document actions" }).getByRole("button", { name: "Save document" }).first().click();
  await expect(page.locator(".dui-example-host__output").last()).toHaveText("Document saved");
  await page.getByPlaceholder("Find component").fill("rounded");
  await expect(components).toHaveAttribute("aria-level", "1");
  await expect(buttons).toHaveAttribute("aria-level", "2");
  await expect(page.getByRole("treeitem", { name: "ToolButton", exact: true })).toBeVisible();
  await expect(page.getByRole("treeitem", { name: "TextInput", exact: true })).toHaveCount(0);
  await page.getByPlaceholder("Find component").fill("buttons");
  await expect(buttonPage).toBeVisible();
  await expect(page.getByRole("treeitem", { name: "Framed Button", exact: true })).toBeVisible();
  await expect(page.getByRole("treeitem", { name: "Button with Icon", exact: true })).toBeVisible();
  await expect(page.getByRole("treeitem", { name: "TextInput", exact: true })).toHaveCount(0);
  await page.getByPlaceholder("Find component").fill("");
  await expect(page.getByRole("treeitem", { name: "TextInput", exact: true })).toBeVisible();
  await page.reload();
  await expect(page).toHaveURL(/#tool-button$/);
  await expect(page.getByRole("heading", { name: "ToolButton", level: 1 })).toBeVisible();
  expect(errors).toEqual([]);
});

test("copyable button snippets match live factories and release owned controls and services", async ({ page }) => {
  await page.goto("/browser-tests/recipes.html");
  const results = await page.evaluate(async () => {
    const ui = await import("/src/ui/all.js");
    const { buttonPage } = await import("/docs/src/pages/Button.page.js");
    const { framedButtonPage, iconButtonPage, toolButtonPage } = await import("/docs/src/pages/ButtonVariants.pages.js");
    const { toggleButtonPage } = await import("/docs/src/pages/ToggleButton.page.js");
    const pages = [[buttonPage, ["button", "form", "form"]], [framedButtonPage, ["form"]],
      [iconButtonPage, ["form", "button"]], [toolButtonPage, ["toolbar", "toolbar"]], [toggleButtonPage, ["example"]]];
    const host = document.querySelector("#root");
    const results = [];
    for (const [doc, names] of pages) {
      for (const [i, example] of doc.examples.entries()) {
        const log = { write() {} };
        const code = new Function(...Object.keys(ui), "log", `${example.source}\nreturn ${names[i]};`);
        const actual = [];
        for (const factory of [() => example.create({ log }), () => code(...Object.values(ui), log)]) {
          const control = factory();
          if (!control.mounted) control.mount(host);
          const children = control.getItems?.() ?? [];
          const registry = control.commands;
          const clone = control.element.cloneNode(true);
          for (const element of [clone, ...clone.querySelectorAll("[data-dui-control-id]")]) element.removeAttribute("data-dui-control-id");
          const ids = new Map();
          actual.push(clone.outerHTML.replace(/dui-editor-a11y-\d+/g, id => {
            if (!ids.has(id)) ids.set(id, `dui-editor-a11y-${ids.size + 1}`);
            return ids.get(id);
          }));
          control.destroy();
          if (host.childElementCount || children.some(child => !child.destroyed) || (registry && !registry.destroyed)) {
            throw new Error(`Leaked example: ${doc.id}/${example.title}`);
          }
        }
        results.push({ name: `${doc.id}/${example.title}`, matches: actual[0] === actual[1] });
      }
    }
    return results;
  });
  expect(results).toHaveLength(9);
  for (const result of results) expect(result.matches, result.name).toBe(true);
});

test("Toggle Button documentation keeps state, supports keyboard and reports form values", async ({ page }) => {
  await page.goto("/docs/index.html#toggle-button");
  await openComponentGroup(page, "Buttons");
  await expect(page.getByRole("treeitem", { name: "Toggle Button", exact: true })).toHaveAttribute("aria-level", "3");
  const pin = page.locator('[data-dui-control-id="pinned"] button');
  const review = page.locator('[data-dui-control-id="reviewed"] button');
  const managed = page.locator('[data-dui-control-id="managedReview"] button');
  for (const theme of ["light", "dark"]) {
    if (theme === "dark") await page.getByRole("button", { name: "Dark", exact: true }).click();
    await expect(review).toHaveAttribute("aria-pressed", "false");
    const width = (await review.boundingBox()).width;
    await review.click();
    await expect(review).toHaveAttribute("aria-pressed", "true");
    await expect(review).toContainText("Reviewed");
    expect((await review.boundingBox()).width).toBe(width);
    await pin.press("Space");
    await expect(pin).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Read button values", exact: true }).click();
    await expect(page.locator(".dui-example-host__output")).toHaveText('{"pinned":true,"reviewed":true,"managedReview":true}');
    await review.press("Enter");
    await expect(review).toHaveAttribute("aria-pressed", "false");
    await page.getByRole("button", { name: "Release buttons", exact: true }).click();
    await expect(pin).toHaveAttribute("aria-pressed", "false");
    await expect(managed).toHaveAttribute("aria-pressed", "true");
    await expect(managed).toBeDisabled();
  }
});
