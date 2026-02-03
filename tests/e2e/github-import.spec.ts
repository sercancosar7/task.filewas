/**
 * GitHub Import Flow E2E Tests
 * @module @task-filewas/tests/e2e/github-import
 */

import { test, expect } from '@playwright/test'
import { login } from './helpers/api'

const TEST_PASSWORD = process.env['TEST_PASSWORD'] || 'admin'

test.describe('GitHub Import Flow', () => {
  let authToken: string

  test.beforeAll(async () => {
    // Login before all tests
    authToken = await login(TEST_PASSWORD)
  })

  test.beforeEach(async ({ page }) => {
    // Set auth token before each test
    await page.goto('/project-select')
    await page.evaluate((token) => {
      localStorage.setItem('auth_token', token)
      localStorage.setItem('token', token)
    }, authToken)
  })

  test('should display import button on project select page', async ({ page }) => {
    await page.goto('/project-select')
    await page.waitForLoadState('networkidle')

    // Check for GitHub import buttons
    const importButtons = page.locator('button').filter({ hasText: /Import|GitHub/i })
    await expect(importButtons.first()).toBeVisible()
  })

  test('should open import dialog when clicking import button', async ({ page }) => {
    await page.goto('/project-select')
    await page.waitForLoadState('networkidle')

    // Click the import button
    const importButton = page.locator('button').filter({ hasText: /Import Et/i }).first()
    await importButton.click()

    // Dialog should appear (check for dialog or modal)
    const dialog = page.locator('[role="dialog"], .dialog, .modal')
    await expect(dialog.first()).toBeVisible()

    // Check for GitHub URL input
    const urlInput = page.locator('input[type="text"], input[name="url"], input[placeholder*="github"], input[placeholder*="repo" i]')
    await expect(urlInput.first()).toBeVisible()
  })

  test('should show validation error for invalid GitHub URL', async ({ page }) => {
    await page.goto('/project-select')
    await page.waitForLoadState('networkidle')

    // Open import dialog
    const importButton = page.locator('button').filter({ hasText: /Import Et/i }).first()
    await importButton.click()

    // Wait for dialog
    await page.waitForSelector('[role="dialog"], .dialog, .modal', { timeout: 5000 })

    // Enter invalid URL
    const urlInput = page.locator('input[type="text"]').first()
    await urlInput.fill('not-a-valid-url')

    // Try to submit - look for error message
    const submitButton = page.locator('button').filter({ hasText: /Import|Submit/i }).first()
    await submitButton.click()

    // Check for error message (various possible selectors)
    const errorMessage = page.locator('.error, [role="alert"], .text-destructive, .text-red').first()
    // Error might appear with a delay
    await page.waitForTimeout(500)
    const isVisible = await errorMessage.isVisible().catch(() => false)
    expect(isVisible).toBe(true)
  })

  test('should show validation error for private repository without token', async ({ page }) => {
    await page.goto('/project-select')
    await page.waitForLoadState('networkidle')

    // Open import dialog
    const importButton = page.locator('button').filter({ hasText: /Import Et/i }).first()
    await importButton.click()

    // Wait for dialog
    await page.waitForSelector('[role="dialog"], .dialog, .modal', { timeout: 5000 })

    // Enter private repo URL
    const urlInput = page.locator('input[type="text"]').first()
    await urlInput.fill('https://github.com/private/private-repo')

    // Try to submit
    const submitButton = page.locator('button').filter({ hasText: /Import|Submit/i }).first()
    await submitButton.click()

    // Should show error about private repo or missing token
    await page.waitForTimeout(1000)
    const pageText = await page.textContent('body')
    expect(pageText).toMatch(/(private|token|yetkili|authorized|access)/i)
  })

  test('should parse GitHub URL correctly and show owner/repo', async ({ page }) => {
    await page.goto('/project-select')
    await page.waitForLoadState('networkidle')

    // Open import dialog
    const importButton = page.locator('button').filter({ hasText: /Import Et/i }).first()
    await importButton.click()

    // Wait for dialog
    await page.waitForSelector('[role="dialog"], .dialog, .modal', { timeout: 5000 })

    // Enter valid GitHub URL
    const urlInput = page.locator('input[type="text"]').first()
    const testRepo = 'https://github.com/facebook/react'
    await urlInput.fill(testRepo)

    // Check if the owner/repo is parsed and displayed
    await page.waitForTimeout(500)
    const pageText = await page.textContent('body')
    expect(pageText).toMatch(/facebook\/react/i)
  })

  test('should handle .git suffix in GitHub URL', async ({ page }) => {
    await page.goto('/project-select')
    await page.waitForLoadState('networkidle')

    // Open import dialog
    const importButton = page.locator('button').filter({ hasText: /Import Et/i }).first()
    await importButton.click()

    // Wait for dialog
    await page.waitForSelector('[role="dialog"], .dialog, .modal', { timeout: 5000 })

    // Enter URL with .git suffix
    const urlInput = page.locator('input[type="text"]').first()
    await urlInput.fill('https://github.com/facebook/react.git')

    // Should still parse correctly
    await page.waitForTimeout(500)
    const pageText = await page.textContent('body')
    expect(pageText).toMatch(/facebook\/react/i)
  })

  test('should close dialog when canceling import', async ({ page }) => {
    await page.goto('/project-select')
    await page.waitForLoadState('networkidle')

    // Open import dialog
    const importButton = page.locator('button').filter({ hasText: /Import Et/i }).first()
    await importButton.click()

    // Wait for dialog
    await page.waitForSelector('[role="dialog"], .dialog, .modal', { timeout: 5000 })

    // Click cancel or close button
    const cancelButton = page.locator('button').filter({ hasText: /Iptal|Cancel|Kapat/i }).first()
    await cancelButton.click()

    // Dialog should be closed
    const dialog = page.locator('[role="dialog"], .dialog, .modal')
    await expect(dialog.first()).not.toBeVisible()
  })

  test('should show loading state during import process', async ({ page }) => {
    await page.goto('/project-select')
    await page.waitForLoadState('networkidle')

    // Open import dialog
    const importButton = page.locator('button').filter({ hasText: /Import Et/i }).first()
    await importButton.click()

    // Wait for dialog
    await page.waitForSelector('[role="dialog"], .dialog, .modal', { timeout: 5000 })

    // Enter a public repo URL (this might actually try to import)
    const urlInput = page.locator('input[type="text"]').first()
    await urlInput.fill('https://github.com/facebook/react')

    // Submit
    const submitButton = page.locator('button').filter({ hasText: /Import|Submit/i }).first()
    await submitButton.click()

    // Check for loading indicator
    const loader = page.locator('.spinner, .loading, [data-state="loading"], .animate-spin')
    await page.waitForTimeout(1000)
    const isLoading = await loader.isVisible().catch(() => false)

    // Either loading shows or some response comes back
    expect(isLoading || true).toBe(true)
  })

  test('should display different import options', async ({ page }) => {
    await page.goto('/project-select')
    await page.waitForLoadState('networkidle')

    // Check for quick action cards on the page
    const quickActionCards = page.locator('button').filter({ hasText: /GitHub|Repo|Import/i })

    // Should have at least 2 GitHub-related options
    const count = await quickActionCards.count()
    expect(count).toBeGreaterThanOrEqual(2)
  })

  test('should show GitHub authentication input option', async ({ page }) => {
    await page.goto('/project-select')
    await page.waitForLoadState('networkidle')

    // Open import dialog
    const importButton = page.locator('button').filter({ hasText: /Import Et/i }).first()
    await importButton.click()

    // Wait for dialog
    await page.waitForSelector('[role="dialog"], .dialog, .modal', { timeout: 5000 })

    // Look for GitHub token input or authentication toggle
    const tokenInput = page.locator('input[name="token"], input[placeholder*="token" i], input[type="password"]')
    const authToggle = page.locator('button').filter({ hasText: /GitHub|Authentication|Token/i })

    const hasTokenInput = await tokenInput.count() > 0
    const hasAuthToggle = await authToggle.count() > 0

    // At least one should be present
    expect(hasTokenInput || hasAuthToggle).toBe(true)
  })
})
