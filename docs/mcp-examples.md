# Playwright MCP — AI-assisted exploration → deterministic CLI tests

Playwright MCP ([microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp), npm `@playwright/mcp`) is a Model Context Protocol server that lets an AI assistant (Claude, Copilot, Cursor…) drive a real browser through tools such as `browser_navigate`, `browser_snapshot` (accessibility tree), `browser_click`, `browser_type`, `browser_evaluate`, `browser_console_messages` and `browser_network_requests`.

**Where it fits in this project — three clearly separated layers:**

| Layer | Tool | Deterministic? | In CI? |
|---|---|---|---|
| Automated tests | Playwright CLI (`npx playwright test`) | Yes | Yes — the only thing that gates a merge |
| Assisted exploration & investigation | Playwright MCP + AI assistant | No (LLM-driven) | No |
| Experimental AI testing | Ad-hoc prompts, AI log analysis (`prompts/log-error-analyzer/`) | No | No — advisory only |

MCP output is *never* a test result. It produces **knowledge** (risks, repro steps, locators) that a human turns into CLI tests.

---

## 1. Setup

The repo ships a project-scoped config in [`.mcp.json`](../.mcp.json) (read by Claude Code and other MCP clients):

```json
{ "mcpServers": { "playwright": { "command": "npx",
  "args": ["@playwright/mcp@0.0.83", "--isolated", "--test-id-attribute=data-test",
           "--output-dir=mcp-output", "--save-session"] } } }
```

- `--isolated`: in-memory profile — every session starts clean (no leftover cart/cookie).
- `--test-id-attribute=data-test`: the assistant proposes `getByTestId(...)` locators matching SauceDemo's attributes and this repo's config.
- `--save-session` + `--output-dir`: keeps the session log for the exploration report (`mcp-output/` is git-ignored if you add it to `.gitignore`).

Other clients:

```bash
# Claude Code (user-level)
claude mcp add playwright npx @playwright/mcp@latest
```

```jsonc
// Claude Desktop — claude_desktop_config.json
{ "mcpServers": { "playwright": { "command": "npx", "args": ["@playwright/mcp@latest", "--isolated"] } } }
```

---

## 2. Workflow 1 — Explore and map risks

Prompt:

> Using the Playwright browser, open https://www.saucedemo.com and log in as standard_user / secret_sauce. Map every page and interactive element (use data-test attributes). For each page, list what state it reads or writes (cookies, localStorage, URL). Then propose the 10 riskiest scenarios for an e-commerce site, ranked by impact × likelihood, as a table with ID, risk and repro idea.

What a good session yields (observed on 2026-10-09):
- session = cookie `session-username`, cart = `localStorage["cart-contents"]` (array of item ids);
- 6 products, ids 0–5 (`item-4-title-link` = Backpack…), tax 8 %;
- risk ideas: logout vs storage, deep links, empty cart checkout, whitespace input.

→ Becomes entries in `catalog/scenarios.json` and charters in `docs/exploratory-testing.md`.

## 3. Workflow 2 — Investigate an anomaly

Prompt (the investigation that produced **EXP-001**):

> Log in as standard_user, add "Sauce Labs Backpack" to the cart, log out, then log in as visual_user. What does the cart badge show? Read document.cookie and localStorage after each step and report them as a table. Is the cart tied to the user?

Evidence collected live:

| Step | cookie | `cart-contents` | badge |
|---|---|---|---|
| standard_user adds Backpack | `session-username=standard_user` | `[4]` | 1 |
| Logout | *(empty)* | `[4]` | — |
| visual_user logs in | `session-username=visual_user` | `[4]` | **1** ← leak |

Follow-up prompt: *"Check with browser_network_requests whether GET /inventory.html returns 200."* → revealed **EXP-002** (HTTP 404 + SPA redirect on every deep link).

## 4. Workflow 3 — Convert findings into deterministic CLI tests

Prompt:

> Write a Playwright Test (TypeScript) for the cart-leak scenario using this repo's fixtures (`import { test, expect } from '../../fixtures'`), page objects (`inventoryPage.header.logout()`, `loginPage.login(USERS.visual)`) and `getByTestId`. Assert the expected behaviour (empty cart) and mark the test with `test.fail()` referencing EXP-001. No waitForTimeout.

Then the human review checklist before committing (this is where MCP output becomes trustworthy):

- [ ] Locators are `getByTestId` / `getByRole`, no CSS classes or nth-child.
- [ ] Preconditions use fixtures (cookie login, `seedCart`) instead of replaying clicks.
- [ ] Web-first assertions only; `npm run lint` passes (`no-wait-for-timeout`, `prefer-web-first-assertions`).
- [ ] Scenario ID in the title, added to `catalog/scenarios.json`, catalog doc regenerated.
- [ ] Run it 5× in a row: `npx playwright test -g EXP-001 --repeat-each=5`.
- [ ] Verify it fails for the right reason (temporarily break the expectation).

Result: [`tests/exploratory/findings.spec.ts`](../tests/exploratory/findings.spec.ts).

## 5. Useful one-shot prompts

| Goal | Prompt |
|---|---|
| Data extraction | "Log in, extract all product names and prices as JSON." |
| Persona comparison | "Compare problem_user and standard_user on the inventory page: list every visual or functional difference." |
| Console / network audit | "Perform a full purchase and report console errors and any request with status ≥ 400." |
| Accessibility smell test | "Navigate the login and checkout forms with the keyboard only and list anything unreachable or unlabeled." |
| Locator help | "Give me the most robust Playwright locator for the sort dropdown, using data-test." |

## 6. Limits (stated honestly)

- LLM-driven sessions are non-deterministic and can hallucinate a conclusion — always confirm with evidence (storage dump, network log, screenshot) and a CLI test.
- MCP is never part of the CI gate.
- Do not paste real credentials or production data into prompts; SauceDemo uses public demo accounts only.

---

## Appendix — CLI commands used alongside MCP

```bash
npx playwright codegen https://www.saucedemo.com      # record → raw script
npx playwright test -g EXP-001 --headed                # watch a repro
npx playwright test -g EXP-001 --debug                 # step through with the inspector
npx playwright show-trace test-results/<test>/trace.zip
```
