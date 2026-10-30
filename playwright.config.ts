import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  workers: 1,
  timeout: 30000,
  use: {
    baseURL: 'http://127.0.0.1:3100',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node --experimental-sqlite --import tsx tests/e2e-server.ts',
    url: 'http://127.0.0.1:3100',
    reuseExistingServer: false,
  },
});
