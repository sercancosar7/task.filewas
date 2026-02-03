/**
 * Playwright E2E Test Configuration
 * @module @task-filewas/playwright.config
 */

import { defineConfig, devices } from '@playwright/test'

// Read environment variables
const baseURL = process.env.BASE_URL || 'http://localhost:3000'
const apiURL = process.env.API_URL || 'http://localhost:3001'

/**
 * Test password from environment or default for local testing
 * In production, this should match the AUTH_PASSWORD in backend .env
 */
const TEST_PASSWORD = process.env.TEST_PASSWORD || '3224'

export default defineConfig({
  // Test directory
  testDir: './tests/e2e',
  // Match E2E test files
  testMatch: '**/*.spec.ts',
  // Ignore unit test files (vitest, jest, etc.)
  testIgnore: [
    '**/node_modules/**',
    '**/dist/**',
  ],

  // Test timeout (30 seconds per test)
  timeout: 30 * 1000,

  // Expect timeout (5 seconds for assertions)
  expect: {
    timeout: 5 * 1000,
  },

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list', { printSteps: true }],
  ],

  // Shared settings for all tests
  use: {
    // Base URL for tests - use navigate('/') to go to baseURL
    baseURL,

    // Collect trace when retrying the test for CI
    trace: 'on-first-retry',

    // Record video only when retrying
    video: 'retain-on-failure',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Action timeout
    actionTimeout: 10 * 1000,

    // Navigation timeout
    navigationTimeout: 30 * 1000,
  },

  // Projects define different test configurations
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

    /* Test against mobile viewports */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },
  ],

  // Run your local dev server before starting the tests
  // webServer: {
  //   command: 'npm run dev',
  //   url: baseURL,
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120 * 1000,
  // },
})

// Export test constants for use in tests
export const testConfig = {
  baseURL,
  apiURL,
  testPassword: TEST_PASSWORD,
}
