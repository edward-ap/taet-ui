import { test, expect } from "@playwright/test";

test("Accordion handles keyboard, cancellation, silent state and owned teardown", async ({ page }) => {
  await page.goto("/browser-tests/recipes.html");
  await page.evaluate(async () => {
    const { Accordion, Form, TextInput } = await import("/src/ui/all.js");
    const a = new Accordion("#root", { name: "contractAccordion" });
    const first = new Form({ name: "firstForm" }).row(new TextInput({ name: "preserved", value: "Keep me" }));
    const second = new Form({ name: "secondForm" }).row(new TextInput({ name: "other" }));
    a.addSection({ name: "one", title: "One", expanded: true }, first);
    a.addSection({ name: "disabled", title: "Disabled", disabled: true }, new Form({ name: "disabledForm" }));
    a.addSection({ name: "two", title: "Two" }, second);
    window.accordionFixture = { a, first, second, children: [...first.getItems(), ...second.getItems()], events: [] };
    a.events.on("change", event => accordionFixture.events.push({ oldValue: event.oldValue, newValue: event.newValue, origin: event.origin, userAction: event.userAction }));
  });
  const one = page.getByRole("button", { name: "One", exact: true });
  const two = page.getByRole("button", { name: "Two", exact: true });
  await one.focus();
  await one.press("ArrowDown");
  await expect(two).toBeFocused();
  await two.press("Space");
  await expect(one).toHaveAttribute("aria-expanded", "false");
  await expect(two).toHaveAttribute("aria-expanded", "true");
  expect(await page.evaluate(() => accordionFixture.events)).toEqual([
    { oldValue: ["one"], newValue: ["two"], origin: "user", userAction: true }
  ]);
  await two.press("Home");
  await expect(one).toBeFocused();
  await one.press("End");
  await expect(two).toBeFocused();
  await page.evaluate(() => {
    const { a } = accordionFixture;
    accordionFixture.veto = a.events.on("beforeChange", event => event.cancel = true);
  });
  await one.click();
  await expect(two).toHaveAttribute("aria-expanded", "true");
  await expect(one).toHaveAttribute("aria-expanded", "false");
  await page.evaluate(() => accordionFixture.a.expand("one", { silent: true }));
  await expect(one).toHaveAttribute("aria-expanded", "true");
  await expect(two).toHaveAttribute("aria-expanded", "false");
  expect(await page.evaluate(() => accordionFixture.events.length)).toBe(1);
  await page.evaluate(() => accordionFixture.veto.dispose());
  const input = page.locator('[data-dui-control-id="preserved"] input');
  await input.focus();
  await page.evaluate(() => accordionFixture.a.collapse("one"));
  await expect(one).toBeFocused();
  await expect(input).toBeHidden();
  await page.evaluate(() => accordionFixture.a.expand("one"));
  await expect(input).toHaveValue("Keep me");
  await page.evaluate(() => accordionFixture.a.disable());
  await expect(one).toBeDisabled();
  await expect(two).toBeDisabled();
  await page.evaluate(() => accordionFixture.a.enable());
  await expect(one).toBeEnabled();
  await expect(page.getByRole("button", { name: "Disabled", exact: true })).toBeDisabled();

  const teardown = await page.evaluate(() => {
    const { a, first, second, children } = accordionFixture;
    a.events.on("beforeChildRemove", event => event.cancel = true);
    const cancelled = a.removeSection("one") === null;
    a.destroy();
    a.destroy();
    return { cancelled, released: [a, first, second, ...children].every(control => control.destroyed), expanded: a.getExpanded() };
  });
  expect(teardown).toEqual({ cancelled: true, released: true, expanded: [] });
  await expect(page.locator("#root")).toBeEmpty();
});

test("Accordion rejects duplicate ownership and respects cancelled additions", async ({ page }) => {
  await page.goto("/browser-tests/recipes.html");
  const results = await page.evaluate(async () => {
    const { Accordion, Form } = await import("/src/ui/all.js");
    const a = new Accordion("#root", { name: "additionAccordion", multiple: true });
    const first = new Form({ name: "first" });
    a.addSection({ name: "one", expanded: true }, first);
    const next = new Form({ name: "next" });
    let duplicate = false, owned = false;
    try { a.addSection({ name: "one" }, next); } catch { duplicate = true; }
    try { a.addSection({ name: "two" }, first); } catch { owned = true; }
    const veto = a.events.on("beforeChildAdd", event => event.cancel = true);
    const cancelled = a.addSection({ name: "two" }, next) === null;
    veto.dispose();
    a.addSection({ name: "two", expanded: true }, next);
    const expanded = a.getExpanded();
    a.removeSection("two");
    const removed = next.destroyed && a.getSection("two") === null;
    a.destroy();
    return { duplicate, owned, cancelled, expanded, removed };
  });
  expect(results).toEqual({ duplicate: true, owned: true, cancelled: true, expanded: ["one", "two"], removed: true });
  await expect(page.locator("#root")).toBeEmpty();
});
