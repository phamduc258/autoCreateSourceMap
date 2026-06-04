import { type Page, type Locator } from '@playwright/test';

/** Trang danh sach san pham. Selector lay tu output/screens/inventory.md (da verify ✓). */
export class InventoryPage {
  readonly page: Page;
  readonly title: Locator;
  readonly cartLink: Locator;
  readonly cartBadge: Locator;

  constructor(page: Page) {
    this.page = page;
    this.title = page.locator('[data-test="title"]');
    this.cartLink = page.locator('[data-test="shopping-cart-link"]');
    this.cartBadge = page.locator('[data-test="shopping-cart-badge"]');
  }

  /** productSlug vi du: 'sauce-labs-backpack' */
  async addToCart(productSlug: string): Promise<void> {
    await this.page.locator(`[data-test="add-to-cart-${productSlug}"]`).click();
  }

  async openCart(): Promise<void> {
    await this.cartLink.click();
  }
}
