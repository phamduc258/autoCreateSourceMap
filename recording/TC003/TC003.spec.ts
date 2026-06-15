import { test, expect } from '@playwright/test';

test('TC003', async ({ page }) => {
  await page.goto('http://127.0.0.1:8000/');
  await page.getByRole('link', { name: 'Login' }).click();
  // -> http://127.0.0.1:8000/login
});
