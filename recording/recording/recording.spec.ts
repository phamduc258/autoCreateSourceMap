import { test, expect } from '@playwright/test';

test('recording', async ({ page }) => {
  await page.goto('https://www.saucedemo.com/');
});
