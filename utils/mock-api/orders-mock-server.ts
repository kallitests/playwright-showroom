// =============================================================================
// utils/mock-api/orders-mock-server.ts — ⚠️ MOCK API, NOT PART OF SAUCEDEMO ⚠️
// =============================================================================
// SauceDemo has no backend API. To demonstrate API-testing skills (status
// codes, validation, auth, contract/schema checks, idempotency) without
// pretending otherwise, this file implements a small, clearly-labelled mock of
// the "Orders API" a real Swag Labs backend would need.
//
// The pricing rules mirror what the SauceDemo UI computes (catalog prices,
// 8 % tax) so the contract stays consistent with the product under test.
//
// Contract (v1)
//   POST /api/v1/orders      Authorization: Bearer <token>
//        body { items: number[], customer: { firstName, lastName, postalCode } }
//        201 { orderId, status:'CONFIRMED', items, subtotal, tax, total, createdAt }
//        400 { error:'VALIDATION_ERROR', details: string[] }
//        401 { error:'UNAUTHORIZED' }
//        409 { error:'DUPLICATE_REQUEST' }  (same Idempotency-Key, different body)
//   GET  /api/v1/orders/:id  200 order | 404 { error:'NOT_FOUND' }
//   GET  /api/v1/health      200 { status:'ok', mock:true }
// =============================================================================

import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { randomUUID } from 'node:crypto';
import { CATALOG } from '../test-data';
import { expectedTotals } from '../helpers';

export const MOCK_TOKEN = 'mock-token-for-tests-only';

type Order = {
  orderId: string;
  status: 'CONFIRMED';
  items: { id: number; name: string; price: number }[];
  subtotal: number;
  tax: number;
  total: number;
  createdAt: string;
};

function validate(body: unknown): string[] {
  const errors: string[] = [];
  const b = body as { items?: unknown; customer?: Record<string, unknown> } | null;
  if (!b || typeof b !== 'object') return ['body must be a JSON object'];
  if (!Array.isArray(b.items) || b.items.length === 0) errors.push('items must be a non-empty array');
  else {
    const ids = b.items as unknown[];
    if (ids.some((id) => !CATALOG.some((p) => p.id === id))) errors.push('items contains an unknown product id');
    if (new Set(ids).size !== ids.length) errors.push('items must not contain duplicates');
  }
  for (const field of ['firstName', 'lastName', 'postalCode']) {
    const v = b.customer?.[field];
    if (typeof v !== 'string' || v.trim() === '') errors.push(`customer.${field} is required`);
  }
  return errors;
}

export async function startOrdersMock(): Promise<{ url: string; close: () => Promise<void> }> {
  const orders = new Map<string, Order>();
  const idempotency = new Map<string, { body: string; orderId: string }>();

  const server = http.createServer((req, res) => {
    const json = (status: number, payload: unknown) => {
      res.writeHead(status, { 'content-type': 'application/json', 'x-mock-api': 'true' });
      res.end(JSON.stringify(payload));
    };
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      const url = new URL(req.url ?? '/', 'http://mock');

      if (req.method === 'GET' && url.pathname === '/api/v1/health') return json(200, { status: 'ok', mock: true });

      if (req.headers.authorization !== `Bearer ${MOCK_TOKEN}`) return json(401, { error: 'UNAUTHORIZED' });

      if (req.method === 'POST' && url.pathname === '/api/v1/orders') {
        let body: unknown;
        try {
          body = JSON.parse(raw || 'null');
        } catch {
          return json(400, { error: 'VALIDATION_ERROR', details: ['malformed JSON'] });
        }
        const errors = validate(body);
        if (errors.length) return json(400, { error: 'VALIDATION_ERROR', details: errors });

        const key = req.headers['idempotency-key'];
        if (typeof key === 'string' && idempotency.has(key)) {
          const prev = idempotency.get(key)!;
          if (prev.body !== raw) return json(409, { error: 'DUPLICATE_REQUEST' });
          return json(201, orders.get(prev.orderId));
        }

        const ids = (body as { items: number[] }).items;
        const items = ids.map((id) => CATALOG.find((p) => p.id === id)!).map(({ id, name, price }) => ({ id, name, price }));
        const order: Order = {
          orderId: randomUUID(),
          status: 'CONFIRMED',
          items,
          ...expectedTotals(items.map((i) => i.price)),
          createdAt: new Date().toISOString(),
        };
        orders.set(order.orderId, order);
        if (typeof key === 'string') idempotency.set(key, { body: raw, orderId: order.orderId });
        return json(201, order);
      }

      const match = url.pathname.match(/^\/api\/v1\/orders\/([\w-]+)$/);
      if (req.method === 'GET' && match) {
        const order = orders.get(match[1]);
        return order ? json(200, order) : json(404, { error: 'NOT_FOUND' });
      }
      return json(404, { error: 'NOT_FOUND' });
    });
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}
