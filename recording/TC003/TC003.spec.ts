import { test, expect } from '@playwright/test';

// ⚠ 1 selector mong manh (🔴) — nen thay bang data-testid.

test('TC003', async ({ page }) => {
  await page.goto('https://staging-hrbc-jp.porterscloud.com/index/login');
  await page.locator('#Model_LoginForm_company_login_id').click();
  await page.locator('#Model_LoginForm_company_login_id').fill('porters_autotest_agent');
  await page.locator('#Model_LoginForm_username').click();
  await page.locator('#Model_LoginForm_username').fill('tamnt@vnext.vn');
  await page.locator('#Model_LoginForm_password').click();
  await page.locator('#Model_LoginForm_password').fill('vnext@2024');
  await page.locator('#yt0').click();
  // -> https://staging-hrbc-jp.porterscloud.com/deny/index?error=duplicate
  await page.getByRole('button', { name: 'OK' }).click();
  // -> https://staging-hrbc-jp.porterscloud.com/common/navigation
  const page1Promise = page.waitForEvent('popup');
  await page.getByRole('button', { name: '02.私の部署の求人(今年)' }).click();
  const page1 = await page1Promise;
  await page1.locator('xpath=//div[normalize-space()="＋新規追加"]').click();
  await page1.locator('#add').click();
  await page1.locator('#pageJob > div:nth-of-type(10) > div:nth-of-type(3) > div:nth-of-type(1) > button').click();  // 🔴 selector mong manh
  // pick locator: //div[normalize-space()="＋新規追加"]
  await expect(page.getByRole('button', { name: '02.私の部署の求人(今年)' })).toBeVisible();
});
