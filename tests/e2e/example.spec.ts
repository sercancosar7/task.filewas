import { test, expect } from '@playwright/test';

/**
 * Example E2E Test
 * Bu dosya Playwright kurulumunun dogru calisip calismadigini test eder
 */

test.describe('Playwright Setup', () => {
  test('homepage has correct title', async ({ page }) => {
    await page.goto('/');

    // Sayfa basligini kontrol et
    await expect(page).toHaveTitle(/Task\.filewas|Auto Claude/);
  });

  test('navigation works', async ({ page }) => {
    await page.goto('/');

    // Ana sayfa yuklendi mi?
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('responsive design - mobile viewport', async ({ page }) => {
    // Mobil viewport boyutu
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Mobilde body gorunur mu?
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});

test.describe('Environment', () => {
  test('frontend is accessible', async ({ request }) => {
    // API test - frontend erisilebilir mi?
    const response = await request.get('/');
    expect(response.status()).toBeLessThan(500);
  });
});
