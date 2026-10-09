// =============================================================================
// toolshop/config.ts — Target environments & public demo data for Toolshop
// =============================================================================
// Application: "Practice Software Testing — Toolshop" by Testsmith
// (https://practicesoftwaretesting.com, sources: github.com/testsmith-io/practice-software-testing)
// Unlike SauceDemo, Toolshop has a REAL REST API (Laravel) behind an Angular UI.
//
// TOOLSHOP_ENV selects the deployment:
//   prod       (default) https://practicesoftwaretesting.com  — sprint 5, v5.0
//   with-bugs            https://with-bugs.practicesoftwaretesting.com — same app
//                        with deliberately injected defects: run the suite there
//                        to demonstrate that it catches regressions.
// TOOLSHOP_UI_URL / TOOLSHOP_API_URL override both (e.g. a local docker setup).
//
// The accounts below are the PUBLIC demo accounts documented in the Toolshop
// README — test data, not secrets.
// =============================================================================

import 'dotenv/config';

const ENVIRONMENTS = {
  prod: { ui: 'https://practicesoftwaretesting.com', api: 'https://api.practicesoftwaretesting.com' },
  'with-bugs': { ui: 'https://with-bugs.practicesoftwaretesting.com', api: 'https://api-with-bugs.practicesoftwaretesting.com' },
} as const;

export type ToolshopEnv = keyof typeof ENVIRONMENTS;

export const TOOLSHOP_ENV = (process.env.TOOLSHOP_ENV ?? 'prod') as ToolshopEnv;
if (!(TOOLSHOP_ENV in ENVIRONMENTS)) {
  throw new Error(`TOOLSHOP_ENV must be one of ${Object.keys(ENVIRONMENTS).join(', ')}`);
}

export const UI_URL = (process.env.TOOLSHOP_UI_URL ?? ENVIRONMENTS[TOOLSHOP_ENV].ui).replace(/\/$/, '');
export const API_URL = (process.env.TOOLSHOP_API_URL ?? ENVIRONMENTS[TOOLSHOP_ENV].api).replace(/\/$/, '');

/** Public demo accounts (Toolshop README). Never use them for negative-password tests: 3 failures lock the account. */
export const ACCOUNTS = {
  customer: { email: 'customer@practicesoftwaretesting.com', password: 'welcome01', firstName: 'Jane', lastName: 'Doe' },
  customer2: { email: 'customer2@practicesoftwaretesting.com', password: 'welcome01', firstName: 'Jack', lastName: 'Howe' },
} as const;

export type Account = { email: string; password: string; firstName?: string; lastName?: string };

/** Browser storage keys used by the Angular front-end (verified in sources). */
export const STORAGE = {
  authToken: 'auth-token', // localStorage — JWT
  cartId: 'cart_id', // sessionStorage
  cartQuantity: 'cart_quantity', // sessionStorage — badge counter
  language: 'language', // localStorage
} as const;

/** Business rules verified in the API sources (InvoiceService / CartService). */
export const RULES = {
  maxQuantityPerLine: 99,
  productsPerPage: 9,
  rentalBundleDiscountPct: 15, // cart contains at least one rental AND one regular product
  ecoDiscountPct: 5, // > 50 % of items with CO2 rating A or B
  maxLoginAttempts: 3, // non-admin accounts lock after 3 failed logins (HTTP 423)
  paymentMethods: ['bank-transfer', 'cash-on-delivery', 'credit-card', 'buy-now-pay-later', 'gift-card'] as const,
} as const;

/** Reserved domain (RFC 2606) — order confirmation e-mails never reach a real inbox. */
export const TEST_EMAIL_DOMAIN = 'example.com';
