// =============================================================================
// pages/CheckoutPage.ts — Checkout: information → overview → complete
// =============================================================================
//   Step 1: /checkout-step-one.html — personal information form
//   Step 2: /checkout-step-two.html — order overview (subtotal, tax, total)
//   Step 3: /checkout-complete.html — confirmation (+ optional PDF receipt)
// =============================================================================

import { expect, type Locator, type Page } from '@playwright/test';
import { Header } from './components/Header';
import { parsePrice } from '../utils/helpers';
import { CONFIRMATION, type CheckoutInfo } from '../utils/test-data';

export class CheckoutPage {
  readonly header: Header;

  // Step 1
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly postalCodeInput: Locator;
  readonly continueButton: Locator;
  readonly cancelButton: Locator;
  readonly errorMessage: Locator;

  // Step 2
  readonly summaryItemNames: Locator;
  readonly subtotalLabel: Locator;
  readonly taxLabel: Locator;
  readonly totalPrice: Locator;
  readonly paymentInfo: Locator;
  readonly shippingInfo: Locator;
  readonly finishButton: Locator;

  // Step 3
  readonly confirmationHeader: Locator;
  readonly confirmationText: Locator;
  readonly backHomeButton: Locator;
  readonly pdfButton: Locator;

  constructor(readonly page: Page) {
    this.header = new Header(page);

    this.firstNameInput = page.getByTestId('firstName');
    this.lastNameInput = page.getByTestId('lastName');
    this.postalCodeInput = page.getByTestId('postalCode');
    this.continueButton = page.getByTestId('continue');
    this.cancelButton = page.getByTestId('cancel');
    this.errorMessage = page.getByTestId('error');

    this.summaryItemNames = page.getByTestId('cart-list').getByTestId('inventory-item-name');
    this.subtotalLabel = page.getByTestId('subtotal-label');
    this.taxLabel = page.getByTestId('tax-label');
    this.totalPrice = page.getByTestId('total-label');
    this.paymentInfo = page.getByTestId('payment-info-value');
    this.shippingInfo = page.getByTestId('shipping-info-value');
    this.finishButton = page.getByTestId('finish');

    this.confirmationHeader = page.getByTestId('complete-header');
    this.confirmationText = page.getByTestId('complete-text');
    this.backHomeButton = page.getByTestId('back-to-products');
    this.pdfButton = page.getByTestId('generate-pdf-order');
  }

  // ----- Step 1 -----

  async fillPersonalInfo(info: CheckoutInfo): Promise<void>;
  async fillPersonalInfo(firstName: string, lastName: string, postalCode: string): Promise<void>;
  async fillPersonalInfo(a: CheckoutInfo | string, lastName = '', postalCode = ''): Promise<void> {
    const info = typeof a === 'string' ? { firstName: a, lastName, postalCode } : a;
    await this.firstNameInput.fill(info.firstName);
    await this.lastNameInput.fill(info.lastName);
    await this.postalCodeInput.fill(info.postalCode);
  }

  async clickContinue(): Promise<void> {
    await this.continueButton.click();
  }

  async submitInfo(info: CheckoutInfo): Promise<void> {
    await this.fillPersonalInfo(info);
    await this.clickContinue();
    await expect(this.page).toHaveURL(/checkout-step-two\.html/);
  }

  async expectStepOneError(message: string): Promise<void> {
    await expect(this.errorMessage).toHaveText(message);
    await expect(this.page).toHaveURL(/checkout-step-one\.html/);
  }

  // ----- Step 2 -----

  async totals(): Promise<{ subtotal: number; tax: number; total: number }> {
    return {
      subtotal: parsePrice(await this.subtotalLabel.textContent()),
      tax: parsePrice(await this.taxLabel.textContent()),
      total: parsePrice(await this.totalPrice.textContent()),
    };
  }

  async getTotalPrice(): Promise<string> {
    return (await this.totalPrice.textContent()) ?? '';
  }

  async clickFinish(): Promise<void> {
    await this.finishButton.click();
    await expect(this.page).toHaveURL(/checkout-complete\.html/);
  }

  // ----- Step 3 -----

  async expectOrderConfirmed(): Promise<void> {
    await expect(this.confirmationHeader).toHaveText(CONFIRMATION.header);
    await expect(this.confirmationText).toHaveText(CONFIRMATION.text);
  }
}
