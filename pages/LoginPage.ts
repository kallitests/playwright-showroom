// =============================================================================
// pages/LoginPage.ts — Page Object Model for the SauceDemo login page
// =============================================================================
// The Page Object Model (POM) pattern encapsulates all selectors and actions
// for a given page in one class. Benefits:
//   - Selectors are defined ONCE — change in one place, fixed everywhere
//   - Tests read like plain English: loginPage.login(user)
//   - Easier to maintain when the UI changes
// =============================================================================

import { Page, Locator, expect } from '@playwright/test';

export class LoginPage {
  // Store a reference to the Playwright Page object
  readonly page: Page;

  // ---------------------------------------------------------------------------
  // Locators
  // ---------------------------------------------------------------------------
  // Each locator targets a specific element using data-test attributes.
  // data-test attributes are preferred over CSS classes or text because:
  //   - They don't change when designers restyle the page
  //   - They clearly communicate "this element exists for testing"
  // ---------------------------------------------------------------------------

  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;

    // The username text field
    this.usernameInput = page.locator('[data-test="username"]');

    // The password text field
    this.passwordInput = page.locator('[data-test="password"]');

    // The "Login" submit button
    this.loginButton = page.locator('[data-test="login-button"]');

    // The red error container shown when login fails
    this.errorMessage = page.locator('[data-test="error"]');
  }

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  // Navigate to the login page
  async goto(): Promise<void> {
    await this.page.goto('/');
  }

  // Fill the form and click submit
  async login(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  // Assert that an error message is visible and contains the expected text
  async expectError(message: string): Promise<void> {
    await expect(this.errorMessage).toBeVisible();
    await expect(this.errorMessage).toContainText(message);
  }

  // Assert that the login was successful by checking the URL
  async expectSuccessfulLogin(): Promise<void> {
    await expect(this.page).toHaveURL(/inventory/);
  }
}
