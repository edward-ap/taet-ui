import { test, expect } from "@playwright/test";

const example = (page, title) => page.locator(".dui-example-host").filter({ has: page.getByRole("heading", { name: title, exact: true }) });

test("Form docs compose columns, label positions and compact rows with hints that stay out of values", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/docs/index.html#form");
  const single = example(page, "One column · labels on the left");
  const two = example(page, "Two columns · labels on top");
  const compact = example(page, "Compact rows · Name and address");
  const fullName = await single.getByRole("textbox", { name: "Full name", exact: true }).boundingBox();
  const email = await single.getByRole("textbox", { name: /^Email(?:\s|$)/ }).boundingBox();
  expect(email.x).toBe(fullName.x);
  expect(email.y).toBeGreaterThan(fullName.y);
  const first = await two.getByRole("textbox", { name: "First name", exact: true }).boundingBox();
  const last = await two.getByRole("textbox", { name: "Last name", exact: true }).boundingBox();
  expect(last.y).toBe(first.y);
  expect(last.x).toBeGreaterThan(first.x + first.width);
  const label = await two.locator(".dui-text-field__label").first().boundingBox();
  expect(label.y + label.height).toBeLessThanOrEqual(first.y);

  const city = await compact.getByRole("textbox", { name: "City", exact: true }).boundingBox();
  for (const name of ["State", "ZIP"]) {
    const box = await compact.getByRole("textbox", { name, exact: true }).boundingBox();
    expect(box.y).toBe(city.y);
    expect(box.x).toBeGreaterThan(city.x);
  }
  await expect(compact.getByRole("textbox", { name: "Name", exact: true })).toHaveAttribute("placeholder", "First");
  await expect(compact.getByRole("textbox", { name: "Last name", exact: true })).toHaveAttribute("placeholder", "Last");
  await compact.getByRole("button", { name: "Read values", exact: true }).click();
  const output = compact.locator(".dui-example-host__output");
  await expect(output).toHaveText(JSON.stringify({ firstName: "", lastName: "", city: "", state: "", zip: "" }));
  await compact.getByRole("textbox", { name: "Name", exact: true }).fill("Ada");
  await compact.getByRole("textbox", { name: "Last name", exact: true }).fill("Lovelace");
  await compact.getByRole("textbox", { name: "ZIP", exact: true }).fill("10001");
  await compact.getByRole("button", { name: "Read values", exact: true }).click();
  await expect(output).toContainText('"lastName":"Lovelace"');
  await expect(output).toContainText('"zip":"10001"');
  await compact.getByRole("button", { name: "Clear fields", exact: true }).click();
  await expect(compact.getByRole("textbox", { name: "Name", exact: true })).toHaveValue("");

  await page.getByRole("button", { name: "Dark", exact: true }).click();
  await page.setViewportSize({ width: 600, height: 900 });
  const narrowFirst = await two.getByRole("textbox", { name: "First name", exact: true }).boundingBox();
  const narrowLast = await two.getByRole("textbox", { name: "Last name", exact: true }).boundingBox();
  expect(narrowLast.y).toBeGreaterThan(narrowFirst.y);
  expect(narrowLast.x).toBe(narrowFirst.x);
  expect(errors).toEqual([]);
});

test("Form validation rejects invalid input and reaches fields inside a framed group", async ({ page }) => {
  await page.goto("/docs/index.html#form");
  const validated = example(page, "Validation · required, email and custom rules");
  const output = validated.locator(".dui-example-host__output");
  await validated.getByRole("button", { name: "Submit", exact: true }).click();
  await expect(validated.getByRole("textbox", { name: /^Customer(?:\s|$)/ })).toBeFocused();
  await expect(output).toContainText("Customer is required");
  await expect(output).toContainText("Choose a whole number from 1 to 50");
  await validated.getByRole("button", { name: "Load valid sample", exact: true }).click();
  await validated.getByRole("textbox", { name: /^Email(?:\s|$)/ }).fill("invalid");
  await validated.getByRole("button", { name: "Validate", exact: true }).click();
  await expect(output).toContainText("Enter a valid email address");
  await validated.getByRole("textbox", { name: /^Email(?:\s|$)/ }).fill("ada@example.com");
  await validated.getByRole("spinbutton", { name: /^Seats(?:\s|$)/ }).fill("2.5");
  await validated.getByRole("button", { name: "Submit", exact: true }).click();
  await expect(output).toContainText("Choose a whole number from 1 to 50");
  await validated.getByRole("spinbutton", { name: /^Seats(?:\s|$)/ }).fill("4");
  await validated.getByRole("button", { name: "Validate", exact: true }).click();
  await expect(output).toHaveText("All values are valid. Nothing submitted.");
  await validated.getByRole("button", { name: "Submit", exact: true }).click();
  await expect(output).toContainText('Submitted: {"customer":"Ada Lovelace","email":"ada@example.com","seats":4}');

  const grouped = example(page, "FieldGroup · Contact Information");
  await expect(grouped.getByRole("group", { name: "Contact Information", exact: true })).toBeVisible();
  await grouped.getByRole("button", { name: "Save contact", exact: true }).click();
  await expect(grouped.getByRole("textbox", { name: /^Customer(?:\s|$)/ })).toBeFocused();
  await expect(grouped.locator(".dui-example-host__output")).toContainText("contactName: Customer is required");
  await grouped.getByRole("textbox", { name: /^Customer(?:\s|$)/ }).fill("Grace Hopper");
  await grouped.getByRole("textbox", { name: /^Email(?:\s|$)/ }).fill("grace@example.com");
  await grouped.getByRole("button", { name: "Save contact", exact: true }).click();
  await expect(grouped.locator(".dui-example-host__output")).toHaveText('Contact saved: {"contactName":"Grace Hopper","contactEmail":"grace@example.com","contactPhone":""}');
});
