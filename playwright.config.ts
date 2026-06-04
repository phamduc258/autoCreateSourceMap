import { defineConfig } from '@playwright/test';
import 'dotenv/config';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: 'list',
  use: {
    baseURL: process.env.BASE_URL ?? 'https://www.saucedemo.com',
    headless: true,
    // Dung trinh duyet he thong neu dat BROWSER_CHANNEL (vd 'chrome'/'msedge'); bo trong = Chromium dong goi.
    channel: process.env.BROWSER_CHANNEL?.trim() || undefined,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
});
