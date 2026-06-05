import { test, expect } from '@playwright/test';

// ⚠ 2 selector mong manh (positional) — nen thay bang data-testid. Chi tiet o file .md.

test('TC001', async ({ page }) => {
  test.setTimeout(90_000); // staging cham + login + 2 tab (job/search + form)
  await page.goto('https://staging-hrbc-jp.porterscloud.com/index/login', { waitUntil: 'domcontentloaded' }); // 'load' treo tren SPA -> domcontentloaded
  await expect(page.locator('#Model_LoginForm_company_login_id')).toBeVisible(); // chờ form login render xong
  await page.locator('#Model_LoginForm_company_login_id').click();
  await page.locator('#Model_LoginForm_company_login_id').press('Tab');
  await page.locator('#Model_LoginForm_company_login_id').fill('porters_autotest_agent');
  await page.locator('#Model_LoginForm_username').press('Tab');
  await page.locator('#Model_LoginForm_username').fill('tamnt@vnext.vn');
  await page.locator('#Model_LoginForm_password').fill('vnext@2024');
  await page.locator('#yt0').click();
  // Tai khoan trung phien -> PORTERS dua sang /deny kem modal "2重ログイン". CO modal thi bam OK, KHONG co thi bo qua.
  await page.waitForURL(/\/(deny|common)/, { waitUntil: 'domcontentloaded' }).catch(() => {});
  if (page.url().includes('/deny')) {
    await page.getByRole('button', { name: 'OK' }).first().click({ timeout: 20_000 }).catch(() => {}); // doi modal render roi bam OK
  }
  // MOC dang nhap thanh cong ON DINH: ten user hien o thanh tren. KHONG ep '**/common/navigation' (URL chuyen tiep).
  await expect(page.getByText('tamnt').first()).toBeVisible({ timeout: 30_000 });
  await page.screenshot({ path: 'recording/TC001/shots/after-login.png', fullPage: true }); // chup man sau login
  // -> https://staging-hrbc-jp.porterscloud.com/deny/index?error=duplicate
  // -> https://staging-hrbc-jp.porterscloud.com/common/navigation
  // "02.私の部署の求人(今年)" MO TAB MOI (/job/search) -> bat tab do (la popup cua `page`).
  const jobPagePromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: '02.私の部署の求人(今年)' }).click();
  const jobPage = await jobPagePromise;                  // tab moi = trang /job/search
  await jobPage.waitForLoadState('domcontentloaded');
  // /job/search hien lop phu loading #simplemodal-overlay luc dau -> doi no bien mat moi click duoc #add.
  await jobPage.locator('#simplemodal-overlay').waitFor({ state: 'hidden', timeout: 30_000 }).catch(() => {});
  // #add nam tren tab /job/search va mo MODAL NGAY TREN tab do (KHONG mo tab moi) -> tiep tuc dung `jobPage`.
  await jobPage.locator('#add').click();
  await jobPage.locator('xpath=(//*[@aria-modal=\'true\']//*[normalize-space()="企業"])[1]/ancestor-or-self::*[.//input][1]/descendant::input[1]').click();
  await jobPage.locator('xpath=(//*[@aria-modal=\'true\']//*[normalize-space()="企業"])[1]/ancestor-or-self::*[.//input][1]/descendant::input[1]').press('Tab');
  await jobPage.locator('xpath=(//*[@aria-modal=\'true\']//*[normalize-space()="企業"])[1]/ancestor-or-self::*[.//input][1]/descendant::input[1]').fill('abc');
  await jobPage.locator('xpath=(//*[@aria-modal=\'true\']//*[normalize-space()="営業先"])[1]/ancestor-or-self::*[.//input][1]/descendant::input[1]').click();
  await jobPage.locator('xpath=(//*[@aria-modal=\'true\']//*[normalize-space()="営業先"])[1]/ancestor-or-self::*[.//input][1]/descendant::input[1]').fill('bde');
  await jobPage.locator('xpath=(//*[normalize-space()="氏名(ご担当者)"])[1]/ancestor-or-self::*[.//input][1]/descendant::input[1]').click();

  await jobPage.screenshot({ path: 'recording/TC001/shots/shot-2.png', fullPage: true });
});