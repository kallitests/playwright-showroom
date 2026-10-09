// =============================================================================
// tests/api/network.spec.ts — Network observation & interception in the browser
// =============================================================================
// v1 "intercept.spec.ts", fixed and hardened:
//   - URLs derived from baseURL (v1 hard-coded www.saucedemo.com)
//   - no waitForTimeout; errors filtered by origin (third-party telemetry such
//     as Backtrace is out of scope and may be blocked by proxies/ad-blockers)
//   - the Accept-header test now targets the document request it claims to check
// =============================================================================

import { test, expect } from '../../fixtures';
import { BASE_URL } from '../../utils/env';
import { login } from '../../utils/helpers';
import { PRODUCTS, USERS } from '../../utils/test-data';

const appOrigin = new URL(BASE_URL).origin;
const isAppUrl = (url: string) => url.startsWith(appOrigin);

test.describe('Network — observation', { tag: ['@api', '@network'] }, () => {
  test('NET-001 no uncaught JS error during login and catalog load', async ({ page, runtimeErrors }) => {
    await login(page, USERS.standard);
    await expect(page.getByTestId('inventory-list')).toBeVisible();
    expect(runtimeErrors).toEqual([]);
  });

  test('NET-002 no failed first-party request during a purchase flow', async ({ page, inventoryPage, cartPage }) => {
    const failures: string[] = [];
    page.on('requestfailed', (r) => isAppUrl(r.url()) && failures.push(`${r.method()} ${r.url()} ${r.failure()?.errorText}`));
    page.on('response', (r) => {
      // Document 404s are the hosting's SPA bootstrap (see API-005), not failures.
      if (isAppUrl(r.url()) && r.status() >= 400 && r.request().resourceType() !== 'document') {
        failures.push(`${r.status()} ${r.url()}`);
      }
    });

    await login(page, USERS.standard);
    await inventoryPage.addToCart(PRODUCTS.backpack);
    await inventoryPage.header.openCart();
    await cartPage.clickCheckout();

    expect(failures).toEqual([]);
  });

  test('NET-003 navigation requests send an HTML Accept header', async ({ page }) => {
    const docRequest = page.waitForRequest((r) => r.resourceType() === 'document' && isAppUrl(r.url()));
    await page.goto('/');
    // allHeaders() includes headers added by the browser network stack
    expect((await (await docRequest).allHeaders())['accept']).toContain('text/html');
  });
});

test.describe('Network — interception (simulated failures)', { tag: ['@api', '@network'] }, () => {
  test('NET-004 a 503 from the server is surfaced to the user (mocked)', async ({ page }) => {
    await page.route(`${appOrigin}/`, (route) =>
      route.fulfill({ status: 503, contentType: 'text/html', body: '<h1>Service Unavailable</h1>' }),
    );
    const res = await page.goto('/');
    expect(res?.status()).toBe(503);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Service Unavailable');
  });

  test('NET-005 login still works when images are blocked', async ({ page, inventoryPage }) => {
    await page.route(/\.(png|jpe?g|gif|svg|ico)(\?.*)?$/, (route) => route.abort());
    await login(page, USERS.standard);
    await inventoryPage.expectLoaded();
    await expect(inventoryPage.items).toHaveCount(6);
  });

  test('NET-006 a slow network delays but does not break the login', async ({ page, inventoryPage }) => {
    await page.route(/\.js(\?.*)?$/, async (route) => {
      await new Promise((r) => setTimeout(r, 1_500));
      await route.continue();
    });
    await login(page, USERS.standard);
    await inventoryPage.expectLoaded();
  });

  test('NET-007 if the app bundle fails to load, no login form is rendered', async ({ page }) => {
    await page.route(/\/assets\/index-.*\.js$/, (route) => route.abort('failed'));
    await page.goto('/');
    await expect(page.getByTestId('login-button')).toHaveCount(0);
  });
});
