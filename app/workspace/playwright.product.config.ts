import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: /(?:phase0-(?:product|presentation|media|access|creation|capture-product|save-recovery|membership|publication|interactions)|captured-renderer)\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  globalSetup: './e2e/setup-local.ts',
  retries: 0,
  forbidOnly: !!process.env.CI,
  use: { baseURL: 'http://localhost:3000', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium-product', use: { ...devices['Desktop Chrome'] } }],
  // Run against scripts/local-dev.mjs. Starting only CRA would hide missing API/queue/storage dependencies.
});
