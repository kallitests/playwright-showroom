// =============================================================================
// tests/api/intercept.spec.ts — Network interception and API-level tests
// =============================================================================
// WHAT ARE NETWORK INTERCEPTION TESTS?
//   Playwright can intercept, inspect, modify, or abort HTTP requests made
//   by the browser. This lets you:
//     - Verify what data is sent to the server
//     - Mock API responses to test edge cases
//     - Test how the app handles network errors
//     - Monitor for unexpected errors during a user flow
//
// WHY THIS MATTERS:
//   A UI test can pass even if the app is sending wrong data to the server.
//   Network interception tests add a deeper layer of confidence.
//
// NOTE: SauceDemo is a frontend-only app (no real backend API calls for
//   product data). We test:
//     - Console error monitoring (catches JS errors silently)
//     - Request/response interception patterns (mocking)
//     - Network failure handling
//     - Resource loading validation
//
// RUN: npx playwright test tests/api/intercept.spec.ts
// =============================================================================

import { test, expect } from '@playwright/test';
import { login } from '../../utils/helpers';
import { USERS } from '../../utils/test-data';

test.describe('🌐 API / Network — Interception Tests', () => {

  // -------------------------------------------------------------------------
  // TEST 1: Monitor console errors during login flow
  // -------------------------------------------------------------------------
  // JavaScript errors in the console are invisible to visual tests.
  // We capture ALL console messages and assert there are no errors.
  //
  // This catches:
  //   - Uncaught JavaScript exceptions
  //   - Failed resource loads
  //   - React/Vue rendering errors
  // -------------------------------------------------------------------------

  test('should produce no console errors during login and inventory load', async ({
    page,
  }) => {
    // Collect all console error messages
    const consoleErrors: string[] = [];

    // page.on('console') fires for every console.log/warn/error/etc.
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Perform login
    await login(page, USERS.standard);
    await page.waitForURL(/inventory/);

    // Wait a moment for any async errors to surface
    await page.waitForTimeout(1000);

    // Assert: no JS errors occurred during the entire flow
    expect(consoleErrors).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // TEST 2: Monitor for failed network requests (4xx / 5xx)
  // -------------------------------------------------------------------------
  // Even if the UI looks fine, a 404 or 500 in the background means
  // something is broken. This test catches silent network failures.
  // -------------------------------------------------------------------------

  test('should have no failed network requests during checkout flow', async ({
    page,
  }) => {
    // Collect all failed requests
    const failedRequests: string[] = [];

    // page.on('requestfailed') fires when a request fails at the network level
    // (DNS error, connection refused, etc.)
    page.on('requestfailed', (request) => {
      failedRequests.push(`${request.method()} ${request.url()}`);
    });

    // Collect HTTP error responses (4xx, 5xx)
    const errorResponses: string[] = [];

    page.on('response', (response) => {
      if (response.status() >= 400) {
        errorResponses.push(`${response.status()} ${response.url()}`);
      }
    });

    // Perform the checkout flow
    await login(page, USERS.standard);
    await page.waitForURL(/inventory/);

    await page
      .locator('.inventory_item')
      .filter({ hasText: 'Sauce Labs Backpack' })
      .locator('button')
      .click();

    await page.locator('.shopping_cart_link').click();
    await page.waitForURL(/cart/);

    await page.locator('[data-test="checkout"]').click();
    await page.waitForURL(/checkout-step-one/);

    // Assert: no failed network requests during the flow
    expect(failedRequests).toHaveLength(0);

    // Filter out known 404s for favicon or analytics (adjust as needed)
    const criticalErrors = errorResponses.filter(
      (url) => !url.includes('favicon') && !url.includes('analytics')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // TEST 3: Intercept and mock a response (route interception)
  // -------------------------------------------------------------------------
  // page.route() lets you intercept any request and return a custom response.
  // This is powerful for testing:
  //   - How the app handles unexpected API data
  //   - Loading states (slow responses)
  //   - Error states (simulate a 500 error)
  //
  // Here we intercept a static asset request and verify interception works.
  // In a real app with REST APIs, you'd mock JSON responses like:
  //   await page.route('**/api/products', route => route.fulfill({ json: [...] }))
  // -------------------------------------------------------------------------

  test('should handle a mocked 503 error response gracefully', async ({
    page,
  }) => {
    // Intercept the main page HTML and return a 503 Service Unavailable
    // This simulates a server outage scenario
    let intercepted = false;

    await page.route('https://www.saucedemo.com/', async (route) => {
      intercepted = true;

      // Fulfill with a 503 error response
      await route.fulfill({
        status: 503,
        contentType: 'text/html',
        body: '<html><body><h1>Service Unavailable</h1></body></html>',
      });
    });

    // Navigate to the page — it will receive our mocked 503 response
    await page.goto('/');

    // Verify our route interception actually fired
    expect(intercepted).toBe(true);

    // The page should show our mocked content
    await expect(page.locator('h1')).toHaveText('Service Unavailable');
  });

  // -------------------------------------------------------------------------
  // TEST 4: Abort specific requests (simulate offline / blocked resource)
  // -------------------------------------------------------------------------
  // page.route() with route.abort() simulates network blocks.
  // Useful for testing: "what happens if a CSS file doesn't load?"
  // or "what if an analytics script is blocked by an ad blocker?"
  // -------------------------------------------------------------------------

  test('should still load the login page if a non-critical resource is blocked', async ({
    page,
  }) => {
    // Abort all image requests (simulates slow network or blocked images)
    await page.route('**/*.{png,jpg,jpeg,gif,svg,ico}', (route) => {
      route.abort();
    });

    // Navigate to the login page
    await page.goto('/');

    // The login FORM must still be functional even without images
    await expect(
      page.locator('[data-test="username"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-test="password"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-test="login-button"]')
    ).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // TEST 5: Inspect request headers during navigation
  // -------------------------------------------------------------------------
  // Verify that specific headers are sent with page requests.
  // In real projects: verify auth tokens, content-type, CSRF headers, etc.
  // -------------------------------------------------------------------------

  test('should send correct Accept header when loading inventory page', async ({
    page,
  }) => {
    // Capture the request to the inventory page
    let capturedRequest: { headers: () => Record<string, string> } | null = null;

    page.on('request', (request) => {
      if (request.url().includes('saucedemo.com')) {
        capturedRequest = request;
      }
    });

    await login(page, USERS.standard);
    await page.waitForURL(/inventory/);

    // Verify we captured a request
    expect(capturedRequest).not.toBeNull();

    if (capturedRequest) {
      const headers = (capturedRequest as { headers: () => Record<string, string> }).headers();
      // Browser requests for HTML pages always include an Accept header
      expect(headers['accept']).toBeDefined();
    }
  });

  // -------------------------------------------------------------------------
  // TEST 6: Measure Time to First Meaningful Paint (performance budget)
  // -------------------------------------------------------------------------
  // Uses the Performance API via page.evaluate() to measure real load times.
  // This catches performance regressions that visual tests miss.
  // -------------------------------------------------------------------------

  test('inventory page should load in under 5 seconds', async ({ page }) => {
    await login(page, USERS.standard);
    await page.waitForURL(/inventory/);

    // Use the browser's built-in Performance API to get timing data
    const loadTime = await page.evaluate(() => {
      const [entry] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      if (!entry) return 0;
      // responseEnd - startTime = total time from start to response received
      return Math.round(entry.responseEnd - entry.startTime);
    });

    console.log(`Inventory page load time: ${loadTime}ms`);

    // Assert the page loaded within our performance budget
    expect(loadTime).toBeLessThan(5000);
  });
});
