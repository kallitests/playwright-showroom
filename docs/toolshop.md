# Toolshop — second application of the showroom (UI + real REST API)

[Practice Software Testing — Toolshop](https://practicesoftwaretesting.com) (Testsmith, open source: [testsmith-io/practice-software-testing](https://github.com/testsmith-io/practice-software-testing)) is a tool e-shop with an **Angular UI on top of a real Laravel REST API** (Swagger: `https://api.practicesoftwaretesting.com/api/documentation`). It complements SauceDemo, which has no backend: here API tests are tests of the product, and UI tests can use the API both to **prepare** state and to **verify** it.

| | SauceDemo | Toolshop |
|---|---|---|
| Backend | none (cookie + localStorage) | REST API, JWT auth, MySQL |
| API testing | HTTP surface + clearly labelled mock | **real** contract, validation, auth, business rules |
| UI preconditions | cookie / localStorage injection | **API calls** (login, cart) injected into the browser session |
| Defect-detection proof | mutation of a local build | official **`with-bugs`** deployment of the same app |

## 1. What was verified, and how (2026-10-09)

Neither the sandbox where this suite was written nor the Cowork VM could reach `practicesoftwaretesting.com` (egress policy), and the backend cannot be built offline (Packagist and Docker Hub are blocked too). So:

- **Live exploration in a real browser** (Claude's built-in browser on the author's machine — the MCP-style workflow of `docs/mcp-examples.md`): every *anonymous* endpoint used by the tests was called from the page with `fetch` and its status code, payload and messages recorded — products, search, filters, sort, pagination, brands, categories, carts (full lifecycle, every validation message), postcode lookup, payment check (valid and invalid), invoice validation errors, access-control probes. UI pages and `data-test` attributes were read from the live DOM.
- **Source review** (repo @ `5a6ccc2`, 2026-10-07 = deployed v5.0): routes, controllers, validation rules, services (discounts, lockout), Angular templates, i18n strings, browser storage keys.
- **Not done live, on purpose:** logging in, registering accounts and placing orders from the exploration browser (credential entry and data creation are left to the test runner). Those tests (`TAUTH-*`, `TORD-001`, `TE2E-*`, UI login tests) are written from the sources and **have not been executed yet**.

➡️ **The Toolshop suite has been type-checked and linted, not run.** First real run: the `Toolshop` GitHub workflow, or locally `npm run toolshop` (see §5).

## 2. Risks and coverage

67 scenarios — 65 automated, 36 high-risk all automated. Full table with preconditions, data, steps, expected results: [toolshop-test-catalog.md](toolshop-test-catalog.md).

| Risk | Covered by |
|---|---|
| Customer cannot find / buy | TPRD-006/010, TUCAT-001/002, TE2E-001/002 |
| Wrong amount (price, quantity, discounts) | TCRT-002/006, TORD-001, TUCRT-002/003/005, TE2E-002 |
| Invalid data accepted (cart, payment, order) | TCRT-004/005, TPAY-002, TORD-002 |
| Authentication / authorisation | TAUTH-001…009, TORD-003, TUAUTH-* |
| Contract drift between API and UI | Zod schemas on every response, API-as-oracle UI tests |
| Overselling, access control (findings) | TEXP-001, TEXP-003 |

## 3. Design

```
toolshop/
├── config.ts            environments (prod | with-bugs | overrides), public demo accounts, storage keys, business rules
├── api/ToolshopApi.ts   typed client over APIRequestContext (raw calls for API tests, helpers for preconditions)
├── api/schemas.ts       Zod contracts (passthrough: new fields OK, missing/retyped fields fail) + security refinement on /users/me
├── fixtures.ts          api · customerApi · throwawayUser · loggedInPage (JWT → localStorage) · withCart (API cart → sessionStorage) · page objects
├── pages/               Catalog, Product, Checkout (4-step wizard), Login, Contact, components/Header
├── tests/api/           products · carts · auth · orders (payment + invoices) · findings
├── tests/ui/            catalog · cart · auth · contact
├── tests/e2e/           guest journey (pure UI) · customer journey (hybrid API ⇄ UI)
├── tests/exploratory/   axe sweep
└── catalog/build.py     scenarios.json (metrics) + docs/toolshop-test-catalog.md
playwright.toolshop.config.ts   projects: api (no browser) · chromium · firefox · webkit
```

Decisions worth defending in an interview:

- **Separate config, shared tooling.** Toolshop has its own config, base URLs and catalog; it reuses the ESLint rules, the metrics reporter, alerting and CI patterns. SauceDemo commands are unchanged.
- **`api` project without a browser.** 50 API tests run in seconds and first in CI.
- **Hybrid tests.** `loggedInPage` gets a JWT from `/users/login` and seeds `localStorage["auth-token"]` before the app boots; `withCart` creates a cart through the API and seeds `sessionStorage["cart_id"]`. Each UI test checks one behaviour; the API is then the oracle (`TUCRT-003` checks the server quantity, `TE2E-002` finds the invoice through `/invoices`).
- **API as oracle instead of hard-coded data.** The demo catalog may change; tests compare the UI with what the API returns.
- **Shared-demo etiquette.** 3 failed logins lock a non-admin account (HTTP 423): negative password tests use a **throw-away user** registered per test, never the public accounts. Orders use cash-on-delivery and `@example.com` addresses. Parallelism is capped. Access-control probes send empty bodies (no data can be created). The contact form is validated but never sent.
- **Locale pinned to en-US.** The app chooses its language from `navigator.language` — seen live: the French browser got "Ajouter au panier". Without `locale: 'en-US'`, text assertions would depend on the machine.

## 4. Exploratory findings (verified live 2026-10-09)

| ID | Finding | Evidence | Severity | Test |
|---|---|---|---|---|
| **TEXP-001** | Out-of-stock product can be added to a cart **through the API** (UI disables the button) — business rule enforced client-side only | `POST /carts/{id}` with *Long Nose Pliers* → `200 item added or updated`; `CartController::addItem` validates existence, not stock | Major (overselling) | test.fail |
| **TEXP-002** | `/payment/check` answers **"Payment was successful"** for an unknown method (`bitcoin`) | live 200; `PaymentController::check` only validates known methods (the invoice endpoint does reject it) | Medium | test.fail |
| **TEXP-003** | **Write endpoints without authentication:** anonymous `POST /products` and `POST /brands` reach validation (422 field errors) instead of 401 | live 422 with an empty body; `ProductController` only protects `destroy` with `role:admin` | Critical (OWASP API5) | test.fail |
| TEXP-004 | Contact message: UI requires ≥ 50 characters, API accepts any length ≤ 250 | `StoreContact` rules vs Angular validator | Low | not automated (would write to the shared demo) |
| **TEXP-005** | Two different 422 formats: `{message, errors}` (inline validation) vs flat `{field: [...]}` (FormRequest: register, products, brands) | live responses of `/carts/{id}` and `/users/register` | Low | test.fail |
| Testability | Cart "remove" control has no `data-test` nor accessible name; IDs mix upper-case (products) and lower-case (carts) ULIDs | DOM / API payloads | — | noted in `CheckoutPage.removeLine` |

Also observed: `per_page` is ignored (always 9 items); adding the same product twice merges quantities (1 + 2 → 3); the `with-bugs` deployment returns 200 for unknown products and 404 on `POST /carts` — the nightly **defect-detection** job runs the API suite there and is *expected* to fail.

## 5. Running it

```bash
npm ci && npx playwright install chromium
npm run toolshop:api          # API only, no browser
npm run toolshop:smoke        # API + UI smoke
npm run toolshop              # API + UI/E2E on Chromium
npm run toolshop:cross-browser
npm run toolshop:with-bugs    # same suite on the buggy deployment → failures expected
npm run toolshop:report       # HTML report
METRICS_DIR=metrics-toolshop npm run report:metrics
npx playwright test -c playwright.toolshop.config.ts -g "TCRT-006" --headed
```

CI: `.github/workflows/toolshop.yml` (API + smoke on push, cross-browser on PR, nightly full run + with-bugs defect detection, manual `environment`/`grep` inputs).

## 6. Known limits

- **Not executed yet** (network restrictions of the authoring environment) — expect a first run to need small selector/timing adjustments; the UI tests were written against the live DOM but never driven by Playwright.
- `TORD-001`, `TE2E-*` create orders on the public demo (cash on delivery, example.com e-mails). Run them sparingly or against a private instance (`TOOLSHOP_UI_URL` / `TOOLSHOP_API_URL`, e.g. the project's docker-compose).
- Performance budgets (TPERF-001) intentionally not automated against a shared demo.
