// =============================================================================
// utils/helpers.ts — Reusable utilities shared across all test files
// =============================================================================
// These helpers wrap common Playwright patterns so test specs stay readable.
// Each function is focused on ONE thing and has a clear, typed signature.
// =============================================================================

import { Page, expect } from '@playwright/test';
import { USERS } from './test-data';

// ---------------------------------------------------------------------------
// Type definitions
// ---------------------------------------------------------------------------

type UserCredentials = {
  username: string;
  password: string;
};

// ---------------------------------------------------------------------------
// login()
// ---------------------------------------------------------------------------
// Navigates to the login page and fills + submits the login form.
// Does NOT assert the result — the caller decides what to assert next.
//
// Usage:
//   await login(page, USERS.standard);
//   await expect(page).toHaveURL(/inventory/);
// ---------------------------------------------------------------------------

export async function login(page: Page, user: UserCredentials): Promise<void> {
  // Go to the root URL (maps to baseURL in playwright.config.ts)
  await page.goto('/');

  // Fill the username input — located by its data-test attribute
  // Using data-test selectors is best practice: they survive CSS refactoring
  await page.locator('[data-test="username"]').fill(user.username);

  // Fill the password input
  await page.locator('[data-test="password"]').fill(user.password);

  // Click the login button
  await page.locator('[data-test="login-button"]').click();
}

// ---------------------------------------------------------------------------
// loginAsStandardUser()
// ---------------------------------------------------------------------------
// Convenience wrapper — logs in as the standard user with a single call.
// Used in most tests that need an authenticated state.
// ---------------------------------------------------------------------------

export async function loginAsStandardUser(page: Page): Promise<void> {
  await login(page, USERS.standard);
  // Wait for the inventory page to confirm login was successful
  await expect(page).toHaveURL(/inventory/);
}

// ---------------------------------------------------------------------------
// addProductToCart()
// ---------------------------------------------------------------------------
// Adds a product to the cart by its display name.
// Finds the product card, then clicks its "Add to cart" button.
//
// Usage:
//   await addProductToCart(page, 'Sauce Labs Backpack');
// ---------------------------------------------------------------------------

export async function addProductToCart(
  page: Page,
  productName: string
): Promise<void> {
  // Find the inventory item that contains the product name
  const item = page
    .locator('.inventory_item')
    .filter({ hasText: productName });

  // Click the Add to cart button inside that item
  await item.locator('button').click();
}

// ---------------------------------------------------------------------------
// getCartCount()
// ---------------------------------------------------------------------------
// Returns the current number shown on the cart badge.
// Returns 0 if the badge is not visible (empty cart).
// ---------------------------------------------------------------------------

export async function getCartCount(page: Page): Promise<number> {
  const badge = page.locator('.shopping_cart_badge');

  // If the badge is not visible, the cart is empty
  const isVisible = await badge.isVisible();
  if (!isVisible) return 0;

  const text = await badge.textContent();
  return parseInt(text ?? '0', 10);
}

// ---------------------------------------------------------------------------
// goToCart()
// ---------------------------------------------------------------------------
// Clicks the cart icon to navigate to the cart page.
// ---------------------------------------------------------------------------

export async function goToCart(page: Page): Promise<void> {
  await page.locator('.shopping_cart_link').click();
  await expect(page).toHaveURL(/cart/);
}

// ---------------------------------------------------------------------------
// getErrorMessage()
// ---------------------------------------------------------------------------
// Returns the text of the error container shown after a failed login.
// Returns null if no error is displayed.
// ---------------------------------------------------------------------------

export async function getErrorMessage(page: Page): Promise<string | null> {
  const errorContainer = page.locator('[data-test="error"]');
  const isVisible = await errorContainer.isVisible();
  if (!isVisible) return null;
  return errorContainer.textContent();
}

// ---------------------------------------------------------------------------
// measureLoginDuration()
// ---------------------------------------------------------------------------
// Measures how long a login attempt takes in milliseconds.
// Used in regression tests to detect performance regressions.
// ---------------------------------------------------------------------------

export async function measureLoginDuration(
  page: Page,
  user: UserCredentials
): Promise<number> {
  await page.goto('/');

  const start = Date.now();

  await page.locator('[data-test="username"]').fill(user.username);
  await page.locator('[data-test="password"]').fill(user.password);
  await page.locator('[data-test="login-button"]').click();

  // Wait for navigation to complete before stopping the clock
  await page.waitForURL(/inventory/);

  return Date.now() - start;
}

// ---------------------------------------------------------------------------
// fillCheckoutForm()
// ---------------------------------------------------------------------------
// Fills the checkout step-one form with the provided data.
// Does NOT click Continue — the caller handles that.
// ---------------------------------------------------------------------------

export async function fillCheckoutForm(
  page: Page,
  data: { firstName: string; lastName: string; postalCode: string }
): Promise<void> {
  await page.locator('[data-test="firstName"]').fill(data.firstName);
  await page.locator('[data-test="lastName"]').fill(data.lastName);
  await page.locator('[data-test="postalCode"]').fill(data.postalCode);
}
