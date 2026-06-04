import { test, expect } from '@playwright/test';

test('TC001', async ({ page }) => {
  await page.goto('http://127.0.0.1:8000/');
});
