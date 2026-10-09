// =============================================================================
// toolshop/tests/ui/cart.spec.ts — Cart UI: add, quantities, totals, removal, discount
// =============================================================================
// Hybrid technique: preconditions are created through the API (withCart) and
// injected in the browser session, so each test exercises ONE behaviour of the
// cart screen. The API is then used again as the oracle for the server state.
// =============================================================================

import { test, expect } from '../../fixtures';
import type { Product } from '../../api/schemas';
import { RULES } from '../../config';

const round2 = (n: number) => Math.round(n * 100) / 100;

test.describe('Cart — UI', { tag: ['@ui', '@toolshop', '@cart'] }, () => {
  let products: Product[];

  test.beforeEach(async ({ api }) => {
    // C/D/E-rated only: keeps the 5 % eco discount out of these totals
    products = (await api.allProducts()).filter((p) => p.in_stock && !p.is_rental && !['A', 'B'].includes(p.co2_rating));
  });

  test('TUCRT-001 adding from the product page updates the badge and the cart', { tag: ['@smoke', '@critical'] }, async ({
    productPage,
    checkoutPage,
  }) => {
    const product = products[0];
    await productPage.goto(product.id);
    await productPage.add(2);
    await productPage.header.expectCartQuantity(2);

    await productPage.header.openCart();
    expect(await checkoutPage.lines()).toEqual([{ name: product.name, quantity: 2, unitPrice: product.price, linePrice: round2(product.price * 2) }]);
  });

  test('TUCRT-002 cart prepared via API is displayed with correct line and grand totals', async ({ withCart, checkoutPage }) => {
    const lines = [
      { product: products[0], quantity: 3 },
      { product: products[1], quantity: 1 },
    ];
    await withCart(lines);
    await checkoutPage.goto();

    const shown = await checkoutPage.lines();
    expect(shown.map((l) => [l.name, l.quantity, l.linePrice])).toEqual(lines.map((l) => [l.product.name, l.quantity, round2(l.product.price * l.quantity)]));
    expect(await checkoutPage.total()).toBeCloseTo(round2(shown.reduce((s, l) => s + l.linePrice, 0)), 2);
  });

  test('TUCRT-003 changing a quantity updates the line, the total and the server cart', async ({ withCart, checkoutPage, api }) => {
    const cartId = await withCart([{ product: products[0], quantity: 1 }]);
    await checkoutPage.goto();

    await checkoutPage.setQuantity(products[0].name, 4);
    await expect(checkoutPage.row(products[0].name).getByTestId('line-price')).toHaveText(`$${(products[0].price * 4).toFixed(2)}`);
    expect((await api.cart(cartId)).cart_items[0].quantity).toBe(4);
  });

  test('TUCRT-004 removing a line updates the cart; removing the last one shows the empty state', async ({ withCart, checkoutPage, api }) => {
    const cartId = await withCart([
      { product: products[0], quantity: 1 },
      { product: products[1], quantity: 1 },
    ]);
    await checkoutPage.goto();

    await checkoutPage.removeLine(products[0].name);
    await expect(checkoutPage.rows).toHaveCount(1);
    expect((await api.cart(cartId)).cart_items.map((i) => i.product_id)).toEqual([products[1].id]);

    await checkoutPage.removeLine(products[1].name);
    await expect(checkoutPage.emptyMessage).toBeVisible();
  });

  test('TUCRT-005 rental + product shows the 15% bundle discount in the totals', async ({ withCart, checkoutPage, api }) => {
    const rental = (await api.products({ is_rental: true })).data[0];
    await withCart([
      { product: products[0], quantity: 1 },
      { product: rental, quantity: 1 },
    ]);
    await checkoutPage.goto();

    await expect(checkoutPage.cartDiscount).toBeVisible();
    const subtotal = round2(products[0].price + rental.price);
    const expectedTotal = round2(subtotal * (1 - RULES.rentalBundleDiscountPct / 100));
    expect(await checkoutPage.total()).toBeCloseTo(expectedTotal, 2);
  });

  test('TUCRT-006 the cart survives a page reload', async ({ withCart, checkoutPage, page }) => {
    await withCart([{ product: products[0], quantity: 2 }]);
    await checkoutPage.goto();
    await expect(checkoutPage.rows).toHaveCount(1);
    await page.reload();
    await expect(checkoutPage.row(products[0].name).getByTestId('product-quantity')).toHaveValue('2');
  });
});
