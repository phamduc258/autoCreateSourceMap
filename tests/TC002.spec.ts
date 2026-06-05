import { test, expect } from '@playwright/test';

test('TC002', async ({ page }) => {
  await page.goto('http://127.0.0.1:8000/');
  await expect(page.locator('xpath=//section[normalize-space()="Chào mừng đến Learning Hub Nền tảng học tập toàn diện - Programming, Testing, DevOps & Languages Khám phá khóa học Đăng ký ngay"]')).toBeVisible();
  await page.getByRole('link', { name: 'Khám phá khóa học' }).click();
  // -> http://127.0.0.1:8000/#courses
  await expect(page.locator('#courses')).toBeVisible();
  await page.getByRole('link', { name: '🐘 PHP & Laravel PHP từ cơ bản đến Laravel - 48 bài học xây dựng web application' }).click();
  // -> http://127.0.0.1:8000/php
  await expect(page.locator('section.hero-section')).toBeVisible();
  await page.getByRole('link', { name: 'Bat dau Section 1' }).click();
  // -> http://127.0.0.1:8000/php/lessons/lesson-01
  await expect(page.locator('div.lesson-number')).toBeVisible();
  await expect(page.locator('div.lesson-number')).toContainText('🐘 Bai 01 - PHP Basics'); // chu HOA tren man hinh la do CSS text-transform; DOM that la chu thuong
  await page.screenshot({ path: 'shots/shot-1.png', fullPage: true });
});