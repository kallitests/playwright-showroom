// =============================================================================
// tests/api/orders-contract.mock.spec.ts — ⚠️ MOCKED API CONTRACT ⚠️
// =============================================================================
// These tests target utils/mock-api/orders-mock-server.ts, an in-process mock.
// They are NOT tests of SauceDemo (which has no API). They demonstrate the API
// testing approach you would apply to a real Swag Labs backend: contract and
// schema checks, validation, authentication, idempotency, business rules.
// Tag: @mock — excluded from nothing, but always reported as mock in docs.
// =============================================================================

import { test as base, expect, type APIRequestContext } from '@playwright/test';
import { MOCK_TOKEN, startOrdersMock } from '../../utils/mock-api/orders-mock-server';
import { expectedTotals } from '../../utils/helpers';
import { CATALOG, CHECKOUT_INFO } from '../../utils/test-data';

const test = base.extend<{ api: APIRequestContext; anonymousApi: APIRequestContext }, { mockUrl: string }>({
  mockUrl: [
    async ({}, use) => {
      const mock = await startOrdersMock();
      await use(mock.url);
      await mock.close();
    },
    { scope: 'worker' },
  ],
  api: async ({ playwright, mockUrl }, use) => {
    const ctx = await playwright.request.newContext({ baseURL: mockUrl, extraHTTPHeaders: { Authorization: `Bearer ${MOCK_TOKEN}` } });
    await use(ctx);
    await ctx.dispose();
  },
  anonymousApi: async ({ playwright, mockUrl }, use) => {
    const ctx = await playwright.request.newContext({ baseURL: mockUrl });
    await use(ctx);
    await ctx.dispose();
  },
});

const validOrder = { items: [4, 0], customer: CHECKOUT_INFO.valid };

test.describe('Orders API contract (MOCK)', { tag: ['@api', '@mock', '@chromium-only'] }, () => {
  test('MOCK-001 health endpoint identifies itself as a mock', async ({ anonymousApi }) => {
    const res = await anonymousApi.get('/api/v1/health');
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok', mock: true });
    expect(res.headers()['x-mock-api']).toBe('true');
  });

  test('MOCK-002 POST /orders returns 201 and a payload matching the contract', async ({ api }) => {
    const res = await api.post('/api/v1/orders', { data: validOrder });
    expect(res.status()).toBe(201);
    expect(res.headers()['content-type']).toContain('application/json');

    const order = await res.json();
    expect(order).toEqual({
      orderId: expect.stringMatching(/^[0-9a-f-]{36}$/),
      status: 'CONFIRMED',
      items: expect.any(Array),
      subtotal: expect.any(Number),
      tax: expect.any(Number),
      total: expect.any(Number),
      createdAt: expect.any(String),
    });
    expect(Number.isNaN(Date.parse(order.createdAt))).toBe(false);
  });

  test('MOCK-003 totals follow the same rule as the UI (catalog price + 8% tax)', async ({ api }) => {
    const ids = CATALOG.map((p) => p.id);
    const order = await (await api.post('/api/v1/orders', { data: { ...validOrder, items: ids } })).json();
    expect({ subtotal: order.subtotal, tax: order.tax, total: order.total }).toEqual(expectedTotals(CATALOG.map((p) => p.price)));
  });

  test('MOCK-004 a created order can be read back; unknown ids return 404', async ({ api }) => {
    const created = await (await api.post('/api/v1/orders', { data: validOrder })).json();
    const read = await api.get(`/api/v1/orders/${created.orderId}`);
    expect(read.status()).toBe(200);
    expect(await read.json()).toEqual(created);

    expect((await api.get('/api/v1/orders/does-not-exist')).status()).toBe(404);
  });

  const invalid = [
    { title: 'empty items', data: { ...validOrder, items: [] }, detail: 'items must be a non-empty array' },
    { title: 'unknown product', data: { ...validOrder, items: [42] }, detail: 'items contains an unknown product id' },
    { title: 'duplicate product', data: { ...validOrder, items: [4, 4] }, detail: 'items must not contain duplicates' },
    { title: 'missing postal code', data: { ...validOrder, customer: CHECKOUT_INFO.missingPostalCode }, detail: 'customer.postalCode is required' },
    { title: 'whitespace-only names', data: { ...validOrder, customer: CHECKOUT_INFO.whitespaceOnly }, detail: 'customer.firstName is required' },
  ];
  for (const { title, data, detail } of invalid) {
    test(`MOCK-005 validation — ${title} → 400`, async ({ api }) => {
      const res = await api.post('/api/v1/orders', { data });
      expect(res.status()).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('VALIDATION_ERROR');
      expect(body.details).toContain(detail);
    });
  }

  test('MOCK-006 missing or wrong token → 401', async ({ anonymousApi }) => {
    expect((await anonymousApi.post('/api/v1/orders', { data: validOrder })).status()).toBe(401);
    const wrong = await anonymousApi.post('/api/v1/orders', { data: validOrder, headers: { Authorization: 'Bearer nope' } });
    expect(wrong.status()).toBe(401);
  });

  test('MOCK-007 Idempotency-Key: a retried request does not create a second order', async ({ api }) => {
    const headers = { 'Idempotency-Key': `key-${test.info().testId}` };
    const first = await (await api.post('/api/v1/orders', { data: validOrder, headers })).json();
    const retry = await api.post('/api/v1/orders', { data: validOrder, headers });
    expect(retry.status()).toBe(201);
    expect((await retry.json()).orderId).toBe(first.orderId);

    const conflicting = await api.post('/api/v1/orders', { data: { ...validOrder, items: [1] }, headers });
    expect(conflicting.status()).toBe(409);
  });
});
