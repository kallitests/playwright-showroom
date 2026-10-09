// =============================================================================
// toolshop/pages/CheckoutPage.ts — 4-step checkout wizard on /checkout
// =============================================================================
//   1 Cart        → proceed-1
//   2 Sign in     → login (customer) or guest form → proceed-2 / proceed-2-guest
//   3 Address     → country + postcode trigger an address lookup → proceed-3
//   4 Payment     → payment-method (+ details) → finish → #order-confirmation
// =============================================================================

import { expect, type Locator, type Page } from '@playwright/test';
import { Header } from './components/Header';

export type LineInfo = { name: string; quantity: number; unitPrice: number; linePrice: number };

export class CheckoutPage {
  readonly header: Header;
  // step 1
  readonly rows: Locator;
  readonly cartTotal: Locator;
  readonly cartDiscount: Locator;
  readonly cartSubtotal: Locator;
  readonly emptyMessage: Locator;
  readonly proceed1: Locator;
  // step 2
  readonly email: Locator;
  readonly password: Locator;
  readonly loginSubmit: Locator;
  readonly guestEmail: Locator;
  readonly guestFirstName: Locator;
  readonly guestLastName: Locator;
  readonly guestSubmit: Locator;
  readonly proceed2: Locator;
  readonly proceed2Guest: Locator;
  // step 3
  readonly country: Locator;
  readonly postalCode: Locator;
  readonly houseNumber: Locator;
  readonly street: Locator;
  readonly city: Locator;
  readonly state: Locator;
  readonly proceed3: Locator;
  // step 4
  readonly paymentMethod: Locator;
  readonly finish: Locator;
  readonly paymentError: Locator;
  readonly confirmation: Locator;
  readonly invoiceNumber: Locator;

  constructor(readonly page: Page) {
    this.header = new Header(page);
    this.rows = page.locator('tbody tr').filter({ has: page.getByTestId('product-title') });
    this.cartTotal = page.getByTestId('cart-total');
    this.cartDiscount = page.getByTestId('cart-discount');
    this.cartSubtotal = page.getByTestId('cart-subtotal');
    this.emptyMessage = page.getByText('The cart is empty. Nothing to display.');
    this.proceed1 = page.getByTestId('proceed-1');

    this.email = page.getByTestId('email');
    this.password = page.getByTestId('password');
    this.loginSubmit = page.getByTestId('login-submit');
    this.guestEmail = page.getByTestId('guest-email');
    this.guestFirstName = page.getByTestId('guest-first-name');
    this.guestLastName = page.getByTestId('guest-last-name');
    this.guestSubmit = page.getByTestId('guest-submit');
    this.proceed2 = page.getByTestId('proceed-2');
    this.proceed2Guest = page.getByTestId('proceed-2-guest');

    this.country = page.getByTestId('country');
    this.postalCode = page.getByTestId('postal_code');
    this.houseNumber = page.getByTestId('house_number');
    this.street = page.getByTestId('street');
    this.city = page.getByTestId('city');
    this.state = page.getByTestId('state');
    this.proceed3 = page.getByTestId('proceed-3');

    this.paymentMethod = page.getByTestId('payment-method');
    this.finish = page.getByTestId('finish');
    this.paymentError = page.getByTestId('payment-error-message');
    this.confirmation = page.locator('#order-confirmation');
    this.invoiceNumber = page.locator('#invoice-number');
  }

  async goto(): Promise<void> {
    await this.page.goto('/checkout');
  }

  row(name: string): Locator {
    return this.rows.filter({ has: this.page.getByTestId('product-title').getByText(name, { exact: true }) });
  }

  async lines(): Promise<LineInfo[]> {
    await expect(this.rows.first()).toBeVisible();
    const money = (s: string | null) => Number((s ?? '').replace(/[^0-9.]/g, ''));
    const out: LineInfo[] = [];
    for (const row of await this.rows.all()) {
      out.push({
        name: ((await row.getByTestId('product-title').textContent()) ?? '').trim(),
        quantity: Number(await row.getByTestId('product-quantity').inputValue()),
        unitPrice: money(await row.getByTestId('product-price').textContent()),
        linePrice: money(await row.getByTestId('line-price').textContent()),
      });
    }
    return out;
  }

  async total(): Promise<number> {
    return Number(((await this.cartTotal.textContent()) ?? '').replace(/[^0-9.]/g, ''));
  }

  async setQuantity(name: string, quantity: number): Promise<void> {
    const input = this.row(name).getByTestId('product-quantity');
    await Promise.all([
      this.page.waitForResponse((r) => r.url().includes('/product/quantity') && r.ok()),
      input.fill(String(quantity)).then(() => input.press('Tab')),
    ]);
  }

  /** The remove control has no data-test/accessible name (testability gap, see docs). */
  async removeLine(name: string): Promise<void> {
    await Promise.all([
      this.page.waitForResponse((r) => r.request().method() === 'DELETE' && r.url().includes('/product/') && r.ok()),
      this.row(name).locator('a.btn-danger').click(),
    ]);
  }

  async continueAsGuest(guest: { email: string; firstName: string; lastName: string }): Promise<void> {
    await this.proceed1.click();
    await this.page.getByRole('tab', { name: 'Continue as Guest' }).click();
    await this.guestEmail.fill(guest.email);
    await this.guestFirstName.fill(guest.firstName);
    await this.guestLastName.fill(guest.lastName);
    await this.guestSubmit.click();
    await this.proceed2Guest.click();
  }

  async continueAsSignedIn(): Promise<void> {
    await this.proceed1.click();
    await this.proceed2.click();
  }

  /** Country + postcode drive the address lookup which fills street/city/state. */
  async fillAddress(countryCode: string, postcode: string, houseNumber = '1'): Promise<void> {
    await this.country.selectOption(countryCode);
    await this.postalCode.fill(postcode);
    await this.houseNumber.fill(houseNumber);
    await this.houseNumber.press('Tab');
    await expect(this.city).not.toHaveValue('');
    await expect(this.proceed3).toBeEnabled();
    await this.proceed3.click();
  }

  async payWithCashOnDelivery(): Promise<string> {
    await this.paymentMethod.selectOption('cash-on-delivery');
    await Promise.all([
      this.page.waitForResponse((r) => r.url().includes('/invoices') && r.request().method() === 'POST' && r.status() === 201),
      this.finish.click(),
    ]);
    await expect(this.confirmation).toContainText('Thanks for your order!');
    return ((await this.invoiceNumber.textContent()) ?? '').trim();
  }
}
