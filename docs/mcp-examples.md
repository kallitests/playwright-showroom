# Playwright MCP — Usage Guide

## What is Playwright MCP?

Playwright MCP (Model Context Protocol) is a server that exposes Playwright's
browser automation capabilities to AI assistants like Claude.

Instead of writing test code, you describe what you want in plain English,
and the AI uses Playwright to do it — navigate, click, fill forms, take
screenshots, extract data.

**Official repo:** https://github.com/microsoft/playwright-mcp

---

## Installation

### 1. Install the MCP server globally

```bash
npm install -g @playwright/mcp
```

### 2. Configure Claude Desktop

Add this to your `claude_desktop_config.json`:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

### 3. Restart Claude Desktop

After saving the config, restart Claude Desktop completely.
You should see a browser icon or "playwright" listed in the tools panel.

---

## Usage — Natural Language Examples

Once configured, you can ask Claude to automate SauceDemo using plain English.

### Example 1: Log in and take a screenshot

> "Navigate to https://www.saucedemo.com and log in with username
> `standard_user` and password `secret_sauce`. Then take a screenshot
> of the inventory page."

Claude will:
1. Open a browser window
2. Navigate to the login page
3. Fill the username and password fields
4. Click Login
5. Take a screenshot of `/inventory.html`

---

### Example 2: Extract all product names and prices

> "Go to SauceDemo, log in as standard_user / secret_sauce, and extract
> all product names and prices from the inventory page as a JSON list."

Claude will return something like:

```json
[
  { "name": "Sauce Labs Backpack", "price": "$29.99" },
  { "name": "Sauce Labs Bike Light", "price": "$9.99" },
  { "name": "Sauce Labs Bolt T-Shirt", "price": "$15.99" },
  { "name": "Sauce Labs Fleece Jacket", "price": "$49.99" },
  { "name": "Sauce Labs Onesie", "price": "$7.99" },
  { "name": "Test.allTheThings() T-Shirt (Red)", "price": "$15.99" }
]
```

---

### Example 3: Complete a purchase

> "Log in to SauceDemo as standard_user / secret_sauce, add the most
> expensive product to the cart, proceed to checkout, fill in the form
> with name Jane Doe and postal code 75001, and complete the order.
> Tell me what the confirmation message says."

---

### Example 4: Test the locked-out user scenario

> "Try to log in to SauceDemo with username `locked_out_user` and
> password `secret_sauce`. What error message appears?"

---

### Example 5: Compare two users

> "Log in to SauceDemo as problem_user / secret_sauce and take a
> screenshot of the inventory page. Then log out and log back in as
> standard_user / secret_sauce and take another screenshot. What visual
> differences do you notice?"

---

## Playwright MCP vs Playwright CLI — When to use which?

| Use case | Tool |
|---|---|
| Automated tests in CI/CD | **Playwright CLI** (`npx playwright test`) |
| Exploratory testing | **Playwright MCP** (ask Claude) |
| Quick one-off automation | **Playwright MCP** |
| Regression suite | **Playwright CLI** |
| Generating test code from observation | **Playwright CLI** (`codegen`) |
| Data extraction / scraping | **Playwright MCP** |
| Complex assertion logic | **Playwright CLI** |

---

## Useful Playwright CLI commands

```bash
# Run all tests
npx playwright test

# Run only smoke tests
npx playwright test tests/smoke/

# Run in headed mode (see the browser)
npx playwright test --headed

# Open the interactive UI mode
npx playwright test --ui

# Generate test code by recording browser actions
npx playwright codegen https://www.saucedemo.com

# Show the last HTML report
npx playwright show-report

# Run tests matching a title pattern
npx playwright test --grep "checkout"

# Run tests in a specific browser
npx playwright test --project=firefox

# Debug a specific test interactively
npx playwright test tests/smoke/auth.spec.ts --debug
```

---

## Viewing test results

After running tests, open the HTML report:

```bash
npx playwright show-report
```

This opens an interactive report in your browser showing:
- Pass/fail status per test
- Screenshots on failure
- Video recordings on failure  
- Full trace files for debugging

To open a trace file manually:

```bash
npx playwright show-trace test-results/trace.zip
```
