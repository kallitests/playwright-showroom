// =============================================================================
// tests/regression/user-behaviors.spec.ts — Non-regression tests
// =============================================================================
// WHAT ARE NON-REGRESSION TESTS?
//   Non-regression tests verify that known behaviors (including known bugs)
//   stay consistent over time.
//
//   Two types:
//     1. Known CORRECT behaviors — verify they haven't broken
//     2. Known BUGS — verify the bug is still present (not accidentally "fixed"
//        in a way that could mask a larger problem)
//
// WHAT THIS FILE TESTS:
//   SauceDemo ships with users that have different behaviors by design:
//     - performance_glitch_user: login takes longer → performance regression
//     - problem_user: images are broken → known bug, should remain consistent
//
// RUN: npx playwright test tests/regression/
// =============================================================================

import { test, expect } from '@playwright/test';
import { login } from '../../utils/helpers';
import { USERS } from '../../utils/test-data';

test.describe('🔁 Non-Regression — User Behavior Consistency', () => {

  // -------------------------------------------------------------------------
  // TEST 1: standard_user login is fast
  // -------------------------------------------------------------------------
  // Establishes a performance baseline for comparison.
  // If this ever starts taking >3s, something is wrong.
  // -------------------------------------------------------------------------

  test('standard_user login should complete within 3 seconds', async ({
    page,
  }) => {
    await page.goto('/');

    // Record the time before clicking login
    const start = Date.now();

    await page.locator('[data-test="username"]').fill(USERS.standard.username);
    await page.locator('[data-test="password"]').fill(USERS.standard.password);
    await page.locator('[data-test="login-button"]').click();

    // Wait for the inventory page to fully load
    await page.waitForURL(/inventory/);

    const duration = Date.now() - start;

    // Assert: the whole login should complete in under 3 seconds
    // This catches performance regressions introduced by code changes
    expect(duration).toBeLessThan(3000);
  });

  // -------------------------------------------------------------------------
  // TEST 2: performance_glitch_user takes significantly longer than standard
  // -------------------------------------------------------------------------
  // This user is intentionally slow (SauceDemo simulates a delay).
  // We test this to verify the performance difference is stable and documented.
  //
  // Note: we use a generous timeout (15s) because the glitch user can be
  // very slow — we're just asserting it's SLOWER than standard, not fast.
  // -------------------------------------------------------------------------

  test('performance_glitch_user login should take longer than standard_user', async ({
    page,
  }) => {
    // Measure standard user login time
    await page.goto('/');
    const standardStart = Date.now();
    await page.locator('[data-test="username"]').fill(USERS.standard.username);
    await page.locator('[data-test="password"]').fill(USERS.standard.password);
    await page.locator('[data-test="login-button"]').click();
    await page.waitForURL(/inventory/);
    const standardDuration = Date.now() - standardStart;

    // Log out before measuring performance_glitch_user
    await page.locator('#react-burger-menu-btn').click();
    await page.locator('#logout_sidebar_link').waitFor({ state: 'visible' });
    await page.locator('#logout_sidebar_link').click();
    await page.waitForURL('/');

    // Measure performance_glitch_user login time
    const glitchStart = Date.now();
    await page
      .locator('[data-test="username"]')
      .fill(USERS.performanceGlitch.username);
    await page
      .locator('[data-test="password"]')
      .fill(USERS.performanceGlitch.password);
    await page.locator('[data-test="login-button"]').click();
    // Use a longer timeout specifically for this user
    await page.waitForURL(/inventory/, { timeout: 15_000 });
    const glitchDuration = Date.now() - glitchStart;

    // The glitch user should take longer than the standard user
    expect(glitchDuration).toBeGreaterThan(standardDuration);

    // Log the actual durations for debugging visibility in CI
    console.log(`Standard user: ${standardDuration}ms`);
    console.log(`Glitch user:   ${glitchDuration}ms`);
  });

  // -------------------------------------------------------------------------
  // TEST 3: problem_user product images are broken (known bug)
  // -------------------------------------------------------------------------
  // The problem_user sees broken images in the product list.
  // This test documents and asserts this known behavior.
  //
  // Why test a known bug?
  //   If this test suddenly PASSES (images are no longer broken), it means
  //   either the bug was fixed intentionally, or something else changed.
  //   Either way, we want to know.
  // -------------------------------------------------------------------------

  test('problem_user should see broken product images', async ({ page }) => {
    await login(page, USERS.problem);
    await page.waitForURL(/inventory/);

    // Get all product images
    const images = page.locator('.inventory_item_img img');
    const count = await images.count();

    // Check that images exist
    expect(count).toBeGreaterThan(0);

    // problem_user always sees the wrong image (all images show the same
    // broken/wrong image src). We check that the src contains an unexpected
    // path compared to the standard catalog.
    // At least one image should have a non-standard src.
    const imageSrcs = await images.evaluateAll((imgs: HTMLImageElement[]) =>
      imgs.map((img) => img.src)
    );

    // All problem_user images point to the same wrong image
    // (SauceDemo uses "sl-404.168b1cce.jpg" for problem_user)
    const uniqueSrcs = new Set(imageSrcs);

    // For standard_user, all 6 images would have DIFFERENT sources.
    // For problem_user, all images have the SAME (wrong) source.
    // So we assert there's only 1 unique src across all products.
    expect(uniqueSrcs.size).toBe(1);
  });
});

// =============================================================================
// tests/regression/cart-persistence.spec.ts — Cart state regression tests
// =============================================================================

test.describe('🔁 Non-Regression — Cart State Persistence', () => {

  // -------------------------------------------------------------------------
  // TEST 4: Cart items persist after page reload
  // -------------------------------------------------------------------------
  // SauceDemo uses localStorage to persist the cart.
  // If this ever breaks (items disappear on refresh), it's a major regression.
  // -------------------------------------------------------------------------

  test('cart items should persist after page reload', async ({ page }) => {
    await login(page, USERS.standard);
    await page.waitForURL(/inventory/);

    // Add a product to the cart
    await page
      .locator('.inventory_item')
      .filter({ hasText: 'Sauce Labs Backpack' })
      .locator('button')
      .click();

    // Verify cart count before reload
    expect(
      await page.locator('.shopping_cart_badge').textContent()
    ).toBe('1');

    // Reload the page (simulates user refreshing the browser)
    await page.reload();
    await page.waitForURL(/inventory/);

    // Cart count should still be 1 after reload
    await expect(page.locator('.shopping_cart_badge')).toHaveText('1');
  });

  // -------------------------------------------------------------------------
  // TEST 5: Cart is empty after logout and new login
  // -------------------------------------------------------------------------
  // When a user logs out and back in, their cart should be cleared.
  // This prevents cart leakage between sessions.
  // -------------------------------------------------------------------------

  test('cart should be empty after logout and new login', async ({ page }) => {
    // --- First session: add a product ---
    await login(page, USERS.standard);
    await page.waitForURL(/inventory/);

    await page
      .locator('.inventory_item')
      .filter({ hasText: 'Sauce Labs Backpack' })
      .locator('button')
      .click();

    // Confirm item is in cart
    await expect(page.locator('.shopping_cart_badge')).toHaveText('1');

    // --- Logout ---
    await page.locator('#react-burger-menu-btn').click();
    await page.locator('#logout_sidebar_link').waitFor({ state: 'visible' });
    await page.locator('#logout_sidebar_link').click();
    await page.waitForURL('/');

    // --- Second session: log back in ---
    await login(page, USERS.standard);
    await page.waitForURL(/inventory/);

    // Cart badge should NOT be visible (empty cart)
    const badge = page.locator('.shopping_cart_badge');
    await expect(badge).not.toBeVisible();
  });
});
