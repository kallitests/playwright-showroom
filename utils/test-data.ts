// =============================================================================
// utils/test-data.ts — Centralized, typed test data
// =============================================================================
// Source of truth for users, catalog, messages and business rules.
// Values were verified on www.saucedemo.com (live, 2026-10-09) and against the
// official source code (github.com/saucelabs/sample-app-web).
// =============================================================================

import { DEMO_PASSWORD } from './env';

// ---------------------------------------------------------------------------
// Users — public demo accounts listed on the SauceDemo login page
// ---------------------------------------------------------------------------

export type UserKey = keyof typeof USERS;
export type Credentials = { username: string; password: string };

export const USERS = {
  standard: { username: 'standard_user', password: DEMO_PASSWORD },
  lockedOut: { username: 'locked_out_user', password: DEMO_PASSWORD },
  problem: { username: 'problem_user', password: DEMO_PASSWORD },
  performanceGlitch: { username: 'performance_glitch_user', password: DEMO_PASSWORD },
  error: { username: 'error_user', password: DEMO_PASSWORD },
  visual: { username: 'visual_user', password: DEMO_PASSWORD },
} as const satisfies Record<string, Credentials>;

export const INVALID_CREDENTIALS = {
  wrongPassword: { username: 'standard_user', password: 'wrong_password' },
  unknownUser: { username: 'ghost_user', password: DEMO_PASSWORD },
  empty: { username: '', password: '' },
  emptyPasswordOnly: { username: 'standard_user', password: '' },
  emptyUsernameOnly: { username: '', password: DEMO_PASSWORD },
  caseSensitiveUsername: { username: 'Standard_User', password: DEMO_PASSWORD },
  trailingSpaceUsername: { username: 'standard_user ', password: DEMO_PASSWORD },
  sqlInjectionLike: { username: "' OR '1'='1", password: "' OR '1'='1" },
} as const satisfies Record<string, Credentials>;

// ---------------------------------------------------------------------------
// UI messages (exact copy)
// ---------------------------------------------------------------------------

export const ERROR_MESSAGES = {
  invalidCredentials: 'Epic sadface: Username and password do not match any user in this service',
  usernameRequired: 'Epic sadface: Username is required',
  passwordRequired: 'Epic sadface: Password is required',
  lockedOut: 'Epic sadface: Sorry, this user has been locked out.',
  protectedRoute: (path: string) => `Epic sadface: You can only access '${path}' when you are logged in.`,
} as const;

export const CHECKOUT_ERRORS = {
  firstNameRequired: 'Error: First Name is required',
  lastNameRequired: 'Error: Last Name is required',
  postalCodeRequired: 'Error: Postal Code is required',
} as const;

export const CONFIRMATION = {
  header: 'Thank you for your order!',
  text: 'Your order has been dispatched, and will arrive just as fast as the pony can get there!',
} as const;

// ---------------------------------------------------------------------------
// Checkout form data
// ---------------------------------------------------------------------------

export type CheckoutInfo = { firstName: string; lastName: string; postalCode: string };

export const CHECKOUT_INFO = {
  valid: { firstName: 'Jane', lastName: 'Doe', postalCode: '75001' },
  missingFirstName: { firstName: '', lastName: 'Doe', postalCode: '75001' },
  missingLastName: { firstName: 'Jane', lastName: '', postalCode: '75001' },
  missingPostalCode: { firstName: 'Jane', lastName: 'Doe', postalCode: '' },
  // Edge data: accepted by the app (no format validation) — documented risk
  unicode: { firstName: 'Zoë', lastName: 'Ñúñez-O’Brien', postalCode: 'SW1A 1AA' },
  whitespaceOnly: { firstName: ' ', lastName: ' ', postalCode: ' ' },
} as const satisfies Record<string, CheckoutInfo>;

// ---------------------------------------------------------------------------
// Routes (relative to baseURL)
// ---------------------------------------------------------------------------

export const ROUTES = {
  login: '/',
  inventory: '/inventory.html',
  productDetail: (id: number) => `/inventory-item.html?id=${id}`,
  cart: '/cart.html',
  checkoutStepOne: '/checkout-step-one.html',
  checkoutStepTwo: '/checkout-step-two.html',
  checkoutComplete: '/checkout-complete.html',
} as const;

// ---------------------------------------------------------------------------
// Catalog — reference data (id = SauceDemo internal item id)
// ---------------------------------------------------------------------------

export type Product = { id: number; name: ProductName; price: number };

export const PRODUCTS = {
  backpack: 'Sauce Labs Backpack',
  bikeLight: 'Sauce Labs Bike Light',
  boltTshirt: 'Sauce Labs Bolt T-Shirt',
  fleeceJacket: 'Sauce Labs Fleece Jacket',
  onesie: 'Sauce Labs Onesie',
  tshirtRed: 'Test.allTheThings() T-Shirt (Red)',
} as const;

export type ProductName = (typeof PRODUCTS)[keyof typeof PRODUCTS];

export const CATALOG: readonly Product[] = [
  { id: 4, name: PRODUCTS.backpack, price: 29.99 },
  { id: 0, name: PRODUCTS.bikeLight, price: 9.99 },
  { id: 1, name: PRODUCTS.boltTshirt, price: 15.99 },
  { id: 5, name: PRODUCTS.fleeceJacket, price: 49.99 },
  { id: 2, name: PRODUCTS.onesie, price: 7.99 },
  { id: 3, name: PRODUCTS.tshirtRed, price: 15.99 },
];

/** Kept for backward compatibility with v1 specs. */
export const PRODUCT_PRICES: Record<ProductName, string> = Object.fromEntries(
  CATALOG.map((p) => [p.name, `$${p.price.toFixed(2)}`]),
) as Record<ProductName, string>;

export function productByName(name: ProductName): Product {
  const product = CATALOG.find((p) => p.name === name);
  if (!product) throw new Error(`Unknown product: ${name}`);
  return product;
}

// ---------------------------------------------------------------------------
// Business rules
// ---------------------------------------------------------------------------

/** Tax applied at checkout step two (8 %, rounded to cents). */
export const TAX_RATE = 0.08;

/** Session cookie written by SauceDemo on login (expires after 10 minutes). */
export const SESSION_COOKIE = 'session-username';

/** localStorage key holding the cart (array of item ids). */
export const CART_STORAGE_KEY = 'cart-contents';
