import { defineConfig } from '@playwright/test';
import base from './playwright.config.js';
export default defineConfig({ ...base, testMatch: ['charts.spec.js','spectrum.spec.js'], outputDir: 'test-results/charts',
  projects: ['chromium','firefox','webkit'].map(browserName => ({ name: browserName, use: { browserName } }))
});
