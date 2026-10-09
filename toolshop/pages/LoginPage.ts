// toolshop/pages/LoginPage.ts — /auth/login
import { expect, type Locator, type Page } from '@playwright/test';
import type { Account } from '../config';

export class LoginPage {
  readonly email: Locator;
  readonly password: Locator;
  readonly submit: Locator;
  readonly emailError: Locator;
  readonly passwordError: Locator;
  readonly loginError: Locator;

  constructor(readonly page: Page) {
    this.email = page.getByTestId('email');
    this.password = page.getByTestId('password');
    this.submit = page.getByTestId('login-submit');
    this.emailError = page.getByTestId('email-error');
    this.passwordError = page.getByTestId('password-error');
    this.loginError = page.getByTestId('login-error');
  }

  async goto(): Promise<void> {
    await this.page.goto('/auth/login');
    await expect(this.submit).toBeVisible();
  }

  async login(account: Pick<Account, 'email' | 'password'>): Promise<void> {
    await this.email.fill(account.email);
    await this.password.fill(account.password);
    await this.submit.click();
  }

  async expectOnAccountPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/account$/);
    await expect(this.page.getByTestId('page-title')).toHaveText('My account');
  }
}
