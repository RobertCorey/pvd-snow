import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 15000,
  use: {
    baseURL: 'http://localhost:3999',
  },
  webServer: {
    command: 'npx serve -l 3999 --no-clipboard .',
    port: 3999,
    reuseExistingServer: true,
  },
});
