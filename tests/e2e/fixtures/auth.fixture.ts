import { test as base, type Page } from '@playwright/test';

// Fixture tip tanimi
type AuthFixtures = {
  authenticatedPage: Page;
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Test kullanicisi ile login ol
    await page.goto('/login');

    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill('3224');

    const loginButton = page.locator('button[type="submit"]');
    await loginButton.click();

    // Dashboard yonlendirmesini bekle
    await page.waitForURL('/', { timeout: 5000 });

    // Login olmus sayfayi test icin kullan
    await use(page);
  },
});
