import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage.js';
import { InventoryPage } from './pages/InventoryPage.js';
import { CartPage } from './pages/CartPage.js';
import { CheckoutInfoPage } from './pages/CheckoutPage.js';

const USER = process.env.TEST_USER ?? 'standard_user';
const PASS = process.env.TEST_PASS ?? 'secret_sauce';

// Sinh tu testcases/TC001-checkout.md, dung selector da verify trong output/screens/*.md
test('TC001 - Mua Sauce Labs Backpack va checkout den Overview', async ({ page }) => {
  // Buoc 1: dang nhap
  const login = new LoginPage(page);
  await login.goto();
  await login.login(USER, PASS);

  const inventory = new InventoryPage(page);
  await expect(page).toHaveURL(/inventory\.html/);
  await expect(inventory.title).toHaveText('Products');

  // Buoc 2: them Backpack vao gio -> badge = 1
  await inventory.addToCart('sauce-labs-backpack');
  await expect(inventory.cartBadge).toHaveText('1');

  // Buoc 3: mo gio hang
  await inventory.openCart();
  const cart = new CartPage(page);
  await expect(page).toHaveURL(/cart\.html/);
  await expect(cart.title).toHaveText('Your Cart');
  await expect(cart.item('Sauce Labs Backpack')).toBeVisible();

  // Buoc 4: checkout + nhap thong tin
  await cart.checkout();
  const info = new CheckoutInfoPage(page);
  await expect(page).toHaveURL(/checkout-step-one\.html/);
  await expect(info.title).toHaveText('Checkout: Your Information');
  await info.fillInfo('Nguyen', 'Tam', '700000');

  // Buoc 5: continue -> trang Overview
  await info.continue();
  await expect(page).toHaveURL(/checkout-step-two\.html/);
  await expect(page.locator('[data-test="title"]')).toHaveText('Checkout: Overview');
});
