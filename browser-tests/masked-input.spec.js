import { test, expect } from "./input-test-fixture.js";

test("masked fields show empty format hints without changing values or validation", { tag: "@input-editing" }, async ({ page }) => {
  await page.goto("/browser-tests/recipes.html");
  await page.evaluate(async () => {
    const { Form, TextInput, required } = await import("/src/ui/index.js");
    window.maskFields = {
      phone: new TextInput({ name: "phone", mask: "+0 (000) 000-0000", validators: [required()] }),
      reference: new TextInput({ name: "reference", mask: "AA-0000", unmaskValue: true }),
      custom: new TextInput({ name: "custom", mask: "00:00", placeholder: "HH:MM" }),
      hidden: new TextInput({ name: "hidden", mask: "000", placeholder: "" }),
      plain: new TextInput({ name: "plain" })
    };
    window.maskForm = new Form({ name: "maskedTest" });
    for (const field of Object.values(window.maskFields)) window.maskForm.row(field);
    window.maskForm.mount("#root");
  });
  const phone = page.locator('[data-dui-control-id="phone"] input');
  const reference = page.locator('[data-dui-control-id="reference"] input');
  for (const theme of ["light-blue", "dark-blue"]) {
    await page.evaluate(theme => document.body.className = `dui-theme-${theme} dui-profile-compact`, theme);
    await phone.focus();
    await expect(phone).toHaveAttribute("placeholder", "+0 (000) 000-0000");
    expect(await phone.evaluate(input => input.matches(":placeholder-shown"))).toBe(true);
    const colors = await phone.evaluate(input => ({
      hint: getComputedStyle(input, "::placeholder").color,
      value: getComputedStyle(input).color,
      opacity: getComputedStyle(input, "::placeholder").opacity
    }));
    expect(colors.hint).not.toBe(colors.value);
    expect(colors.opacity).toBe("1");
    expect(await page.evaluate(() => maskFields.phone.validate().ok)).toBe(false);
    await phone.pressSequentially("15551234567");
    await expect(phone).toHaveValue("+1 (555) 123-4567");
    expect(await phone.evaluate(input => input.matches(":placeholder-shown"))).toBe(false);
    await phone.press("ControlOrMeta+a");
    await phone.press("Backspace");
    await expect(phone).toHaveValue("");
    expect(await phone.evaluate(input => input.matches(":placeholder-shown"))).toBe(true);
    expect(await page.evaluate(() => maskFields.phone.value.get())).toBe("");
  }
  await expect(reference).toHaveAttribute("placeholder", "AA-0000");
  await reference.fill("AB1234");
  await expect(reference).toHaveValue("AB-1234");
  expect(await page.evaluate(() => maskFields.reference.value.get())).toBe("AB1234");
  await page.evaluate(() => {
    window.maskChanges = 0;
    maskFields.reference.events.on("change", () => window.maskChanges++);
    maskFields.reference.value.clear({ silent: true });
  });
  await expect(reference).toHaveValue("");
  expect(await reference.evaluate(input => input.matches(":placeholder-shown"))).toBe(true);
  expect(await page.evaluate(() => window.maskChanges)).toBe(0);
  await expect(page.locator('[data-dui-control-id="custom"] input')).toHaveAttribute("placeholder", "HH:MM");
  await expect(page.locator('[data-dui-control-id="hidden"] input')).toHaveAttribute("placeholder", "");
  await expect(page.locator('[data-dui-control-id="plain"] input')).toHaveAttribute("placeholder", "");
  await page.evaluate(() => maskForm.destroy());
  await expect(page.locator("#root")).toBeEmpty();
});
