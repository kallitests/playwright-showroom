// =============================================================================
// tests/exploratory/accessibility.spec.ts — Automated accessibility scan (axe)
// =============================================================================
// Scope: an exploratory "heuristic sweep", not a WCAG audit. The scan attaches
// the full axe report to the HTML report and fails only on violations that
// block users entirely (impact "critical"). Serious/moderate issues are
// reported as findings (see docs/exploratory-testing.md) for triage.
// =============================================================================

import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../../fixtures';
import { CHECKOUT_INFO, PRODUCTS } from '../../utils/test-data';

type Page = import('@playwright/test').Page;

async function scan(page: Page, name: string) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  const summary = results.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help }));
  await test.info().attach(`axe-${name}.json`, { body: JSON.stringify(summary, null, 2), contentType: 'application/json' });
  for (const v of summary) test.info().annotations.push({ type: `a11y:${v.impact}`, description: `${name}: ${v.id} (${v.nodes}) — ${v.help}` });
  return summary;
}

test.describe('Accessibility sweep', { tag: ['@exploratory', '@a11y', '@chromium-only'] }, () => {
  test('A11Y-001 login page has no critical violation', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('login-button')).toBeVisible();
    const violations = await scan(page, 'login');
    expect(violations.filter((v) => v.impact === 'critical')).toEqual([]);
  });

  test('A11Y-002 catalog, cart and checkout pages — critical violations are reported', async ({
    loggedInPage,
    seedCart,
    cartPage,
    checkoutPage,
  }) => {
    const all: { page: string; id: string; impact: string | null | undefined }[] = [];
    all.push(...(await scan(loggedInPage, 'inventory')).map((v) => ({ page: 'inventory', ...v })));

    await seedCart([PRODUCTS.backpack]);
    await cartPage.goto();
    all.push(...(await scan(loggedInPage, 'cart')).map((v) => ({ page: 'cart', ...v })));

    await cartPage.clickCheckout();
    all.push(...(await scan(loggedInPage, 'checkout-info')).map((v) => ({ page: 'checkout-info', ...v })));

    await checkoutPage.submitInfo(CHECKOUT_INFO.valid);
    all.push(...(await scan(loggedInPage, 'checkout-overview')).map((v) => ({ page: 'checkout-overview', ...v })));

    expect(all.filter((v) => v.impact === 'critical').map((v) => `${v.page}:${v.id}`)).toEqual([]);
  });
});
