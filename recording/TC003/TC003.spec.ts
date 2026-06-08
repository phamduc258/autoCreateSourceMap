import { test, expect } from '@playwright/test';

test('TC003', async ({ page }) => {
  await page.goto('http://127.0.0.1:8000/');
  await page.getByRole('link', { name: 'Đăng ký ngay' }).click();
  // -> http://127.0.0.1:8000/register
  await page.goBack();   // -> http://127.0.0.1:8000/
});
