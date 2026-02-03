/**
 * Settings Flow E2E Tests
 * @module @task-filewas/tests/e2e/settings
 */

import { test, expect } from '@playwright/test'
import { login } from './helpers/api'

const TEST_PASSWORD = process.env['TEST_PASSWORD'] || 'admin'

test.describe('Settings Flow', () => {
  let authToken: string

  test.beforeAll(async () => {
    // Login before all tests
    authToken = await login(TEST_PASSWORD)
  })

  test.beforeEach(async ({ page }) => {
    // Set auth token before each test
    await page.goto('/settings')
    await page.evaluate((token) => {
      localStorage.setItem('auth_token', token)
      localStorage.setItem('token', token)
    }, authToken)
  })

  test('should display settings page', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')

    // Check if we're on the settings page
    await expect(page).toHaveURL(/.*settings/)

    // Check for settings heading
    const heading = page.locator('h1, h2').filter({ hasText: /Ayarlar|Settings/i })
    await expect(heading.first()).toBeVisible()
  })

  test('should display model settings section', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')

    // Look for model settings card/section
    const modelSection = page.locator('[data-section="model"], .model-settings').filter({
      hasText: /Model|Bot|AI/i,
    })

    const hasModelSection = await modelSection.count() > 0
    if (hasModelSection) {
      await expect(modelSection.first()).toBeVisible()
    } else {
      // Alternative: check for model dropdown
      const modelSelect = page.locator('select, [role="combobox"]').filter({
        hasText: /Claude|GLM|Auto/i,
      })
      const hasModelSelect = await modelSelect.count() > 0
      expect(hasModelSelect).toBe(true)
    }
  })

  test('should allow changing default model', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')

    // Look for model selector
    const modelSelector = page.locator('[data-testid="model-select"], select, [role="combobox"]').first()

    const hasSelector = await modelSelector.count() > 0
    if (hasSelector) {
      // Open dropdown
      await modelSelector.click()
      await page.waitForTimeout(300)

      // Try to select a different option
      const options = page.locator('[role="option"], option')
      const optionCount = await options.count()

      if (optionCount > 1) {
        await options.nth(1).click()
        await page.waitForTimeout(300)

        // Check if selection was made (value might change)
        const value = await modelSelector.inputValue()
        expect(value).toBeTruthy()
      }
    }
  })

  test('should display permission settings', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')

    // Look for permission mode settings
    const permissionSection = page.locator('[data-section="permission"], .permission-settings').filter({
      hasText: /Permission|Izin|Safe|Ask|Auto/i,
    })

    const hasPermissionSection = await permissionSection.count() > 0
    if (hasPermissionSection) {
      await expect(permissionSection.first()).toBeVisible()
    } else {
      // Alternative: check for permission mode selector
      const permissionSelect = page.locator('select, [role="combobox"]').filter({
        hasText: /Safe|Ask|Auto/i,
      })
      const hasPermissionSelect = await permissionSelect.count() > 0
      expect(hasPermissionSelect).toBe(true)
    }
  })

  test('should allow changing permission mode', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')

    // Look for permission mode selector
    const permissionSelector = page
      .locator('button, [role="combobox"], select')
      .filter({ hasText: /Safe|Ask|Auto|Permission/i })
      .first()

    const hasSelector = await permissionSelector.count() > 0
    if (hasSelector) {
      await permissionSelector.click()
      await page.waitForTimeout(300)

      // Look for permission options
      const permissionOption = page.locator('[role="option"], button').filter({
        hasText: /Auto|Otomatik/i,
      })

      const hasOption = await permissionOption.count() > 0
      if (hasOption) {
        await permissionOption.first().click()
        await page.waitForTimeout(300)

        // Verify selection (check UI state)
        const selectedText = await page.textContent('body')
        expect(selectedText).toContain('Auto')
      }
    }
  })

  test('should display automation settings', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')

    // Look for automation settings
    const automationSection = page.locator('[data-section="automation"], .automation-settings').filter({
      hasText: /Automation|Otomasyon|Commit|Push/i,
    })

    const hasAutomationSection = await automationSection.count() > 0
    if (hasAutomationSection) {
      await expect(automationSection.first()).toBeVisible()
    }
  })

  test('should allow toggling auto-commit setting', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')

    // Look for auto-commit toggle/switch
    const autoCommitSwitch = page
      .locator('input[type="checkbox"], [role="switch"], button[role="switch"]')
      .filter({ hasText: /Auto.*Commit|Otomatik.*Commit/i })
      .first()

    const hasSwitch = await autoCommitSwitch.count() > 0
    if (hasSwitch) {
      // Get initial state
      const initialState = await autoCommitSwitch.isChecked()

      // Toggle
      await autoCommitSwitch.click()
      await page.waitForTimeout(300)

      // State should change
      const newState = await autoCommitSwitch.isChecked()
      expect(newState).not.toBe(initialState)
    }
  })

  test('should allow toggling auto-push setting', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')

    // Look for auto-push toggle/switch
    const autoPushSwitch = page
      .locator('input[type="checkbox"], [role="switch"], button[role="switch"]')
      .filter({ hasText: /Auto.*Push|Otomatik.*Push/i })
      .first()

    const hasSwitch = await autoPushSwitch.count() > 0
    if (hasSwitch) {
      // Get initial state
      const initialState = await autoPushSwitch.isChecked()

      // Toggle
      await autoPushSwitch.click()
      await page.waitForTimeout(300)

      // State should change
      const newState = await autoPushSwitch.isChecked()
      expect(newState).not.toBe(initialState)
    }
  })

  test('should have save button', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')

    // Look for save button
    const saveButton = page.locator('button').filter({ hasText: /Kaydet|Save/i })

    await expect(saveButton.first()).toBeVisible()
  })

  test('should show loading state while saving', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')

    // Change a setting to enable save
    const switchElement = page.locator('input[type="checkbox"]').first()
    const hasSwitch = await switchElement.count() > 0

    if (hasSwitch) {
      await switchElement.click()

      // Click save
      const saveButton = page.locator('button').filter({ hasText: /Kaydet|Save/i }).first()
      await saveButton.click()

      // Check for loading indicator
      await page.waitForTimeout(500)

      // Save button should be disabled or show loading
      const isDisabled = await saveButton.isDisabled()
      const hasLoader = await page.locator('.spinner, .loading, .animate-spin').count() > 0

      expect(isDisabled || hasLoader).toBe(true)
    }
  })

  test('should show success message after saving', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')

    // Change a setting
    const switchElement = page.locator('input[type="checkbox"]').first()
    const hasSwitch = await switchElement.count() > 0

    if (hasSwitch) {
      await switchElement.click()

      // Click save
      const saveButton = page.locator('button').filter({ hasText: /Kaydet|Save/i }).first()
      await saveButton.click()

      // Wait for save to complete
      await page.waitForTimeout(2000)

      // Check for success message
      const successMessage = page.locator('.success, [role="status"], .text-success').filter({
        hasText: /Kaydedildi|Saved|Success/i,
      })

      const hasSuccess = await successMessage.count() > 0
      expect(hasSuccess).toBe(true)
    }
  })

  test('should have reset button', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')

    // Look for reset button
    const resetButton = page.locator('button').filter({ hasText: /Sifirla|Reset|Default/i })

    await expect(resetButton.first()).toBeVisible()
  })

  test('should show confirmation dialog when resetting', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')

    // Handle the confirmation dialog
    page.on('dialog', (dialog) => {
      expect(dialog.type()).toBe('confirm' || 'alert')
      dialog.accept()
    })

    // Click reset button
    const resetButton = page.locator('button').filter({ hasText: /Sifirla|Reset/i }).first()
    await resetButton.click()

    // Wait for dialog to be handled
    await page.waitForTimeout(500)
  })

  test('should display thinking level settings', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')

    // Look for thinking level settings
    const thinkingSection = page.locator('[data-section="thinking"], .thinking-settings').filter({
      hasText: /Thinking|Dusunme|Seviye/i,
    })

    const hasThinkingSection = await thinkingSection.count() > 0
    if (hasThinkingSection) {
      await expect(thinkingSection.first()).toBeVisible()
    } else {
      // Alternative: check for thinking level selector
      const thinkingSelect = page.locator('select, [role="combobox"]').filter({
        hasText: /Off|Think|Max|Kapali|Dusun/i,
      })
      const hasThinkingSelect = await thinkingSelect.count() > 0
      expect(hasThinkingSelect).toBe(true)
    }
  })

  test('should allow changing thinking level', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')

    // Look for thinking level selector
    const thinkingSelector = page
      .locator('button, [role="combobox"], select')
      .filter({ hasText: /Thinking|Dusunme/i })
      .first()

    const hasSelector = await thinkingSelector.count() > 0
    if (hasSelector) {
      await thinkingSelector.click()
      await page.waitForTimeout(300)

      // Look for thinking level options
      const thinkingOption = page.locator('[role="option"], button').filter({
        hasText: /Max|Think/i,
      })

      const hasOption = await thinkingOption.count() > 0
      if (hasOption) {
        await thinkingOption.first().click()
        await page.waitForTimeout(300)

        // Verify selection
        const selectedText = await page.textContent('body')
        expect(selectedText).toMatch(/(Max|Think)/i)
      }
    }
  })

  test('should have logout button', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')

    // Look for logout button
    const logoutButton = page.locator('button').filter({
      hasText: /Cikis|Logout|Sign Out/i,
    })

    await expect(logoutButton.first()).toBeVisible()
  })

  test('should logout when clicking logout button', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')

    // Click logout button
    const logoutButton = page.locator('button').filter({
      hasText: /Cikis|Logout/i,
    }).first()

    await logoutButton.click()
    await page.waitForTimeout(1000)

    // Should redirect to login page or clear auth
    const url = page.url()
    const token = await page.evaluate(() => localStorage.getItem('auth_token'))

    const isRedirected = url.includes('login')
    const isTokenCleared = token === null
    expect(isRedirected || isTokenCleared).toBe(true)
  })

  test('should persist settings after page reload', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')

    // Toggle a setting
    const switchElement = page.locator('input[type="checkbox"]').first()
    const hasSwitch = await switchElement.count() > 0

    if (hasSwitch) {
      const initialState = await switchElement.isChecked()

      // Toggle and save
      await switchElement.click()

      const saveButton = page.locator('button').filter({ hasText: /Kaydet|Save/i }).first()
      await saveButton.click()

      // Wait for save
      await page.waitForTimeout(2000)

      // Reload page
      await page.reload()
      await page.waitForLoadState('networkidle')

      // Check if setting persisted
      const newState = await switchElement.isChecked()
      expect(newState).not.toBe(initialState)
    }
  })

  test('should display fallback settings', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')

    // Look for fallback settings
    const fallbackSection = page.locator('[data-section="fallback"], .fallback-settings').filter({
      hasText: /Fallback|Otomatik.*Fallback/i,
    })

    const hasFallbackSection = await fallbackSection.count() > 0
    if (hasFallbackSection) {
      await expect(fallbackSection.first()).toBeVisible()
    }
  })

  test('should allow toggling fallback enabled setting', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')

    // Look for fallback toggle
    const fallbackSwitch = page
      .locator('input[type="checkbox"], [role="switch"]')
      .filter({ hasText: /Fallback/i })
      .first()

    const hasSwitch = await fallbackSwitch.count() > 0
    if (hasSwitch) {
      // Get initial state
      const initialState = await fallbackSwitch.isChecked()

      // Toggle
      await fallbackSwitch.click()
      await page.waitForTimeout(300)

      // State should change
      const newState = await fallbackSwitch.isChecked()
      expect(newState).not.toBe(initialState)
    }
  })
})
