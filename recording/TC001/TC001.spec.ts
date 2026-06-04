import { test, expect } from '@playwright/test';

// ⚠ 1 selector mong manh (positional) — nen thay bang data-testid. Chi tiet o file .md.

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
  await page.locator('#recordGridControlsContainer > div:nth-of-type(2) > div:nth-of-type(2) > div').click();
  await page.getByRole('link', { name: '＋新規追加' }).click();
  await page.locator('xpath=(//*[@aria-modal=\'true\']//*[normalize-space()="企業"])[1]/ancestor-or-self::*[.//input][1]/descendant::input[1]').click();
  await page.getByRole('button', { name: '01.選考プロセス無し求人' }).click();
  await page.locator('xpath=(//*[normalize-space()="面接情報"])[1]/ancestor-or-self::*[.//textarea][1]/descendant::textarea[1]').click();
  await page.locator('xpath=(//*[normalize-space()="雇用期間"])[1]/ancestor-or-self::*[.//input][1]/descendant::input[1]').click();
  await page.locator('xpath=(//*[normalize-space()="有効期間開始"])[1]/ancestor-or-self::*[.//input][1]/descendant::input[1]').click();
  await page.locator('xpath=(//*[normalize-space()="労働条件変更履歴"])[1]/ancestor-or-self::*[.//textarea][1]/descendant::textarea[1]').click();
  await page.locator('xpath=(//*[normalize-space()="労働条件変更履歴"])[1]/ancestor-or-self::*[.//textarea][1]/descendant::textarea[1]').fill('dasdasd');
  await page.locator('div.record-screen-dialog').click();
  await page.screenshot({ path: 'shots/shot-1.png', fullPage: true });
});
