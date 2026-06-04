import { test, expect } from '@playwright/test';

test('TC001', async ({ page }) => {
  await page.goto('http://127.0.0.1:8000/');
  // pick locator: #courses > div > div > a:nth-of-type(2) > span
  await page.locator('#courses > div > div > a:nth-of-type(2) > span').dblclick();
  await page.getByRole('link', { name: '🔷 TypeScript TypeScript từ cơ bản đến nâng cao - Type Safet' }).click();
  // -> http://127.0.0.1:8000/typescript
  await page.locator('body > section:nth-of-type(3) > div > div:nth-of-type(2) > div:nth-of-type(2) > div').click();
  await page.locator('body > section:nth-of-type(3) > div > div:nth-of-type(2) > div:nth-of-type(2) > div > ul > li:nth-of-type(2)').hover();
});
