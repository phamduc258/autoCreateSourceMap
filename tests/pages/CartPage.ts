import { type Page, type Locator } from '@playwright/test';

/** Trang gio hang. Selector lay tu output/screens/cart.md (da verify ✓). */
export class CartPage {
  readonly page: Page;
  readonly title: Locator;
  readonly checkoutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.title = page.locator('[data-test="title"]');
    this.checkoutButton = page.locator('[data-test="checkout"]');
  }

  item(name: string): Locator {
    return this.page.getByText(name, { exact: true });
  }

  async checkout(): Promise<void> {
    await this.checkoutButton.click();
  }
}
