import { expect } from "@playwright/test";

export function capturePageErrors(page) {
  const errors = [];
  page.on("console", message => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", error => errors.push(`page: ${error.message}`));
  return errors;
}

export async function expectNoPageErrors(errors) {
  expect(errors, errors.join("\n")).toEqual([]);
}
