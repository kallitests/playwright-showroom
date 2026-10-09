# Architecture

## 1. Overview

```
                       ┌───────────────────────────── Application under test ─────────────────────────────┐
                       │  www.saucedemo.com (GitHub Pages SPA)   or   local build of saucelabs/sample-app-web │
                       └───────────────▲──────────────────────────────▲───────────────────────▲───────────┘
                                       │ browser (UI)                 │ HTTP (no browser)     │ AI-driven browser
┌─────────────────── Playwright CLI (deterministic, gates CI) ────────┴──────────┐   ┌────────┴─────────┐
│ tests/smoke  tests/ui  tests/e2e  tests/regression  tests/api  tests/exploratory│   │ Playwright MCP   │
│        │            uses                         │                             │   │ (.mcp.json)      │
│ fixtures/index.ts ── pages/* (+ components/Header) ── utils/test-data, helpers │   │ exploration,     │
│        │                                         │                             │   │ investigation →  │
│ utils/mock-api (⚠️ MOCK Orders API, in-process)   │                             │   │ findings → tests │
└────────┬─────────────────────────────────────────┴─────────────────────────────┘   └──────────────────┘
         │ reporters
         ├─ list / github · html (playwright-report/) · junit (test-results/junit.xml) · json
         ├─ reporters/metrics-reporter.ts → metrics/summary.{json,md}, history.jsonl
         └─ optional @alex_neo/playwright-azure-reporter (Azure Test Plans) — env-activated
                 │
   GitHub Actions: ci.yml (lint/tsc → smoke → cross-browser → merged report)
                   nightly-regression.yml (4 projects → metrics → Slack/Teams/email)
   Azure Pipelines: azure-pipelines.yml (JUnit → Tests tab, report artifact)
```

## 2. Repository layout

```
playwright-showroom/
├── tests/
│   ├── smoke/            @smoke — critical paths (auth, catalog, cart, purchase)
│   ├── ui/               feature tests: auth, catalog, cart, checkout (data-driven)
│   ├── e2e/              multi-page purchase journeys with real UI login + PDF receipt
│   ├── regression/       personas (known defects) + robustness (refresh, back, tabs…)
│   ├── api/              HTTP resources (real) · network interception · MOCK orders contract
│   └── exploratory/      test.fail() reproductions of findings · axe accessibility sweep
├── pages/                LoginPage, InventoryPage, ProductDetailPage, CartPage, CheckoutPage
│   └── components/       Header (menu, cart badge) — composed into pages
├── fixtures/index.ts     page objects, `user` option, loggedInPage (cookie auth), seedCart, runtimeErrors
├── utils/                env.ts (config) · test-data.ts (reference data) · helpers.ts · mock-api/
├── reporters/            metrics-reporter.ts
├── catalog/              scenarios.json (+ generators for docs/test-catalog.md)
├── scripts/
│   ├── local-saucedemo/  setup.mjs (clone+build official sources) · serve.mjs (GitHub-Pages-like server)
│   ├── metrics/          print-summary.mjs
│   ├── notify/           notify.mjs (Slack / Teams)
│   └── …                 v1 Python admin scripts (unchanged)
├── docs/                 strategy · catalog · exploratory · architecture · MCP
├── .github/workflows/    ci.yml · nightly-regression.yml
├── azure-pipelines.yml · Dockerfile · docker-compose.yml · .mcp.json · .env.example
└── playwright.config.ts · eslint.config.mjs · tsconfig.json
```

## 3. Playwright CLI layer

- **Config** (`playwright.config.ts`): target from env; `testIdAttribute: 'data-test'`; trace/screenshot/video retained on failure only; retries = 1 in CI so flakiness is *measured* (outcome "flaky") rather than hidden; projects chromium, firefox, webkit, mobile-chrome (Pixel 5).
- **Fixtures** (`fixtures/index.ts`): one import for all specs. `loggedInPage` injects the `session-username` cookie (≈ 10× faster than UI login and independent of the login screen). `test.use({ user: 'problem' })` switches persona per describe block. `seedCart([...])` writes `localStorage` to set cart preconditions in one step.
- **Page objects**: thin, intention-revealing methods (`addToCart(name)`, `submitInfo(info)`, `totals()`), assertions that belong to the page (`expectLoaded`, `expectOrderConfirmed`). Locators scoped by product name (`item(name)`), robust to re-ordering.
- **Selection by intent**: tags (`--grep @critical`) and folders (`tests/ui`). See README for all commands.
- **Local target**: `LOCAL_SAUCEDEMO=1` starts `scripts/local-saucedemo/serve.mjs` via `webServer`. The server reproduces GitHub Pages' contract (unknown path → HTTP 404 + `404.html` SPA bootstrap), so HTTP and navigation tests behave as on the live site.

## 4. API layer

| File | Target | Real? |
|---|---|---|
| `tests/api/http-resources.spec.ts` | HTML shell, JS bundle, manifest + icons, robots.txt, deep-link contract, absence of `/api/*` | ✅ real SauceDemo HTTP surface (APIRequestContext, no browser) |
| `tests/api/network.spec.ts` | Browser traffic: JS errors, failed first-party requests, headers; simulated 503, blocked images, slow JS, missing bundle | ✅ real app, failures simulated with `page.route` |
| `tests/api/orders-contract.mock.spec.ts` | `utils/mock-api/orders-mock-server.ts` — contract, validation (400), auth (401), idempotency (409), read-back (404) | ⚠️ **MOCK** — SauceDemo has no API. Responses carry `x-mock-api: true`; tests tagged `@mock` |

## 5. MCP layer

See [`docs/mcp-examples.md`](mcp-examples.md). MCP is used for exploration, investigation and test drafting; its output is reviewed and converted into CLI tests. It never runs in CI.

## 6. CI/CD

### GitHub Actions — `ci.yml` (push, PR, manual)

| Job | When | What |
|---|---|---|
| quality | always | `npm ci` (lockfile), ESLint (incl. `eslint-plugin-playwright`), `tsc --noEmit` |
| smoke | after quality | Chromium, `--grep "@smoke|@api"`, metrics in job summary, report artifact; traces/videos uploaded on failure |
| cross-browser | PR / manual | matrix chromium · firefox · webkit, blob reports, `@chromium-only` excluded on Firefox/WebKit |
| report | after matrix | `merge-reports` → single HTML + JUnit artifact |

Manual run inputs: `target` (live / local build) and `grep` (e.g. `@checkout`, `AUTH-0`).

### GitHub Actions — `nightly-regression.yml`

Daily 02:17 UTC: full suite on chromium, firefox, webkit + smoke on mobile-chrome; metrics summary per job; artifacts kept 30 days (history); alerts on failure.

### Azure DevOps — `azure-pipelines.yml`

`PublishTestResults@2` (JUnit → Tests tab, trend & flaky analytics native to ADO) + HTML report and metrics artifacts.
**Test Plans (optional):** set `INSTALL_ADO_REPORTER=true` and variables `AZURE_DEVOPS_ORG_URL`, `AZURE_DEVOPS_PROJECT`, `AZURE_DEVOPS_PLAN_ID`, `AZURE_DEVOPS_TOKEN` (secret, PAT with *Test Management – read & write*). The config then adds `@alex_neo/playwright-azure-reporter`, which maps results to test cases referenced as `@[<ADO id>]` tags or `[<id>]` in titles. Without these variables nothing changes.

## 7. Reporting & metrics

| Output | Content | Where |
|---|---|---|
| HTML report | per test steps, errors, screenshots, video, trace viewer | `playwright-report/` · `npm run report` |
| JUnit / JSON | machine-readable results | `test-results/` |
| QA metrics | pass rate, duration, flaky, failed, known defects, slowest, scenario coverage by risk/area | `metrics/summary.json`, `summary.md`, `history.jsonl` · `npm run report:metrics` |

Coverage reported is **scenario/risk coverage** (catalog IDs executed), never presented as code coverage.

## 8. Alerting

`scripts/notify/notify.mjs` reads `metrics/summary.json` and posts to every configured channel:

| Channel | Activation (env / secret) | Format |
|---|---|---|
| Slack | `SLACK_WEBHOOK_URL` | text message |
| Microsoft Teams | `TEAMS_WEBHOOK_URL` (Workflows webhook) | Adaptive Card |
| Email | `SMTP_SERVER`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `NOTIFY_EMAIL_TO` (GitHub secrets) | `dawidd6/action-send-mail` with `metrics/summary.md` |

`NOTIFY_ON=failure|always`; `NOTIFY_DRY_RUN=1` prints payloads. No variable → no alert, exit 0. Alerting failures never fail the pipeline.

## 9. Configuration reference

All variables are optional — see [`.env.example`](../.env.example). `BASE_URL`, `LOCAL_SAUCEDEMO`, `LOCAL_SAUCEDEMO_PORT`, `SAUCE_PASSWORD`, `NOTIFY_*`, `SLACK_WEBHOOK_URL`, `TEAMS_WEBHOOK_URL`, `AZURE_DEVOPS_*`, `TEST_ENVIRONMENT`.
