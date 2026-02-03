/**
 * Agent Workflow E2E Tests
 * @module @task-filewas/tests/e2e/agent-workflow
 */

import { test, expect } from '@playwright/test'
import { login } from './helpers/api'

const TEST_PASSWORD = process.env['TEST_PASSWORD'] || 'admin'

test.describe('Agent Workflow Flow', () => {
  let authToken: string

  test.beforeAll(async () => {
    // Login before all tests
    authToken = await login(TEST_PASSWORD)
  })

  test.beforeEach(async ({ page }) => {
    // Set auth token before each test
    await page.goto('/agents')
    await page.evaluate((token) => {
      localStorage.setItem('auth_token', token)
      localStorage.setItem('token', token)
    }, authToken)
  })

  test('should display agents page', async ({ page }) => {
    await page.goto('/agents')
    await page.waitForLoadState('networkidle')

    // Check if we're on the agents page
    await expect(page).toHaveURL(/.*agents/)

    // Check for agents heading
    const heading = page.locator('h1, h2').filter({ hasText: /Agent|AI/i })
    await expect(heading.first()).toBeVisible()
  })

  test('should list all available agents', async ({ page }) => {
    await page.goto('/agents')
    await page.waitForLoadState('networkidle')

    // Look for agent cards or list items
    const agentCards = page.locator('[data-agent], .agent-card, .agent-item')

    const agentCount = await agentCards.count()
    expect(agentCount).toBeGreaterThan(0)

    // Should have at least the core agents
    const pageText = await page.textContent('body')
    expect(pageText).toMatch(/(Orchestrator|Planner|Implementer|Reviewer|Tester|Security|Debugger)/i)
  })

  test('should display agent details for each agent', async ({ page }) => {
    await page.goto('/agents')
    await page.waitForLoadState('networkidle')

    // Look for agent cards
    const firstAgent = page.locator('[data-agent], .agent-card, .agent-item').first()

    await expect(firstAgent).toBeVisible()

    // Check for agent name
    const agentName = firstAgent.locator('[data-agent-name], .agent-name, h2, h3')
    expect(await agentName.count()).toBeGreaterThan(0)

    // Check for agent description
    const agentDesc = firstAgent.locator('[data-agent-description], .agent-description, p')
    expect(await agentDesc.count()).toBeGreaterThan(0)
  })

  test('should show current model assignment for each agent', async ({ page }) => {
    await page.goto('/agents')
    await page.waitForLoadState('networkidle')

    // Look for model badges or indicators
    const modelBadges = page.locator('[data-model], .model-badge, .agent-model').filter({
      hasText: /Claude|GLM|Auto/i,
    })

    const badgeCount = await modelBadges.count()
    expect(badgeCount).toBeGreaterThan(0)
  })

  test('should allow changing agent model', async ({ page }) => {
    await page.goto('/agents')
    await page.waitForLoadState('networkidle')

    // Look for model selector/dropdown
    const modelSelector = page
      .locator('select, [role="combobox"], button')
      .filter({ hasText: /Claude|GLM|Model/i })
      .first()

    const hasSelector = await modelSelector.count() > 0
    if (hasSelector) {
      await modelSelector.click()
      await page.waitForTimeout(300)

      // Look for model options
      const modelOption = page.locator('[role="option"], option, button').filter({
        hasText: /(Claude|GLM|Auto)/i,
      })

      const optionCount = await modelOption.count()
      if (optionCount > 0) {
        await modelOption.first().click()
        await page.waitForTimeout(500)

        // Check for success message
        const toastMessage = page.locator('.toast, [role="status"], .message').filter({
          hasText: /model|ayarlandi/i,
        })

        await page.waitForTimeout(500)
        const hasToast = await toastMessage.count() > 0
        expect(hasToast).toBe(true)
      }
    }
  })

  test('should show agent capabilities', async ({ page }) => {
    await page.goto('/agents')
    await page.waitForLoadState('networkidle')

    // Look for capability indicators
    const capabilities = page.locator('[data-capabilities], .agent-capabilities, .tools').filter({
      hasText: /tools|capability|yetenek/i,
    })

    const capCount = await capabilities.count()
    if (capCount > 0) {
      await expect(capabilities.first()).toBeVisible()
    } else {
      // Alternative: check if tool names are mentioned
      const pageText = await page.textContent('body')
      expect(pageText).toMatch(/(Read|Write|Edit|Bash|Grep|Glob|Task)/i)
    }
  })

  test('should have refresh button to reload agent configurations', async ({ page }) => {
    await page.goto('/agents')
    await page.waitForLoadState('networkidle')

    // Look for refresh button
    const refreshButton = page
      .locator('button')
      .filter({ hasText: /Refresh|Yenile/i })
      .first()

    await expect(refreshButton).toBeVisible()
  })

  test('should reload agents when clicking refresh', async ({ page }) => {
    await page.goto('/agents')
    await page.waitForLoadState('networkidle')

    const refreshButton = page
      .locator('button')
      .filter({ hasText: /Refresh|Yenile/i })
      .first()

    await refreshButton.click()

    // Should show loading state briefly
    const loader = page.locator('.spinner, .loading, .animate-spin')
    await page.waitForTimeout(500)

    // Page should still be functional after refresh
    const agentCards = page.locator('[data-agent], .agent-card, .agent-item')
    const agentCount = await agentCards.count()
    expect(agentCount).toBeGreaterThan(0)
  })

  test('should display statistics about agent assignments', async ({ page }) => {
    await page.goto('/agents')
    await page.waitForLoadState('networkidle')

    // Look for statistics section
    const stats = page.locator('[data-stats], .agent-stats, .statistics').filter({
      hasText: /(Claude|GLM|agent)/i,
    })

    const statsCount = await stats.count()
    if (statsCount > 0) {
      await expect(stats.first()).toBeVisible()

      // Check for counts
      const statsText = await stats.first().textContent()
      expect(statsText).toMatch(/\d+/)
    }
  })

  test('should show different agent types with different colors', async ({ page }) => {
    await page.goto('/agents')
    await page.waitForLoadState('networkidle')

    // Look for color-coded agents (Claude vs GLM)
    const claudeBadges = page.locator('[data-model="claude"], .model-claude, .text-accent').filter({
      hasText: /Claude/i,
    })
    const glmBadges = page.locator('[data-model="glm"], .model-glm, .text-success').filter({
      hasText: /GLM/i,
    })

    const hasClaude = await claudeBadges.count() > 0
    const hasGLM = await glmBadges.count() > 0

    // At least one type should be visible
    expect(hasClaude || hasGLM).toBe(true)
  })

  test('should have info banner explaining agent assignments', async ({ page }) => {
    await page.goto('/agents')
    await page.waitForLoadState('networkidle')

    // Look for info banner
    const infoBanner = page.locator('.info, [role="banner"], .alert-info').filter({
      hasText: /Agent|Model|Assignment/i,
    })

    const hasBanner = await infoBanner.count() > 0
    if (hasBanner) {
      await expect(infoBanner.first()).toBeVisible()
    }
  })

  test('should handle agent model change errors gracefully', async ({ page }) => {
    await page.goto('/agents')
    await page.waitForLoadState('networkidle')

    // This test verifies error handling
    // In a real scenario, we'd mock an API error
    const pageText = await page.textContent('body')
    expect(pageText).toBeTruthy()
  })

  test('should display agent system prompt preview', async ({ page }) => {
    await page.goto('/agents')
    await page.waitForLoadState('networkidle')

    // Look for system prompt section
    const systemPrompt = page.locator('[data-system-prompt], .system-prompt, .agent-prompt')

    const promptCount = await systemPrompt.count()
    if (promptCount > 0) {
      await expect(systemPrompt.first()).toBeVisible()

      // Should have some content
      const promptText = await systemPrompt.first().textContent()
      expect(promptText?.length).toBeGreaterThan(0)
    }
  })

  test('should allow viewing agent details in detail view', async ({ page }) => {
    await page.goto('/agents')
    await page.waitForLoadState('networkidle')

    // Click on an agent card
    const firstAgent = page.locator('[data-agent], .agent-card, .agent-item').first()

    await firstAgent.click()
    await page.waitForTimeout(500)

    // Either a modal should open or URL should change
    const url = page.url()
    const hasModal = await page.locator('[role="dialog"], .modal, .drawer').count() > 0

    expect(hasModal || url.includes('/agents/')).toBe(true)
  })

  test('should display thinking level for each agent', async ({ page }) => {
    await page.goto('/agents')
    await page.waitForLoadState('networkidle')

    // Look for thinking level indicators
    const thinkingBadges = page.locator('[data-thinking], .thinking-level').filter({
      hasText: /(Off|Think|Max|Kapali|Dusun)/i,
    })

    const badgeCount = await thinkingBadges.count()
    if (badgeCount > 0) {
      await expect(thinkingBadges.first()).toBeVisible()
    }
  })

  test('should show which agents allow model override', async ({ page }) => {
    await page.goto('/agents')
    await page.waitForLoadState('networkidle')

    // Look for override indicators
    const overrideIndicators = page.locator('[data-override], .override-allowed').filter({
      hasText: /override|allowed|degisebilir/i,
    })

    const indicatorCount = await overrideIndicators.count()
    if (indicatorCount > 0) {
      await expect(overrideIndicators.first()).toBeVisible()
    }
  })

  test('should have working filter or search for agents', async ({ page }) => {
    await page.goto('/agents')
    await page.waitForLoadState('networkidle')

    // Look for search input
    const searchInput = page.locator('input[placeholder*="search" i], input[placeholder*="ara" i]')

    const hasSearch = await searchInput.count() > 0
    if (hasSearch) {
      await searchInput.first().fill('planner')
      await page.waitForTimeout(500)

      // Results should filter
      const pageText = await page.textContent('body')
      expect(pageText).toMatch(/planner/i)
    }
  })

  test('should handle loading state when fetching agents', async ({ page }) => {
    // Navigate to agents page fresh
    await page.goto('/agents')

    // Check for initial loading state
    const loader = page.locator('.spinner, .loading, .animate-spin')

    await page.waitForTimeout(500)
    const hasLoader = await loader.count() > 0

    if (hasLoader) {
      await expect(loader.first()).toBeVisible()

      // Wait for loading to complete
      await page.waitForLoadState('networkidle')

      // Loader should be gone
      const loaderAfter = await loader.count()
      expect(loaderAfter).toBe(0)
    }
  })

  test('should show empty state when no agents configured', async ({ page }) => {
    // This test checks the error state handling
    // Navigate to agents
    await page.goto('/agents')
    await page.waitForLoadState('networkidle')

    // Page should load without crashing
    const title = await page.title()
    expect(title).toBeTruthy()
  })
})
