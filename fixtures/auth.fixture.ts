// =============================================================================
// fixtures/auth.fixture.ts — Backward-compatible entry point (v1)
// =============================================================================
// v1 logged in through the UI for every test. v2 centralises fixtures in
// fixtures/index.ts and authenticates via the session cookie (faster, and the
// login screen is covered by its own dedicated tests).
//
//   import { test, expect } from '../../fixtures/auth.fixture';
//   test('...', async ({ authenticatedPage }) => { ... });
// =============================================================================

export { test, expect } from './index';
