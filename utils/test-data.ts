// =============================================================================
// utils/test-data.ts — Centralized test data for all specs
// =============================================================================
// Keeping all usernames, passwords, and product data in one place means:
//   - If SauceDemo changes a credential, you fix it in ONE file
//   - Tests are easier to read (no magic strings scattered around)
//   - You can import exactly what you need in each spec
// =============================================================================

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------
// SauceDemo ships with 6 built-in test users, each with different behaviors.
// All share the same password.
// ---------------------------------------------------------------------------

export const USERS = {
  // Standard user — everything works as expected
  standard: {
    username: 'standard_user',
    password: 'secret_sauce',
  },

  // This user is blocked from logging in — useful to test error states
  lockedOut: {
    username: 'locked_out_user',
    password: 'secret_sauce',
  },

  // Problem user — product images are broken, some interactions misbehave
  problem: {
    username: 'problem_user',
    password: 'secret_sauce',
  },

  // Performance glitch user — login takes several seconds
  performanceGlitch: {
    username: 'performance_glitch_user',
    password: 'secret_sauce',
  },

  // Error user — some cart and checkout actions throw errors
  error: {
    username: 'error_user',
    password: 'secret_sauce',
  },

  // Visual user — subtle visual differences vs standard user
  visual: {
    username: 'visual_user',
    password: 'secret_sauce',
  },
} as const;

// ---------------------------------------------------------------------------
// Invalid credentials — used in negative test scenarios
// ---------------------------------------------------------------------------

export const INVALID_CREDENTIALS = {
  wrongPassword: {
    username: 'standard_user',
    password: 'wrong_password',
  },
  unknownUser: {
    username: 'ghost_user',
    password: 'secret_sauce',
  },
  empty: {
    username: '',
    password: '',
  },
  emptyPasswordOnly: {
    username: 'standard_user',
    password: '',
  },
} as const;

// ---------------------------------------------------------------------------
// Expected error messages — assert the exact copy shown in the UI
// ---------------------------------------------------------------------------

export const ERROR_MESSAGES = {
  // Shown when username or password is wrong
  invalidCredentials:
    'Epic sadface: Username and password do not match any user in this service',

  // Shown when username field is empty
  usernameRequired: 'Epic sadface: Username is required',

  // Shown when password field is empty
  passwordRequired: 'Epic sadface: Password is required',

  // Shown for the locked-out user
  lockedOut:
    'Epic sadface: Sorry, this user has been locked out.',
} as const;

// ---------------------------------------------------------------------------
// Checkout form data — used in e2e checkout flow tests
// ---------------------------------------------------------------------------

export const CHECKOUT_INFO = {
  valid: {
    firstName: 'Jane',
    lastName: 'Doe',
    postalCode: '75001',
  },
  missingFirstName: {
    firstName: '',
    lastName: 'Doe',
    postalCode: '75001',
  },
  missingLastName: {
    firstName: 'Jane',
    lastName: '',
    postalCode: '75001',
  },
  missingPostalCode: {
    firstName: 'Jane',
    lastName: 'Doe',
    postalCode: '',
  },
} as const;

// ---------------------------------------------------------------------------
// Expected checkout error messages
// ---------------------------------------------------------------------------

export const CHECKOUT_ERRORS = {
  firstNameRequired: 'Error: First Name is required',
  lastNameRequired: 'Error: Last Name is required',
  postalCodeRequired: 'Error: Postal Code is required',
} as const;

// ---------------------------------------------------------------------------
// URLs — relative paths (baseURL is set in playwright.config.ts)
// ---------------------------------------------------------------------------

export const ROUTES = {
  login: '/',
  inventory: '/inventory.html',
  cart: '/cart.html',
  checkoutStepOne: '/checkout-step-one.html',
  checkoutStepTwo: '/checkout-step-two.html',
  checkoutComplete: '/checkout-complete.html',
} as const;

// ---------------------------------------------------------------------------
// Product names available in the inventory
// ---------------------------------------------------------------------------

export const PRODUCTS = {
  backpack: 'Sauce Labs Backpack',
  bikeLight: 'Sauce Labs Bike Light',
  boltTshirt: 'Sauce Labs Bolt T-Shirt',
  fleeceJacket: 'Sauce Labs Fleece Jacket',
  onesie: 'Sauce Labs Onesie',
  tshirtRed: 'Test.allTheThings() T-Shirt (Red)',
} as const;

// Prices as displayed in the UI (string with $ sign)
export const PRODUCT_PRICES = {
  [PRODUCTS.backpack]: '$29.99',
  [PRODUCTS.bikeLight]: '$9.99',
  [PRODUCTS.boltTshirt]: '$15.99',
  [PRODUCTS.fleeceJacket]: '$49.99',
  [PRODUCTS.onesie]: '$7.99',
  [PRODUCTS.tshirtRed]: '$15.99',
} as const;
