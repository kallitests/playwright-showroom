// =============================================================================
// tests/exploratory/findings.spec.ts — Reproductions of exploratory findings
// =============================================================================
// Each test turns an anomaly found during an exploratory session
// (docs/exploratory-testing.md) into a deterministic reproduction.
//
// Pattern: the test asserts the EXPECTED behaviour and is marked test.fail()
// while the defect exists. The suite stays green, the report shows the defect
// as "expected to fail", and the day the product is fixed the test
// "unexpectedly passes" — forcing someone to close the finding and remove
// test.fail(). Nothing silently rots.
// =============================================================================

import { test, expect } from '../../fixtures';
import { login } from '../../utils/helpers';
import { CHECKOUT_INFO, PRODUCTS, USERS } from '../../utils/test-data';

test.describe('Exploratory findings', { tag: ['@exploratory', '@known-issue'] }, () => {
  test('EXP-001 cart of a previous user must not leak to the next user on the same browser', async ({ page, inventoryPage, loginPage }) => {
    test.fail(true, 'EXP-001 — logout only removes the session cookie; cart stays in localStorage (verified live 2026-10-09)');
    test.info().annotations.push({ type: 'severity', description: 'major — privacy / wrong order on shared devices' });

    await login(page, USERS.standard);
    await inventoryPage.addToCart(PRODUCTS.backpack);
    await inventoryPage.header.logout();

    await loginPage.login(USERS.visual);
    await inventoryPage.expectLoaded(); // avoid a false "hidden" before the header renders
    await expect(inventoryPage.header.cartBadge).toBeHidden({ timeout: 2_000 }); // EXPECTED — currently shows 1
  });

  test('EXP-003 checkout must reject whitespace-only customer information', async ({ loggedInPage: _page, seedCart, cartPage, checkoutPage }) => {
    test.fail(true, 'EXP-003 — required-field check is a truthiness test: " " is accepted');
    test.info().annotations.push({ type: 'severity', description: 'minor — invalid order data' });

    await seedCart([PRODUCTS.backpack]);
    await cartPage.goto();
    await cartPage.clickCheckout();
    await checkoutPage.fillPersonalInfo(CHECKOUT_INFO.whitespaceOnly);
    await checkoutPage.clickContinue();

    // Positive evidence of the expected behaviour (a URL check could pass before navigation happens)
    await expect(checkoutPage.errorMessage).toBeVisible({ timeout: 2_000 }); // EXPECTED — currently moves to step two
  });

  test('EXP-004 checkout must not be possible with an empty cart', async ({ loggedInPage: _page, cartPage }) => {
    test.fail(true, 'EXP-004 — Checkout button is active on an empty cart; an order of $0.00 can be placed');
    test.info().annotations.push({ type: 'severity', description: 'major — empty order' });

    await cartPage.goto();
    await expect(cartPage.cartItems).toHaveCount(0);
    await expect(cartPage.checkoutButton).toBeDisabled({ timeout: 2_000 }); // EXPECTED
  });

  test('EXP-005 refreshing the confirmation page must keep the receipt download', async ({
    loggedInPage: _page,
    seedCart,
    cartPage,
    checkoutPage,
    page,
  }) => {
    test.fail(true, 'EXP-005 — order data lives in router state only; a refresh loses it and hides "Generate PDF order"');
    test.info().annotations.push({ type: 'severity', description: 'minor — lost receipt' });

    await seedCart([PRODUCTS.onesie]);
    await cartPage.goto();
    await cartPage.clickCheckout();
    await checkoutPage.submitInfo(CHECKOUT_INFO.valid);
    await checkoutPage.clickFinish();
    await expect(checkoutPage.pdfButton).toBeVisible();

    await page.reload();
    await checkoutPage.expectOrderConfirmed();
    await expect(checkoutPage.pdfButton).toBeVisible({ timeout: 2_000 }); // EXPECTED
  });

  test('EXP-006 sort choice should survive a round-trip to a product page', async ({ loggedInPage: _page, inventoryPage, productPage }) => {
    test.fail(true, 'EXP-006 — sort state is component-local and resets to A→Z');
    test.info().annotations.push({ type: 'severity', description: 'trivial — UX' });

    await inventoryPage.sortBy('hilo');
    await inventoryPage.openProduct(PRODUCTS.fleeceJacket);
    await productPage.backToProducts();

    await expect(inventoryPage.activeSortOption).toHaveText('Price (high to low)', { timeout: 2_000 }); // EXPECTED
  });
});
