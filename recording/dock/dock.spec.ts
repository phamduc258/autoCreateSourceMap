import { test, expect } from '@playwright/test';

test('dock', async ({ page }) => {
  await page.goto('https://www.saucedemo.com/');
  await page.locator('[data-test="username"]').fill('standard_user');
  await page.locator('[data-test="password"]').fill('secret_sauce');
  await page.locator('[data-test="login-button"]').click();
  // -> https://www.saucedemo.com/inventory.html
  await page.locator('[data-test="add-to-cart-sauce-labs-backpack"]').click();
  // pick locator: [data-test="add-to-cart-sauce-labs-bike-light"]
  await expect(page.locator('#item_4_title_link > div')).toBeVisible();
});
