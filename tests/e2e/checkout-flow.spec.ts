// =============================================================================
// tests/e2e/checkout-flow.spec.ts — End-to-end purchase journeys
// =============================================================================
// E2E = several pages, real UI login, business outcome asserted at the end.
// Field-level validation and totals math live in tests/ui/checkout.spec.ts;
// here we prove the journeys hold together.
// =============================================================================

import { test, expect } from '../../fixtures';
import { expectedTotals } from '../../utils/helpers';
import { CHECKOUT_INFO, PRODUCTS, USERS, productByName } from '../../utils/test-data';

test.describe('E2E — purchase journeys', { tag: ['@e2e', '@checkout'] }, () => {
  test('E2E-001 login → browse → detail → cart → checkout → confirmation (UI login)', { tag: '@critical' }, async ({
    loginPage,
    inventoryPage,
    productPage,
    cartPage,
    checkoutPage,
  }) => {
    const items = [PRODUCTS.backpack, PRODUCTS.boltTshirt];

    await test.step('Log in through the UI', async () => {
      await loginPage.goto();
      await loginPage.login(USERS.standard);
      await inventoryPage.expectLoaded();
    });

    await test.step('Pick one product from the list, one from its detail page', async () => {
      await inventoryPage.addToCart(items[0]);
      await inventoryPage.openProduct(items[1]);
      await productPage.addToCartButton.click();
      await productPage.header.expectCartCount(2);
    });

    await test.step('Review the cart', async () => {
      await productPage.header.openCart();
      await cartPage.expectItems(items);
      await cartPage.clickCheckout();
    });

    await test.step('Provide information and verify the amount', async () => {
      await checkoutPage.submitInfo(CHECKOUT_INFO.valid);
      expect(await checkoutPage.totals()).toEqual(expectedTotals(items.map((n) => productByName(n).price)));
    });

    await test.step('Place the order', async () => {
      await checkoutPage.clickFinish();
      await checkoutPage.expectOrderConfirmed();
      await checkoutPage.header.expectCartCount(0);
    });
  });

  test('E2E-002 after an order, Back Home shows an empty cart and a fresh catalog (CHK-008, CHK-010)', async ({
    loggedInPage: _page,
    seedCart,
    cartPage,
    checkoutPage,
    inventoryPage,
  }) => {
    await seedCart([PRODUCTS.onesie, PRODUCTS.bikeLight]);
    await cartPage.goto();
    await cartPage.clickCheckout();
    await checkoutPage.submitInfo(CHECKOUT_INFO.valid);
    await checkoutPage.clickFinish();

    await checkoutPage.backHomeButton.click();
    await inventoryPage.expectLoaded();
    await inventoryPage.header.expectCartCount(0);
    await expect(inventoryPage.page.getByRole('button', { name: 'Remove' })).toHaveCount(0);
  });

  test('E2E-003 interrupted purchase: cancel, change the basket, then complete', async ({
    loggedInPage: _page,
    inventoryPage,
    cartPage,
    checkoutPage,
  }) => {
    await inventoryPage.addToCart(PRODUCTS.fleeceJacket);
    await inventoryPage.header.openCart();
    await cartPage.clickCheckout();
    await checkoutPage.submitInfo(CHECKOUT_INFO.valid);
    await checkoutPage.cancelButton.click(); // back to catalog

    await inventoryPage.removeFromCart(PRODUCTS.fleeceJacket);
    await inventoryPage.addToCart(PRODUCTS.onesie);
    await inventoryPage.header.openCart();
    await cartPage.expectItems([PRODUCTS.onesie]);
    await cartPage.clickCheckout();
    await checkoutPage.submitInfo(CHECKOUT_INFO.valid);
    expect((await checkoutPage.totals()).subtotal).toBe(productByName(PRODUCTS.onesie).price);

    await checkoutPage.clickFinish();
    await checkoutPage.expectOrderConfirmed();
  });

  test('E2E-004 order receipt can be downloaded as a PDF (CHK-011)', { tag: '@download' }, async ({
    loggedInPage: _page,
    seedCart,
    cartPage,
    checkoutPage,
  }) => {
    await seedCart([PRODUCTS.backpack]);
    await cartPage.goto();
    await cartPage.clickCheckout();
    await checkoutPage.submitInfo(CHECKOUT_INFO.valid);
    await checkoutPage.clickFinish();

    const [download] = await Promise.all([checkoutPage.page.waitForEvent('download'), checkoutPage.pdfButton.click()]);

    expect(download.suggestedFilename()).toMatch(/^swag-labs-order-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.pdf$/);
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(chunk as Buffer);
    const pdf = Buffer.concat(chunks);
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-'); // real PDF, not an HTML error page
    expect(pdf.length).toBeGreaterThan(1_000);
  });
});
