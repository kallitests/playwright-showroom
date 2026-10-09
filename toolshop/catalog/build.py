#!/usr/bin/env python3
"""Toolshop scenario catalog -> toolshop/catalog/scenarios.json + docs/toolshop-test-catalog.md

Run: python3 toolshop/catalog/build.py
"""
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
ANON = "Anonymous API client"
CUST = "API client logged in as demo customer"
UI = "Browser on the Toolshop home page (en-US)"

# id, area, title, risk, prio, type, automated, spec, risk statement, preconditions, data, steps, expected
S = [
 ("TPRD-001","Catalog API","Status endpoint","high","P1","api",True,"api/products.spec.ts","Wrong deployment tested / API down",ANON,"—","GET /status","200, app_name Toolshop, version"),
 ("TPRD-002","Catalog API","Product list contract & pagination meta","high","P1","api",True,"api/products.spec.ts","Front-end breaks on contract drift",ANON,"—","GET /products","200 JSON, Zod schema, 9 per page, last_page = ceil(total/9)"),
 ("TPRD-003","Catalog API","All pages = every product once","high","P1","api",True,"api/products.spec.ts","Products lost/duplicated by pagination",ANON,"—","Walk pages 1..last_page","count = total, ids unique"),
 ("TPRD-004","Catalog API","Detail consistent with list","medium","P2","api",True,"api/products.spec.ts","Price differs list vs detail",ANON,"first listed product","GET /products/{id}","Schema + specs; same name/price/stock"),
 ("TPRD-005","Catalog API","Unknown id → 404","medium","P2","api",True,"api/products.spec.ts","Crash/500 on bad link",ANON,"01ZZZ…","GET /products/{bad}","404 'Requested item not found'"),
 ("TPRD-006","Catalog API","Search relevance","high","P1","api",True,"api/products.spec.ts","Customers cannot find products",ANON,"q=hammer","GET /products/search","every hit contains 'hammer'"),
 ("TPRD-007","Catalog API","Search without match","low","P3","api",True,"api/products.spec.ts","Error instead of empty state",ANON,"q=zzz…","GET /products/search","200, total 0, data []"),
 ("TPRD-008","Catalog API","Sort by price asc/desc over whole catalog","medium","P2","api",True,"api/products.spec.ts","Wrong order",ANON,"sort=price,asc|desc","Walk all pages","monotonic prices"),
 ("TPRD-009","Catalog API","Sort by name","low","P3","api",True,"api/products.spec.ts","Wrong order",ANON,"sort=name,asc","GET /products","alphabetical"),
 ("TPRD-010","Catalog API","Filters: category, brand, price range, eco, rental","high","P1","api",True,"api/products.spec.ts","Filters leak other products",ANON,"hammer, first brand, 1–10, eco, rental","GET /products with each filter","every item satisfies its filter"),
 ("TPRD-011","Catalog API","Rentals excluded from shop listing","medium","P2","api",True,"api/products.spec.ts","Rental machines sold as tools",ANON,"—","Walk default listing","no is_rental item"),
 ("TPRD-012","Catalog API","Brands & category tree contracts","medium","P2","api",True,"api/products.spec.ts","Navigation menus break",ANON,"—","GET /brands, /categories/tree","schemas, unique slugs, sub-categories"),
 ("TCRT-001","Cart API","Cart lifecycle","high","P1","api",True,"api/carts.spec.ts","Cart operations broken",ANON,"2 in-stock products","create → add → read → update → remove → delete","201/200/204, state after each step, 404 after delete"),
 ("TCRT-002","Cart API","Line carries catalog price","high","P1","api",True,"api/carts.spec.ts","Wrong price charged",ANON,"1 product","Add, read cart","line price = catalog price"),
 ("TCRT-003","Cart API","Same product twice → one line","medium","P2","api",True,"api/carts.spec.ts","Duplicate lines",ANON,"qty 1 then 2","Add twice","1 line (quantity annotated; 3 observed live)"),
 ("TCRT-004","Cart API","Line validation (x5)","high","P1","api",True,"api/carts.spec.ts","Invalid lines accepted",ANON,"qty 0, 100, 'abc', unknown/missing product","POST /carts/{id}","422 with exact field message; cart unchanged"),
 ("TCRT-005","Cart API","Quantity boundary 99","medium","P2","api",True,"api/carts.spec.ts","Off-by-one",ANON,"qty 99","Add","200, quantity 99"),
 ("TCRT-006","Cart API","Rental + product → 15 % bundle discount","high","P1","api",True,"api/carts.spec.ts","Discount wrongly applied",ANON,"1 product, then 1 rental","Add, read","null → 15"),
 ("TCRT-007","Cart API","Unknown cart → 404","low","P3","api",True,"api/carts.spec.ts","500 on stale cart id",ANON,"ghost id","GET / POST","404"),
 ("TAUTH-001","Auth API","Valid login → JWT","high","P1","api",True,"api/auth.spec.ts","Nobody can log in",ANON,"demo customer","POST /users/login","200 bearer JWT (3 parts)"),
 ("TAUTH-002","Auth API","/users/me without sensitive fields","high","P1","api",True,"api/auth.spec.ts","Password/role leak",CUST,"—","GET /users/me","profile; no password/role/totp fields"),
 ("TAUTH-003","Auth API","Anonymous → 401 on protected endpoints","high","P1","api",True,"api/auth.spec.ts","Data exposed anonymously",ANON,"/users/me, /invoices, /favorites","GET","401 Unauthorized"),
 ("TAUTH-004","Auth API","Forged token rejected","high","P1","api",True,"api/auth.spec.ts","Token forgery",ANON,"bad signature JWT","GET /users/me","401"),
 ("TAUTH-005","Auth API","Customer → admin endpoint 403","high","P1","api",True,"api/auth.spec.ts","Privilege escalation",CUST,"—","GET /users","403 Forbidden"),
 ("TAUTH-006","Auth API","Logout invalidates token","high","P2","api",True,"api/auth.spec.ts","Stolen token reusable after logout","Throw-away user","—","login, /me, logout, /me","200, 200, 401"),
 ("TAUTH-007","Auth API","Unknown e-mail → generic 401","medium","P2","api",True,"api/auth.spec.ts","User enumeration",ANON,"nobody@example.com","POST /users/login","401 {error: Unauthorized}"),
 ("TAUTH-008","Auth API","Lockout after 3 failures","high","P1","api",True,"api/auth.spec.ts","Brute force","Throw-away user","3 wrong passwords then right one","POST /users/login x4","401 x3 then 423 'Account locked'"),
 ("TAUTH-009","Auth API","Registration: weak password, duplicate e-mail","medium","P2","api",True,"api/auth.spec.ts","Weak accounts / duplicates","Throw-away user","'abc', existing e-mail","POST /users/register","422 on password / email"),
 ("TPAY-001","Payment API","Valid details accepted (4 methods)","high","P1","api",True,"api/orders.spec.ts","Customers cannot pay",ANON,"COD, bank, card (future expiry), BNPL","POST /payment/check","200 'Payment was successful'"),
 ("TPAY-002","Payment API","Invalid details rejected (x5)","high","P1","api",True,"api/orders.spec.ts","Bad payment data accepted",ANON,"card format, expired, CVV, account no., BNPL","POST /payment/check","422 on the right field"),
 ("TORD-001","Orders API","Guest order totals","high","P1","api",True,"api/orders.spec.ts","Wrong invoice amount",ANON,"2×A + 1×B (C–E rated), NL address from lookup","cart → POST /invoices/guest","201, schema, subtotal = total = Σ"),
 ("TORD-002","Orders API","Order validation","high","P1","api",True,"api/orders.spec.ts","Invalid orders accepted",ANON,"bitcoin, wrong city, no address","POST /invoices/guest","422 on payment_method / billing_country / required fields"),
 ("TORD-003","Orders API","Customer sees only own invoices","high","P1","api",True,"api/orders.spec.ts","Data leak between customers",CUST,"—","GET /invoices","no foreign user_id"),
 ("TUCAT-001","Catalog UI","Home = API page 1","high","P1","ui",True,"ui/catalog.spec.ts","Rendering/mapping bug",UI,"API as oracle","Open home","same names, prices, order"),
 ("TUCAT-002","Catalog UI","Search","high","P1","ui",True,"ui/catalog.spec.ts","Search broken",UI,"pliers","Type, submit","caption + API results"),
 ("TUCAT-003","Catalog UI","Search empty state","low","P3","ui",True,"ui/catalog.spec.ts","Blank page",UI,"zzz…","Search","'There are no products found.'"),
 ("TUCAT-004","Catalog UI","Search reset","low","P3","ui",True,"ui/catalog.spec.ts","Stuck filter",UI,"hammer","Search, reset","full page 1 again"),
 ("TUCAT-005","Catalog UI","Sort price asc/desc","medium","P2","ui",True,"ui/catalog.spec.ts","Wrong order",UI,"price,asc|desc","Select sort","matches API, monotonic"),
 ("TUCAT-006","Catalog UI","Category filter","medium","P2","ui",True,"ui/catalog.spec.ts","Filter leaks",UI,"Hammer","Tick checkbox","API result for that category"),
 ("TUCAT-007","Catalog UI","Pagination","medium","P2","ui",True,"ui/catalog.spec.ts","Missing/duplicated items",UI,"page 2","Click Page-2","API page 2, no overlap"),
 ("TUCAT-008","Catalog UI","Product detail","high","P1","ui",True,"ui/catalog.spec.ts","Wrong price/description",UI,"first product","Open card","name, price, description = API"),
 ("TUCAT-009","Catalog UI","Out-of-stock blocked in UI","high","P1","ui",True,"ui/catalog.spec.ts","Overselling","Out-of-stock product","—","Open detail","badge, add & qty disabled"),
 ("TUCAT-010","Catalog UI","Language switch persists","medium","P3","ui",True,"ui/catalog.spec.ts","i18n broken",UI,"FR","Switch, reload","'Accueil' kept"),
 ("TUCRT-001","Cart UI","Add from product page","high","P1","ui",True,"ui/cart.spec.ts","Add to cart broken",UI,"qty 2","Add, open cart","badge 2, line = price×2"),
 ("TUCRT-002","Cart UI","API cart displayed with totals","high","P1","ui",True,"ui/cart.spec.ts","Totals wrong","Cart created via API","3×A + 1×B","Open /checkout","lines and total match"),
 ("TUCRT-003","Cart UI","Change quantity","high","P1","ui",True,"ui/cart.spec.ts","UI/server desync","Cart via API","1 → 4","Edit quantity","line price ×4; server qty 4"),
 ("TUCRT-004","Cart UI","Remove lines → empty state","medium","P2","ui",True,"ui/cart.spec.ts","Ghost lines","Cart via API (2 lines)","—","Remove both","server updated; empty message"),
 ("TUCRT-005","Cart UI","Bundle discount displayed","high","P1","ui",True,"ui/cart.spec.ts","Discount not shown/applied","Cart via API","product + rental","Open cart","discount row; total −15 %"),
 ("TUCRT-006","Cart UI","Cart survives reload","medium","P2","ui",True,"ui/cart.spec.ts","Lost cart","Cart via API","qty 2","Reload","qty 2 kept"),
 ("TUAUTH-001","Auth UI","Login form","high","P1","ui",True,"ui/auth.spec.ts","Login broken",UI,"demo customer","Fill, submit","/account, name in menu, token stored"),
 ("TUAUTH-002","Auth UI","Required fields, no API call","medium","P2","ui",True,"ui/auth.spec.ts","Useless server calls / unclear errors",UI,"empty","Submit","2 messages, 0 /users/login calls"),
 ("TUAUTH-003","Auth UI","E-mail format","low","P3","ui",True,"ui/auth.spec.ts","Unclear validation",UI,"not-an-email","Submit","'Email format is invalid'"),
 ("TUAUTH-004","Auth UI","Wrong password","high","P1","ui",True,"ui/auth.spec.ts","Misleading error","Throw-away user","wrong password","Submit","'Invalid email or password'"),
 ("TUAUTH-005","Auth UI","Logout protects account","high","P1","ui",True,"ui/auth.spec.ts","Session survives logout","Logged in via API token","—","Logout, open /account","token removed, redirected to login"),
 ("TUAUTH-006","Auth UI","API token honoured by UI","medium","P2","ui",True,"ui/auth.spec.ts","Hybrid auth broken","Token injected","—","Open /account","My account"),
 ("TUCON-001","Contact UI","Required fields, nothing sent","medium","P2","ui",True,"ui/contact.spec.ts","Empty messages",UI,"empty","Submit","5 errors, no POST /messages"),
 ("TUCON-002","Contact UI","Message ≥ 50 chars","low","P3","ui",True,"ui/contact.spec.ts","Unclear validation",UI,"'Too short.'","Submit","min-length message"),
 ("TUCON-003","Contact UI","E-mail format","low","P3","ui",True,"ui/contact.spec.ts","Unreachable sender",UI,"jane@","Submit","email error"),
 ("TE2E-001","E2E","Guest purchase via UI","high","P1","e2e",True,"e2e/checkout.spec.ts","Revenue path broken",UI,"pliers ×2, NL 1011AB, COD","search → detail → cart → guest → address → pay","invoice INV-…, badge cleared"),
 ("TE2E-002","E2E","Customer checkout, hybrid","high","P1","e2e",True,"e2e/checkout.spec.ts","UI and server disagree","API login + API cart","2 C–E products","UI checkout, then GET /invoices","invoice listed with same total"),
 ("TEXP-001","Findings","Out-of-stock addable via API","high","P1","exploratory",True,"api/findings.spec.ts","Overselling",ANON,"Long Nose Pliers","POST /carts/{id}","EXPECTED 422 — ACTUAL 200 (test.fail)"),
 ("TEXP-002","Findings","Unknown payment method 'successful'","medium","P2","exploratory",True,"api/findings.spec.ts","Misleading confirmation",ANON,"bitcoin","POST /payment/check","EXPECTED 422 — ACTUAL 200 (test.fail)"),
 ("TEXP-003","Findings","Anonymous POST /products, /brands","high","P1","exploratory",True,"api/findings.spec.ts","Broken access control",ANON,"empty body (no side effect)","POST","EXPECTED 401 — ACTUAL 422 (test.fail)"),
 ("TEXP-004","Findings","Contact: UI min 50 chars vs API no minimum","low","P3","exploratory",False,"not automated — would write a message on the shared demo","Rules differ by channel","Source review","short message","POST /messages","Documented hypothesis, to confirm on a private instance"),
 ("TEXP-005","Findings","Two 422 error formats","low","P3","exploratory",True,"api/findings.spec.ts","Client complexity",ANON,"cart vs register errors","POST","EXPECTED same shape — ACTUAL differs (test.fail)"),
 ("TA11Y-001","Accessibility","axe sweep (4 pages)","medium","P2","exploratory",True,"exploratory/accessibility.spec.ts","Barriers",UI,"wcag2a/aa","Scan","no critical violation; report attached"),
 ("TPERF-001","Performance","Response-time budgets","medium","P3","api",False,"backlog","Slow API","—","—","—","p95 budget per endpoint (needs a private instance — no load on the shared demo)"),
]

scen = [dict(id=r[0], area=r[1], title=r[2], risk=r[3], priority=r[4], type=r[5], automated=r[6], spec=r[7]) for r in S]
(ROOT / "toolshop/catalog/scenarios.json").write_text(json.dumps({"description": "Toolshop scenario catalog — see docs/toolshop-test-catalog.md", "scenarios": scen}, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

c = lambda t: str(t).replace("|", "\\|")
lines = ["# Toolshop — test catalog & coverage matrix", "", "> Generated by `toolshop/catalog/build.py`. Coverage = scenario/risk coverage, not code coverage.", "",
         "| Area | Scenarios | Automated | High risk | High-risk automated |", "|---|---:|---:|---:|---:|"]
areas = list(dict.fromkeys(r[1] for r in S))
for a in areas:
    rows = [r for r in S if r[1] == a]; hi = [r for r in rows if r[3] == "high"]
    lines.append(f"| {a} | {len(rows)} | {sum(r[6] for r in rows)} | {len(hi)} | {sum(r[6] for r in hi)} |")
hi = [r for r in S if r[3] == "high"]
lines.append(f"| **Total** | **{len(S)}** | **{sum(r[6] for r in S)}** | **{len(hi)}** | **{sum(r[6] for r in hi)}** |")
lines += ["", "## Scenarios", ""]
for a in areas:
    lines += [f"### {a}", "", "| ID | Objective | Risk | Preconditions | Data | Steps | Expected | Prio | Type | Automation |", "|---|---|---|---|---|---|---|---|---|---|"]
    for r in [x for x in S if x[1] == a]:
        auto = f"✅ `toolshop/tests/{r[7]}`" if r[6] else f"⬜ {r[7]}"
        lines.append(f"| {r[0]} | {c(r[2])} | **{r[3]}** — {c(r[8])} | {c(r[9])} | {c(r[10])} | {c(r[11])} | {c(r[12])} | {r[4]} | {r[5]} | {auto} |")
    lines.append("")
(ROOT / "docs/toolshop-test-catalog.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
print(len(S), "scenarios")
