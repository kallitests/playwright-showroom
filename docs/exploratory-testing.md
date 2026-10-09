# Exploratory testing

Structured, time-boxed exploration (session-based test management) complements the automated suite: automation checks what we already know; exploration finds what we don't. Sessions can be run by hand or **assisted by Playwright MCP** (an AI agent drives a real browser — see `docs/mcp-examples.md`). Every finding is either rejected, documented, or turned into a deterministic CLI test.

## 1. Heuristics used

- **SFDIPOT** (Structure, Function, Data, Interfaces, Platform, Operations, Time) to generate ideas per feature.
- **CRUD on state**: create/read/update/delete the cart and the session through every entry point (UI, storage, cookie, URL).
- **Interruptions & history**: refresh, Back/Forward, new tab, deep link, session expiry, double click.
- **Boundaries & invalid data**: empty, whitespace, unicode, very long, injection-like strings.
- **Personas as oracles**: compare `standard_user` with the deliberately faulty personas.
- **Consistency oracle**: the same fact shown in two places (list vs detail, badge vs cart vs storage, UI vs computed total) must agree.
- **Source-informed testing**: SauceDemo is open source (`saucelabs/sample-app-web`); reading how state is stored pointed directly at EXP-001.

## 2. Charters

| ID | Charter (Explore … with … to discover …) | Time-box | Status |
|---|---|---|---|
| CH-01 | Explore **session handling** with logout, cookie deletion, Back button and user switching to discover **state leaking between sessions** | 45 min | Done — EXP-001 |
| CH-02 | Explore **checkout** with boundary and invalid data to discover **orders accepted with bad data** | 30 min | Done — EXP-003, EXP-004 |
| CH-03 | Explore **navigation** with refresh, Back/Forward, deep links and tabs to discover **lost or resurrected state** | 30 min | Done — EXP-005, EXP-006, ROB-* |
| CH-04 | Explore the **HTTP surface** with direct requests to discover **what is really observable server-side** | 20 min | Done — EXP-002, API-* |
| CH-05 | Explore **accessibility** with keyboard only and a screen reader to discover **barriers** | 45 min | Partially — axe scans automated (0 WCAG A/AA violations detected on 5 pages, local build); manual screen-reader pass **not yet done** |
| CH-06 | Explore **personas** (`problem_user`, `error_user`, `visual_user`, `performance_glitch_user`) to **characterise each deliberate defect** | 40 min | Done — USR-001…008 |

## 3. Findings (verified on www.saucedemo.com, 2026-10-09)

| ID | Finding | Severity | Repro (short) | Status / test |
|---|---|---|---|---|
| **EXP-001** | **Cart leaks to the next user.** Logout only deletes the session cookie; `localStorage` cart survives. A different user logging in on the same browser sees the previous user's cart. | Major (privacy, wrong order) | standard_user adds Backpack → Logout → log in as visual_user → badge shows 1 | Reproduced live (cart `[4]`, badge 1 for visual_user). `tests/exploratory/findings.spec.ts` (test.fail) + REG-002 pins current behaviour. v1 test "cart empty after logout" was wrong and has been corrected. |
| **EXP-002** | **Every deep link returns HTTP 404.** GitHub Pages serves `404.html` (spa-github-pages redirect) for `/inventory.html`, `/cart.html`… The page works for users, but monitors, crawlers and synthetic checks see errors. | Minor (ops/SEO) | `GET /inventory.html` → 404 + "Single Page Apps for GitHub Pages" | Verified live (headers `server: GitHub.com`). API-005 pins it. |
| **EXP-003** | **Whitespace-only customer info accepted.** Required-field check is a truthiness test: `" "` passes. | Minor | Checkout, type a space in each field → Continue → overview | test.fail |
| **EXP-004** | **Checkout possible with an empty cart** → $0.00 order placed and confirmed. | Major | Empty cart → Checkout → info → Finish | test.fail |
| **EXP-005** | **Refreshing the confirmation page loses the receipt.** Order data lives in router state only; after reload the "Generate PDF order" button disappears. | Minor | Finish order → F5 | test.fail |
| **EXP-006** | **Sort choice is forgotten** after visiting a product and coming back. | Trivial (UX) | Sort high→low → open product → Back to products | test.fail |
| EXP-007 | `performance_glitch_user`: the main thread is **blocked ~5 s** after login (measured 5.2 s vs 0.25 s). Clicks during that time are queued. | By design (persona) | Login as performance_glitch_user | USR-006 (relative measure) |
| EXP-008 | v1 suite had **0 executable e2e checkout tests** (missing `pages/CartPage.ts`) and a CI that could never install (`npm ci` without lockfile). | Test-debt | `npx playwright test` | Fixed in v2 |

Rejected observation: "problem_user About link points to a 404" — deliberate persona behaviour, documented by Sauce Labs, not logged as a defect.

## 4. Session report template

```
Charter:        CH-xx — Explore <target> with <resources> to discover <information>
Tester / tool:  <name> (manual | Playwright MCP + Claude)
Date / build:   <date> / <commit or "live">
Duration:       <setup> / <testing> / <investigation> (min)
Coverage notes: <areas, personas, browsers touched>
Findings:       <EXP-xxx — title — severity — evidence (screenshot, trace, storage dump)>
Questions:      <open questions for PO/dev>
New test ideas: <scenario ids to add to catalog/scenarios.json>
```

## 5. From exploration to automation (workflow)

1. **Explore** (manually or with Playwright MCP) and capture evidence: URL, storage/cookie dump, console, network.
2. **Minimise** the repro to the smallest set of steps; confirm it on the live site.
3. **Classify**: defect (product) · known persona behaviour · test-debt · rejected.
4. **Encode**: add the scenario to `catalog/scenarios.json`, regenerate `docs/test-catalog.md`, write the CLI test with stable locators. For a product defect, assert the *expected* behaviour and mark `test.fail()` with the finding id.
5. **Report**: the HTML report shows it as "expected to fail"; `metrics/summary.md` lists known defects; when the product is fixed the test turns red and the finding is closed.
