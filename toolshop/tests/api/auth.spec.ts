// =============================================================================
// toolshop/tests/api/auth.spec.ts — Authentication & authorisation API
// =============================================================================
// ⚠️ Shared demo accounts lock after 3 failed logins (HTTP 423). Negative
// password tests therefore ALWAYS use a freshly registered throw-away user,
// never the public customer accounts — otherwise the suite would lock them for
// every other tester (and for itself).
// =============================================================================

import { test, expect } from '../../fixtures';
import { ErrorBody, MessageBody, Token, User, errorFields, expectSchema } from '../../api/schemas';
import { ACCOUNTS, RULES } from '../../config';

test.describe('Auth API', { tag: ['@api', '@toolshop', '@auth'] }, () => {
  test('TAUTH-001 valid login returns a bearer JWT', { tag: ['@smoke', '@critical'] }, async ({ api }) => {
    const res = await api.post('/users/login', { email: ACCOUNTS.customer.email, password: ACCOUNTS.customer.password });
    expect(res.status()).toBe(200);
    const token = expectSchema(Token, await res.json(), 'token');
    expect(token.access_token.split('.')).toHaveLength(3); // header.payload.signature
  });

  test('TAUTH-002 /users/me returns the profile without sensitive fields', async ({ customerApi }) => {
    const res = await customerApi.get('/users/me');
    expect(res.status()).toBe(200);
    const me = expectSchema(User, await res.json(), '/users/me');
    expect(me.email).toBe(ACCOUNTS.customer.email);
    expect(me.first_name).toBe(ACCOUNTS.customer.firstName);
  });

  test('TAUTH-003 protected endpoints reject anonymous calls with 401', async ({ api }) => {
    for (const path of ['/users/me', '/invoices', '/favorites']) {
      const res = await api.get(path);
      expect(res.status(), path).toBe(401);
      expect(expectSchema(MessageBody, await res.json()).message).toBe('Unauthorized');
    }
  });

  test('TAUTH-004 a forged token is rejected', async ({ api }) => {
    api.withToken('eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJoYWNrZXIifQ.invalid-signature');
    expect((await api.get('/users/me')).status()).toBe(401);
  });

  test('TAUTH-005 customer cannot reach admin-only endpoints (403)', { tag: '@security' }, async ({ customerApi }) => {
    const res = await customerApi.get('/users');
    expect(res.status()).toBe(403);
    expect(expectSchema(MessageBody, await res.json()).message).toBe('Forbidden');
  });

  test('TAUTH-006 logout invalidates the token', async ({ api, throwawayUser }) => {
    await api.login(throwawayUser);
    expect((await api.get('/users/me')).status()).toBe(200);
    expect((await api.get('/users/logout')).status()).toBe(200);
    expect((await api.get('/users/me')).status()).toBe(401);
  });

  test('TAUTH-007 unknown e-mail → 401 with a generic error (no user enumeration)', async ({ api }) => {
    const res = await api.post('/users/login', { email: 'nobody-here@example.com', password: 'Whatever123!' });
    expect(res.status()).toBe(401);
    expect(expectSchema(ErrorBody, await res.json()).error).toBe('Unauthorized');
  });

  test('TAUTH-008 account locks after 3 failed attempts (HTTP 423), even with the right password', { tag: '@security' }, async ({
    api,
    throwawayUser,
  }) => {
    for (let i = 1; i <= RULES.maxLoginAttempts; i++) {
      const res = await api.post('/users/login', { email: throwawayUser.email, password: 'Wrong-password-1!' });
      expect(res.status(), `attempt ${i}`).toBe(401);
    }
    const locked = await api.post('/users/login', { email: throwawayUser.email, password: throwawayUser.password });
    expect(locked.status()).toBe(423);
    expect(expectSchema(ErrorBody, await locked.json()).error).toContain('Account locked');
  });

  test('TAUTH-009 registration rejects a weak password and a duplicate e-mail', async ({ api, throwawayUser }) => {
    const base = { first_name: 'A', last_name: 'B', dob: '1990-01-01', address: { country: 'NL', postal_code: '1011AB' } };

    const weak = await api.post('/users/register', { ...base, email: `weak-${Date.now()}@example.com`, password: 'abc' });
    expect(weak.status()).toBe(422);
    expect(errorFields(await weak.json())).toContain('password');

    const dup = await api.post('/users/register', { ...base, email: throwawayUser.email, password: 'An0ther!Strong#Pw' });
    expect(dup.status()).toBe(422);
    expect(errorFields(await dup.json())).toContain('email');
  });
});
