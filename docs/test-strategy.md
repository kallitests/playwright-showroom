# Test strategy — SauceDemo (Swag Labs)

## 1. Context

| Item | Value |
|---|---|
| Application under test | [SauceDemo](https://www.saucedemo.com) — demo e-commerce SPA (React) by Sauce Labs |
| Architecture (verified 2026-10-09) | Static SPA on GitHub Pages. **No backend API**: auth = client-side check + `session-username` cookie (10 min); cart = `localStorage["cart-contents"]`; prices/tax computed in the browser |
| Personas | `standard_user`, `locked_out_user`, `problem_user`, `performance_glitch_user`, `error_user`, `visual_user` (public demo accounts, password `secret_sauce`) |
| Out of scope | Real payment, real backend, load testing, security pentest |

What the architecture means for testing: there is nothing to test at the HTTP API level for business logic, so business rules are verified **through the UI**, and HTTP tests target what really exists (HTML shell, bundle, manifest, hosting behaviour). API-testing technique is shown on a **clearly labelled mock** (`tests/api/orders-contract.mock.spec.ts`), never presented as a SauceDemo API.

## 2. Risk analysis

Risk = business impact × likelihood. Top risks and how they are mitigated:

| # | Risk | Impact | Likelihood | Mitigation (scenarios) |
|---|---|---|---|---|
| R1 | Customer cannot log in / buy | Critical | Medium | Smoke on every push: AUTH-001, CHK-001, CART-001 |
| R2 | Wrong amount charged (tax/total) | Critical | Low | CHK-005 (1, 2, 6 items), MOCK-003 |
| R3 | Unauthorised access to pages | High | Medium | AUTH-007 (×5 routes), AUTH-010, AUTH-011, AUTH-014 |
| R4 | Cart inconsistencies (badge, list, storage, reload) | High | Medium | CART-002…011, ROB-001, ROB-005 |
| R5 | Order data invalid or lost | High | Medium | CHK-002…004, EXP-003, EXP-004, EXP-005 |
| R6 | Privacy: cart leaks between users on a shared device | High | **Confirmed** | EXP-001 (defect reproduced live) |
| R7 | Unexpected navigation breaks the flow | Medium | High | ROB-002…006, CHK-006/007, E2E-003 |
| R8 | Catalog data wrong (price, description, image) | Medium | Low | CAT-002, CAT-007 (×6), CAT-011 |
| R9 | Performance degradation | Medium | Medium | USR-006 (relative), API-007 (budget), NET-006 |
| R10 | Accessibility barriers | Medium | Medium | A11Y-001/002 (axe), manual charter CH-05 |

## 3. Test pyramid (adapted to a backend-less SPA)

```
                 ┌─────────────┐
                 │  E2E (4)    │  real UI login, multi-page journeys
               ┌─┴─────────────┴─┐
               │  Smoke (8 + 1)   │  @smoke — every push, < 1 min
             ┌─┴─────────────────┴─┐
             │  UI / feature (53)   │  one feature per test, state seeded via cookie/localStorage
           ┌─┴─────────────────────┴─┐
           │ Regression & robustness  │  personas (known defects), unexpected behaviour (16)
         ┌─┴─────────────────────────┴─┐
         │ HTTP & network (14) + mock API (11) │  no browser / interception — fastest, most stable
         └─────────────────────────────────────┘
   Exploratory: charters (manual, MCP-assisted) → findings → test.fail() reproductions (5) + a11y (2)
```

Key design decisions:

- **Fast, isolated preconditions.** Non-auth tests start authenticated by injecting the session cookie, and seed the cart through `localStorage`. Login itself is covered by dedicated tests. Each test has its own browser context → no order dependency, safe parallelism.
- **Page Objects only where they pay off.** Five pages + one shared `Header` component. No base-class hierarchy, no generic "click" wrappers.
- **Locators:** `data-test` attributes via `getByTestId` (configured `testIdAttribute`), plus roles (`getByRole('button', { name: 'Add to cart' })`) for user-facing controls. No CSS classes, no XPath.
- **Assertions:** web-first (`toHaveText`, `toBeHidden`, `expect.poll`) — zero `waitForTimeout` (enforced by ESLint).
- **Characterisation of known defects:** persona defects are pinned by regression tests; product defects found in exploration are reproduced with `test.fail()` so they stay visible and alert when fixed.
- **Tags** drive selection in CI: `@smoke @critical @ui @e2e @api @regression @exploratory @known-issue @mock @chromium-only` + area tags.

## 4. Environments & data

| Target | How | Use |
|---|---|---|
| Live site (default) | `BASE_URL` unset | CI, nightly, demos |
| Local build of official sources | `npm run saucedemo:setup` then `npm run test:local` | Offline / proxy-restricted networks; reproduces GitHub Pages' 404-SPA behaviour |

Test data is centralised in `utils/test-data.ts` (personas, catalog reference, messages, business rules). Demo credentials are public; no secret is stored in the repo.

## 5. Entry & exit criteria

**Entry (start a test cycle):** lint + type-check green; target reachable (API-001); dependencies installed from lockfile.

**Exit — pull request can merge:**
- 100 % of `@smoke` and `@critical` pass on Chromium;
- full suite passes on Chromium, Firefox, WebKit (no unexpected failure);
- no new flaky test (a test passing only on retry is reported as *flaky* and must be fixed or quarantined with an issue).

**Exit — release / nightly is green:**
- all P1 scenarios pass on all desktop browsers + mobile smoke;
- known defects (`@known-issue`) unchanged — a known-issue test that *unexpectedly passes* must be triaged;
- high-risk scenario coverage = 100 % executed (see `metrics/summary.md`).

## 6. Metrics

Produced on every run by `reporters/metrics-reporter.ts` → `metrics/summary.{json,md}` + `history.jsonl`:
pass rate, duration, flaky tests, failed tests, known defects reproduced, slowest tests, **scenario coverage by risk and area**. CI publishes the summary to the job page; nightly runs keep 30 days of artifacts as history.
Scenario coverage ≠ code coverage: SauceDemo's code is not instrumented in this project.

## 7. Evidence of effectiveness (mutation check, 2026-10-09)

Two defects were injected into a copy of the SauceDemo build (tax 8 % → 9 %; locked-out message changed). Result: **5 targeted failures, 108 passes, no collateral failure** — CHK-005a/b/c, E2E-001 caught the tax change, AUTH-005 the message change. The suite detects real regressions and fails for the right reason.

## 8. Flakiness caught by the metrics (2026-10-09)

A later CI-mode run (retries = 1) reported **1 flaky test**: `EXP-001`. Root cause: a race in the *test*, not the app — `toBeHidden()` on the cart badge could pass before the header had rendered, so the "expected failure" sometimes passed. Fix: wait for the catalog first (`expectLoaded()`), and in `EXP-003` assert a positive signal (error banner) instead of a URL that is still correct before navigation. Verified with `--repeat-each=10` on all exploratory tests: 70/70 stable. This is exactly what the flaky metric is for.
