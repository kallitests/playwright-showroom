# 🎭 Playwright Showroom

> **Real-world Playwright CLI + MCP showcase — from smoke tests to AI-assisted browser automation.**
> Authentication flows, full E2E checkout journeys, network interception, non-regression baselines, Page Object Model, custom fixtures, Docker, and CI/CD — all demonstrated against [SauceDemo](https://www.saucedemo.com).

[![CI](https://img.shields.io/badge/CI-GitHub%20Actions-2088FF?style=flat-square&logo=githubactions)](https://github.com/your-username/playwright-showroom/actions)
[![Playwright](https://img.shields.io/badge/Playwright-1.44+-green?style=flat-square&logo=playwright)](https://playwright.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4+-blue?style=flat-square&logo=typescript)](https://typescriptlang.org)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?style=flat-square&logo=docker)](https://docker.com)
[![MCP](https://img.shields.io/badge/Playwright-MCP-blueviolet?style=flat-square)](https://github.com/microsoft/playwright-mcp)
[![License](https://img.shields.io/badge/license-MIT-lightgrey?style=flat-square)](LICENSE)

---

## 🗺️ Table of Contents

- [Why this showroom?](#-why-this-showroom)
- [What's inside](#️-whats-inside)
- [Architecture](#️-architecture)
- [Stack](#-stack)
- [Project Structure](#-project-structure)
- [Test Users](#-test-users)
- [Installation](#-installation)
- [Running Tests](#-running-tests)
- [Running with Docker](#-running-with-docker)
- [Installing Playwright MCP](#-installing-playwright-mcp)
- [Key Concepts](#-key-concepts)
- [CI/CD](#️-cicd)
- [Roadmap](#-roadmap)
- [Author](#-author)

---

## 💡 Why this showroom?

Most Playwright repos demonstrate one thing. This one demonstrates **everything** a senior SDET would set up on a real project:

> *Smoke tests that catch regressions in 30 seconds. E2E journeys that cover real user paths. Network interception that validates what the browser actually sends. A CI pipeline that runs all of it automatically.*

Built on [SauceDemo](https://www.saucedemo.com) — a free, stable, purposely-buggy e-commerce demo site — so every test is reproducible with zero setup cost.

```
Smoke Tests ──▶ E2E Journeys ──▶ Network Interception ──▶ Non-regression ──▶ CI/CD + Docker
```

---

## ⚙️ What's Inside

| Category | What it demonstrates |
|---|---|
| 🔥 **Smoke tests** | Fast critical-path verification — auth, inventory, cart badge |
| 🛒 **E2E tests** | Full user journeys — checkout, sorting, product detail |
| 🔁 **Non-regression tests** | Performance baselines, known bug assertions, cart persistence |
| 🌐 **API / Network tests** | Request interception, response mocking, console error monitoring |
| 📐 **Page Object Model** | Reusable page classes — LoginPage, InventoryPage, CartPage, CheckoutPage |
| 🔑 **Custom fixtures** | Pre-authenticated browser context — skip login in every test |
| 🤖 **Playwright MCP** | AI-assisted browser automation via Claude (natural language) |
| 🐳 **Docker** | Dockerfile + Compose with one service per test category |
| ⚡ **GitHub Actions CI** | Smoke on push · full suite on PR · multi-browser matrix |

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                        Playwright Showroom                           │
│                                                                      │
│  ┌─────────────────┐   ┌──────────────────┐   ┌──────────────────┐  │
│  │   Smoke Tests   │   │    E2E Tests      │   │ Regression Tests │  │
│  │  auth + inventory│   │ checkout · sort  │   │ perf · bugs · cart│  │
│  └────────┬────────┘   └────────┬─────────┘   └────────┬─────────┘  │
│           │                     │                       │            │
│  ┌────────▼─────────────────────▼───────────────────────▼─────────┐  │
│  │              Page Object Model  +  Custom Fixtures              │  │
│  │         LoginPage · InventoryPage · CartPage · Checkout         │  │
│  └────────────────────────────┬────────────────────────────────────┘  │
│                               │                                      │
│  ┌───────────────────┐  ┌─────▼──────────┐  ┌─────────────────────┐ │
│  │  API / Network    │  │   Playwright   │  │   Playwright MCP    │ │
│  │  Interception     │  │   CLI Runner   │  │  (Claude · natural  │ │
│  │  mock · abort     │  │  (TypeScript)  │  │   language control) │ │
│  └───────────────────┘  └───────┬────────┘  └─────────────────────┘ │
│                                 │                                    │
│  ┌──────────────────┐  ┌────────▼────────┐  ┌─────────────────────┐ │
│  │  GitHub Actions  │  │  HTML Report    │  │  Docker Compose     │ │
│  │  CI/CD Pipeline  │  │  + Trace Viewer │  │  smoke · e2e · full │ │
│  └──────────────────┘  └─────────────────┘  └─────────────────────┘ │
│                                                                      │
│  🐳 Dockerized — runs locally and in any CI pipeline                │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 🧰 Stack

| Layer | Technology |
|---|---|
| **Test framework** | [Playwright](https://playwright.dev) v1.44+ |
| **Language** | TypeScript 5.4+ |
| **AI automation** | [Playwright MCP](https://github.com/microsoft/playwright-mcp) + Claude (Anthropic) |
| **Target app** | [SauceDemo](https://www.saucedemo.com) |
| **Infra** | Docker · Docker Compose |
| **CI/CD** | GitHub Actions |
| **Reporting** | Playwright HTML reporter + Trace Viewer |

---

## 📁 Project Structure

```
playwright-showroom/
├── .github/
│   └── workflows/
│       └── ci.yml                  # Smoke on push · full suite on PR
│
├── docs/
│   └── mcp-examples.md             # Playwright MCP natural language examples
│
├── fixtures/
│   └── auth.fixture.ts             # Pre-authenticated page — tests start logged in
│
├── pages/                          # Page Object Model
│   ├── LoginPage.ts                # Selectors + actions for /
│   ├── InventoryPage.ts            # Selectors + actions for /inventory.html
│   ├── CartPage.ts                 # Selectors + actions for /cart.html
│   └── CheckoutPage.ts             # Multi-step checkout (step 1 → 2 → confirm)
│
├── tests/
│   ├── smoke/                      # Critical-path tests — run on every commit
│   │   ├── auth.spec.ts            # Login: success · failures · logout · access control
│   │   └── inventory.spec.ts       # Product list · cart badge · product catalog
│   │
│   ├── e2e/                        # Full user journeys — run on pull requests
│   │   ├── checkout-flow.spec.ts   # Login → Add → Cart → Checkout → Confirm
│   │   └── sorting.spec.ts         # A→Z · Z→A · price asc · price desc · product detail
│   │
│   ├── regression/                 # Non-regression — run nightly
│   │   └── user-behaviors.spec.ts  # Perf timing · problem_user · cart persistence
│   │
│   └── api/
│       └── intercept.spec.ts       # Console monitoring · mock 503 · abort images · perf budget
│
├── utils/
│   ├── helpers.ts                  # login() · addToCart() · getCartCount() · fillCheckoutForm()
│   └── test-data.ts                # All users · passwords · product names · error messages
│
├── Dockerfile                      # Official Playwright image — browsers pre-installed
├── docker-compose.yml              # One service per test category + report server
├── .dockerignore
├── playwright.config.ts            # Multi-browser · timeouts · trace · video on failure
├── tsconfig.json
├── package.json
├── SPEC.txt                        # Full project specification
└── README.md
```

---

## 👤 Test Users

SauceDemo ships with 6 built-in test users. All share the same password.

| Username | Password | Behavior |
|---|---|---|
| `standard_user` | `secret_sauce` | Normal — everything works |
| `locked_out_user` | `secret_sauce` | Cannot log in — tests error handling |
| `problem_user` | `secret_sauce` | Broken images · misbehaving interactions |
| `performance_glitch_user` | `secret_sauce` | Intentionally slow login |
| `error_user` | `secret_sauce` | Some cart/checkout actions throw errors |
| `visual_user` | `secret_sauce` | Subtle visual differences vs standard |

---

## 🚀 Installation

### Prerequisites

- **Node.js** v18 or higher — [download](https://nodejs.org)
- A terminal (bash, zsh, PowerShell)

### 1. Clone the repository

```bash
git clone https://github.com/your-username/playwright-showroom.git
cd playwright-showroom
```

### 2. Install Node dependencies

```bash
npm install
```

### 3. Install Playwright browsers

```bash
npx playwright install
```

Downloads Chromium, Firefox, and WebKit (~300MB). Isolated from your system browsers.

```bash
# Chromium only — faster for local dev
npx playwright install chromium
```

### 4. Verify the setup

```bash
npx playwright test tests/smoke/ --project=chromium
```

You should see green output with all smoke tests passing.

---

## 🧪 Running Tests

### Run everything

```bash
npm test
# or
npx playwright test
```

### Run by category

```bash
npm run test:smoke        # Critical paths only (~30s)
npm run test:e2e          # Full user journeys
npm run test:regression   # Non-regression suite
npm run test:api          # Network interception tests
```

### Run with a visible browser

```bash
npm run test:headed
# or
npx playwright test --headed
```

### Interactive UI mode

```bash
npm run test:ui
# or
npx playwright test --ui
```

Opens Playwright's built-in GUI with time-travel debugging — the best way to explore the suite.

### Other useful commands

```bash
# Run a specific file
npx playwright test tests/smoke/auth.spec.ts

# Run tests matching a keyword
npx playwright test --grep "checkout"

# Run in a specific browser
npx playwright test --project=firefox

# Step-by-step debug
npx playwright test tests/smoke/auth.spec.ts --debug

# Generate test code from browser actions
npm run codegen
# or
npx playwright codegen https://www.saucedemo.com

# Open the last HTML report
npm run test:report
```

---

## 🐳 Running with Docker

No Node.js or browser installation needed — Docker handles everything.

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running

### Build the image

```bash
docker compose build
```

Uses the official `mcr.microsoft.com/playwright` image — Node.js and all browsers pre-installed.

### Run tests

```bash
docker compose up smoke        # Critical paths only (~30s)
docker compose up e2e          # End-to-end journeys
docker compose up regression   # Non-regression suite
docker compose up api          # Network interception tests
docker compose up full         # Full suite across all browsers
```

### View the HTML report

```bash
docker compose up report
```

Then open **http://localhost:9323** in your browser.

The `playwright-report/` folder is volume-mounted — reports are available on your host after the container exits.

### One-liner

```bash
docker compose up smoke && docker compose up report
```

---

## 🤖 Installing Playwright MCP

Playwright MCP is a Model Context Protocol server that lets AI assistants (like Claude) control a browser using natural language.

### 1. Install the MCP server

```bash
npm install -g @playwright/mcp
```

### 2. Configure Claude Desktop

Open the Claude Desktop configuration file:

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

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

Fully quit and reopen Claude Desktop after saving the config.

### 4. Use it

In Claude, you can now say:

> *"Go to https://www.saucedemo.com, log in as standard_user / secret_sauce, add the most expensive product to the cart, complete the checkout with name Jane Doe and postal code 75001, and tell me the confirmation message."*

Claude opens a browser, performs every step, and returns the result.

See [`docs/mcp-examples.md`](docs/mcp-examples.md) for the full list of examples.

---

## 🧠 Key Concepts

### Page Object Model (POM)

Encapsulate all selectors and actions for a page in a single class — change a selector once, fix it everywhere.

```typescript
// Without POM — selector scattered across every test
await page.locator('[data-test="login-button"]').click();

// With POM — readable, maintainable, DRY
const loginPage = new LoginPage(page);
await loginPage.login(username, password);
await loginPage.expectSuccessfulLogin();
```

### Custom Fixtures

The `auth.fixture.ts` extends Playwright's `test` with an `authenticatedPage` that starts already logged in — no login UI repeated in every test.

```typescript
// Without fixture — login steps repeated in every test body
test('can see inventory', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-test="username"]').fill('standard_user');
  await page.locator('[data-test="password"]').fill('secret_sauce');
  await page.locator('[data-test="login-button"]').click();
  // ... finally write the actual test
});

// With fixture — starts authenticated, tests the real thing immediately
test('can see inventory', async ({ authenticatedPage }) => {
  await authenticatedPage.goto('/inventory.html');
  await expect(authenticatedPage.locator('.inventory_list')).toBeVisible();
});
```

### Network Interception

```typescript
// Mock an API response with custom data
await page.route('**/api/products', route => route.fulfill({
  status: 200,
  json: [{ name: 'Mocked Product', price: '$0.01' }]
}));

// Simulate a server outage
await page.route('https://www.saucedemo.com/', route => route.fulfill({
  status: 503,
  body: '<h1>Service Unavailable</h1>'
}));

// Block all images (simulate slow network / ad blocker)
await page.route('**/*.{png,jpg,jpeg}', route => route.abort());

// Monitor for silent HTTP errors
page.on('response', response => {
  if (response.status() >= 400)
    console.error(`HTTP error: ${response.status()} ${response.url()}`);
});
```

---

## ⚡ CI/CD

The GitHub Actions workflow in `.github/workflows/ci.yml` runs automatically:

| Trigger | Tests run | Browsers |
|---|---|---|
| Every push to `main` / `develop` | Smoke + API | Chromium only |
| Every pull request to `main` | Full suite | Chromium + Firefox + WebKit |

HTML reports are uploaded as artifacts and retained for 7–14 days.

---

## 📌 Roadmap

### ✅ Implemented

- [x] Project architecture — POM, fixtures, centralized test data
- [x] **Smoke tests** — authentication (7 scenarios) + inventory (4 scenarios)
- [x] **E2E tests** — checkout flow (7 scenarios) · sorting (4 scenarios) · product detail (4 scenarios)
- [x] **Non-regression tests** — performance timing · problem_user bug assertion · cart persistence
- [x] **API / Network tests** — console error monitoring · request mocking · abort · perf budget
- [x] **Custom fixture** — pre-authenticated browser context
- [x] **Page Object Model** — LoginPage · InventoryPage · CartPage · CheckoutPage
- [x] **Docker** — Dockerfile + Compose with one service per test category
- [x] **GitHub Actions CI** — smoke on push · full suite on PR · multi-browser matrix
- [x] **Playwright MCP** — integration guide + natural language examples
- [x] Multi-browser matrix — Chromium · Firefox · WebKit · Mobile Chrome

---

### 🔜 Coming Next

#### Testing

- [ ] **Advanced API mocking** — intercept REST endpoints, inject delayed responses, simulate partial network failures, validate request payloads and headers
- [ ] **Accessibility tests** — integrate `@axe-core/playwright` to catch WCAG violations on every page automatically
- [ ] **Visual regression** — `expect(page).toHaveScreenshot()` pixel-by-pixel comparison, baseline management, diff reports
- [ ] **Contract testing** — validate API response schemas with Zod or JSON Schema to catch breaking backend changes before they hit the UI
- [ ] **Auth state storage** — persist login state to a JSON file and reuse across parallel workers for faster test runs (`storageState`)
- [ ] **i18n / locale testing** — run the full suite in multiple locales using `page.context({ locale })` to catch layout breaks and missing translations

#### Infrastructure

- [ ] **Kubernetes deployment** — Helm chart to run the full suite as a Job on a K8s cluster, with pod autoscaling for parallel execution across multiple nodes
- [ ] **Allure reporter** — richer test reports with history, trends, flakiness tracking, and per-test attachments (screenshots, videos, traces)
- [ ] **Slack / Teams notifications** — send a formatted failure summary to a channel on every CI run via webhook
- [ ] **Parallelism tuning** — benchmark `workers` and `sharding` settings, document optimal configuration for different CI runner sizes

#### Developer Experience

- [ ] **AI failure diagnosis** — pipe Playwright trace files and error messages to an LLM (Claude) to get plain-language root cause hints and fix suggestions automatically
- [ ] **Test generation via Playwright MCP** — ask Claude to observe a user flow and generate a Playwright spec file from it, then commit it to the repo
- [ ] **Performance dashboard** — track login time, inventory load time, and checkout duration across branches using Playwright's built-in `performance.getEntriesByType`
- [ ] **Codegen integration guide** — step-by-step walkthrough of `playwright codegen`, selector best practices, and how to clean up generated code into POM-style specs

---

## 👤 Author

**Your Name**
Senior SDET — specialized in test automation, Playwright, and AI-assisted QA

[![LinkedIn](https://img.shields.io/badge/LinkedIn-your--profile-0077B5?style=flat-square&logo=linkedin)](https://linkedin.com/in/your-profile)
[![GitHub](https://img.shields.io/badge/GitHub-your--username-181717?style=flat-square&logo=github)](https://github.com/your-username)

---

## 📚 Resources

- [Playwright documentation](https://playwright.dev)
- [Playwright MCP GitHub](https://github.com/microsoft/playwright-mcp)
- [SauceDemo](https://www.saucedemo.com)
- [Playwright Discord](https://aka.ms/playwright/discord)

---

## License

MIT

---

*Built with 🎭 Playwright · 🤖 Playwright MCP · 🧠 Claude (Anthropic) · 🐳 Docker*
