// =============================================================================
// tests/ui/catalog.spec.ts — Catalog: data consistency, sorting, product detail
// =============================================================================
// Risks covered: wrong price displayed, list/detail inconsistency, broken sort,
// broken images, dead product links.
// =============================================================================

import { test, expect } from '../../fixtures';
import { isSortedAsc } from '../../utils/helpers';
import { CATALOG, PRODUCTS } from '../../utils/test-data';
import type { SortOption } from '../../pages/InventoryPage';

test.describe('Catalog — data & sorting', { tag: ['@ui', '@catalog'] }, () => {
  test.beforeEach(async ({ loggedInPage: _page }) => {});

  test('CAT-002 every product shows the reference price', async ({ inventoryPage }) => {
    for (const product of CATALOG) {
      await expect(inventoryPage.item(product.name).getByTestId('inventory-item-price')).toHaveText(`$${product.price.toFixed(2)}`);
    }
  });

  test('CAT-003 default sort is Name (A to Z)', async ({ inventoryPage }) => {
    await expect(inventoryPage.activeSortOption).toHaveText('Name (A to Z)');
    expect(isSortedAsc(await inventoryPage.names(), (a, b) => a.localeCompare(b))).toBe(true);
  });

  const sorts: { id: string; option: SortOption; label: string; check: (n: string[], p: number[]) => boolean }[] = [
    { id: 'CAT-004', option: 'za', label: 'Name (Z to A)', check: (n) => isSortedAsc([...n].reverse(), (a, b) => a.localeCompare(b)) },
    { id: 'CAT-005', option: 'lohi', label: 'Price (low to high)', check: (_n, p) => isSortedAsc(p, (a, b) => a - b) },
    { id: 'CAT-006', option: 'hilo', label: 'Price (high to low)', check: (_n, p) => isSortedAsc([...p].reverse(), (a, b) => a - b) },
    { id: 'CAT-003b', option: 'az', label: 'Name (A to Z)', check: (n) => isSortedAsc(n, (a, b) => a.localeCompare(b)) },
  ];

  for (const { id, option, label, check } of sorts) {
    test(`${id} sort by ${label}`, async ({ inventoryPage }) => {
      await inventoryPage.sortBy(option);
      await expect(inventoryPage.activeSortOption).toHaveText(label);
      expect(check(await inventoryPage.names(), await inventoryPage.prices())).toBe(true);
      // Sorting must re-order, never add/remove products
      await expect(inventoryPage.items).toHaveCount(CATALOG.length);
    });
  }

  test('CAT-011 all product images are loaded and distinct', async ({ inventoryPage }) => {
    const images = inventoryPage.items.locator('img');
    await expect(images).toHaveCount(CATALOG.length);
    const readImages = () =>
      images.evaluateAll((imgs) =>
        (imgs as HTMLImageElement[]).map((img) => ({ src: img.currentSrc || img.src, ok: img.complete && img.naturalWidth > 0 })),
      );
    // Images load asynchronously: poll (auto-retrying) instead of sleeping.
    await expect.poll(async () => (await readImages()).filter((i) => !i.ok), { message: 'broken or unloaded images' }).toEqual([]);
    expect(new Set((await readImages()).map((i) => i.src)).size).toBe(CATALOG.length);
  });

  test('CAT-010 cart state survives a sort change', async ({ inventoryPage }) => {
    await inventoryPage.addToCart(PRODUCTS.onesie);
    await inventoryPage.sortBy('hilo');
    await expect(inventoryPage.item(PRODUCTS.onesie).getByRole('button', { name: 'Remove' })).toBeVisible();
    await inventoryPage.header.expectCartCount(1);
  });
});

test.describe('Catalog — product detail', { tag: ['@ui', '@catalog'] }, () => {
  test.beforeEach(async ({ loggedInPage: _page }) => {});

  for (const product of CATALOG) {
    test(`CAT-007 detail page is consistent with the list — ${product.name}`, async ({ inventoryPage, productPage }) => {
      const listDescription = await inventoryPage.item(product.name).getByTestId('inventory-item-desc').textContent();
      await inventoryPage.openProduct(product.name);

      await expect(productPage.name).toHaveText(product.name);
      await expect(productPage.price).toHaveText(`$${product.price.toFixed(2)}`);
      await expect(productPage.description).toHaveText(listDescription ?? '');
      await expect(productPage.page).toHaveURL(new RegExp(`id=${product.id}$`));
    });
  }

  test('CAT-008 Back to products returns to the catalog', async ({ inventoryPage, productPage }) => {
    await inventoryPage.openProduct(PRODUCTS.backpack);
    await productPage.backToProducts();
    await inventoryPage.expectLoaded();
  });

  test('CAT-009 unknown product id shows a not-found state, not a crash', async ({ productPage }) => {
    await productPage.goto(999);
    await expect(productPage.name).toHaveText('ITEM NOT FOUND');
    await expect(productPage.backButton).toBeVisible();
  });
});
