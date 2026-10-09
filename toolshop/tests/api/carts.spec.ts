// =============================================================================
// toolshop/tests/api/carts.spec.ts — Cart API: lifecycle, validation, business rules
// =============================================================================
// Risks: wrong quantities, invalid lines accepted, discount rules misapplied,
// orphan carts. Each test owns its cart (created + deleted) → no shared state.
// Behaviour verified live on 2026-10-09 (status codes, messages, 15 % bundle).
// =============================================================================

import { test, expect } from '../../fixtures';
import { ValidationError, expectSchema, type Product } from '../../api/schemas';
import { RULES } from '../../config';

test.describe('Cart API', { tag: ['@api', '@toolshop', '@cart'] }, () => {
  let inStock: Product[];

  test.beforeEach(async ({ api }) => {
    inStock = (await api.products()).data.filter((p) => p.in_stock);
    expect(inStock.length).toBeGreaterThan(1);
  });

  test('TCRT-001 full lifecycle: create → add → read → update qty → remove line → delete', { tag: '@critical' }, async ({ api }) => {
    const cartId = await api.createCart();
    const [a, b] = inStock;

    expect((await api.addToCart(cartId, a.id, 2)).status()).toBe(200);
    expect((await api.addToCart(cartId, b.id, 1)).status()).toBe(200);
    let cart = await api.cart(cartId);
    expect(cart.cart_items.map((i) => [i.product_id, i.quantity])).toEqual([
      [a.id, 2],
      [b.id, 1],
    ]);

    expect((await api.put(`/carts/${cartId}/product/quantity`, { product_id: a.id, quantity: 5 })).status()).toBe(200);
    cart = await api.cart(cartId);
    expect(cart.cart_items.find((i) => i.product_id === a.id)?.quantity).toBe(5);

    expect((await api.delete(`/carts/${cartId}/product/${b.id}`)).status()).toBe(204);
    expect((await api.cart(cartId)).cart_items).toHaveLength(1);

    expect((await api.delete(`/carts/${cartId}`)).status()).toBe(204);
    expect((await api.get(`/carts/${cartId}`)).status()).toBe(404);
  });

  test('TCRT-002 cart lines carry the current catalog price', async ({ api }) => {
    const cartId = await api.cartWith([{ product: inStock[0], quantity: 1 }]);
    const line = (await api.cart(cartId)).cart_items[0];
    expect(line.product.price).toBe(inStock[0].price);
    await api.delete(`/carts/${cartId}`);
  });

  test('TCRT-003 adding the same product twice keeps one line', async ({ api }) => {
    const cartId = await api.createCart();
    await api.addToCart(cartId, inStock[0].id, 1);
    await api.addToCart(cartId, inStock[0].id, 2);
    const items = (await api.cart(cartId)).cart_items;
    expect(items).toHaveLength(1);
    test.info().annotations.push({ type: 'observed-quantity', description: String(items[0].quantity) });
    await api.delete(`/carts/${cartId}`);
  });

  const invalid = [
    { title: 'quantity 0', body: (id: string) => ({ product_id: id, quantity: 0 }), field: 'quantity', msg: 'The quantity field must be at least 1.' },
    { title: 'quantity above 99', body: (id: string) => ({ product_id: id, quantity: RULES.maxQuantityPerLine + 1 }), field: 'quantity', msg: 'The quantity field must not be greater than 99.' },
    { title: 'non-integer quantity', body: (id: string) => ({ product_id: id, quantity: 'abc' }), field: 'quantity', msg: 'The quantity field must be an integer.' },
    { title: 'unknown product', body: () => ({ product_id: 'nope', quantity: 1 }), field: 'product_id', msg: 'The selected product id is invalid.' },
    { title: 'missing product', body: () => ({ quantity: 1 }), field: 'product_id', msg: 'The product id field is required.' },
  ];
  for (const { title, body, field, msg } of invalid) {
    test(`TCRT-004 validation — ${title} → 422`, async ({ api }) => {
      const cartId = await api.createCart();
      const res = await api.post(`/carts/${cartId}`, body(inStock[0].id));
      expect(res.status()).toBe(422);
      const err = expectSchema(ValidationError, await res.json(), '422 body');
      expect(err.errors?.[field]).toContain(msg);
      expect((await api.cart(cartId)).cart_items).toHaveLength(0);
      await api.delete(`/carts/${cartId}`);
    });
  }

  test('TCRT-005 99 is the maximum accepted quantity (boundary)', async ({ api }) => {
    const cartId = await api.createCart();
    expect((await api.addToCart(cartId, inStock[0].id, RULES.maxQuantityPerLine)).status()).toBe(200);
    expect((await api.cart(cartId)).cart_items[0].quantity).toBe(RULES.maxQuantityPerLine);
    await api.delete(`/carts/${cartId}`);
  });

  test('TCRT-006 rental + regular product in one cart triggers the 15% bundle discount', async ({ api }) => {
    const rental = (await api.products({ is_rental: true })).data[0];
    const cartId = await api.cartWith([{ product: inStock[0], quantity: 1 }]);
    expect((await api.cart(cartId)).additional_discount_percentage).toBeNull();

    expect((await api.addToCart(cartId, rental.id, 1)).status()).toBe(200);
    expect((await api.cart(cartId)).additional_discount_percentage).toBe(RULES.rentalBundleDiscountPct);
    await api.delete(`/carts/${cartId}`);
  });

  test('TCRT-007 operations on an unknown cart → 404', async ({ api }) => {
    const ghost = '01zzzzzzzzzzzzzzzzzzzzzzzz';
    expect((await api.get(`/carts/${ghost}`)).status()).toBe(404);
    expect((await api.addToCart(ghost, inStock[0].id, 1)).status()).toBe(404);
  });
});
