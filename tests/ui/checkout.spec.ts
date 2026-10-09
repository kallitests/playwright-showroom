// =============================================================================
// tests/ui/checkout.spec.ts — Checkout: validation, totals, interrupted flows
// =============================================================================
// Risks covered: wrong amount charged (tax/total), invalid order data accepted,
// lost cart when the user cancels, order summary different from cart.
// =============================================================================

import { test, expect } from '../../fixtures';
import { expectedTotals } from '../../utils/helpers';
import { CHECKOUT_ERRORS, CHECKOUT_INFO, PRODUCTS, productByName, type ProductName } from '../../utils/test-data';

test.describe('Checkout — information form', { tag: ['@ui', '@checkout'] }, () => {
  test.beforeEach(async ({ loggedInPage: _page, seedCart, cartPage }) => {
    await seedCart([PRODUCTS.backpack]);
    await cartPage.goto();
    await cartPage.clickCheckout();
  });

  const missing = [
    { id: 'CHK-002', field: 'first name', info: CHECKOUT_INFO.missingFirstName, error: CHECKOUT_ERRORS.firstNameRequired },
    { id: 'CHK-003', field: 'last name', info: CHECKOUT_INFO.missingLastName, error: CHECKOUT_ERRORS.lastNameRequired },
    { id: 'CHK-004', field: 'postal code', info: CHECKOUT_INFO.missingPostalCode, error: CHECKOUT_ERRORS.postalCodeRequired },
  ] as const;

  for (const { id, field, info, error } of missing) {
    test(`${id} missing ${field} blocks the checkout`, async ({ checkoutPage }) => {
      await checkoutPage.fillPersonalInfo(info);
      await checkoutPage.clickContinue();
      await checkoutPage.expectStepOneError(error);
    });
  }

  test('CHK-006 Cancel on step one returns to the cart with items kept', async ({ checkoutPage, cartPage }) => {
    await checkoutPage.cancelButton.click();
    await cartPage.expectLoaded();
    await cartPage.expectItems([PRODUCTS.backpack]);
  });

  test('CHK-014 unicode names and alphanumeric postal codes are accepted', async ({ checkoutPage }) => {
    await checkoutPage.submitInfo(CHECKOUT_INFO.unicode);
    await expect(checkoutPage.finishButton).toBeVisible();
  });
});

test.describe('Checkout — overview & totals', { tag: ['@ui', '@checkout', '@critical'] }, () => {
  const baskets: { id: string; items: ProductName[] }[] = [
    { id: 'CHK-005a', items: [PRODUCTS.onesie] },
    { id: 'CHK-005b', items: [PRODUCTS.backpack, PRODUCTS.bikeLight] },
    { id: 'CHK-005c', items: Object.values(PRODUCTS) },
  ];

  for (const { id, items } of baskets) {
    test(`${id} subtotal + 8% tax = total for ${items.length} item(s)`, async ({ loggedInPage: _page, seedCart, cartPage, checkoutPage }) => {
      await seedCart(items);
      await cartPage.goto();
      await cartPage.clickCheckout();
      await checkoutPage.submitInfo(CHECKOUT_INFO.valid);

      await expect(checkoutPage.summaryItemNames).toHaveCount(items.length);
      expect(await checkoutPage.totals()).toEqual(expectedTotals(items.map((n) => productByName(n).price)));
    });
  }

  test('CHK-009 overview lists exactly the cart content, plus payment and shipping info', async ({
    loggedInPage: _page,
    seedCart,
    cartPage,
    checkoutPage,
  }) => {
    const items = [PRODUCTS.boltTshirt, PRODUCTS.fleeceJacket];
    await seedCart(items);
    await cartPage.goto();
    await cartPage.clickCheckout();
    await checkoutPage.submitInfo(CHECKOUT_INFO.valid);

    await expect(checkoutPage.summaryItemNames).toHaveText([...items]);
    await expect(checkoutPage.paymentInfo).not.toBeEmpty();
    await expect(checkoutPage.shippingInfo).not.toBeEmpty();
  });

  test('CHK-007 Cancel on the overview returns to the catalog with the cart kept', async ({
    loggedInPage: _page,
    seedCart,
    cartPage,
    checkoutPage,
    inventoryPage,
  }) => {
    await seedCart([PRODUCTS.bikeLight]);
    await cartPage.goto();
    await cartPage.clickCheckout();
    await checkoutPage.submitInfo(CHECKOUT_INFO.valid);
    await checkoutPage.cancelButton.click();

    await inventoryPage.expectLoaded();
    await inventoryPage.header.expectCartCount(1);
  });
});
