# Test catalog & coverage matrix

> Generated from `catalog/scenarios.json` by `catalog/build-catalog-doc.py` — edit those, not this file.
> **Coverage here = scenario/risk coverage**, i.e. which catalogued risks have an automated check. It is *not* code coverage.

Legend — Risk: business impact × likelihood (high / medium / low). Priority: P1 must pass to release, P2 should pass, P3 nice to have.
Type: smoke · ui · e2e · api · regression · exploratory · mock (⚠️ mock = not SauceDemo). Automated: ✅ yes · ⬜ no (reason given).

## 1. Coverage matrix

| Area | Scenarios | Automated | High risk | High-risk automated |
|---|---:|---:|---:|---:|
| Authentication | 15 | 14 | 7 | 7 |
| Catalog | 12 | 11 | 3 | 3 |
| Cart | 10 | 10 | 4 | 4 |
| Checkout | 12 | 12 | 7 | 7 |
| E2E | 4 | 4 | 2 | 2 |
| Robustness | 6 | 6 | 1 | 1 |
| Personas | 10 | 10 | 2 | 2 |
| HTTP & network | 14 | 14 | 4 | 4 |
| Mock Orders API | 7 | 7 | 0 | 0 |
| Exploratory findings | 6 | 6 | 2 | 2 |
| Accessibility | 3 | 2 | 0 | 0 |
| **Total** | **99** | **96** | **32** | **32** |

Live numbers for a given run (executed / failing scenarios per risk level) are written to `metrics/summary.md` by the metrics reporter.

## 2. Scenarios

### Authentication

| ID | Objective | Risk | Preconditions | Data | Steps | Expected result | Prio | Type | Automation |
|---|---|---|---|---|---|---|---|---|---|
| AUTH-001 | Valid login lands on catalog | **high** — Nobody can buy if login breaks | Anonymous browser context, on the login page | standard_user / secret_sauce | Fill username, password; click Login | Catalog displayed, URL /inventory.html, title 'Swag Labs' | P1 | smoke | ✅ `tests/smoke/auth.spec.ts` |
| AUTH-002 | Wrong password rejected | **high** — Weak credential check / misleading error | Anonymous browser context, on the login page | standard_user / wrong_password | Submit form | Error 'Username and password do not match…'; stays on login | P1 | smoke | ✅ `tests/smoke/auth.spec.ts` |
| AUTH-003 | Empty username / both fields empty | **medium** — Unclear validation | Anonymous browser context, on the login page | empty username (with/without password) | Submit form | Error 'Username is required' | P2 | ui | ✅ `tests/ui/auth.spec.ts` |
| AUTH-004 | Empty password | **medium** — Unclear validation | Anonymous browser context, on the login page | standard_user / empty | Submit form | Error 'Password is required' | P2 | ui | ✅ `tests/ui/auth.spec.ts` |
| AUTH-005 | Locked-out user refused | **high** — Suspended account still gets in | Anonymous browser context, on the login page | locked_out_user | Submit form | Error 'Sorry, this user has been locked out.'; no access | P1 | smoke | ✅ `tests/smoke/auth.spec.ts` |
| AUTH-006 | Logout returns to login | **high** — Session not terminated | Logged in as standard_user (session cookie), on /inventory.html | — | Menu › Logout | Login form displayed | P1 | smoke | ✅ `tests/smoke/auth.spec.ts` |
| AUTH-007 | Protected routes redirect anonymous users with message | **high** — Protected pages reachable anonymously | Anonymous browser context, on the login page | 5 protected routes | Open route directly | Redirect to login + "You can only access '<route>' when you are logged in." | P1 | smoke+ui | ✅ `tests/smoke/auth.spec.ts, tests/ui/auth.spec.ts` |
| AUTH-008 | Unknown user, case, whitespace, injection-like input | **medium** — Lenient matching lets wrong users in | Anonymous browser context, on the login page | ghost_user, Standard_User, 'standard_user ', "' OR '1'='1" | Submit each | Generic invalid-credentials error for all | P2 | ui | ✅ `tests/ui/auth.spec.ts` |
| AUTH-009 | Error banner can be dismissed | **low** — Error cannot be cleared | Login error displayed | wrong password | Click the ✕ on the banner | Banner hidden | P3 | ui | ✅ `tests/ui/auth.spec.ts` |
| AUTH-010 | Back after logout does not reveal catalog | **high** — Cached page leaks data after logout | Logged in as standard_user (session cookie), on /inventory.html | — | Logout, browser Back | Login page, catalog not shown | P1 | ui | ✅ `tests/ui/auth.spec.ts` |
| AUTH-011 | Expired session forces new login | **high** — Expired session still usable | Logged in as standard_user (session cookie), on /inventory.html | — | Delete session cookie, reload | Redirected to login | P2 | ui | ✅ `tests/ui/auth.spec.ts` |
| AUTH-012 | Keyboard-only login | **low** — Keyboard users blocked | Anonymous browser context, on the login page | valid creds | Fill fields, press Enter | Catalog displayed | P3 | ui | ✅ `tests/ui/auth.spec.ts` |
| AUTH-013 | Password field is masked | **medium** — Password shoulder-surfing | Anonymous browser context, on the login page | — | Inspect password input | type=password | P3 | ui | ✅ `tests/ui/auth.spec.ts` |
| AUTH-014 | Session cookie set on login / removed on logout | **medium** — Session not created/destroyed correctly | Anonymous browser context, on the login page | valid creds | Login, read cookies; logout, read cookies | session-username=standard_user, then removed | P2 | ui | ✅ `tests/ui/auth.spec.ts` |
| AUTH-015 | Brute-force / rate limiting on login | **medium** — Credential stuffing | Anonymous browser context, on the login page | — | Not automatable: auth is client-side | Documented limitation | P3 | exploratory | ⬜ n/a — client-side auth, no server to rate-limit (documented) |

### Catalog

| ID | Objective | Risk | Preconditions | Data | Steps | Expected result | Prio | Type | Automation |
|---|---|---|---|---|---|---|---|---|---|
| CAT-001 | 6 reference products displayed | **high** — Empty or incomplete catalog | Logged in as standard_user (session cookie), on /inventory.html | 6 reference products | Read product names | Exactly the 6 reference names | P1 | smoke | ✅ `tests/smoke/inventory.spec.ts` |
| CAT-002 | Prices match reference data | **high** — Wrong price displayed (legal/commercial) | Logged in as standard_user (session cookie), on /inventory.html | reference prices | Read price of each card | Each matches reference | P1 | ui | ✅ `tests/ui/catalog.spec.ts` |
| CAT-003 | Default sort A→Z | **medium** — Default order wrong | Logged in as standard_user (session cookie), on /inventory.html | — | Read sort label and names | 'Name (A to Z)', names ascending | P2 | ui | ✅ `tests/ui/catalog.spec.ts` |
| CAT-004 | Sort Z→A | **medium** — Broken sort | Logged in as standard_user (session cookie), on /inventory.html | option za | Select option | Names descending, 6 items | P2 | ui | ✅ `tests/ui/catalog.spec.ts` |
| CAT-005 | Sort price low→high | **medium** — Broken sort | Logged in as standard_user (session cookie), on /inventory.html | option lohi | Select option | Prices ascending | P2 | ui | ✅ `tests/ui/catalog.spec.ts` |
| CAT-006 | Sort price high→low | **medium** — Broken sort | Logged in as standard_user (session cookie), on /inventory.html | option hilo | Select option | Prices descending | P2 | ui | ✅ `tests/ui/catalog.spec.ts` |
| CAT-007 | Detail page consistent with list (x6) | **high** — List and detail disagree (price/description) | Logged in as standard_user (session cookie), on /inventory.html | each of 6 products | Read card; open detail | Same name, price, description; URL id matches | P1 | ui | ✅ `tests/ui/catalog.spec.ts` |
| CAT-008 | Back to products | **low** — Navigation dead end | On a detail page | — | Click Back to products | Catalog displayed | P3 | ui | ✅ `tests/ui/catalog.spec.ts` |
| CAT-009 | Unknown product id handled | **medium** — Crash on bad link | Logged in as standard_user (session cookie), on /inventory.html | id=999 | Open /inventory-item.html?id=999 | 'ITEM NOT FOUND', back button available | P3 | ui | ✅ `tests/ui/catalog.spec.ts` |
| CAT-010 | Cart state survives sort change | **medium** — Re-render loses cart | Logged in as standard_user (session cookie), on /inventory.html | Onesie in cart | Change sort | Onesie still 'Remove', badge 1 | P2 | ui | ✅ `tests/ui/catalog.spec.ts` |
| CAT-011 | Images loaded and distinct | **medium** — Broken images | Logged in as standard_user (session cookie), on /inventory.html | — | Inspect 6 images | All loaded, 6 distinct sources | P2 | ui | ✅ `tests/ui/catalog.spec.ts` |
| CAT-012 | Visual regression of catalog layout | **low** — Layout regressions | Logged in as standard_user (session cookie), on /inventory.html | — | Screenshot compare (backlog) | Matches baseline | P3 | regression | ⬜ backlog — toHaveScreenshot needs pinned OS/fonts baseline in CI |

### Cart

| ID | Objective | Risk | Preconditions | Data | Steps | Expected result | Prio | Type | Automation |
|---|---|---|---|---|---|---|---|---|---|
| CART-001 | Add product updates badge | **high** — Add to cart broken | Logged in as standard_user (session cookie), on /inventory.html | Backpack | Click Add to cart | Badge 0 → 1 | P1 | smoke | ✅ `tests/smoke/inventory.spec.ts` |
| CART-002 | Multiple products: badge, list, prices agree | **high** — Badge/cart desync | Logged in as standard_user (session cookie), on /inventory.html | 3 products | Add 3, open cart | Badge 3, same names and prices in cart | P1 | ui | ✅ `tests/ui/cart.spec.ts` |
| CART-003 | Remove from cart page | **high** — Cannot remove | 2 items in cart | Backpack, Bike Light | Remove Backpack in cart | Only Bike Light, badge 1 | P1 | ui | ✅ `tests/ui/cart.spec.ts` |
| CART-004 | Add/Remove toggle reversible | **medium** — Toggle stuck | Logged in as standard_user (session cookie), on /inventory.html | Bolt T-Shirt | Add then Remove on catalog | Badge hidden, button 'Add to cart' | P2 | ui | ✅ `tests/ui/cart.spec.ts` |
| CART-005 | Add from detail page | **medium** — Detail page add broken | Logged in as standard_user (session cookie), on /inventory.html | Fleece Jacket | Open detail, Add to cart, open cart | Item in cart, badge 1 | P2 | ui | ✅ `tests/ui/cart.spec.ts` |
| CART-006 | Cart survives reload | **high** — Cart lost on refresh | Logged in as standard_user (session cookie), on /inventory.html | Backpack | Add, reload | Badge 1 | P1 | ui | ✅ `tests/ui/cart.spec.ts` |
| CART-007 | Continue Shopping keeps cart | **medium** — Cart lost on navigation | 1 item in cart | Onesie | Cart › Continue Shopping | Catalog with 'Remove' on Onesie | P2 | ui | ✅ `tests/ui/cart.spec.ts` |
| CART-008 | Reset App State empties cart | **medium** — Reset does not reset | 2 items in cart | — | Menu › Reset App State | Badge hidden, storage cleared | P2 | ui | ✅ `tests/ui/cart.spec.ts` |
| CART-009 | Quantity fixed to 1 | **low** — Wrong quantities | Cart seeded via storage | 2 items | Open cart | Quantity 1 for each | P3 | ui | ✅ `tests/ui/cart.spec.ts` |
| CART-011 | UI and localStorage in sync | **medium** — UI ⇄ storage drift | Cart seeded via storage | Red T-Shirt | Check badge; add Backpack; read storage | Badge 1; storage holds both ids | P2 | ui | ✅ `tests/ui/cart.spec.ts` |

### Checkout

| ID | Objective | Risk | Preconditions | Data | Steps | Expected result | Prio | Type | Automation |
|---|---|---|---|---|---|---|---|---|---|
| CHK-001 | Golden path purchase | **high** — Revenue path broken | Logged in as standard_user (session cookie), on /inventory.html | Backpack, Jane Doe 75001 | Add → cart → checkout → info → finish | 'Thank you for your order!' | P1 | smoke | ✅ `tests/smoke/inventory.spec.ts` |
| CHK-002 | Missing first name blocked | **high** — Incomplete order accepted | Checkout step one, 1 item | first name empty | Continue | 'Error: First Name is required', stays on step one | P1 | ui | ✅ `tests/ui/checkout.spec.ts` |
| CHK-003 | Missing last name blocked | **high** — Incomplete order accepted | Checkout step one, 1 item | last name empty | Continue | 'Error: Last Name is required' | P1 | ui | ✅ `tests/ui/checkout.spec.ts` |
| CHK-004 | Missing postal code blocked | **high** — Incomplete order accepted | Checkout step one, 1 item | postal code empty | Continue | 'Error: Postal Code is required' | P1 | ui | ✅ `tests/ui/checkout.spec.ts` |
| CHK-005 | Subtotal + 8% tax = total (1, 2, 6 items) | **high** — Wrong amount charged | Cart seeded with 1, 2, 6 items | reference prices, 8% tax | Go to overview, read subtotal/tax/total | subtotal = Σ prices; tax = round(8%); total = subtotal + tax | P1 | ui | ✅ `tests/ui/checkout.spec.ts` |
| CHK-006 | Cancel on step one keeps cart | **medium** — Cancel loses cart | Checkout step one | — | Cancel | Cart page with item kept | P2 | ui | ✅ `tests/ui/checkout.spec.ts` |
| CHK-007 | Cancel on overview keeps cart | **medium** — Cancel loses cart | Checkout overview | — | Cancel | Catalog, badge 1 | P2 | ui | ✅ `tests/ui/checkout.spec.ts` |
| CHK-008 | Cart emptied after order | **high** — Order completed but cart kept → double order | Order finished | 2 items | Back Home | Badge hidden, no 'Remove' buttons | P1 | e2e | ✅ `tests/e2e/checkout-flow.spec.ts` |
| CHK-009 | Overview lists cart content + payment/shipping | **high** — Summary differs from cart | Overview, 2 items | Bolt T-Shirt, Fleece Jacket | Read summary | Same 2 items, payment & shipping info present | P1 | ui | ✅ `tests/ui/checkout.spec.ts` |
| CHK-010 | Back Home after confirmation | **low** — Dead end after order | Order finished | — | Back Home | Catalog displayed | P3 | e2e | ✅ `tests/e2e/checkout-flow.spec.ts` |
| CHK-011 | PDF receipt download | **medium** — No proof of purchase | Order finished | — | Click 'Generate PDF order' | File swag-labs-order-<timestamp>.pdf, valid PDF header | P2 | e2e | ✅ `tests/e2e/checkout-flow.spec.ts` |
| CHK-014 | Unicode names / alphanumeric postal codes | **medium** — International customers rejected | Checkout step one | Zoë Ñúñez-O’Brien, SW1A 1AA | Continue | Overview reached | P2 | ui | ✅ `tests/ui/checkout.spec.ts` |

### E2E

| ID | Objective | Risk | Preconditions | Data | Steps | Expected result | Prio | Type | Automation |
|---|---|---|---|---|---|---|---|---|---|
| E2E-001 | Full journey with UI login, list + detail add | **high** — Integration of all steps | Anonymous browser context, on the login page | 2 products (list + detail) | UI login → add → cart → info → verify totals → finish | Confirmation, badge hidden | P1 | e2e | ✅ `tests/e2e/checkout-flow.spec.ts` |
| E2E-002 | Post-order state reset | **high** — State not reset after order | Cart seeded, order finished | 2 items | Back Home | Clean catalog | P1 | e2e | ✅ `tests/e2e/checkout-flow.spec.ts` |
| E2E-003 | Interrupted purchase then completed | **medium** — Interrupted journeys | Logged in as standard_user (session cookie), on /inventory.html | Fleece → Onesie | Checkout, cancel, change basket, checkout again, finish | Subtotal = Onesie price, confirmation | P2 | e2e | ✅ `tests/e2e/checkout-flow.spec.ts` |
| E2E-004 | Receipt download journey | **medium** — Receipt journey | Order finished | Backpack | Download PDF | Valid PDF > 1 KB | P2 | e2e | ✅ `tests/e2e/checkout-flow.spec.ts` |

### Robustness

| ID | Objective | Risk | Preconditions | Data | Steps | Expected result | Prio | Type | Automation |
|---|---|---|---|---|---|---|---|---|---|
| ROB-001 | Double-click add to cart | **medium** — Duplicate items on impatient clicks | Logged in as standard_user (session cookie), on /inventory.html | Backpack | Double-click Add to cart | ≤ 1 item stored, badge = storage | P2 | regression | ✅ `tests/regression/robustness.spec.ts` |
| ROB-002 | Refresh on overview | **medium** — Refresh loses order | Overview | Backpack | Reload | Same summary | P2 | regression | ✅ `tests/regression/robustness.spec.ts` |
| ROB-003 | Back after completed order | **medium** — Back resurrects paid cart | Order finished | Onesie | Browser Back | Overview empty, badge hidden | P2 | regression | ✅ `tests/regression/robustness.spec.ts` |
| ROB-004 | Deep link + refresh | **high** — Deep links broken by hosting | Logged in as standard_user (session cookie), on /inventory.html | /cart.html | Open + reload | Cart page | P2 | regression | ✅ `tests/regression/robustness.spec.ts` |
| ROB-005 | Two tabs share cart | **low** — Multi-tab inconsistency | Logged in as standard_user (session cookie), on /inventory.html (2 tabs) | Bike Light | Add in tab 1, reload tab 2 | Badge 1 in tab 2 | P3 | regression | ✅ `tests/regression/robustness.spec.ts` |
| ROB-006 | Back/Forward catalog ⇄ detail | **low** — History navigation breaks state | Logged in as standard_user (session cookie), on /inventory.html | Backpack | Detail, Back, Forward | State consistent | P3 | regression | ✅ `tests/regression/robustness.spec.ts` |

### Personas

| ID | Objective | Risk | Preconditions | Data | Steps | Expected result | Prio | Type | Automation |
|---|---|---|---|---|---|---|---|---|---|
| USR-001 | problem_user: placeholder images | **low** — Known defect regresses/changes | problem_user | — | Inspect images | All = sl-404 placeholder | P3 | regression | ✅ `tests/regression/user-behaviors.spec.ts` |
| USR-002 | problem_user: some add-to-cart ignored | **medium** — Known defect | problem_user | Backpack (even id), Bolt (odd id) | Add both | Badge stays 1 | P3 | regression | ✅ `tests/regression/user-behaviors.spec.ts` |
| USR-003 | problem_user: last name overwrites first name | **medium** — Known defect | problem_user, step one | Jane / Doe | Type first then last name | Last name empty, first name overwritten | P3 | regression | ✅ `tests/regression/user-behaviors.spec.ts` |
| USR-004 | problem_user: sorting inert | **low** — Known defect | problem_user | za | Sort | Order unchanged | P3 | regression | ✅ `tests/regression/user-behaviors.spec.ts` |
| USR-005 | error_user: add throws, cart unchanged | **medium** — Known defect | error_user | Bolt T-Shirt | Add to cart | Uncaught error, badge hidden | P3 | regression | ✅ `tests/regression/user-behaviors.spec.ts` |
| USR-006 | performance_glitch_user slower than standard | **medium** — Performance degradation unnoticed | 2 fresh contexts | standard vs performance_glitch | Time login → catalog visible | glitch − standard > 2 s (observed ≈ 5 s) | P2 | regression | ✅ `tests/regression/user-behaviors.spec.ts` |
| USR-007 | error_user: finish does not empty cart | **medium** — Known defect | error_user, 1 item | no last name | Continue, Finish | Badge still 1 | P3 | regression | ✅ `tests/regression/user-behaviors.spec.ts` |
| USR-008 | visual_user: prices differ | **low** — Known defect | visual_user | — | Read prices | Differ from reference | P3 | regression | ✅ `tests/regression/user-behaviors.spec.ts` |
| REG-001 | Cart persists after reload (v1) | **high** — Cart lost on refresh | Logged in as standard_user (session cookie), on /inventory.html | Backpack | Add, reload | Badge 1 | P1 | regression | ✅ `tests/regression/user-behaviors.spec.ts` |
| REG-002 | Logout keeps cart (current behaviour) | **high** — Behaviour change unnoticed | Anonymous browser context, on the login page | standard_user twice | Add, logout, login | Badge 1 (current behaviour; risk in EXP-001) | P2 | regression | ✅ `tests/regression/user-behaviors.spec.ts` |

### HTTP & network

| ID | Objective | Risk | Preconditions | Data | Steps | Expected result | Prio | Type | Automation |
|---|---|---|---|---|---|---|---|---|---|
| API-001 | GET / serves HTML shell | **high** — Site down | HTTP client, no browser | GET / | Request | 200, text/html, root div, title | P1 | api | ✅ `tests/api/http-resources.spec.ts` |
| API-002 | JS bundle served | **high** — Broken deploy (missing bundle) | HTTP client | script src from / | GET each bundle | 200, javascript, > 1 KB | P1 | api | ✅ `tests/api/http-resources.spec.ts` |
| API-003 | Manifest contract + icons | **low** — PWA metadata broken | HTTP client | /manifest.json | GET manifest + icons | Contract fields present, icons 200 with declared type | P3 | api | ✅ `tests/api/http-resources.spec.ts` |
| API-004 | robots.txt | **low** — Crawlers misconfigured | HTTP client | /robots.txt | GET | 200 text/plain | P3 | api | ✅ `tests/api/http-resources.spec.ts` |
| API-005 | Deep links → 404 + SPA bootstrap | **medium** — Monitoring/SEO see 404s | HTTP client | 3 deep links | GET each | 404 + SPA bootstrap page (finding EXP-002) | P2 | api | ✅ `tests/api/http-resources.spec.ts` |
| API-006 | No business API exposed | **low** — Undocumented endpoints | HTTP client | /api/* | GET | 404 (no API) | P3 | api | ✅ `tests/api/http-resources.spec.ts` |
| API-007 | Shell response-time budget | **medium** — Slow origin | HTTP client | GET / | Time request | < 3 s | P2 | api | ✅ `tests/api/http-resources.spec.ts` |
| NET-001 | No uncaught JS error on login | **high** — Silent JS errors | Anonymous browser context, on the login page | standard_user | Login, catalog | No pageerror | P1 | api | ✅ `tests/api/network.spec.ts` |
| NET-002 | No failed first-party request in purchase | **high** — Silent 4xx/5xx | Anonymous browser context, on the login page | standard_user | Login → add → cart → checkout | No failed first-party sub-request | P1 | api | ✅ `tests/api/network.spec.ts` |
| NET-003 | Accept header on navigation | **low** — Wrong content negotiation | Anonymous browser context, on the login page | — | Navigate to / | Accept contains text/html | P3 | api | ✅ `tests/api/network.spec.ts` |
| NET-004 | Server 503 surfaced (mocked) | **medium** — Outage not surfaced | Route mocked to 503 | — | Open / | Status 503, message shown | P2 | api | ✅ `tests/api/network.spec.ts` |
| NET-005 | Images blocked: still usable | **medium** — Images block usage | Images aborted | standard_user | Login | Catalog with 6 items | P2 | api | ✅ `tests/api/network.spec.ts` |
| NET-006 | Slow network: still usable | **medium** — Slow network breaks app | JS delayed 1.5 s | standard_user | Login | Catalog displayed | P2 | api | ✅ `tests/api/network.spec.ts` |
| NET-007 | Bundle failure: no broken form | **low** — Half-rendered broken UI | Main bundle aborted | — | Open / | No login form rendered | P3 | api | ✅ `tests/api/network.spec.ts` |

### Mock Orders API

| ID | Objective | Risk | Preconditions | Data | Steps | Expected result | Prio | Type | Automation |
|---|---|---|---|---|---|---|---|---|---|
| MOCK-001 | Health identifies mock | **low** — Mock mistaken for real API | Mock started | — | GET /health | {status ok, mock true}, x-mock-api header | P3 | mock | ✅ `tests/api/orders-contract.mock.spec.ts` |
| MOCK-002 | 201 + contract | **medium** — Contract drift | Mock + token | 2 items, Jane Doe | POST /orders | 201, exact contract shape | P2 | mock | ✅ `tests/api/orders-contract.mock.spec.ts` |
| MOCK-003 | Totals rule = UI rule | **medium** — Backend/UI pricing mismatch | Mock + token | 6 items | POST /orders | Totals = UI rule | P2 | mock | ✅ `tests/api/orders-contract.mock.spec.ts` |
| MOCK-004 | Read back / 404 | **low** — Orders not persisted | Mock + token | — | POST then GET by id; GET unknown | 200 same body; 404 | P3 | mock | ✅ `tests/api/orders-contract.mock.spec.ts` |
| MOCK-005 | Validation 400 (x5) | **medium** — Invalid orders accepted | Mock + token | 5 invalid bodies | POST | 400 VALIDATION_ERROR with detail | P2 | mock | ✅ `tests/api/orders-contract.mock.spec.ts` |
| MOCK-006 | Auth 401 | **medium** — Unauthenticated orders | Mock | no/wrong token | POST | 401 | P2 | mock | ✅ `tests/api/orders-contract.mock.spec.ts` |
| MOCK-007 | Idempotency 201/409 | **medium** — Duplicate orders on retry | Mock + token | Idempotency-Key | POST twice; POST different body | Same orderId; 409 | P2 | mock | ✅ `tests/api/orders-contract.mock.spec.ts` |

### Exploratory findings

| ID | Objective | Risk | Preconditions | Data | Steps | Expected result | Prio | Type | Automation |
|---|---|---|---|---|---|---|---|---|---|
| EXP-001 | Cart leaks to next user after logout | **high** — Privacy: cart leaks across users | Anonymous browser context, on the login page | standard_user then visual_user | Add, logout, login as other user | EXPECTED empty cart — ACTUAL 1 item (test.fail) | P1 | exploratory | ✅ `tests/exploratory/findings.spec.ts` |
| EXP-002 | Deep links return HTTP 404 | **medium** — Monitoring false alarms | HTTP client | deep links | GET | Documented via API-005 | P2 | exploratory | ✅ `tests/api/http-resources.spec.ts` |
| EXP-003 | Whitespace-only customer info accepted | **medium** — Garbage order data | Checkout step one | '  ' in all fields | Continue | EXPECTED blocked — ACTUAL accepted (test.fail) | P2 | exploratory | ✅ `tests/exploratory/findings.spec.ts` |
| EXP-004 | Checkout with empty cart | **high** — $0 empty order | Logged in as standard_user (session cookie), on /inventory.html, empty cart | — | Open cart | EXPECTED Checkout disabled — ACTUAL enabled (test.fail) | P2 | exploratory | ✅ `tests/exploratory/findings.spec.ts` |
| EXP-005 | Refresh on confirmation loses receipt | **low** — Receipt lost | Order finished | Onesie | Reload confirmation | EXPECTED PDF button — ACTUAL gone (test.fail) | P3 | exploratory | ✅ `tests/exploratory/findings.spec.ts` |
| EXP-006 | Sort resets after detail round-trip | **low** — UX: sort forgotten | Logged in as standard_user (session cookie), on /inventory.html | hilo | Sort, open detail, back | EXPECTED hilo kept — ACTUAL reset (test.fail) | P3 | exploratory | ✅ `tests/exploratory/findings.spec.ts` |

### Accessibility

| ID | Objective | Risk | Preconditions | Data | Steps | Expected result | Prio | Type | Automation |
|---|---|---|---|---|---|---|---|---|---|
| A11Y-001 | Login page: no critical axe violation | **medium** — Users with disabilities blocked | Anonymous browser context, on the login page | axe wcag2a/aa | Scan login | No critical violation (report attached) | P2 | exploratory | ✅ `tests/exploratory/accessibility.spec.ts` |
| A11Y-002 | Shop pages: no critical axe violation | **medium** — Users with disabilities blocked | Logged in as standard_user (session cookie), on /inventory.html | axe wcag2a/aa | Scan 4 shop pages | No critical violation | P2 | exploratory | ✅ `tests/exploratory/accessibility.spec.ts` |
| A11Y-003 | Screen-reader walkthrough (manual) | **medium** — Screen-reader usability | Manual | NVDA/VoiceOver | Charter CH-05 | Findings logged | P3 | exploratory | ⬜ manual charter CH-05 |

## 3. Traceability rules

- Every automated test title starts with its scenario ID (`AUTH-001 …`); data-driven variants add a suffix (`CHK-005b`).
- Tests that reproduce a known defect use `test.fail()` and the `@known-issue` tag; they turn red the day the defect is fixed.
- Azure DevOps Test Plans: add the ADO test-case id as a tag (`{ tag: '@[1234]' }`) — see docs/architecture.md.
