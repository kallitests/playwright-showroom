// =============================================================================
// toolshop/tests/ui/contact.spec.ts — Contact form client-side validation
// =============================================================================
// Only the validation layer is exercised: the form is never sent, so no
// message is written to the shared demo. (API-side rules: see TEXP-004.)
// =============================================================================

import { test, expect } from '../../fixtures';

test.describe('Contact form — UI validation', { tag: ['@ui', '@toolshop', '@contact'] }, () => {
  test.beforeEach(async ({ contactPage }) => {
    await contactPage.goto();
  });

  test('TUCON-001 submitting an empty form lists every required field', async ({ contactPage, page }) => {
    let sent = false;
    page.on('request', (r) => r.url().includes('/messages') && r.method() === 'POST' && (sent = true));
    await contactPage.submit.click();

    await expect(contactPage.errors.firstName).toBeVisible();
    await expect(contactPage.errors.lastName).toBeVisible();
    await expect(contactPage.errors.email).toBeVisible();
    await expect(contactPage.errors.subject).toHaveText('Subject is required');
    await expect(contactPage.errors.message).toHaveText('Message is required');
    expect(sent).toBe(false);
  });

  test('TUCON-002 message shorter than 50 characters is rejected', async ({ contactPage }) => {
    await contactPage.message.fill('Too short.');
    await contactPage.submit.click();
    await expect(contactPage.errors.message).toHaveText('Message must be minimal 50 characters');
  });

  test('TUCON-003 malformed e-mail is rejected', async ({ contactPage }) => {
    await contactPage.email.fill('jane@');
    await contactPage.submit.click();
    await expect(contactPage.errors.email).toBeVisible();
  });
});
