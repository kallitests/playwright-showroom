// =============================================================================
// toolshop/api/ToolshopApi.ts — Thin typed client over Playwright's APIRequestContext
// =============================================================================
// Two uses:
//   1. API tests call the low-level `raw*` helpers and assert status + contract.
//   2. UI/E2E tests use the high-level helpers (login, createCart, addToCart,
//      lookupAddress…) to build preconditions in milliseconds instead of clicks.
// No business assertion lives here: the client returns responses, tests judge.
// =============================================================================

import { expect, type APIRequestContext, type APIResponse } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { TEST_EMAIL_DOMAIN, type Account } from '../config';
import { Address, Cart, ProductPage, Token, expectSchema, type Product } from './schemas';

export type Query = Record<string, string | number | boolean>;

export class ToolshopApi {
  private token: string | null = null;

  constructor(readonly request: APIRequestContext) {}

  // ---------------------------------------------------------------- low level
  private headers(extra: Record<string, string> = {}): Record<string, string> {
    return {
      Accept: 'application/json',
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      ...extra,
    };
  }

  get(path: string, params?: Query): Promise<APIResponse> {
    return this.request.get(path, { headers: this.headers(), params });
  }
  post(path: string, data?: unknown): Promise<APIResponse> {
    return this.request.post(path, { headers: this.headers({ 'Content-Type': 'application/json' }), data });
  }
  put(path: string, data?: unknown): Promise<APIResponse> {
    return this.request.put(path, { headers: this.headers({ 'Content-Type': 'application/json' }), data });
  }
  delete(path: string): Promise<APIResponse> {
    return this.request.delete(path, { headers: this.headers() });
  }

  withToken(token: string | null): this {
    this.token = token;
    return this;
  }

  get accessToken(): string | null {
    return this.token;
  }

  // ---------------------------------------------------------------- auth
  async login(account: Account): Promise<string> {
    const res = await this.post('/users/login', { email: account.email, password: account.password });
    expect(res.status(), `login ${account.email}: ${await res.text()}`).toBe(200);
    this.token = expectSchema(Token, await res.json(), 'login token').access_token;
    return this.token;
  }

  /** Registers a throw-away customer (unique e-mail on a reserved domain). */
  async registerThrowawayUser(): Promise<Account & { id: string }> {
    const suffix = randomUUID().slice(0, 8);
    const account = {
      email: `pw-showroom+${suffix}@${TEST_EMAIL_DOMAIN}`,
      // min 8, mixed case, number, symbol, not in breach lists (random suffix)
      password: `Sh0wroom!${suffix}Zq`,
      firstName: 'Test',
      lastName: `Run${suffix}`,
    };
    const res = await this.post('/users/register', {
      first_name: account.firstName,
      last_name: account.lastName,
      email: account.email,
      password: account.password,
      dob: '1990-01-15',
      phone: '0612345678',
      address: { street: 'Teststraat', house_number: '1', city: 'Amsterdam', state: 'Noord-Holland', country: 'NL', postal_code: '1011AB' },
    });
    expect(res.status(), `register: ${await res.text()}`).toBe(201);
    return { ...account, id: (await res.json()).id };
  }

  // ---------------------------------------------------------------- catalog
  async products(params?: Query): Promise<ProductPage> {
    const res = await this.get('/products', params);
    expect(res.status()).toBe(200);
    return expectSchema(ProductPage, await res.json(), 'GET /products');
  }

  /** Walks every page (the API ignores per_page and serves 9 items per page). */
  async allProducts(params: Query = {}): Promise<Product[]> {
    const first = await this.products({ ...params, page: 1 });
    const rest = await Promise.all(
      Array.from({ length: first.last_page - 1 }, (_, i) => this.products({ ...params, page: i + 2 })),
    );
    return [first, ...rest].flatMap((p) => p.data);
  }

  async findProduct(predicate: (p: Product) => boolean, params?: Query): Promise<Product> {
    const product = (await this.allProducts(params)).find(predicate);
    if (!product) throw new Error('No product matches the predicate');
    return product;
  }

  // ---------------------------------------------------------------- cart
  async createCart(): Promise<string> {
    const res = await this.post('/carts');
    expect(res.status()).toBe(201);
    return (await res.json()).id as string;
  }

  addToCart(cartId: string, productId: string, quantity: number): Promise<APIResponse> {
    return this.post(`/carts/${cartId}`, { product_id: productId, quantity });
  }

  async cart(cartId: string): Promise<Cart> {
    const res = await this.get(`/carts/${cartId}`);
    expect(res.status()).toBe(200);
    return expectSchema(Cart, await res.json(), 'GET /carts/{id}');
  }

  /** Creates a cart pre-filled with the given lines (precondition helper). */
  async cartWith(lines: { product: Product; quantity: number }[]): Promise<string> {
    const id = await this.createCart();
    for (const { product, quantity } of lines) {
      const res = await this.addToCart(id, product.id, quantity);
      expect(res.status(), await res.text()).toBe(200);
    }
    return id;
  }

  // ---------------------------------------------------------------- checkout
  /** Deterministic address that passes the API's postcode/city consistency rule. */
  async lookupAddress(country = 'NL', postcode = '1011AB'): Promise<Address> {
    const res = await this.get('/postcode-lookup', { country, postcode });
    expect(res.status()).toBe(200);
    return expectSchema(Address, await res.json(), 'postcode lookup');
  }

  guestInvoice(cartId: string, address: Address, paymentMethod = 'cash-on-delivery', paymentDetails: object = {}): Promise<APIResponse> {
    const suffix = randomUUID().slice(0, 8);
    return this.post('/invoices/guest', {
      cart_id: cartId,
      payment_method: paymentMethod,
      payment_details: paymentDetails,
      billing_street: `${address.street} ${address.house_number}`,
      billing_city: address.city,
      billing_state: address.state,
      billing_country: address.country,
      billing_postal_code: address.postcode,
      guest_email: `guest+${suffix}@${TEST_EMAIL_DOMAIN}`,
      guest_first_name: 'Guest',
      guest_last_name: `Run${suffix}`,
    });
  }
}
