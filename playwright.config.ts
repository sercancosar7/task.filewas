import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration
 * Task.filewas - Otonom AI Proje Gelistirme Platformu
 */
export default defineConfig({
  // Test dosyalarinin konumu
  testDir: './tests/e2e',

  // Her testin farkli bir context'te calismasini saglar (izolasyon)
  fullyParallel: true,

  // Fail olan testleri tekrar calistir (max 2 kez)
  retries: process.env['CI'] ? 2 : 0,

  // Paralel worker sayisi
  workers: process.env['CI'] ? 1 : undefined,

  // Test raporu: HTML formatinda
  reporter: [
    ['html', { outputFolder: 'tests/e2e-results/html-report' }],
    ['json', { outputFile: 'tests/e2e-results/results.json' }],
    ['junit', { outputFile: 'tests/e2e-results/junit.xml' }],
    ['list'],
  ],

  // Global test ayarlari
  use: {
    // Base URL: Frontend preview server (vite preview)
    // baseURL: 'http://localhost:3000',

    // Test sirasinda ekran goruntusu al (sadece fail durumunda)
    trace: 'retain-on-failure',

    // Screenshot ayarlari
    screenshot: 'only-on-failure',

    // Video kaydi (sadece fail durumunda)
    video: 'retain-on-failure',

    // Action timeout
    actionTimeout: 10000,

    // Navigation timeout
    navigationTimeout: 30000,
  },

  // Farkli browser'lar ve konfigurasyonlar
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // Mobil testler
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  // Test oncesi server baslatma (dev server)
  webServer: {
    command: 'cd frontend && npm run build && npm run preview',
    url: 'http://localhost:4173',
    timeout: 120000,
    reuseExistingServer: !process.env['CI'],
    stdout: 'pipe',
    stderr: 'pipe',
  },

  // Global kurulum (test oncesi)
  globalSetup: './tests/e2e/global-setup.ts',

  // Global temizleme (test sonrasi)
  globalTeardown: './tests/e2e/global-teardown.ts',

  // Test dosyasi kalibi
  // testMatch: '**/*.spec.ts',
});
