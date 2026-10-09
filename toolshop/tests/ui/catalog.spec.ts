// =============================================================================
// toolshop/tests/ui/catalog.spec.ts — Catalog UI: search, sort, filters, pagination, detail
// =============================================================================
// The API is the oracle: the UI must show what the API returns (same names,
// same prices, same order). This catches rendering, mapping and sort bugs
// without hard-coding catalog data that the demo may change.
// =============================================================================

import { test, expect } from '../../fixtures';

test.describe('Catalog — UI', { tag: ['@ui', '@toolshop', '@catalog'] }, () => {
  test.beforeEach(async ({ catalogPage }) => {
    await catalogPage.goto();
  });

  test('TUCAT-001 home page lists the first API page, same names and prices', { tag: ['@smoke', '@critical'] }, async ({ catalogPage, api }) => {
    const apiPage = await api.products();
    await expect(catalogPage.cards).toHaveCount(apiPage.data.length);
    expect(await catalogPage.nameList()).toEqual(apiPage.data.map((p) => p.name));
    expect(await catalogPage.priceList()).toEqual(apiPage.data.map((p) => p.price));
  });

  test('TUCAT-002 search shows only matching products and the result caption', async ({ catalogPage, api }) => {
    const expected = (await (await api.get('/products/search', { q: 'pliers' })).json()).data.map((p: { name: string }) => p.name);
    await catalogPage.search('pliers');

    await expect(catalogPage.searchCaption).toContainText('pliers');
    await expect.poll(() => catalogPage.nameList()).toEqual(expected);
  });

  test('TUCAT-003 search without results shows the empty state', async ({ catalogPage }) => {
    await catalogPage.searchInput.fill('zzz-no-such-tool-zzz');
    await catalogPage.searchSubmit.click();
    await expect(catalogPage.noResults).toHaveText('There are no products found.');
    await expect(catalogPage.cards).toHaveCount(0);
  });

  test('TUCAT-004 search reset restores the full catalog', async ({ catalogPage, api }) => {
    await catalogPage.search('hammer');
    await catalogPage.reloadingGrid(() => catalogPage.searchReset.click());
    await expect.poll(() => catalogPage.nameList()).toEqual((await api.products()).data.map((p) => p.name));
  });

  for (const [value, dir] of [
    ['price,asc', 'asc'],
    ['price,desc', 'desc'],
  ] as const) {
    test(`TUCAT-005 sort ${value} matches the API order`, async ({ catalogPage, api }) => {
      const expected = (await api.products({ sort: value })).data.map((p) => p.price);
      await catalogPage.sortBy(value);
      await expect.poll(() => catalogPage.priceList()).toEqual(expected);
      const shown = await catalogPage.priceList();
      expect(shown).toEqual([...shown].sort((a, b) => (dir === 'asc' ? a - b : b - a)));
    });
  }

  test('TUCAT-006 category filter keeps only that category', async ({ catalogPage, api }) => {
    const categories = (await (await api.get('/categories')).json()) as { id: string; slug: string; name: string }[];
    const hammer = categories.find((c) => c.slug === 'hammer')!;
    const expected = (await api.products({ by_category: hammer.id })).data.map((p) => p.name);

    await catalogPage.filterCategory(hammer.name);
    await expect.poll(() => catalogPage.nameList()).toEqual(expected);
  });

  test('TUCAT-007 pagination shows page 2 without overlap with page 1', async ({ catalogPage, api }) => {
    const page1 = await catalogPage.nameList();
    await catalogPage.goToPage(2);
    const expected = (await api.products({ page: 2 })).data.map((p) => p.name);
    await expect.poll(() => catalogPage.nameList()).toEqual(expected);
    expect(expected.filter((n) => page1.includes(n))).toEqual([]);
  });

  test('TUCAT-008 product detail shows the API data', async ({ catalogPage, productPage, api }) => {
    const product = (await api.products()).data[0];
    await catalogPage.openProduct(product.name);

    await expect(productPage.name).toHaveText(product.name);
    await expect(productPage.unitPrice).toHaveText(product.price.toFixed(2));
    await expect(productPage.description).toContainText(product.description.slice(0, 40));
  });

  test('TUCAT-009 out-of-stock product cannot be added from the UI', async ({ productPage, api }) => {
    const outOfStock = await api.findProduct((p) => !p.in_stock);
    await productPage.goto(outOfStock.id);

    await expect(productPage.outOfStock).toBeVisible();
    await expect(productPage.addToCart).toBeDisabled();
    await expect(productPage.quantity).toBeDisabled();
  });

  test('TUCAT-010 language switch translates the UI and is remembered', async ({ catalogPage, page }) => {
    await catalogPage.header.switchLanguage('fr');
    await expect(page.getByTestId('nav-home')).toHaveText(/Accueil/i);
    await page.reload();
    await expect(page.getByTestId('nav-home')).toHaveText(/Accueil/i);
  });
});
