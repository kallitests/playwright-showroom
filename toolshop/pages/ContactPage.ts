// toolshop/pages/ContactPage.ts — /contact (client-side validation only is exercised: no message is sent)
import { expect, type Locator, type Page } from '@playwright/test';

export class ContactPage {
  readonly firstName: Locator;
  readonly lastName: Locator;
  readonly email: Locator;
  readonly subject: Locator;
  readonly message: Locator;
  readonly submit: Locator;
  readonly errors: Record<'firstName' | 'lastName' | 'email' | 'subject' | 'message', Locator>;

  constructor(readonly page: Page) {
    this.firstName = page.getByTestId('first-name');
    this.lastName = page.getByTestId('last-name');
    this.email = page.getByTestId('email');
    this.subject = page.getByTestId('subject');
    this.message = page.getByTestId('message');
    this.submit = page.getByTestId('contact-submit');
    this.errors = {
      firstName: page.getByTestId('first-name-error'),
      lastName: page.getByTestId('last-name-error'),
      email: page.getByTestId('email-error'),
      subject: page.getByTestId('subject-error'),
      message: page.getByTestId('message-error'),
    };
  }

  async goto(): Promise<void> {
    await this.page.goto('/contact');
    await expect(this.submit).toBeVisible();
  }
}
