import { expect, test } from "@playwright/test";

test("a command button may finish saving after its screen is destroyed", async ({ page }) => {
  await page.goto("/browser-tests/recipes.html");
  const result = await page.evaluate(async () => {
    const { Button, CommandRegistry, Panel } = await import("/src/ui/index.js");
    const commands = new CommandRegistry();
    let finish;
    commands.register("save", { run: () => new Promise(resolve => { finish = resolve; }) });
    const screen = new Panel("#root");
    const button = new Button({ commands, command: "save" });
    screen.add(button);
    const execute = commands.execute.bind(commands);
    let pending;
    commands.execute = (...args) => { pending = execute(...args); return pending; };
    button.element.click();
    screen.destroy();
    commands.destroy();
    finish("saved");
    return await pending;
  });
  expect(result).toEqual({ ok: true, value: "saved" });
});

test("silent SelectInput store mutations update rendered options without semantic events", async ({ page }) => {
  await page.goto("/browser-tests/recipes.html");
  const state = await page.evaluate(async () => {
    const { SelectInput } = await import("/src/ui/index.js");
    const select = new SelectInput("#root", { value: "a", clearValueOnMissingData: true });
    select.data.parse([{ id: "a", text: "Alpha" }]);
    const changes = [];
    select.events.on("change", event => changes.push(event));
    select.data.parse([{ id: "b", text: "Beta" }], { origin: "import", silent: true });
    const options = () => [...select.element.querySelectorAll("option")].map(option => option.textContent);
    const replaced = options();
    const value = select.value.get();
    select.data.update("b", { text: "Updated" }, { silent: true });
    const updated = options();
    select.data.clear({ silent: true });
    const cleared = options();
    select.destroy();
    return { replaced, value, updated, cleared, changes: changes.length };
  });
  expect(state).toEqual({ replaced: ["Beta"], value: "", updated: ["Updated"], cleared: [], changes: 0 });
});

test("destroying a mounted owner ignores removal vetoes and releases descendants", async ({ page }) => {
  await page.goto("/browser-tests/recipes.html");
  const state = await page.evaluate(async () => {
    const { Form, Panel, TextInput } = await import("/src/ui/index.js");
    const parent = new Panel("#root");
    const input = new TextInput({ name: "name" });
    const form = new Form().row(input);
    parent.add(form);
    parent.events.on("beforeChildRemove", event => { event.cancel = true; });
    form.events.on("beforeChildRemove", event => { event.cancel = true; });
    parent.destroy();
    return { parent: parent.destroyed, form: form.destroyed, input: input.destroyed,
      events: input.events.destroyed, mounted: input.mounted,
      empty: document.querySelector("#root").childElementCount === 0 };
  });
  expect(state).toEqual({ parent: true, form: true, input: true, events: true, mounted: false, empty: true });
});
