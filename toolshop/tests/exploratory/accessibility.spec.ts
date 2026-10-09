// =============================================================================
// toolshop/tests/exploratory/accessibility.spec.ts — axe sweep of key Toolshop pages
// =============================================================================
// Heuristic sweep (not a WCAG audit): full axe results are attached to the
// report; the test fails only on "critical" violations. Results on the live
// site have NOT been recorded yet — first run will establish the baseline.
// =============================================================================

import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../../fixtures';

const pages = [
  { name: 'catalog', path: '/' },
  { name: 'login', path: '/auth/login' },
  { name: 'contact', path: '/contact' },
  { name: 'empty-cart', path: '/checkout' },
];

test.describe('Accessibility sweep — Toolshop', { tag: ['@exploratory', '@a11y', '@toolshop'] }, () => {
  for (const { name, path } of pages) {
    test(`TA11Y-001 ${name} page has no critical axe violation`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('body')).toBeVisible();
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
      const summary = results.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help }));
      await test.info().attach(`axe-${name}.json`, { body: JSON.stringify(summary, null, 2), contentType: 'application/json' });
      expect(summary.filter((v) => v.impact === 'critical').map((v) => v.id)).toEqual([]);
    });
  }
});
