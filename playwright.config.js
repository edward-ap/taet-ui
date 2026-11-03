import { defineConfig } from "@playwright/test";
import {availableParallelism} from "node:os";

export default defineConfig({
  testDir: "./browser-tests",
  outputDir: process.env.TAET_UI_TEST_OUTPUT || "test-results",
  fullyParallel: false,
  workers: Math.max(1, Math.min(32, availableParallelism(), Number(process.env.TAET_UI_WORKERS) || 32)),
  reporter: "line",
  use: {
    baseURL: "http://127.0.0.1:" + (process.env.TAET_UI_PORT || "5173"),
    headless: true,
    viewport: { width: 1440, height: 900 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure"
  },
  webServer: process.env.TAET_UI_TEST_SERVER ? undefined : {
    command: "node scripts/test-server.js " + (process.env.TAET_UI_PORT || "5173"),
    url: "http://127.0.0.1:" + (process.env.TAET_UI_PORT || "5173") + "/browser-tests/recipes.html",
    reuseExistingServer: !process.env.CI,
    timeout: 15_000
  }
});
