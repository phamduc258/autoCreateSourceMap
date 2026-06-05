import { test, expect } from '@playwright/test';

// ⚠ 1 selector mong manh (positional) — nen thay bang data-testid. Chi tiet o file .md.

test('TC002', async ({ page }) => {
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
  await page.getByRole('button', { name: '02.私の部署の求人(今年)' }).click();
  // -> https://staging-hrbc-jp.porterscloud.com/job/search?condition_id=13&menu_id=3
  await page.locator('#add').click();
  await page.locator('#pageJob > div:nth-of-type(16) > div:nth-of-type(3) > div:nth-of-type(1) > button').click();
});
