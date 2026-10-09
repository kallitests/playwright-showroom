// =============================================================================
// toolshop/tests/api/findings.spec.ts — Reproductions of exploratory findings (API)
// =============================================================================
// Found on 2026-10-09 by exploring the live API from the browser and reading
// the Laravel sources (see docs/toolshop.md § Findings). Same pattern as the
// SauceDemo suite: assert the EXPECTED behaviour, mark test.fail() while the
// defect exists — the test turns red the day it is fixed.
//
// Safety: none of these tests creates catalog data. The access-control probe
// sends an EMPTY body: a protected endpoint must answer 401 before validating;
// an unprotected one answers 422 (validation) — proof without side effects.
// =============================================================================

import { test, expect } from '../../fixtures';
import { errorFields } from '../../api/schemas';

test.describe('Exploratory findings — API', { tag: ['@api', '@toolshop', '@exploratory', '@known-issue'] }, () => {
  test('TEXP-001 an out-of-stock product must not be addable to a cart', async ({ api }) => {
    test.fail(true, 'TEXP-001 — the UI disables "Add to cart" but the API accepts the line (200): business rule enforced client-side only');
    test.info().annotations.push({ type: 'severity', description: 'major — overselling / orders that cannot be fulfilled' });

    const outOfStock = await api.findProduct((p) => !p.in_stock);
    const cartId = await api.createCart();
    const res = await api.addToCart(cartId, outOfStock.id, 1);
    await api.delete(`/carts/${cartId}`);
    expect(res.status()).toBe(422); // EXPECTED — actual 200 "item added or updated"
  });

  test('TEXP-002 /payment/check must reject an unknown payment method', async ({ api }) => {
    test.fail(true, 'TEXP-002 — only known methods are validated; "bitcoin" returns "Payment was successful"');
    test.info().annotations.push({ type: 'severity', description: 'medium — misleading payment confirmation (the invoice endpoint does reject it)' });

    const res = await api.post('/payment/check', { payment_method: 'bitcoin', payment_details: {} });
    expect(res.status()).toBe(422); // EXPECTED — actual 200
  });

  for (const path of ['/products', '/brands']) {
    test(`TEXP-003 anonymous POST ${path} must be refused before validation (401)`, { tag: '@security' }, async ({ api }) => {
      test.fail(true, `TEXP-003 — POST ${path} has no auth middleware: an anonymous empty body gets 422 field errors instead of 401`);
      test.info().annotations.push({ type: 'severity', description: 'critical — broken access control (OWASP API5:2023)' });

      const res = await api.post(path, {}); // empty body: can never create anything
      expect(res.status()).toBe(401); // EXPECTED — actual 422
    });
  }

  test('TEXP-005 validation errors should share one format across endpoints', async ({ api }) => {
    test.fail(true, 'TEXP-005 — inline validation returns {message, errors}; FormRequest endpoints return a flat {field: [..]} object');
    test.info().annotations.push({ type: 'severity', description: 'minor — every client needs two error parsers' });

    const cartId = await api.createCart();
    const cartError = await (await api.post(`/carts/${cartId}`, { quantity: 1 })).json();
    await api.delete(`/carts/${cartId}`);
    const registerError = await (await api.post('/users/register', { email: 'not-an-email' })).json();

    expect(errorFields(cartError).length).toBeGreaterThan(0);
    expect(errorFields(registerError).length).toBeGreaterThan(0);
    expect(Object.keys(registerError)).toEqual(expect.arrayContaining(['message', 'errors'])); // EXPECTED — actual flat object
  });
});
