// toolshop/pages/components/Header.ts — navigation bar shared by every page
import { expect, type Locator, type Page } from '@playwright/test';

export class Header {
  readonly signIn: Locator;
  readonly userMenu: Locator;
  readonly signOut: Locator;
  readonly cartLink: Locator;
  readonly cartQuantity: Locator;
  readonly languageSelect: Locator;

  constructor(private readonly page: Page) {
    this.signIn = page.getByTestId('nav-sign-in');
    this.userMenu = page.getByTestId('nav-menu');
    this.signOut = page.getByTestId('nav-sign-out');
    this.cartLink = page.getByTestId('nav-cart');
    this.cartQuantity = page.getByTestId('cart-quantity');
    this.languageSelect = page.getByTestId('language-select');
  }

  async expectCartQuantity(n: number): Promise<void> {
    if (n === 0) await expect(this.cartQuantity).toBeHidden();
    else await expect(this.cartQuantity).toHaveText(String(n));
  }

  async expectSignedInAs(fullName: string): Promise<void> {
    await expect(this.userMenu).toContainText(fullName);
  }

  async logout(): Promise<void> {
    await this.userMenu.click();
    await this.signOut.click();
    await expect(this.signIn).toBeVisible();
  }

  async switchLanguage(code: 'de' | 'el' | 'en' | 'es' | 'fr' | 'nl' | 'tr'): Promise<void> {
    await this.languageSelect.click();
    await this.page.getByTestId(`lang-${code}`).click();
  }

  async openCart(): Promise<void> {
    await this.cartLink.click();
    await expect(this.page).toHaveURL(/\/checkout$/);
  }
}
