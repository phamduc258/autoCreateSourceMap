import { test, expect } from '@playwright/test';

// ⚠ 2 selector mong manh (positional) — nen thay bang data-testid. Chi tiet o file .md.

test('TC003', async ({ page }) => {
  await page.goto('http://127.0.0.1:8000/');
  await page.locator('xpath=//a[normalize-space()="Khám phá khóa học"]').click();
  await page.getByRole('link', { name: '🤖 AI Tools ChatGPT, Midjourney, DALL-E, GitHub Copilot - 48 bài học làm chủ AI' }).click();
  // -> http://127.0.0.1:8000/ai-tools
  await page.locator('xpath=//div[normalize-space()="Midjourney"]').click();
  await page.locator('i.fa-solid.fa-palette').click();
  await page.locator('body > section:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) > span').click();
  await page.locator('body > section:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(2) > span').click();
  await page.locator('xpath=//div[normalize-space()="DALL-E 3"]').click();
  await page.getByRole('link', { name: 'Bat Dau Ngay' }).click();
  // -> http://127.0.0.1:8000/ai-tools/lessons/lesson-01
  await page.getByRole('link', { name: 'Bai tiep theo Cai Dat va Dang Ky ChatGPT' }).click();
  // -> http://127.0.0.1:8000/ai-tools/lessons/lesson-02
  await page.locator('div.ai-lesson-wrapper').click();
});
