// =============================================================================
// toolshop/tests/e2e/checkout.spec.ts — End-to-end purchase journeys
// =============================================================================
// TE2E-001  guest: search → product → cart → guest details → address → pay → invoice (pure UI)
// TE2E-002  customer, hybrid: API login + API cart → UI checkout → API confirms the invoice
// Orders use cash-on-delivery and example.com e-mails (no real payment, no real inbox).
// =============================================================================

import { randomUUID } from 'node:crypto';
import { test, expect } from '../../fixtures';
import { TEST_EMAIL_DOMAIN } from '../../config';

test.describe('E2E — checkout', { tag: ['@e2e', '@toolshop', '@checkout'] }, () => {
  test('TE2E-001 guest buys a searched product end-to-end through the UI', { tag: '@critical' }, async ({
    catalogPage,
    productPage,
    checkoutPage,
    api,
  }) => {
    const product = (await (await api.get('/products/search', { q: 'pliers' })).json()).data.find((p: { in_stock: boolean }) => p.in_stock);

    await test.step('Find the product', async () => {
      await catalogPage.goto();
      await catalogPage.search('pliers');
      await catalogPage.openProduct(product.name);
    });

    await test.step('Add 2 units to the cart', async () => {
      await productPage.add(2);
      await productPage.header.expectCartQuantity(2);
      await productPage.header.openCart();
      await expect(checkoutPage.row(product.name).getByTestId('product-quantity')).toHaveValue('2');
    });

    await test.step('Continue as guest', async () => {
      const suffix = randomUUID().slice(0, 8);
      await checkoutPage.continueAsGuest({ email: `guest+${suffix}@${TEST_EMAIL_DOMAIN}`, firstName: 'Guest', lastName: `E2E${suffix}` });
    });

    await test.step('Billing address via postcode lookup', async () => {
      await checkoutPage.fillAddress('NL', '1011AB');
    });

    await test.step('Pay cash on delivery and get an invoice number', async () => {
      const invoiceNumber = await checkoutPage.payWithCashOnDelivery();
      expect(invoiceNumber).toMatch(/^INV-\d{4}\d+$/);
      await checkoutPage.header.expectCartQuantity(0);
    });
  });

  test('TE2E-002 customer checkout: API preconditions, UI journey, API verification', { tag: '@critical' }, async ({
    loggedInPage: _page,
    withCart,
    checkoutPage,
    customerApi,
    api,
  }) => {
    const products = (await api.allProducts()).filter((p) => p.in_stock && !p.is_rental && !['A', 'B'].includes(p.co2_rating)).slice(0, 2);
    await withCart(products.map((product) => ({ product, quantity: 1 })));
    const expectedTotal = Math.round(products.reduce((s, p) => s + p.price, 0) * 100) / 100;

    await checkoutPage.goto();
    expect(await checkoutPage.total()).toBeCloseTo(expectedTotal, 2);
    await checkoutPage.continueAsSignedIn();
    await checkoutPage.fillAddress('NL', '1011AB');
    const invoiceNumber = await checkoutPage.payWithCashOnDelivery();

    // Server-side truth: the invoice exists for this customer with the right total
    const res = await customerApi.get('/invoices');
    expect(res.status()).toBe(200);
    const body = await res.json();
    const invoice = ((body.data ?? body) as { invoice_number: string; total: number }[]).find((i) => i.invoice_number === invoiceNumber);
    expect(invoice, `invoice ${invoiceNumber} listed for the customer`).toBeDefined();
    expect(invoice!.total).toBeCloseTo(expectedTotal, 2);
  });
});
