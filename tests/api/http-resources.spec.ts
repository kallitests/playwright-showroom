// =============================================================================
// tests/api/http-resources.spec.ts — HTTP-level tests on REAL SauceDemo resources
// =============================================================================
// SauceDemo has NO public business API: it is a static single-page app
// (hosted on GitHub Pages). Login, catalog and cart all run client-side.
// Verified on 2026-10-09: e.g. GET /api/products -> 404.
//
// So these tests use Playwright's APIRequestContext (no browser) on what is
// genuinely observable over HTTP: the HTML shell, the JS bundle, the web app
// manifest and its icons, robots.txt, and the hosting's routing contract.
// =============================================================================

import { test, expect } from '@playwright/test';

test.describe('HTTP resources (real, no browser)', { tag: ['@api', '@chromium-only'] }, () => {
  test('API-001 GET / serves the HTML shell of the app', { tag: ['@smoke', '@critical'] }, async ({ request }) => {
    const res = await request.get('/');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('text/html');
    const html = await res.text();
    expect(html).toContain('<div id="root">');
    expect(html).toMatch(/<title>Swag Labs<\/title>/);
  });

  test('API-002 the JS bundle referenced by the shell is served as JavaScript', async ({ request }) => {
    const html = await (await request.get('/')).text();
    const scripts = [...html.matchAll(/<script[^>]+src="([^"]+\.js)"/g)].map((m) => m[1]);
    expect(scripts.length).toBeGreaterThan(0);

    for (const src of scripts) {
      const res = await request.get(src);
      expect(res.status(), src).toBe(200);
      expect(res.headers()['content-type'], src).toMatch(/javascript/);
      expect((await res.body()).length, src).toBeGreaterThan(1_000);
    }
  });

  test('API-003 web app manifest respects its contract and every icon exists', async ({ request }) => {
    const res = await request.get('/manifest.json');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('json');

    const manifest = await res.json();
    // Lightweight schema check (no extra dependency)
    expect(manifest).toEqual(
      expect.objectContaining({
        name: 'Swag Labs',
        short_name: expect.any(String),
        start_url: expect.any(String),
        display: expect.any(String),
        icons: expect.arrayContaining([expect.objectContaining({ src: expect.any(String), sizes: expect.stringMatching(/^\d+x\d+$/) })]),
      }),
    );

    for (const icon of manifest.icons as { src: string; type: string }[]) {
      const iconRes = await request.get(icon.src);
      expect(iconRes.status(), icon.src).toBe(200);
      expect(iconRes.headers()['content-type'], icon.src).toBe(icon.type);
    }
  });

  test('API-004 robots.txt is served as plain text', async ({ request }) => {
    const res = await request.get('/robots.txt');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('text/plain');
    expect(await res.text()).toContain('User-agent');
  });

  test('API-005 deep links answer HTTP 404 but bootstrap the SPA (hosting contract, EXP-002)', { tag: '@known-issue' }, async ({ request }) => {
    test.info().annotations.push({
      type: 'finding',
      description: 'EXP-002: every deep link (/inventory.html, /cart.html…) returns HTTP 404 — monitoring/SEO see errors',
    });
    for (const path of ['/inventory.html', '/cart.html', '/checkout-step-one.html']) {
      const res = await request.get(path);
      expect(res.status(), path).toBe(404);
      // The 404 page is the "spa-github-pages" redirect script, not an error page
      expect(await res.text(), path).toContain('Single Page Apps for GitHub Pages');
    }
  });

  test('API-006 no business API is exposed (documents the absence of endpoints)', async ({ request }) => {
    for (const path of ['/api/products', '/api/login', '/api/cart']) {
      expect((await request.get(path)).status(), path).toBe(404);
    }
  });

  test('API-007 the shell responds within the performance budget', async ({ request }) => {
    const start = Date.now();
    const res = await request.get('/');
    const elapsed = Date.now() - start;
    test.info().annotations.push({ type: 'metric', description: `GET / ${elapsed}ms` });
    expect(res.ok()).toBe(true);
    expect(elapsed).toBeLessThan(3_000);
  });
});
