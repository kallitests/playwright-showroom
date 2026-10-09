// =============================================================================
// utils/helpers.ts — Pure helpers + a few low-level browser helpers
// =============================================================================
// Business-flow actions live in the Page Objects (pages/). This file keeps only:
//   - pure functions (price parsing, order totals) — unit-testable, no browser
//   - session helpers (UI login, cookie login) reused by fixtures and specs
// =============================================================================

import { expect, type BrowserContext, type Page } from '@playwright/test';
import { BASE_HOST } from './env';
import { SESSION_COOKIE, TAX_RATE, type Credentials, type CheckoutInfo } from './test-data';

// ---------------------------------------------------------------------------
// Pure functions
// ---------------------------------------------------------------------------

/** "$29.99" | "Item total: $29.99" | "Tax: $2.40" -> 29.99 */
export function parsePrice(text: string | null | undefined): number {
  const match = (text ?? '').match(/\$\s*(\d+(?:\.\d{1,2})?)/);
  if (!match) throw new Error(`No price found in "${text}"`);
  return Number(match[1]);
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Mirrors the SauceDemo order computation: subtotal, 8 % tax, total. */
export function expectedTotals(prices: number[]): { subtotal: number; tax: number; total: number } {
  const subtotal = round2(prices.reduce((sum, p) => sum + p, 0));
  const tax = round2(subtotal * TAX_RATE);
  return { subtotal, tax, total: round2(subtotal + tax) };
}

export function isSortedAsc<T>(values: T[], compare: (a: T, b: T) => number): boolean {
  return values.every((v, i) => i === 0 || compare(values[i - 1], v) <= 0);
}

// ---------------------------------------------------------------------------
// Session helpers
// ---------------------------------------------------------------------------

/** Logs in through the UI. Does not assert the outcome — the caller decides. */
export async function login(page: Page, user: Credentials): Promise<void> {
  await page.goto('/');
  await page.getByTestId('username').fill(user.username);
  await page.getByTestId('password').fill(user.password);
  await page.getByTestId('login-button').click();
}

export async function loginAsStandardUser(page: Page): Promise<void> {
  await login(page, { username: 'standard_user', password: 'secret_sauce' });
  await expect(page).toHaveURL(/inventory\.html/);
}

/**
 * Fast authentication: SauceDemo keeps the session in a client-side cookie
 * ("session-username"). Injecting it skips the login UI entirely, which keeps
 * non-auth tests fast and independent from the login screen.
 * Login itself is covered by dedicated UI tests.
 */
export async function loginViaCookie(context: BrowserContext, username: string): Promise<void> {
  await context.addCookies([
    {
      name: SESSION_COOKIE,
      value: username,
      domain: BASE_HOST,
      path: '/',
      expires: Math.floor(Date.now() / 1000) + 10 * 60,
    },
  ]);
}

/** Fills the checkout step-one form (does not submit). */
export async function fillCheckoutForm(page: Page, data: CheckoutInfo): Promise<void> {
  await page.getByTestId('firstName').fill(data.firstName);
  await page.getByTestId('lastName').fill(data.lastName);
  await page.getByTestId('postalCode').fill(data.postalCode);
}
