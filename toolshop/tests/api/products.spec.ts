// =============================================================================
// toolshop/tests/api/products.spec.ts — Catalog API: contract, pagination, search, filters, sort
// =============================================================================
// Risks: broken contract for the front-end, wrong filtering/sorting (customers
// cannot find products), pagination losing or duplicating items.
// Facts verified live on 2026-10-09: 9 items/page (per_page is ignored),
// 6 hammers for "hammer", 3 rentals, 404 + {"message"} for unknown ids.
// =============================================================================

import { test, expect } from '../../fixtures';
import { Brand, CategoryNode, MessageBody, Product, ProductPage, Status, expectSchema } from '../../api/schemas';
import { RULES } from '../../config';
import { z } from 'zod';

const isSorted = (values: number[], dir: 'asc' | 'desc') =>
  values.every((v, i) => i === 0 || (dir === 'asc' ? values[i - 1] <= v : values[i - 1] >= v));

test.describe('Products API', { tag: ['@api', '@toolshop'] }, () => {
  test('TPRD-001 GET /status identifies the deployment', { tag: ['@smoke', '@critical'] }, async ({ api }) => {
    const res = await api.get('/status');
    expect(res.status()).toBe(200);
    const status = expectSchema(Status, await res.json(), '/status');
    test.info().annotations.push({ type: 'deployment', description: `${status.environment} v${status.version}` });
  });

  test('TPRD-002 GET /products returns a paginated list matching the contract', { tag: ['@smoke', '@critical'] }, async ({ api }) => {
    const res = await api.get('/products');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('application/json');
    const page = expectSchema(ProductPage, await res.json(), 'GET /products');

    expect(page.current_page).toBe(1);
    expect(page.per_page).toBe(RULES.productsPerPage);
    expect(page.data.length).toBeLessThanOrEqual(page.per_page);
    expect(page.last_page).toBe(Math.ceil(page.total / page.per_page));
  });

  test('TPRD-003 walking all pages yields every product exactly once', async ({ api }) => {
    const first = await api.products();
    const all = await api.allProducts();
    expect(all).toHaveLength(first.total);
    expect(new Set(all.map((p) => p.id)).size).toBe(first.total);
  });

  test('TPRD-004 GET /products/{id} returns the product with its specs', async ({ api }) => {
    const listed = (await api.products()).data[0];
    const res = await api.get(`/products/${listed.id}`);
    expect(res.status()).toBe(200);
    const detail = expectSchema(Product.and(z.object({ specs: z.array(z.unknown()) }).passthrough()), await res.json(), 'GET /products/{id}');
    // list and detail must agree on the commercial data
    expect({ name: detail.name, price: detail.price, in_stock: detail.in_stock }).toEqual({
      name: listed.name,
      price: listed.price,
      in_stock: listed.in_stock,
    });
  });

  test('TPRD-005 unknown product id → 404 with a message', async ({ api }) => {
    const res = await api.get('/products/01ZZZZZZZZZZZZZZZZZZZZZZZZ');
    expect(res.status()).toBe(404);
    expect(expectSchema(MessageBody, await res.json()).message).toBe('Requested item not found');
  });

  test('TPRD-006 search is relevant: every hit contains the term', async ({ api }) => {
    const res = await api.get('/products/search', { q: 'hammer' });
    expect(res.status()).toBe(200);
    const page = expectSchema(ProductPage, await res.json(), 'search');
    expect(page.total).toBeGreaterThan(0);
    for (const p of page.data) expect(p.name.toLowerCase()).toContain('hammer');
  });

  test('TPRD-007 search with no match returns an empty page, not an error', async ({ api }) => {
    const res = await api.get('/products/search', { q: 'zzz-no-such-tool-zzz' });
    expect(res.status()).toBe(200);
    const page = expectSchema(ProductPage, await res.json(), 'search');
    expect(page.total).toBe(0);
    expect(page.data).toEqual([]);
  });

  for (const dir of ['asc', 'desc'] as const) {
    test(`TPRD-008 sort=price,${dir} orders the whole catalog`, async ({ api }) => {
      const prices = (await api.allProducts({ sort: `price,${dir}` })).map((p) => p.price);
      expect(isSorted(prices, dir), prices.join(', ')).toBe(true);
    });
  }

  test('TPRD-009 sort=name,asc orders products alphabetically', async ({ api }) => {
    const names = (await api.products({ sort: 'name,asc' })).data.map((p) => p.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'en')));
  });

  test('TPRD-010 filters: category, brand, price range, eco-friendly, rentals', async ({ api }) => {
    const categories = (await (await api.get('/categories')).json()) as { id: string; slug: string }[];
    const hammer = categories.find((c) => c.slug === 'hammer')!;
    const byCategory = await api.allProducts({ by_category: hammer.id });
    expect(byCategory.length).toBeGreaterThan(0);
    expect(new Set(byCategory.map((p) => p.category.slug))).toEqual(new Set(['hammer']));

    const brand = ((await (await api.get('/brands')).json()) as { id: string; name: string }[])[0];
    const byBrand = await api.allProducts({ by_brand: brand.id });
    expect(byBrand.every((p) => p.brand.id === brand.id)).toBe(true);

    const cheap = await api.allProducts({ between: 'price,1,10' });
    expect(cheap.length).toBeGreaterThan(0);
    expect(cheap.every((p) => p.price >= 1 && p.price <= 10)).toBe(true);

    const eco = await api.allProducts({ eco_friendly: true });
    expect(eco.every((p) => p.is_eco_friendly)).toBe(true);

    const rentals = await api.allProducts({ is_rental: true });
    expect(rentals.length).toBeGreaterThan(0);
    expect(rentals.every((p) => p.is_rental)).toBe(true);
  });

  test('TPRD-011 rentals are excluded from the default shop listing', async ({ api }) => {
    const all = await api.allProducts();
    expect(all.some((p) => p.is_rental)).toBe(false);
  });

  test('TPRD-012 brands and category tree match their contracts', async ({ api }) => {
    const brands = expectSchema(z.array(Brand).min(1), await (await api.get('/brands')).json(), 'brands');
    expect(new Set(brands.map((b) => b.slug)).size).toBe(brands.length);

    const tree = expectSchema(z.array(CategoryNode).min(1), await (await api.get('/categories/tree')).json(), 'category tree');
    expect(tree.map((c) => c.slug)).toEqual(expect.arrayContaining(['hand-tools', 'power-tools']));
    expect(tree.every((c) => (c.sub_categories ?? []).length > 0)).toBe(true);
  });
});
