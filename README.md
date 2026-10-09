# 🎭 Playwright Showroom

> **Risk-based QA automation on two applications** — [SauceDemo](https://www.saucedemo.com) (front-end only) and [Toolshop](https://practicesoftwaretesting.com) (Angular UI + **real REST API**). Playwright CLI + TypeScript (smoke, UI, E2E, API, hybrid API⇄UI, regression), Playwright MCP for AI-assisted exploration, structured exploratory testing, CI/CD with GitHub Actions & Azure DevOps, QA metrics and optional alerting.

[![CI](https://img.shields.io/badge/CI-GitHub%20Actions-2088FF?style=flat-square&logo=githubactions)](.github/workflows/ci.yml)
[![Playwright](https://img.shields.io/badge/Playwright-1.56-green?style=flat-square&logo=playwright)](https://playwright.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?style=flat-square&logo=typescript)](https://typescriptlang.org)
[![MCP](https://img.shields.io/badge/Playwright-MCP-blueviolet?style=flat-square)](docs/mcp-examples.md)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?style=flat-square&logo=docker)](Dockerfile)

---

## 🗺️ Contents

[Why](#-why-this-showroom) · [Toolshop](#-second-application-toolshop-ui--real-api) · [Results](#-results-real-runs) · [Architecture](#️-architecture) · [Install](#-installation) · [Commands](#-commands) · [MCP](#-playwright-mcp) · [CI/CD](#️-cicd--reporting) · [5-minute demo](#-5-minute-interview-demo) · [Docs](#-documentation) · [Admin scripts](#️-admin-scripts)

---

## 💡 Why this showroom?

It shows how a senior SDET approaches a product, not just how to write Playwright code:

1. **Understand the product first.** SauceDemo turned out to be a static SPA with **no backend API** (auth = cookie, cart = `localStorage`, hosted on GitHub Pages). The strategy follows from that: business rules are verified through the UI, HTTP tests target what really exists, and API-testing technique is shown on a **clearly labelled mock** — never presented as a SauceDemo API.
2. **Risk-based catalogue.** 99 scenarios with ID, risk, preconditions, data, steps, expected result, priority, type and automation — [docs/test-catalog.md](docs/test-catalog.md).
3. **Exploration that finds real defects.** 6 findings verified on the live site, e.g. **EXP-001: a user's cart leaks to the next user after logout** — each turned into a deterministic `test.fail()` reproduction.
4. **Engineering hygiene.** Fixtures, thin page objects, `data-test` locators, web-first assertions, ESLint (`no-wait-for-timeout`…), strict TypeScript, lockfile, tags, traces on failure, metrics, flaky detection.

## 🧰 Second application: Toolshop (UI + real API)

SauceDemo has no backend, so a second, richer target was added: **Toolshop** by Testsmith — catalog, cart, guest/customer checkout, JWT auth, Laravel REST API. Everything lives in [`toolshop/`](toolshop) with its own config ([`playwright.toolshop.config.ts`](playwright.toolshop.config.ts)) and reuses the showroom tooling (lint rules, metrics reporter, alerting, CI patterns).

| | |
|---|---|
| **82 tests** | 50 API tests (no browser) · 32 UI/E2E/exploratory tests |
| **API** | Zod contracts on every response, validation matrix, lockout after 3 failures (on throw-away users), 401/403/423, discount rules, guest orders |
| **Hybrid** | API login → JWT in `localStorage`; API cart → `sessionStorage`; UI journey; API confirms the invoice |
| **Findings** | 5 verified on the live API, incl. **anonymous write access to `POST /products`** and **out-of-stock items addable via API** |
| **Defect detection** | nightly run against the official `with-bugs` deployment — expected to fail |
| **Status** | ⚠️ written from live exploration + sources, type-checked and linted — **not executed yet** (see [docs/toolshop.md](docs/toolshop.md) § 1) |

```bash
npm run toolshop:api      # API tests only
npm run toolshop          # API + UI/E2E (Chromium)
npm run toolshop:with-bugs
```

## 📊 Results (real runs)

*SauceDemo suite.* Executed on 2026-10-09 with Playwright 1.56.1 / Chromium, against a **local build of the official SauceDemo sources** (the live site was not reachable from the execution sandbox; CI targets the live site — see [Limits](#-known-limits)).

```
$ npm run check                      # ESLint + tsc --noEmit
✔ 0 errors, 0 warnings

$ npx playwright test --project=chromium
  113 passed (1.2m)                  # incl. 5 known defects reproduced with test.fail()

$ npx playwright test --project=chromium --repeat-each=3 --retries=1
  339 passed (3.3m)                  # 0 flaky over 3 repetitions

$ npx playwright test --project=mobile-chrome --grep @smoke
  9 passed (8.2s)
```

`metrics/summary.md` produced by the run:

| Executed | Passed | Failed | Flaky | Known defects (test.fail) | Skipped |
|---:|---:|---:|---:|---:|---:|
| 113 | 108 | 0 | 0 | 5 | 0 |

Scenario coverage (risk-based, **not** code coverage): 96/99 catalogued scenarios executed — high risk 32/32 (100 %), medium 45/47, low 19/20.

**Mutation check:** injecting two defects into the app (tax 8 % → 9 %, locked-out message changed) produced **5 targeted failures and 0 collateral failures** — the suite fails for the right reasons.

Before v2, the same run aborted with `Cannot find module '../../pages/CartPage'` (0 tests executed) and CI could not install (`npm ci` without lockfile).

## 🏗️ Architecture

```
tests/                         what is tested                         run with
├── smoke/        @smoke       login, catalog, cart, purchase         every push (< 1 min)
├── ui/           @ui          auth matrix, catalog, cart, checkout   PR
├── e2e/          @e2e         multi-page journeys, PDF receipt       PR
├── regression/   @regression  personas (known defects), robustness   PR + nightly
├── api/          @api         real HTTP surface · network · ⚠️ mock   every push
└── exploratory/  @exploratory findings (test.fail) · axe a11y        PR + nightly

fixtures/index.ts   page objects · loggedInPage (cookie auth) · test.use({ user }) · seedCart · runtimeErrors
pages/              Login · Inventory · ProductDetail · Cart · Checkout  (+ components/Header)
utils/              env · test-data (reference data) · helpers · mock-api (⚠️ MOCK Orders API)
reporters/          metrics-reporter → metrics/summary.{json,md}, history.jsonl
catalog/            scenarios.json → docs/test-catalog.md
scripts/            local-saucedemo (setup/serve) · metrics · notify (Slack/Teams) · v1 admin scripts
```

Details: [docs/architecture.md](docs/architecture.md).

```ts
// A typical test: intention-revealing, isolated, no login UI, no sleeps
test('CHK-005b subtotal + 8% tax = total for 2 item(s)', async ({ loggedInPage, seedCart, cartPage, checkoutPage }) => {
  await seedCart([PRODUCTS.backpack, PRODUCTS.bikeLight]);   // precondition via localStorage
  await cartPage.goto();
  await cartPage.clickCheckout();
  await checkoutPage.submitInfo(CHECKOUT_INFO.valid);
  expect(await checkoutPage.totals()).toEqual(expectedTotals([29.99, 9.99]));
});
```

## 🚀 Installation

Prerequisites: Node.js ≥ 20, git.

```bash
git clone https://github.com/kallitests/playwright-showroom.git
cd playwright-showroom
npm ci
npx playwright install chromium          # or: npx playwright install (all browsers)
cp .env.example .env                     # optional — every variable is optional
npm run test:smoke
```

**Offline / behind a proxy that blocks saucedemo.com?** Build the official sources locally and run against them:

```bash
npm run saucedemo:setup                  # clones saucelabs/sample-app-web and builds it
npm run test:local                       # starts the local server automatically
```

## 🧪 Commands

| Goal | Command |
|---|---|
| Full suite (Chromium) | `npm test` |
| Smoke / critical only | `npm run test:smoke` · `npm run test:critical` |
| By layer | `npm run test:ui` · `test:e2e` · `test:api` · `test:regression` · `test:exploratory` |
| Cross-browser | `npm run test:cross-browser` |
| Mobile smoke | `npm run test:mobile` |
| One test by ID / file | `npx playwright test -g "CHK-005"` · `npx playwright test tests/ui/cart.spec.ts` |
| By tag | `npx playwright test --grep "@checkout"` · `--grep-invert @known-issue` |
| Another persona | `test.use({ user: 'problem' })` in a describe block |
| Headed / debug / UI mode | `npm run test:headed` · `npm run test:debug` · `npm run test:ui-mode` |
| Stability check | `npx playwright test -g "CART-" --repeat-each=5` |
| Local SauceDemo build | `npm run saucedemo:setup` then `npm run test:local` |
| HTML report / trace | `npm run report` · `npx playwright show-trace test-results/<test>/trace.zip` |
| QA metrics | `npm run report:metrics` |
| Alert dry-run | `NOTIFY_ON=always NOTIFY_DRY_RUN=1 SLACK_WEBHOOK_URL=x npm run notify` |
| Toolshop suites | `npm run toolshop` · `toolshop:api` · `toolshop:smoke` · `toolshop:cross-browser` · `toolshop:with-bugs` · `toolshop:report` |
| Lint + types | `npm run check` |
| Record a flow | `npm run codegen` |

## 🤖 Playwright MCP

Project-scoped config in [`.mcp.json`](.mcp.json) (`@playwright/mcp`, isolated profile, `data-test` locators). Three documented workflows — **explore & map risks**, **investigate an anomaly** (how EXP-001 and EXP-002 were found), **convert findings into deterministic CLI tests** with a review checklist — in [docs/mcp-examples.md](docs/mcp-examples.md).

Separation is explicit: CLI tests gate CI; MCP sessions produce knowledge, never test results; AI log analysis (`prompts/log-error-analyzer/`) is advisory only.

## ⚡️ CI/CD & reporting

| Pipeline | Trigger | Content |
|---|---|---|
| `ci.yml` | push / PR / manual | lint + tsc → smoke & HTTP (Chromium) → cross-browser matrix on PR → merged HTML report; traces & videos uploaded on failure; manual inputs `target` (live/local) and `grep` |
| `nightly-regression.yml` | daily 02:17 UTC | chromium · firefox · webkit + mobile smoke; metrics in job summary; Slack / Teams / email alerts if secrets are set; artifacts kept 30 days |
| `toolshop.yml` | push / PR / nightly / manual | Toolshop: API + UI smoke → cross-browser on PR; nightly full run + defect detection on `with-bugs` |
| `azure-pipelines.yml` | Azure DevOps | JUnit → Tests tab; report & metrics artifacts; optional Azure Test Plans reporter (env-activated) |

Reports: Playwright HTML (`playwright-report/`), JUnit + JSON (`test-results/`), QA metrics (`metrics/`). Everything external is optional: without secrets the project runs locally and in GitHub Actions unchanged.

## 🎤 5-minute interview demo

| Time | Show | Say |
|---|---|---|
| 0:00 | This README → "Why" | "I started by finding out what SauceDemo really is: a static SPA, no API. That shaped the whole strategy." |
| 0:45 | [docs/test-strategy.md](docs/test-strategy.md) risk table → [test-catalog.md](docs/test-catalog.md) | "99 scenarios, risk-ranked; every test title carries its ID, so coverage is measured, not claimed." |
| 1:30 | `npm run test:smoke` (headed: `npx playwright test --grep @smoke --headed`) | "Under a minute. Cookie-based auth fixture: tests don't depend on the login screen." |
| 2:15 | `tests/exploratory/findings.spec.ts` + [exploratory-testing.md](docs/exploratory-testing.md) EXP-001 | "Found with an MCP-assisted session, verified live: the cart leaks to the next user. Reproduced with test.fail() — it turns red when fixed." |
| 3:00 | `npm run report` → a test with trace | "Trace, video, screenshot kept only on failure. Flaky = passed on retry, reported, never hidden." |
| 3:45 | `metrics/summary.md`, `.github/workflows/ci.yml` | "Pass rate, flaky, known defects and risk coverage on every run; smoke on PR, cross-browser matrix, nightly with alerts." |
| 4:30 | `tests/api/orders-contract.mock.spec.ts` | "No real API, so I show contract, validation, auth and idempotency testing on an explicitly labelled mock." |

## 📚 Documentation

| Document | Content |
|---|---|
| [docs/test-strategy.md](docs/test-strategy.md) | context, risk analysis, pyramid, environments, entry/exit criteria, metrics, mutation check |
| [docs/test-catalog.md](docs/test-catalog.md) | 99 scenarios with full fields + coverage matrix (generated from `catalog/scenarios.json`) |
| [docs/exploratory-testing.md](docs/exploratory-testing.md) | heuristics, charters, findings, session template, exploration → automation workflow |
| [docs/architecture.md](docs/architecture.md) | CLI, MCP, API, CI/CD, reporting, alerting, Azure DevOps, configuration |
| [docs/mcp-examples.md](docs/mcp-examples.md) | Playwright MCP setup and workflows |
| [docs/toolshop.md](docs/toolshop.md) | Toolshop: verification method, design, findings, how to run, limits |
| [docs/toolshop-test-catalog.md](docs/toolshop-test-catalog.md) | 67 Toolshop scenarios + coverage matrix |

## 👤 Test users

All SauceDemo demo accounts share the public password `secret_sauce`.

| Username | Behaviour (verified) | Covered by |
|---|---|---|
| `standard_user` | reference behaviour | everything |
| `locked_out_user` | login refused | AUTH-005 |
| `problem_user` | placeholder images, some add-to-cart ignored, last name overwrites first name, sort inert | USR-001…004 |
| `performance_glitch_user` | main thread blocked ≈ 5 s after login | USR-006 |
| `error_user` | runtime errors on some cart actions, Finish keeps the cart | USR-005, USR-007 |
| `visual_user` | randomised prices, visual glitches | USR-008 |

## 🐳 Docker

```bash
docker compose build
docker compose up smoke          # or e2e · regression · api · full
docker compose up report         # http://localhost:9323
```

Image `mcr.microsoft.com/playwright:v1.56.1-noble` — keep it in sync with `@playwright/test`.

## 🛠️ Admin scripts

Standalone Python utilities from v1, unchanged — see [`scripts/README.md`](scripts/README.md): secure `git commit/push` (optionally with AI commit messages), GitHub auth wizard, remote URL updater, environment checker.

## ⚠️ Known limits

- **Execution environment for the published results:** www.saucedemo.com was not reachable from the sandbox where v2 was built, so the results above come from a local build of the official sources (commit `60ece43`, 2026-10-04), served with the same GitHub Pages routing. The live site was checked by hand in a browser for the key facts (catalog, prices, `data-test` ids, cart leak, deep-link 404). The first CI run on GitHub will confirm the suite against the live site.
- **Firefox / WebKit** were not executed locally (only Chromium was available); they run in the CI matrix.
- The Docker image tag and the Azure DevOps pipeline were not executed here.
- SauceDemo has no backend: no real API tests are possible; the Orders API tests target a mock and say so.
- Visual regression (CAT-012) and a manual screen-reader pass (A11Y-003) are in the backlog.

## 📌 Roadmap

- [ ] Visual regression with pinned Docker baselines (`toHaveScreenshot`)
- [ ] Manual screen-reader charter (NVDA / VoiceOver) — CH-05
- [ ] Flaky-test trend dashboard from nightly `history.jsonl` artifacts
- [ ] Sharding for the cross-browser matrix when the suite grows
- [ ] AI failure triage: feed traces + `prompts/log-error-analyzer` in CI (advisory comment on PR)

## 👤 Author

**Your Name** — Senior SDET · test automation, Playwright, AI-assisted QA
[LinkedIn](https://linkedin.com/in/your-profile) · [GitHub](https://github.com/kallitests)

## License

MIT
