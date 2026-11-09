import { test as base, expect } from '@playwright/test';

// Opt in by importing this test. Expected errors must match exactly, including count.
export const test = base.extend({
  expectedPageErrors: [[], { option: true }],
  pageErrorGuard: [async ({ page, expectedPageErrors }, use) => {
    const errors = [];
    const record = error => errors.push(error.message);
    page.on('pageerror', record);
    try {
      await use();
    } finally {
      // Runs after the test and its afterEach hooks, before the page is torn down.
      page.off('pageerror', record);
      expect(errors, 'Unexpected browser pageerror (including teardown)').toEqual(expectedPageErrors);
    }
  }, { auto: true }]
});
export { expect };
