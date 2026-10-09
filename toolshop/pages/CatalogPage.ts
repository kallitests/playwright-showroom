// toolshop/pages/CatalogPage.ts — home page: product grid, search, filters, sort, pagination
import { expect, type Locator, type Page } from '@playwright/test';
import { Header } from './components/Header';

export type SortValue = 'name,asc' | 'name,desc' | 'price,asc' | 'price,desc';

export class CatalogPage {
  readonly header: Header;
  readonly cards: Locator;
  readonly names: Locator;
  readonly prices: Locator;
  readonly searchInput: Locator;
  readonly searchSubmit: Locator;
  readonly searchReset: Locator;
  readonly searchCaption: Locator;
  readonly noResults: Locator;
  readonly sort: Locator;
  readonly ecoFilter: Locator;

  constructor(readonly page: Page) {
    this.header = new Header(page);
    // product cards are links with data-test="product-<ULID>"
    this.cards = page.locator('a[data-test^="product-"]');
    this.names = this.cards.getByTestId('product-name');
    this.prices = this.cards.getByTestId('product-price');
    this.searchInput = page.getByTestId('search-query');
    this.searchSubmit = page.getByTestId('search-submit');
    this.searchReset = page.getByTestId('search-reset');
    this.searchCaption = page.getByTestId('search-caption');
    this.noResults = page.getByTestId('no-results');
    this.sort = page.getByTestId('sort');
    this.ecoFilter = page.getByTestId('eco-friendly-filter');
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
    await this.expectLoaded();
  }

  async expectLoaded(): Promise<void> {
    await expect(this.cards.first()).toBeVisible();
  }

  card(name: string): Locator {
    return this.cards.filter({ has: this.page.getByTestId('product-name').getByText(name, { exact: true }) });
  }

  /** Waits for the grid to be re-rendered by the API call triggered by `action`. */
  async reloadingGrid(action: () => Promise<unknown>, urlPart = '/products'): Promise<void> {
    await Promise.all([this.page.waitForResponse((r) => r.url().includes(urlPart) && r.ok()), action()]);
    await expect(this.cards.first()).toBeVisible();
  }

  async search(term: string): Promise<void> {
    await this.searchInput.fill(term);
    await this.reloadingGrid(() => this.searchSubmit.click(), '/products/search');
  }

  async sortBy(value: SortValue): Promise<void> {
    await this.reloadingGrid(() => this.sort.selectOption(value));
  }

  async filterCategory(categoryName: string): Promise<void> {
    await this.reloadingGrid(() => this.page.getByRole('checkbox', { name: categoryName, exact: true }).check());
  }

  async goToPage(n: number): Promise<void> {
    await this.reloadingGrid(() => this.page.getByRole('button', { name: `Page-${n}`, exact: true }).click());
  }

  async nameList(): Promise<string[]> {
    return (await this.names.allTextContents()).map((s) => s.trim());
  }

  async priceList(): Promise<number[]> {
    return (await this.prices.allTextContents()).map((s) => Number(s.replace(/[^0-9.]/g, '')));
  }

  async openProduct(name: string): Promise<void> {
    await this.card(name).click();
    await expect(this.page).toHaveURL(/\/product\/[0-9A-Z]{26}$/i);
  }
}
