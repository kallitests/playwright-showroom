// =============================================================================
// toolshop/tests/api/orders.spec.ts — Payment check & order (invoice) API
// =============================================================================
// Risks: payment details not validated, wrong invoice totals, orders visible to
// the wrong user. Orders are placed on the public demo with cash-on-delivery
// and e-mails on the reserved example.com domain (no real person is mailed).
// =============================================================================

import { test, expect } from '../../fixtures';
import { Invoice, MessageBody, ValidationError, expectSchema } from '../../api/schemas';

const futureExpiry = () => {
  const d = new Date();
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear() + 2}`;
};

test.describe('Payment check API', { tag: ['@api', '@toolshop', '@payment'] }, () => {
  const valid = [
    { method: 'cash-on-delivery', details: {} },
    { method: 'bank-transfer', details: { bank_name: 'Test Bank', account_name: 'Jane Doe', account_number: '123456789' } },
    { method: 'credit-card', details: { credit_card_number: '1111-2222-3333-4444', expiration_date: futureExpiry(), cvv: '123', card_holder_name: 'Jane Doe' } },
    { method: 'buy-now-pay-later', details: { monthly_installments: 6 } },
  ];
  for (const { method, details } of valid) {
    test(`TPAY-001 valid ${method} details are accepted`, async ({ api }) => {
      const res = await api.post('/payment/check', { payment_method: method, payment_details: details });
      expect(res.status()).toBe(200);
      expect(expectSchema(MessageBody, await res.json()).message).toBe('Payment was successful');
    });
  }

  const invalid = [
    { title: 'credit card number format', method: 'credit-card', details: { credit_card_number: '1234', expiration_date: futureExpiry(), cvv: '123', card_holder_name: 'Jane Doe' }, field: 'payment_details.credit_card_number' },
    { title: 'expired card', method: 'credit-card', details: { credit_card_number: '1111-2222-3333-4444', expiration_date: '01/2020', cvv: '123', card_holder_name: 'Jane Doe' }, field: 'payment_details.expiration_date' },
    { title: 'CVV with letters', method: 'credit-card', details: { credit_card_number: '1111-2222-3333-4444', expiration_date: futureExpiry(), cvv: '12a', card_holder_name: 'Jane Doe' }, field: 'payment_details.cvv' },
    { title: 'bank account with letters', method: 'bank-transfer', details: { bank_name: 'Test Bank', account_name: 'Jane', account_number: 'ABC' }, field: 'payment_details.account_number' },
    { title: 'BNPL without installments', method: 'buy-now-pay-later', details: {}, field: 'payment_details.monthly_installments' },
  ];
  for (const { title, method, details, field } of invalid) {
    test(`TPAY-002 invalid payment — ${title} → 422`, async ({ api }) => {
      const res = await api.post('/payment/check', { payment_method: method, payment_details: details });
      expect(res.status()).toBe(422);
      expect(Object.keys(expectSchema(ValidationError, await res.json()).errors ?? {})).toContain(field);
    });
  }
});

test.describe('Orders API', { tag: ['@api', '@toolshop', '@orders'] }, () => {
  test('TORD-001 guest order: invoice created with the cart total', { tag: '@critical' }, async ({ api }) => {
    // C/D/E-rated products: no eco discount (that rule is covered separately)
    const [a, b] = (await api.allProducts()).filter((p) => p.in_stock && !['A', 'B'].includes(p.co2_rating));
    const cartId = await api.cartWith([
      { product: a, quantity: 2 },
      { product: b, quantity: 1 },
    ]);
    const address = await api.lookupAddress();

    const res = await api.guestInvoice(cartId, address);
    expect(res.status(), await res.text()).toBe(201);
    const invoice = expectSchema(Invoice, await res.json(), 'guest invoice');

    const expectedSubtotal = Math.round((a.price * 2 + b.price) * 100) / 100;
    expect(invoice.subtotal).toBeCloseTo(expectedSubtotal, 2);
    expect(invoice.total).toBeCloseTo(expectedSubtotal, 2); // no discount applies
    expect(invoice.billing_city).toBe(address.city);
  });

  test('TORD-002 order validation: unknown payment method, missing address, inconsistent city', async ({ api }) => {
    const product = (await api.products()).data.find((p) => p.in_stock)!;
    const cartId = await api.cartWith([{ product, quantity: 1 }]);
    const address = await api.lookupAddress();

    const badMethod = await api.guestInvoice(cartId, address, 'bitcoin');
    expect(badMethod.status()).toBe(422);
    expect(Object.keys(expectSchema(ValidationError, await badMethod.json()).errors ?? {})).toContain('payment_method');

    const wrongCity = await api.guestInvoice(cartId, { ...address, city: 'Atlantis' });
    expect(wrongCity.status()).toBe(422);
    expect(Object.keys(expectSchema(ValidationError, await wrongCity.json()).errors ?? {})).toContain('billing_country');

    const noAddress = await api.post('/invoices/guest', { cart_id: cartId, payment_method: 'cash-on-delivery', payment_details: {} });
    expect(noAddress.status()).toBe(422);
    const fields = Object.keys(expectSchema(ValidationError, await noAddress.json()).errors ?? {});
    expect(fields).toEqual(expect.arrayContaining(['billing_street', 'billing_city', 'billing_country', 'guest_email']));
  });

  test('TORD-003 a customer only sees their own invoices', { tag: '@security' }, async ({ customerApi }) => {
    const me = await (await customerApi.get('/users/me')).json();
    const res = await customerApi.get('/invoices');
    expect(res.status()).toBe(200);
    const page = await res.json();
    const invoices = (page.data ?? page) as { user_id?: string }[];
    expect(invoices.every((i) => i.user_id === undefined || i.user_id === me.id)).toBe(true);
  });
});
