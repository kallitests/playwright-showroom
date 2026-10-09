// =============================================================================
// pages/LoginPage.ts — Login screen
// =============================================================================

import { expect, type Locator, type Page } from '@playwright/test';
import type { Credentials } from '../utils/test-data';

export class LoginPage {
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;
  readonly errorCloseButton: Locator;

  constructor(readonly page: Page) {
    this.usernameInput = page.getByTestId('username');
    this.passwordInput = page.getByTestId('password');
    this.loginButton = page.getByTestId('login-button');
    this.errorMessage = page.getByTestId('error');
    this.errorCloseButton = page.getByTestId('error-button');
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
    await expect(this.loginButton).toBeVisible();
  }

  async login(username: string, password: string): Promise<void>;
  async login(user: Credentials): Promise<void>;
  async login(userOrName: Credentials | string, password?: string): Promise<void> {
    const creds = typeof userOrName === 'string' ? { username: userOrName, password: password ?? '' } : userOrName;
    await this.usernameInput.fill(creds.username);
    await this.passwordInput.fill(creds.password);
    await this.loginButton.click();
  }

  async expectError(message: string): Promise<void> {
    await expect(this.errorMessage).toHaveText(message);
  }

  async expectSuccessfulLogin(): Promise<void> {
    await expect(this.page).toHaveURL(/inventory\.html/);
  }

  async expectOnLoginPage(): Promise<void> {
    await expect(this.loginButton).toBeVisible();
    await expect(this.page).not.toHaveURL(/inventory|cart|checkout/);
  }
}
