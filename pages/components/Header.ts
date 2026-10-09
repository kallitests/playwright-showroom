// =============================================================================
// pages/components/Header.ts — Shared header: burger menu + cart badge
// =============================================================================
// Present on every authenticated page, so it is modelled once as a component
// and composed into the page objects (composition over inheritance).
// =============================================================================

import { expect, type Locator, type Page } from '@playwright/test';

export class Header {
  readonly cartLink: Locator;
  readonly cartBadge: Locator;
  readonly menuButton: Locator;
  readonly title: Locator;

  constructor(private readonly page: Page) {
    this.cartLink = page.getByTestId('shopping-cart-link');
    this.cartBadge = page.getByTestId('shopping-cart-badge');
    this.menuButton = page.getByRole('button', { name: 'Open Menu' });
    this.title = page.getByTestId('title');
  }

  /** Web-first assertion on the badge (0 => badge hidden). */
  async expectCartCount(count: number): Promise<void> {
    if (count === 0) {
      await expect(this.cartBadge).toBeHidden();
    } else {
      await expect(this.cartBadge).toHaveText(String(count));
    }
  }

  async openCart(): Promise<void> {
    await this.cartLink.click();
    await expect(this.page).toHaveURL(/cart\.html/);
  }

  private async openMenuAndClick(testId: string): Promise<void> {
    await this.menuButton.click();
    // The sidebar slides in: the click auto-waits for the link to be actionable.
    await this.page.getByTestId(testId).click();
  }

  async logout(): Promise<void> {
    await this.openMenuAndClick('logout-sidebar-link');
    await expect(this.page.getByTestId('login-button')).toBeVisible();
  }

  async resetAppState(): Promise<void> {
    await this.openMenuAndClick('reset-sidebar-link');
  }

  async goToAllItems(): Promise<void> {
    await this.openMenuAndClick('inventory-sidebar-link');
    await expect(this.page).toHaveURL(/inventory\.html/);
  }
}
