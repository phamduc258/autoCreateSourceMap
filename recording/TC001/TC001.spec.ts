import { test, expect } from '@playwright/test';

test('TC001', async ({ page }) => {
  await page.goto('http://127.0.0.1:8000/');
  await page.screenshot({ path: 'shots/shot-1.png', fullPage: true });
  await page.getByRole('link', { name: '🤖 AI Tools ChatGPT, Midjourney, DALL-E, GitHub Copilot - 48 bài học làm chủ AI' }).click();
  // -> http://127.0.0.1:8000/ai-tools
  await page.screenshot({ path: 'shots/shot-2.png', fullPage: true });
});
