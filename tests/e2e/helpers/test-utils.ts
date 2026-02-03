import type { Page, Locator } from '@playwright/test';

/**
 * E2E Test Yardimci Fonksiyonlari
 */

// Backend API URL
export const API_URL = process.env['TEST_API_URL'] || 'http://localhost:3001';

// Frontend URL
export const FRONTEND_URL = process.env['TEST_FRONTEND_URL'] || 'http://localhost:4173';

/**
 * Login fonksiyonu - Test kullanicisi ile giris yapar
 */
export async function login(page: Page, password: string = '3224') {
  await page.goto('/login');

  // Sifre inputunu bul ve doldur
  const passwordInput = page.locator('input[type="password"]');
  await passwordInput.fill(password);

  // Login butonuna tikla
  const loginButton = page.locator('button[type="submit"]');
  await loginButton.click();

  // Dashboard yonlendirmesini bekle
  await page.waitForURL('/', { timeout: 5000 });
}

/**
 * Logout fonksiyonu
 */
export async function logout(page: Page) {
  // Ayarlar sayfasina git
  await page.goto('/settings');

  // Cikis yap butonuna tikla (destructive variant)
  const logoutButton = page.getByText('Çıkış Yap').or(page.getByText('Logout'));
  await logoutButton.click();
}

/**
 * Test verisi temizleme helper'i
 */
export async function cleanupTestData(apiUrl: string = API_URL) {
  // TODO: Test sonu verileri temizle
  console.log('Test verisi temizleme:', apiUrl);
}

/**
 * Element gorunur olana kadar bekle
 */
export async function waitForVisible(
  page: Page,
  selector: string,
  timeout: number = 5000
): Promise<Locator> {
  const element = page.locator(selector);
  await element.waitFor({ state: 'visible', timeout });
  return element;
}

/**
 * Screenshot al - test failures icin
 */
export async function takeScreenshot(
  page: Page,
  name: string,
  fullPage: boolean = true
): Promise<void> {
  await page.screenshot({
    path: `tests/e2e/screenshots/${name}.png`,
    fullPage,
  });
}

/**
 * Toast mesaji gorunene kadar bekle
 */
export async function waitForToast(
  page: Page,
  message: string,
  timeout: number = 3000
): Promise<void> {
  const toast = page.locator(`[data-toast], .toast, [role="status"]`).filter({
    hasText: message,
  });
  await toast.waitFor({ state: 'visible', timeout });
}

/**
 * Form doldurma helper'i
 */
export async function fillForm(
  page: Page,
  fields: Record<string, string>
): Promise<void> {
  for (const [selector, value] of Object.entries(fields)) {
    const input = page.locator(selector);
    await input.fill(value);
  }
}

/**
 * Modal/dialog acilana kadar bekle
 */
export async function waitForModal(page: Page, timeout: number = 5000): Promise<Locator> {
  const modal = page.locator('[role="dialog"], .modal, [data-dialog]').first();
  await modal.waitFor({ state: 'visible', timeout });
  return modal;
}

/**
 * Loading spinner kaybolana kadar bekle
 */
export async function waitForLoading(
  page: Page,
  timeout: number = 30000
): Promise<void> {
  const loaders = page.locator('[data-loading], .loading, .spinner, [aria-busy="true"]');
  // Eger loading elementi varsa, kaybolmasini bekle
  const count = await loaders.count();
  if (count > 0) {
    await loaders.first().waitFor({ state: 'hidden', timeout });
  }
}
