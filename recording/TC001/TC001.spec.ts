import { test, expect } from '@playwright/test';

test('TC001', async ({ page }) => {
  await page.goto('https://staging-hrbc-jp.porterscloud.com/index/login');
  await page.getByPlaceholder('Company ID').click();
  await page.getByPlaceholder('Company ID').fill('porters_autotest_agent');
  await page.getByPlaceholder('Mail Address').click();
  await page.getByPlaceholder('Mail Address').fill('tamnt@vnext.vn');
  await page.getByPlaceholder('Password').click();
  await page.getByPlaceholder('Password').fill('vnext@2024');
  await page.getByRole('button', { name: 'Login' }).click();
  // -> https://staging-hrbc-jp.porterscloud.com/deny/index?error=duplicate
  await page.getByRole('button', { name: 'OK' }).click();
  // -> https://staging-hrbc-jp.porterscloud.com/common/navigation
  await page.getByRole('button', { name: '02.私の部署の求人(今年)' }).click();
  // -> https://staging-hrbc-jp.porterscloud.com/job/search?condition_id=13&menu_id=3
  await page.getByRole('link', { name: '＋新規追加' }).click();
  await page.locator('xpath=(//*[@aria-modal=\'true\']//*[normalize-space()="企業"])[1]/ancestor-or-self::*[.//input][1]/descendant::input[1]').click();
  await page.locator('xpath=(//*[@aria-modal=\'true\']//*[normalize-space()="営業先"])[1]/ancestor-or-self::*[.//input][1]/descendant::input[1]').click();
  await page.locator('xpath=(//*[normalize-space()="氏名(ご担当者)"])[1]/ancestor-or-self::*[.//input][1]/descendant::input[1]').click();
});
