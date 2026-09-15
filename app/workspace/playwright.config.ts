import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testIgnore: /phase0-(product|presentation|media|access|extension|creation|capture-product|save-recovery|membership|publication|interactions)\.spec\.ts/,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:3100',
    trace: 'on-first-retry',
  },
  projects: [{
    name: 'chromium',
    use: { ...devices['Desktop Chrome'] },
  }],
  webServer: {
    command: 'corepack yarn --ignore-engines workspace @fable/common build && '
      + 'corepack yarn --ignore-engines workspace @fable/client start-local',
    url: 'http://127.0.0.1:3100/__phase0/editor',
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      BROWSER: 'none',
      PORT: '3100',
    },
  },
});
