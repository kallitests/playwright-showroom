#!/usr/bin/env python3
"""Generates docs/test-catalog.md from catalog/scenarios.json + the details below.

Run after editing scenarios:  python3 catalog/build-scenarios.py && python3 catalog/build-catalog-doc.py
"""
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
data = json.loads((ROOT / "catalog" / "scenarios.json").read_text(encoding="utf-8"))["scenarios"]

STD = "Logged in as standard_user (session cookie), on /inventory.html"
ANON = "Anonymous browser context, on the login page"

# id: (risk statement, preconditions, data, steps, expected result)
D = {
 "AUTH-001": ("Nobody can buy if login breaks", ANON, "standard_user / secret_sauce", "Fill username, password; click Login", "Catalog displayed, URL /inventory.html, title 'Swag Labs'"),
 "AUTH-002": ("Weak credential check / misleading error", ANON, "standard_user / wrong_password", "Submit form", "Error 'Username and password do not match…'; stays on login"),
 "AUTH-003": ("Unclear validation", ANON, "empty username (with/without password)", "Submit form", "Error 'Username is required'"),
 "AUTH-004": ("Unclear validation", ANON, "standard_user / empty", "Submit form", "Error 'Password is required'"),
 "AUTH-005": ("Suspended account still gets in", ANON, "locked_out_user", "Submit form", "Error 'Sorry, this user has been locked out.'; no access"),
 "AUTH-006": ("Session not terminated", STD, "—", "Menu › Logout", "Login form displayed"),
 "AUTH-007": ("Protected pages reachable anonymously", ANON, "5 protected routes", "Open route directly", "Redirect to login + \"You can only access '<route>' when you are logged in.\""),
 "AUTH-008": ("Lenient matching lets wrong users in", ANON, "ghost_user, Standard_User, 'standard_user ', \"' OR '1'='1\"", "Submit each", "Generic invalid-credentials error for all"),
 "AUTH-009": ("Error cannot be cleared", "Login error displayed", "wrong password", "Click the ✕ on the banner", "Banner hidden"),
 "AUTH-010": ("Cached page leaks data after logout", STD, "—", "Logout, browser Back", "Login page, catalog not shown"),
 "AUTH-011": ("Expired session still usable", STD, "—", "Delete session cookie, reload", "Redirected to login"),
 "AUTH-012": ("Keyboard users blocked", ANON, "valid creds", "Fill fields, press Enter", "Catalog displayed"),
 "AUTH-013": ("Password shoulder-surfing", ANON, "—", "Inspect password input", "type=password"),
 "AUTH-014": ("Session not created/destroyed correctly", ANON, "valid creds", "Login, read cookies; logout, read cookies", "session-username=standard_user, then removed"),
 "AUTH-015": ("Credential stuffing", ANON, "—", "Not automatable: auth is client-side", "Documented limitation"),
 "CAT-001": ("Empty or incomplete catalog", STD, "6 reference products", "Read product names", "Exactly the 6 reference names"),
 "CAT-002": ("Wrong price displayed (legal/commercial)", STD, "reference prices", "Read price of each card", "Each matches reference"),
 "CAT-003": ("Default order wrong", STD, "—", "Read sort label and names", "'Name (A to Z)', names ascending"),
 "CAT-004": ("Broken sort", STD, "option za", "Select option", "Names descending, 6 items"),
 "CAT-005": ("Broken sort", STD, "option lohi", "Select option", "Prices ascending"),
 "CAT-006": ("Broken sort", STD, "option hilo", "Select option", "Prices descending"),
 "CAT-007": ("List and detail disagree (price/description)", STD, "each of 6 products", "Read card; open detail", "Same name, price, description; URL id matches"),
 "CAT-008": ("Navigation dead end", "On a detail page", "—", "Click Back to products", "Catalog displayed"),
 "CAT-009": ("Crash on bad link", STD, "id=999", "Open /inventory-item.html?id=999", "'ITEM NOT FOUND', back button available"),
 "CAT-010": ("Re-render loses cart", STD, "Onesie in cart", "Change sort", "Onesie still 'Remove', badge 1"),
 "CAT-011": ("Broken images", STD, "—", "Inspect 6 images", "All loaded, 6 distinct sources"),
 "CAT-012": ("Layout regressions", STD, "—", "Screenshot compare (backlog)", "Matches baseline"),
 "CART-001": ("Add to cart broken", STD, "Backpack", "Click Add to cart", "Badge 0 → 1"),
 "CART-002": ("Badge/cart desync", STD, "3 products", "Add 3, open cart", "Badge 3, same names and prices in cart"),
 "CART-003": ("Cannot remove", "2 items in cart", "Backpack, Bike Light", "Remove Backpack in cart", "Only Bike Light, badge 1"),
 "CART-004": ("Toggle stuck", STD, "Bolt T-Shirt", "Add then Remove on catalog", "Badge hidden, button 'Add to cart'"),
 "CART-005": ("Detail page add broken", STD, "Fleece Jacket", "Open detail, Add to cart, open cart", "Item in cart, badge 1"),
 "CART-006": ("Cart lost on refresh", STD, "Backpack", "Add, reload", "Badge 1"),
 "CART-007": ("Cart lost on navigation", "1 item in cart", "Onesie", "Cart › Continue Shopping", "Catalog with 'Remove' on Onesie"),
 "CART-008": ("Reset does not reset", "2 items in cart", "—", "Menu › Reset App State", "Badge hidden, storage cleared"),
 "CART-009": ("Wrong quantities", "Cart seeded via storage", "2 items", "Open cart", "Quantity 1 for each"),
 "CART-011": ("UI ⇄ storage drift", "Cart seeded via storage", "Red T-Shirt", "Check badge; add Backpack; read storage", "Badge 1; storage holds both ids"),
 "CHK-001": ("Revenue path broken", STD, "Backpack, Jane Doe 75001", "Add → cart → checkout → info → finish", "'Thank you for your order!'"),
 "CHK-002": ("Incomplete order accepted", "Checkout step one, 1 item", "first name empty", "Continue", "'Error: First Name is required', stays on step one"),
 "CHK-003": ("Incomplete order accepted", "Checkout step one, 1 item", "last name empty", "Continue", "'Error: Last Name is required'"),
 "CHK-004": ("Incomplete order accepted", "Checkout step one, 1 item", "postal code empty", "Continue", "'Error: Postal Code is required'"),
 "CHK-005": ("Wrong amount charged", "Cart seeded with 1, 2, 6 items", "reference prices, 8% tax", "Go to overview, read subtotal/tax/total", "subtotal = Σ prices; tax = round(8%); total = subtotal + tax"),
 "CHK-006": ("Cancel loses cart", "Checkout step one", "—", "Cancel", "Cart page with item kept"),
 "CHK-007": ("Cancel loses cart", "Checkout overview", "—", "Cancel", "Catalog, badge 1"),
 "CHK-008": ("Order completed but cart kept → double order", "Order finished", "2 items", "Back Home", "Badge hidden, no 'Remove' buttons"),
 "CHK-009": ("Summary differs from cart", "Overview, 2 items", "Bolt T-Shirt, Fleece Jacket", "Read summary", "Same 2 items, payment & shipping info present"),
 "CHK-010": ("Dead end after order", "Order finished", "—", "Back Home", "Catalog displayed"),
 "CHK-011": ("No proof of purchase", "Order finished", "—", "Click 'Generate PDF order'", "File swag-labs-order-<timestamp>.pdf, valid PDF header"),
 "CHK-014": ("International customers rejected", "Checkout step one", "Zoë Ñúñez-O’Brien, SW1A 1AA", "Continue", "Overview reached"),
 "E2E-001": ("Integration of all steps", ANON, "2 products (list + detail)", "UI login → add → cart → info → verify totals → finish", "Confirmation, badge hidden"),
 "E2E-002": ("State not reset after order", "Cart seeded, order finished", "2 items", "Back Home", "Clean catalog"),
 "E2E-003": ("Interrupted journeys", STD, "Fleece → Onesie", "Checkout, cancel, change basket, checkout again, finish", "Subtotal = Onesie price, confirmation"),
 "E2E-004": ("Receipt journey", "Order finished", "Backpack", "Download PDF", "Valid PDF > 1 KB"),
 "ROB-001": ("Duplicate items on impatient clicks", STD, "Backpack", "Double-click Add to cart", "≤ 1 item stored, badge = storage"),
 "ROB-002": ("Refresh loses order", "Overview", "Backpack", "Reload", "Same summary"),
 "ROB-003": ("Back resurrects paid cart", "Order finished", "Onesie", "Browser Back", "Overview empty, badge hidden"),
 "ROB-004": ("Deep links broken by hosting", STD, "/cart.html", "Open + reload", "Cart page"),
 "ROB-005": ("Multi-tab inconsistency", STD + " (2 tabs)", "Bike Light", "Add in tab 1, reload tab 2", "Badge 1 in tab 2"),
 "ROB-006": ("History navigation breaks state", STD, "Backpack", "Detail, Back, Forward", "State consistent"),
 "USR-001": ("Known defect regresses/changes", "problem_user", "—", "Inspect images", "All = sl-404 placeholder"),
 "USR-002": ("Known defect", "problem_user", "Backpack (even id), Bolt (odd id)", "Add both", "Badge stays 1"),
 "USR-003": ("Known defect", "problem_user, step one", "Jane / Doe", "Type first then last name", "Last name empty, first name overwritten"),
 "USR-004": ("Known defect", "problem_user", "za", "Sort", "Order unchanged"),
 "USR-005": ("Known defect", "error_user", "Bolt T-Shirt", "Add to cart", "Uncaught error, badge hidden"),
 "USR-006": ("Performance degradation unnoticed", "2 fresh contexts", "standard vs performance_glitch", "Time login → catalog visible", "glitch − standard > 2 s (observed ≈ 5 s)"),
 "USR-007": ("Known defect", "error_user, 1 item", "no last name", "Continue, Finish", "Badge still 1"),
 "USR-008": ("Known defect", "visual_user", "—", "Read prices", "Differ from reference"),
 "REG-001": ("Cart lost on refresh", STD, "Backpack", "Add, reload", "Badge 1"),
 "REG-002": ("Behaviour change unnoticed", ANON, "standard_user twice", "Add, logout, login", "Badge 1 (current behaviour; risk in EXP-001)"),
 "API-001": ("Site down", "HTTP client, no browser", "GET /", "Request", "200, text/html, root div, title"),
 "API-002": ("Broken deploy (missing bundle)", "HTTP client", "script src from /", "GET each bundle", "200, javascript, > 1 KB"),
 "API-003": ("PWA metadata broken", "HTTP client", "/manifest.json", "GET manifest + icons", "Contract fields present, icons 200 with declared type"),
 "API-004": ("Crawlers misconfigured", "HTTP client", "/robots.txt", "GET", "200 text/plain"),
 "API-005": ("Monitoring/SEO see 404s", "HTTP client", "3 deep links", "GET each", "404 + SPA bootstrap page (finding EXP-002)"),
 "API-006": ("Undocumented endpoints", "HTTP client", "/api/*", "GET", "404 (no API)"),
 "API-007": ("Slow origin", "HTTP client", "GET /", "Time request", "< 3 s"),
 "NET-001": ("Silent JS errors", ANON, "standard_user", "Login, catalog", "No pageerror"),
 "NET-002": ("Silent 4xx/5xx", ANON, "standard_user", "Login → add → cart → checkout", "No failed first-party sub-request"),
 "NET-003": ("Wrong content negotiation", ANON, "—", "Navigate to /", "Accept contains text/html"),
 "NET-004": ("Outage not surfaced", "Route mocked to 503", "—", "Open /", "Status 503, message shown"),
 "NET-005": ("Images block usage", "Images aborted", "standard_user", "Login", "Catalog with 6 items"),
 "NET-006": ("Slow network breaks app", "JS delayed 1.5 s", "standard_user", "Login", "Catalog displayed"),
 "NET-007": ("Half-rendered broken UI", "Main bundle aborted", "—", "Open /", "No login form rendered"),
 "MOCK-001": ("Mock mistaken for real API", "Mock started", "—", "GET /health", "{status ok, mock true}, x-mock-api header"),
 "MOCK-002": ("Contract drift", "Mock + token", "2 items, Jane Doe", "POST /orders", "201, exact contract shape"),
 "MOCK-003": ("Backend/UI pricing mismatch", "Mock + token", "6 items", "POST /orders", "Totals = UI rule"),
 "MOCK-004": ("Orders not persisted", "Mock + token", "—", "POST then GET by id; GET unknown", "200 same body; 404"),
 "MOCK-005": ("Invalid orders accepted", "Mock + token", "5 invalid bodies", "POST", "400 VALIDATION_ERROR with detail"),
 "MOCK-006": ("Unauthenticated orders", "Mock", "no/wrong token", "POST", "401"),
 "MOCK-007": ("Duplicate orders on retry", "Mock + token", "Idempotency-Key", "POST twice; POST different body", "Same orderId; 409"),
 "EXP-001": ("Privacy: cart leaks across users", ANON, "standard_user then visual_user", "Add, logout, login as other user", "EXPECTED empty cart — ACTUAL 1 item (test.fail)"),
 "EXP-002": ("Monitoring false alarms", "HTTP client", "deep links", "GET", "Documented via API-005"),
 "EXP-003": ("Garbage order data", "Checkout step one", "'  ' in all fields", "Continue", "EXPECTED blocked — ACTUAL accepted (test.fail)"),
 "EXP-004": ("$0 empty order", STD + ", empty cart", "—", "Open cart", "EXPECTED Checkout disabled — ACTUAL enabled (test.fail)"),
 "EXP-005": ("Receipt lost", "Order finished", "Onesie", "Reload confirmation", "EXPECTED PDF button — ACTUAL gone (test.fail)"),
 "EXP-006": ("UX: sort forgotten", STD, "hilo", "Sort, open detail, back", "EXPECTED hilo kept — ACTUAL reset (test.fail)"),
 "A11Y-001": ("Users with disabilities blocked", ANON, "axe wcag2a/aa", "Scan login", "No critical violation (report attached)"),
 "A11Y-002": ("Users with disabilities blocked", STD, "axe wcag2a/aa", "Scan 4 shop pages", "No critical violation"),
 "A11Y-003": ("Screen-reader usability", "Manual", "NVDA/VoiceOver", "Charter CH-05", "Findings logged"),
}

missing = [s["id"] for s in data if s["id"] not in D]
assert not missing, f"details missing for {missing}"

lines = [
    "# Test catalog & coverage matrix",
    "",
    "> Generated from `catalog/scenarios.json` by `catalog/build-catalog-doc.py` — edit those, not this file.",
    "> **Coverage here = scenario/risk coverage**, i.e. which catalogued risks have an automated check. It is *not* code coverage.",
    "",
    "Legend — Risk: business impact × likelihood (high / medium / low). Priority: P1 must pass to release, P2 should pass, P3 nice to have.",
    "Type: smoke · ui · e2e · api · regression · exploratory · mock (⚠️ mock = not SauceDemo). Automated: ✅ yes · ⬜ no (reason given).",
    "",
    "## 1. Coverage matrix",
    "",
    "| Area | Scenarios | Automated | High risk | High-risk automated |",
    "|---|---:|---:|---:|---:|",
]
areas = []
for s in data:
    if s["area"] not in areas:
        areas.append(s["area"])
for a in areas:
    rows = [s for s in data if s["area"] == a]
    hi = [s for s in rows if s["risk"] == "high"]
    lines.append(f"| {a} | {len(rows)} | {sum(s['automated'] for s in rows)} | {len(hi)} | {sum(s['automated'] for s in hi)} |")
tot_hi = [s for s in data if s["risk"] == "high"]
lines.append(f"| **Total** | **{len(data)}** | **{sum(s['automated'] for s in data)}** | **{len(tot_hi)}** | **{sum(s['automated'] for s in tot_hi)}** |")
lines += ["", "Live numbers for a given run (executed / failing scenarios per risk level) are written to `metrics/summary.md` by the metrics reporter.", ""]

lines += ["## 2. Scenarios", ""]
for a in areas:
    lines += [f"### {a}", "", "| ID | Objective | Risk | Preconditions | Data | Steps | Expected result | Prio | Type | Automation |", "|---|---|---|---|---|---|---|---|---|---|"]
    for s in [x for x in data if x["area"] == a]:
        risk, pre, dat, steps, exp = D[s["id"]]
        auto = f"✅ `{s['spec']}`" if s["automated"] else f"⬜ {s['spec']}"
        cell = lambda t: t.replace("|", "\\|")
        lines.append(
            f"| {s['id']} | {cell(s['title'])} | **{s['risk']}** — {cell(risk)} | {cell(pre)} | {cell(dat)} | {cell(steps)} | {cell(exp)} | {s['priority']} | {s['type']} | {auto} |"
        )
    lines.append("")

lines += [
    "## 3. Traceability rules",
    "",
    "- Every automated test title starts with its scenario ID (`AUTH-001 …`); data-driven variants add a suffix (`CHK-005b`).",
    "- Tests that reproduce a known defect use `test.fail()` and the `@known-issue` tag; they turn red the day the defect is fixed.",
    "- Azure DevOps Test Plans: add the ADO test-case id as a tag (`{ tag: '@[1234]' }`) — see docs/architecture.md.",
]
(ROOT / "docs" / "test-catalog.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
print("docs/test-catalog.md written")
