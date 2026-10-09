#!/usr/bin/env python3
"""Generates catalog/scenarios.json — the machine-readable scenario catalog.

Single source of truth for the risk/scenario coverage metric computed by
reporters/metrics-reporter.ts. The human-readable version (with steps,
preconditions and expected results) is docs/test-catalog.md.

Run: python3 catalog/build-scenarios.py
"""
import json
import pathlib

# id, area, title, risk, priority, type, automated, spec
S = [
    # --- Authentication ---------------------------------------------------
    ("AUTH-001", "Authentication", "Valid login lands on catalog", "high", "P1", "smoke", True, "tests/smoke/auth.spec.ts"),
    ("AUTH-002", "Authentication", "Wrong password rejected", "high", "P1", "smoke", True, "tests/smoke/auth.spec.ts"),
    ("AUTH-003", "Authentication", "Empty username / both fields empty", "medium", "P2", "ui", True, "tests/ui/auth.spec.ts"),
    ("AUTH-004", "Authentication", "Empty password", "medium", "P2", "ui", True, "tests/ui/auth.spec.ts"),
    ("AUTH-005", "Authentication", "Locked-out user refused", "high", "P1", "smoke", True, "tests/smoke/auth.spec.ts"),
    ("AUTH-006", "Authentication", "Logout returns to login", "high", "P1", "smoke", True, "tests/smoke/auth.spec.ts"),
    ("AUTH-007", "Authentication", "Protected routes redirect anonymous users with message", "high", "P1", "smoke+ui", True, "tests/smoke/auth.spec.ts, tests/ui/auth.spec.ts"),
    ("AUTH-008", "Authentication", "Unknown user, case, whitespace, injection-like input", "medium", "P2", "ui", True, "tests/ui/auth.spec.ts"),
    ("AUTH-009", "Authentication", "Error banner can be dismissed", "low", "P3", "ui", True, "tests/ui/auth.spec.ts"),
    ("AUTH-010", "Authentication", "Back after logout does not reveal catalog", "high", "P1", "ui", True, "tests/ui/auth.spec.ts"),
    ("AUTH-011", "Authentication", "Expired session forces new login", "high", "P2", "ui", True, "tests/ui/auth.spec.ts"),
    ("AUTH-012", "Authentication", "Keyboard-only login", "low", "P3", "ui", True, "tests/ui/auth.spec.ts"),
    ("AUTH-013", "Authentication", "Password field is masked", "medium", "P3", "ui", True, "tests/ui/auth.spec.ts"),
    ("AUTH-014", "Authentication", "Session cookie set on login / removed on logout", "medium", "P2", "ui", True, "tests/ui/auth.spec.ts"),
    ("AUTH-015", "Authentication", "Brute-force / rate limiting on login", "medium", "P3", "exploratory", False, "n/a — client-side auth, no server to rate-limit (documented)"),
    # --- Catalog ----------------------------------------------------------
    ("CAT-001", "Catalog", "6 reference products displayed", "high", "P1", "smoke", True, "tests/smoke/inventory.spec.ts"),
    ("CAT-002", "Catalog", "Prices match reference data", "high", "P1", "ui", True, "tests/ui/catalog.spec.ts"),
    ("CAT-003", "Catalog", "Default sort A→Z", "medium", "P2", "ui", True, "tests/ui/catalog.spec.ts"),
    ("CAT-004", "Catalog", "Sort Z→A", "medium", "P2", "ui", True, "tests/ui/catalog.spec.ts"),
    ("CAT-005", "Catalog", "Sort price low→high", "medium", "P2", "ui", True, "tests/ui/catalog.spec.ts"),
    ("CAT-006", "Catalog", "Sort price high→low", "medium", "P2", "ui", True, "tests/ui/catalog.spec.ts"),
    ("CAT-007", "Catalog", "Detail page consistent with list (x6)", "high", "P1", "ui", True, "tests/ui/catalog.spec.ts"),
    ("CAT-008", "Catalog", "Back to products", "low", "P3", "ui", True, "tests/ui/catalog.spec.ts"),
    ("CAT-009", "Catalog", "Unknown product id handled", "medium", "P3", "ui", True, "tests/ui/catalog.spec.ts"),
    ("CAT-010", "Catalog", "Cart state survives sort change", "medium", "P2", "ui", True, "tests/ui/catalog.spec.ts"),
    ("CAT-011", "Catalog", "Images loaded and distinct", "medium", "P2", "ui", True, "tests/ui/catalog.spec.ts"),
    ("CAT-012", "Catalog", "Visual regression of catalog layout", "low", "P3", "regression", False, "backlog — toHaveScreenshot needs pinned OS/fonts baseline in CI"),
    # --- Cart ---------------------------------------------------------------
    ("CART-001", "Cart", "Add product updates badge", "high", "P1", "smoke", True, "tests/smoke/inventory.spec.ts"),
    ("CART-002", "Cart", "Multiple products: badge, list, prices agree", "high", "P1", "ui", True, "tests/ui/cart.spec.ts"),
    ("CART-003", "Cart", "Remove from cart page", "high", "P1", "ui", True, "tests/ui/cart.spec.ts"),
    ("CART-004", "Cart", "Add/Remove toggle reversible", "medium", "P2", "ui", True, "tests/ui/cart.spec.ts"),
    ("CART-005", "Cart", "Add from detail page", "medium", "P2", "ui", True, "tests/ui/cart.spec.ts"),
    ("CART-006", "Cart", "Cart survives reload", "high", "P1", "ui", True, "tests/ui/cart.spec.ts"),
    ("CART-007", "Cart", "Continue Shopping keeps cart", "medium", "P2", "ui", True, "tests/ui/cart.spec.ts"),
    ("CART-008", "Cart", "Reset App State empties cart", "medium", "P2", "ui", True, "tests/ui/cart.spec.ts"),
    ("CART-009", "Cart", "Quantity fixed to 1", "low", "P3", "ui", True, "tests/ui/cart.spec.ts"),
    ("CART-011", "Cart", "UI and localStorage in sync", "medium", "P2", "ui", True, "tests/ui/cart.spec.ts"),
    # --- Checkout -----------------------------------------------------------
    ("CHK-001", "Checkout", "Golden path purchase", "high", "P1", "smoke", True, "tests/smoke/inventory.spec.ts"),
    ("CHK-002", "Checkout", "Missing first name blocked", "high", "P1", "ui", True, "tests/ui/checkout.spec.ts"),
    ("CHK-003", "Checkout", "Missing last name blocked", "high", "P1", "ui", True, "tests/ui/checkout.spec.ts"),
    ("CHK-004", "Checkout", "Missing postal code blocked", "high", "P1", "ui", True, "tests/ui/checkout.spec.ts"),
    ("CHK-005", "Checkout", "Subtotal + 8% tax = total (1, 2, 6 items)", "high", "P1", "ui", True, "tests/ui/checkout.spec.ts"),
    ("CHK-006", "Checkout", "Cancel on step one keeps cart", "medium", "P2", "ui", True, "tests/ui/checkout.spec.ts"),
    ("CHK-007", "Checkout", "Cancel on overview keeps cart", "medium", "P2", "ui", True, "tests/ui/checkout.spec.ts"),
    ("CHK-008", "Checkout", "Cart emptied after order", "high", "P1", "e2e", True, "tests/e2e/checkout-flow.spec.ts"),
    ("CHK-009", "Checkout", "Overview lists cart content + payment/shipping", "high", "P1", "ui", True, "tests/ui/checkout.spec.ts"),
    ("CHK-010", "Checkout", "Back Home after confirmation", "low", "P3", "e2e", True, "tests/e2e/checkout-flow.spec.ts"),
    ("CHK-011", "Checkout", "PDF receipt download", "medium", "P2", "e2e", True, "tests/e2e/checkout-flow.spec.ts"),
    ("CHK-014", "Checkout", "Unicode names / alphanumeric postal codes", "medium", "P2", "ui", True, "tests/ui/checkout.spec.ts"),
    # --- E2E ----------------------------------------------------------------
    ("E2E-001", "E2E", "Full journey with UI login, list + detail add", "high", "P1", "e2e", True, "tests/e2e/checkout-flow.spec.ts"),
    ("E2E-002", "E2E", "Post-order state reset", "high", "P1", "e2e", True, "tests/e2e/checkout-flow.spec.ts"),
    ("E2E-003", "E2E", "Interrupted purchase then completed", "medium", "P2", "e2e", True, "tests/e2e/checkout-flow.spec.ts"),
    ("E2E-004", "E2E", "Receipt download journey", "medium", "P2", "e2e", True, "tests/e2e/checkout-flow.spec.ts"),
    # --- Robustness ---------------------------------------------------------
    ("ROB-001", "Robustness", "Double-click add to cart", "medium", "P2", "regression", True, "tests/regression/robustness.spec.ts"),
    ("ROB-002", "Robustness", "Refresh on overview", "medium", "P2", "regression", True, "tests/regression/robustness.spec.ts"),
    ("ROB-003", "Robustness", "Back after completed order", "medium", "P2", "regression", True, "tests/regression/robustness.spec.ts"),
    ("ROB-004", "Robustness", "Deep link + refresh", "high", "P2", "regression", True, "tests/regression/robustness.spec.ts"),
    ("ROB-005", "Robustness", "Two tabs share cart", "low", "P3", "regression", True, "tests/regression/robustness.spec.ts"),
    ("ROB-006", "Robustness", "Back/Forward catalog ⇄ detail", "low", "P3", "regression", True, "tests/regression/robustness.spec.ts"),
    # --- Personas -------------------------------------------------------------
    ("USR-001", "Personas", "problem_user: placeholder images", "low", "P3", "regression", True, "tests/regression/user-behaviors.spec.ts"),
    ("USR-002", "Personas", "problem_user: some add-to-cart ignored", "medium", "P3", "regression", True, "tests/regression/user-behaviors.spec.ts"),
    ("USR-003", "Personas", "problem_user: last name overwrites first name", "medium", "P3", "regression", True, "tests/regression/user-behaviors.spec.ts"),
    ("USR-004", "Personas", "problem_user: sorting inert", "low", "P3", "regression", True, "tests/regression/user-behaviors.spec.ts"),
    ("USR-005", "Personas", "error_user: add throws, cart unchanged", "medium", "P3", "regression", True, "tests/regression/user-behaviors.spec.ts"),
    ("USR-006", "Personas", "performance_glitch_user slower than standard", "medium", "P2", "regression", True, "tests/regression/user-behaviors.spec.ts"),
    ("USR-007", "Personas", "error_user: finish does not empty cart", "medium", "P3", "regression", True, "tests/regression/user-behaviors.spec.ts"),
    ("USR-008", "Personas", "visual_user: prices differ", "low", "P3", "regression", True, "tests/regression/user-behaviors.spec.ts"),
    ("REG-001", "Personas", "Cart persists after reload (v1)", "high", "P1", "regression", True, "tests/regression/user-behaviors.spec.ts"),
    ("REG-002", "Personas", "Logout keeps cart (current behaviour)", "high", "P2", "regression", True, "tests/regression/user-behaviors.spec.ts"),
    # --- HTTP / network -------------------------------------------------------
    ("API-001", "HTTP & network", "GET / serves HTML shell", "high", "P1", "api", True, "tests/api/http-resources.spec.ts"),
    ("API-002", "HTTP & network", "JS bundle served", "high", "P1", "api", True, "tests/api/http-resources.spec.ts"),
    ("API-003", "HTTP & network", "Manifest contract + icons", "low", "P3", "api", True, "tests/api/http-resources.spec.ts"),
    ("API-004", "HTTP & network", "robots.txt", "low", "P3", "api", True, "tests/api/http-resources.spec.ts"),
    ("API-005", "HTTP & network", "Deep links → 404 + SPA bootstrap", "medium", "P2", "api", True, "tests/api/http-resources.spec.ts"),
    ("API-006", "HTTP & network", "No business API exposed", "low", "P3", "api", True, "tests/api/http-resources.spec.ts"),
    ("API-007", "HTTP & network", "Shell response-time budget", "medium", "P2", "api", True, "tests/api/http-resources.spec.ts"),
    ("NET-001", "HTTP & network", "No uncaught JS error on login", "high", "P1", "api", True, "tests/api/network.spec.ts"),
    ("NET-002", "HTTP & network", "No failed first-party request in purchase", "high", "P1", "api", True, "tests/api/network.spec.ts"),
    ("NET-003", "HTTP & network", "Accept header on navigation", "low", "P3", "api", True, "tests/api/network.spec.ts"),
    ("NET-004", "HTTP & network", "Server 503 surfaced (mocked)", "medium", "P2", "api", True, "tests/api/network.spec.ts"),
    ("NET-005", "HTTP & network", "Images blocked: still usable", "medium", "P2", "api", True, "tests/api/network.spec.ts"),
    ("NET-006", "HTTP & network", "Slow network: still usable", "medium", "P2", "api", True, "tests/api/network.spec.ts"),
    ("NET-007", "HTTP & network", "Bundle failure: no broken form", "low", "P3", "api", True, "tests/api/network.spec.ts"),
    # --- Mock API (NOT SauceDemo) -------------------------------------------
    ("MOCK-001", "Mock Orders API", "Health identifies mock", "low", "P3", "mock", True, "tests/api/orders-contract.mock.spec.ts"),
    ("MOCK-002", "Mock Orders API", "201 + contract", "medium", "P2", "mock", True, "tests/api/orders-contract.mock.spec.ts"),
    ("MOCK-003", "Mock Orders API", "Totals rule = UI rule", "medium", "P2", "mock", True, "tests/api/orders-contract.mock.spec.ts"),
    ("MOCK-004", "Mock Orders API", "Read back / 404", "low", "P3", "mock", True, "tests/api/orders-contract.mock.spec.ts"),
    ("MOCK-005", "Mock Orders API", "Validation 400 (x5)", "medium", "P2", "mock", True, "tests/api/orders-contract.mock.spec.ts"),
    ("MOCK-006", "Mock Orders API", "Auth 401", "medium", "P2", "mock", True, "tests/api/orders-contract.mock.spec.ts"),
    ("MOCK-007", "Mock Orders API", "Idempotency 201/409", "medium", "P2", "mock", True, "tests/api/orders-contract.mock.spec.ts"),
    # --- Exploratory findings & a11y ---------------------------------------
    ("EXP-001", "Exploratory findings", "Cart leaks to next user after logout", "high", "P1", "exploratory", True, "tests/exploratory/findings.spec.ts"),
    ("EXP-002", "Exploratory findings", "Deep links return HTTP 404", "medium", "P2", "exploratory", True, "tests/api/http-resources.spec.ts"),
    ("EXP-003", "Exploratory findings", "Whitespace-only customer info accepted", "medium", "P2", "exploratory", True, "tests/exploratory/findings.spec.ts"),
    ("EXP-004", "Exploratory findings", "Checkout with empty cart", "high", "P2", "exploratory", True, "tests/exploratory/findings.spec.ts"),
    ("EXP-005", "Exploratory findings", "Refresh on confirmation loses receipt", "low", "P3", "exploratory", True, "tests/exploratory/findings.spec.ts"),
    ("EXP-006", "Exploratory findings", "Sort resets after detail round-trip", "low", "P3", "exploratory", True, "tests/exploratory/findings.spec.ts"),
    ("A11Y-001", "Accessibility", "Login page: no critical axe violation", "medium", "P2", "exploratory", True, "tests/exploratory/accessibility.spec.ts"),
    ("A11Y-002", "Accessibility", "Shop pages: no critical axe violation", "medium", "P2", "exploratory", True, "tests/exploratory/accessibility.spec.ts"),
    ("A11Y-003", "Accessibility", "Screen-reader walkthrough (manual)", "medium", "P3", "exploratory", False, "manual charter CH-05"),
]

out = {
    "description": "Scenario catalog for SauceDemo — see docs/test-catalog.md. Coverage = scenarios executed, not code coverage.",
    "scenarios": [
        dict(zip(["id", "area", "title", "risk", "priority", "type", "automated", "spec"], row)) for row in S
    ],
}
path = pathlib.Path(__file__).with_name("scenarios.json")
path.write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print(f"{len(S)} scenarios -> {path}")
