# 🎭 Playwright Showroom

> A showcase repository demonstrating real-world Playwright CLI and MCP usage
> against [SauceDemo](https://www.saucedemo.com) — a free e-commerce demo site
> built for automation practice.

[![CI](https://github.com/your-username/playwright-showroom/actions/workflows/ci.yml/badge.svg)](https://github.com/your-username/playwright-showroom/actions)

---

## What's inside

| Category | What it demonstrates |
|---|---|
| **Smoke tests** | Fast critical-path verification (auth, inventory) |
| **E2E tests** | Full user journeys (checkout, sorting, product detail) |
| **Non-regression tests** | Performance baselines, known bug assertions, cart persistence |
| **API / Network tests** | Request interception, mocking, console error monitoring |
| **Page Object Model** | Reusable page classes for clean, maintainable tests |
| **Custom fixtures** | Pre-authenticated browser context to skip login in tests |
| **Playwright MCP** | AI-assisted browser automation with Claude |
| **GitHub Actions CI** | Automated pipeline running tests on push and PR |

---

## Prerequisites

- **Node.js** v18 or higher — [download](https://nodejs.org)
- A terminal (bash, zsh, PowerShell)

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/your-username/playwright-showroom.git
cd playwright-showroom
```

### 2. Install Node dependencies

```bash
npm install
```

This installs `@playwright/test` and TypeScript.

### 3. Install Playwright browsers

```bash
npx playwright install
```

This downloads Chromium, Firefox, and WebKit browser binaries (~300MB total).
These are isolated from your system browsers — they don't affect anything else.

To install only Chromium (faster, good for local dev):

```bash
npx playwright install chromium
```

### 4. Verify the setup

```bash
npx playwright test tests/smoke/ --project=chromium
```

You should see green output with passing smoke tests.

---

## Running tests

### Run everything

```bash
npm test
# or
npx playwright test
```

### Run by category

```bash
# Only smoke tests (fast, ~30s)
npm run test:smoke

# Only end-to-end tests
npm run test:e2e

# Only non-regression tests
npm run test:regression

# Only API/network tests
npm run test:api
```

### Run with a visible browser (headed mode)

```bash
npm run test:headed
# or
npx playwright test --headed
```

This opens an actual Chrome/Firefox window so you can watch tests run.
Useful for debugging what's happening on screen.

### Run with the interactive UI

```bash
npm run test:ui
# or
npx playwright test --ui
```

Opens Playwright's built-in GUI — you can run, filter, and watch tests
with time-travel debugging. The best way to explore the test suite.

### Run a specific test file

```bash
npx playwright test tests/smoke/auth.spec.ts
```

### Run tests matching a keyword

```bash
npx playwright test --grep "checkout"
npx playwright test --grep "login"
```

### Run in a specific browser

```bash
npx playwright test --project=firefox
npx playwright test --project=webkit
npx playwright test --project=chromium
```

### Debug a specific test interactively

```bash
npx playwright test tests/smoke/auth.spec.ts --debug
```

Opens the Playwright Inspector — step through the test line by line.

---

## View the HTML report

After running tests, open the HTML report:

```bash
npm run test:report
# or
npx playwright show-report
```

This opens an interactive report in your browser showing screenshots,
videos, and traces for every test — especially useful when something fails.

---

## Generate test code from browser actions (Codegen)

Playwright can watch what you do in a browser and write the test code for you:

```bash
npm run codegen
# or
npx playwright codegen https://www.saucedemo.com
```

A browser window opens — everything you click, type, or navigate gets
recorded as Playwright code in the panel next to it. Great for bootstrapping
new tests quickly.

---

## Installing Playwright MCP

Playwright MCP is a Model Context Protocol server that lets AI assistants
(like Claude) control a browser using natural language.

### 1. Install the MCP server

```bash
npm install -g @playwright/mcp
```

### 2. Configure Claude Desktop

Open the Claude Desktop configuration file:

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

Add this configuration:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

### 3. Restart Claude Desktop

After saving the file, fully quit and reopen Claude Desktop.

### 4. Use it

In Claude, you can now say things like:

> "Go to https://www.saucedemo.com, log in as standard_user / secret_sauce,
> and extract all product names and prices as a JSON list."

Claude will open a browser, perform the actions, and return the results.

See [`docs/mcp-examples.md`](docs/mcp-examples.md) for a full list of examples.

---

## Project structure

```
playwright-showroom/
├── .github/
│   └── workflows/
│       └── ci.yml                  # GitHub Actions: smoke on push, full on PR
│
├── docs/
│   └── mcp-examples.md             # Playwright MCP usage guide and examples
│
├── fixtures/
│   └── auth.fixture.ts             # Pre-authenticated page fixture
│                                   # Tests using this start already logged in
│
├── pages/                          # Page Object Model classes
│   ├── LoginPage.ts                # Selectors + actions for /login
│   ├── InventoryPage.ts            # Selectors + actions for /inventory.html
│   ├── CartPage.ts                 # Selectors + actions for /cart.html
│   └── CheckoutPage.ts             # Selectors + actions for all 3 checkout steps
│
├── tests/
│   ├── smoke/                      # Fast, critical-path tests (run on every commit)
│   │   ├── auth.spec.ts            # Login success, failures, logout
│   │   └── inventory.spec.ts       # Product list, cart badge
│   │
│   ├── e2e/                        # Full user journey tests (run on PRs)
│   │   ├── checkout-flow.spec.ts   # Login → Add → Cart → Checkout → Confirm
│   │   ├── sorting.spec.ts         # A→Z, Z→A, price asc/desc
│   │   └── product-detail.spec.ts  # Product page navigation and interactions (in sorting.spec.ts)
│   │
│   ├── regression/                 # Non-regression tests (run nightly)
│   │   ├── user-behaviors.spec.ts  # Performance timing, problem_user bugs
│   │   └── cart-persistence.spec.ts # Cart after reload, after logout (in user-behaviors.spec.ts)
│   │
│   └── api/
│       └── intercept.spec.ts       # Console monitoring, request mocking, abort
│
├── utils/
│   ├── helpers.ts                  # login(), addToCart(), getCartCount(), etc.
│   └── test-data.ts                # All users, passwords, product names, error messages
│
├── playwright.config.ts            # Playwright configuration (browsers, timeouts, reporter)
├── tsconfig.json                   # TypeScript configuration
├── package.json                    # Scripts and dependencies
├── SPEC.txt                        # Full project specification
└── README.md                       # This file
```

---

## Test users

SauceDemo ships with 6 built-in test users. All share the same password.

| Username | Password | Behavior |
|---|---|---|
| `standard_user` | `secret_sauce` | Normal — everything works |
| `locked_out_user` | `secret_sauce` | Cannot log in (error shown) |
| `problem_user` | `secret_sauce` | Images are broken, some interactions misbehave |
| `performance_glitch_user` | `secret_sauce` | Login takes several seconds |
| `error_user` | `secret_sauce` | Some cart/checkout actions throw errors |
| `visual_user` | `secret_sauce` | Subtle visual differences vs standard |

---

## Key concepts

### Page Object Model (POM)

Instead of writing `page.locator('[data-test="login-button"]').click()` in
every test, we encapsulate page interactions in a class:

```typescript
// Without POM — selector repeated in every test
await page.locator('[data-test="login-button"]').click();

// With POM — clean, readable, single source of truth
const loginPage = new LoginPage(page);
await loginPage.login(username, password);
```

If the login button's selector ever changes, you update `LoginPage.ts` once
and all tests are fixed automatically.

### Custom Fixtures

The `auth.fixture.ts` extends Playwright's `test` with an `authenticatedPage`
that starts already logged in:

```typescript
// Without fixture — every test repeats login logic
test('can see inventory', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-test="username"]').fill('standard_user');
  await page.locator('[data-test="password"]').fill('secret_sauce');
  await page.locator('[data-test="login-button"]').click();
  // ... now write the actual test
});

// With fixture — clean, fast, DRY
test('can see inventory', async ({ authenticatedPage }) => {
  await authenticatedPage.goto('/inventory.html');
  // Already logged in — start testing immediately
});
```

### Network Interception

```typescript
// Mock an API response
await page.route('**/api/products', route => route.fulfill({
  status: 200,
  json: [{ name: 'Fake Product', price: '$0.01' }]
}));

// Abort all image requests
await page.route('**/*.{png,jpg}', route => route.abort());

// Monitor for errors
page.on('response', response => {
  if (response.status() >= 400) console.error('HTTP error:', response.url());
});
```

---

## Running with Docker

No need to install Node.js or browsers locally — Docker handles everything.

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running

### Build the image

```bash
docker compose build
```

This builds the image using the official Playwright Docker image which includes
Node.js and all browser binaries pre-installed.

### Run tests

```bash
# Smoke tests only (~30s)
docker compose up smoke

# End-to-end tests
docker compose up e2e

# Non-regression tests
docker compose up regression

# API / network tests
docker compose up api

# Full suite across all browsers
docker compose up full
```

### View the HTML report

After any test run, serve the report on `http://localhost:9323`:

```bash
docker compose up report
```

Then open your browser at **http://localhost:9323**.

The `playwright-report/` folder is mounted as a volume so reports are
available on your host machine after the container exits.

### One-liner: run smoke and open report

```bash
docker compose up smoke && docker compose up report
```

---

## CI/CD

The GitHub Actions workflow in `.github/workflows/ci.yml` runs:

| Trigger | Tests run | Browsers |
|---|---|---|
| Every push to `main` / `develop` | Smoke + API tests | Chromium only |
| Every pull request to `main` | Full suite (smoke + e2e + regression + api) | Chromium + Firefox + WebKit |

HTML reports are uploaded as artifacts and retained for 7–14 days.

---

## Suggestions for extending this showroom

Here are ideas to take this further:

- **Accessibility tests** — add `@axe-core/playwright` to catch a11y violations
- **Visual regression** — use `expect(page).toHaveScreenshot()` to catch UI changes
- **Allure reporter** — richer test reports with history and trends
- **Slack notifications** — send a message on failure via webhook in CI
- **Parallelism tuning** — benchmark `workers` settings for your CI runner
- **i18n testing** — test the app in different locales using `page.context()`
- **Auth state storage** — save login state to a file and reuse across workers
  for faster parallel test runs

---

## Resources

- [Playwright documentation](https://playwright.dev)
- [Playwright MCP GitHub](https://github.com/microsoft/playwright-mcp)
- [SauceDemo](https://www.saucedemo.com)
- [Playwright Discord](https://aka.ms/playwright/discord)

---

## License

MIT
