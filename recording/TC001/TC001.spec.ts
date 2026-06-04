import { test, expect } from '@playwright/test';

test('TC001', async ({ page }) => {
  await page.goto('http://127.0.0.1:8000/');
  await expect(page.getByText('Nền tảng học tập toàn diện - Programming, Testing, DevOps & Languages', { exact: true })).toBeVisible();
  await expect(page.getByText('Nền tảng học tập toàn diện - Programming, Testing, DevOps & Languages', { exact: true })).toContainText('Nền tảng học tập toàn diện - Programming, Testing, DevOps & Languages');
});
