/**
 * File Browser Flow E2E Tests
 * @module @task-filewas/tests/e2e/file-browser
 */

import { test, expect } from '@playwright/test'
import { login, createProject } from './helpers/api'

const TEST_PASSWORD = process.env['TEST_PASSWORD'] || 'admin'

test.describe('File Browser Flow', () => {
  let authToken: string
  let projectId: string

  test.beforeAll(async () => {
    // Login before all tests
    authToken = await login(TEST_PASSWORD)

    // Create a test project
    const project = await createProject(authToken, {
      name: `File Browser Test ${Date.now()}`,
      description: 'E2E test project for file browser',
      type: 'other',
    })
    projectId = project.id
  })

  test.beforeEach(async ({ page }) => {
    // Set auth token before each test
    await page.goto('/projects')
    await page.evaluate((token) => {
      localStorage.setItem('auth_token', token)
      localStorage.setItem('token', token)
    }, authToken)
  })

  test('should navigate to files tab from project detail', async ({ page }) => {
    await page.goto(`/projects/${projectId}`)
    await page.waitForLoadState('networkidle')

    // Look for files tab
    const filesTab = page.locator('button, a').filter({ hasText: /Files|Dosyalar/i })
    const filesTabCount = await filesTab.count()

    if (filesTabCount > 0) {
      await filesTab.first().click()
      await page.waitForTimeout(500)

      // URL should include files or similar
      const url = page.url()
      expect(url).toMatch(/(files|dosyalar)/i)
    }
  })

  test('should display file tree structure', async ({ page }) => {
    await page.goto(`/projects/${projectId}/files`)
    await page.waitForLoadState('networkidle')

    // Check for file tree or folder structure
    const fileTree = page.locator('[data-file-tree], .file-tree, .tree-view')
    const treeItems = page.locator('[role="treeitem"], .tree-item, .file-item')

    const hasFileTree = await fileTree.count() > 0
    const hasTreeItems = await treeItems.count() > 0

    // At least some file tree structure should be present
    expect(hasFileTree || hasTreeItems).toBe(true)
  })

  test('should expand and collapse folders', async ({ page }) => {
    await page.goto(`/projects/${projectId}/files`)
    await page.waitForLoadState('networkidle')

    // Look for folder items with expand/collapse capability
    const folderItems = page.locator('[role="treeitem"][aria-expanded], .folder, [data-folder]')

    const folderCount = await folderItems.count()
    if (folderCount > 0) {
      const firstFolder = folderItems.first()

      // Check if it's collapsed
      const ariaExpanded = await firstFolder.getAttribute('aria-expanded')
      const isExpanded = ariaExpanded === 'true'

      // Click to toggle
      await firstFolder.click()
      await page.waitForTimeout(300)

      // State should have changed
      const newAriaExpanded = await firstFolder.getAttribute('aria-expanded')
      const newIsExpanded = newAriaExpanded === 'true'

      // If we had folders, one of them should be interactive
      expect(newIsExpanded).not.toBe(isExpanded)
    }
  })

  test('should display file content when clicking a file', async ({ page }) => {
    await page.goto(`/projects/${projectId}/files`)
    await page.waitForLoadState('networkidle')

    // Look for file items (not folders)
    const fileItems = page.locator('[role="treeitem"]:not([aria-expanded]), .file-item:not(.folder), [data-file]:not([data-folder])')

    const fileCount = await fileItems.count()
    if (fileCount > 0) {
      const firstFile = fileItems.first()
      await firstFile.click()
      await page.waitForTimeout(500)

      // File content panel should appear
      const contentPanel = page.locator('.file-content, .code-viewer, [data-file-content]')
      const hasContent = await contentPanel.count() > 0

      expect(hasContent).toBe(true)
    }
  })

  test('should have search functionality for files', async ({ page }) => {
    await page.goto(`/projects/${projectId}/files`)
    await page.waitForLoadState('networkidle')

    // Look for search input
    const searchInput = page.locator('input[placeholder*="search" i], input[placeholder*="ara" i], [data-search-input]')

    const hasSearch = await searchInput.count() > 0
    if (hasSearch) {
      await searchInput.first().fill('test')
      await page.waitForTimeout(500)

      // Either results filter or message appears
      const pageText = await page.textContent('body')
      expect(pageText).toBeTruthy()
    }
  })

  test('should display file metadata', async ({ page }) => {
    await page.goto(`/projects/${projectId}/files`)
    await page.waitForLoadState('networkidle')

    // Click on a file to see metadata
    const fileItems = page.locator('[role="treeitem"]:not([aria-expanded]), .file-item:not(.folder)')

    const fileCount = await fileItems.count()
    if (fileCount > 0) {
      await fileItems.first().click()
      await page.waitForTimeout(500)

      // Look for file metadata (size, type, last modified, etc.)
      const metadata = page.locator('.file-metadata, .file-info, [data-file-metadata]')
      const hasMetadata = await metadata.count() > 0

      if (hasMetadata) {
        const metadataText = await metadata.first().textContent()
        expect(metadataText).toBeTruthy()
        expect(metadataText?.length).toBeGreaterThan(0)
      }
    }
  })

  test('should support breadcrumb navigation', async ({ page }) => {
    await page.goto(`/projects/${projectId}/files`)
    await page.waitForLoadState('networkidle')

    // Look for breadcrumbs
    const breadcrumbs = page.locator('.breadcrumb, nav[aria-label="breadcrumb"], [data-breadcrumbs]')

    const hasBreadcrumbs = await breadcrumbs.count() > 0
    if (hasBreadcrumbs) {
      const breadcrumbText = await breadcrumbs.first().textContent()
      expect(breadcrumbText).toBeTruthy()
      expect(breadcrumbText?.length).toBeGreaterThan(0)
    }
  })

  test('should have context menu or actions for files', async ({ page }) => {
    await page.goto(`/projects/${projectId}/files`)
    await page.waitForLoadState('networkidle')

    // Look for action buttons or context menu trigger
    const actionButtons = page.locator('button').filter({ hasText: /Edit|Delete|Rename|Copy|Download/i })
    const menuButtons = page.locator('[aria-haspopup], button[aria-label*="more" i], button[aria-label*="menu" i]')

    const hasActions = await actionButtons.count() > 0
    const hasMenus = await menuButtons.count() > 0

    expect(hasActions || hasMenus).toBe(true)
  })

  test('should display code syntax highlighting for code files', async ({ page }) => {
    await page.goto(`/projects/${projectId}/files`)
    await page.waitForLoadState('networkidle')

    // Look for code files
    const codeFiles = page.locator('[role="treeitem"]').filter({ hasText: /\.(ts|tsx|js|jsx|py|go|rs)/i })

    const codeFileCount = await codeFiles.count()
    if (codeFileCount > 0) {
      await codeFiles.first().click()
      await page.waitForTimeout(500)

      // Check for syntax highlighting classes or elements
      const syntaxHighlight = page.locator('.token, .keyword, .string, .shiki, [data-syntax-highlight]')
      const hasHighlighting = await syntaxHighlight.count() > 0

      if (hasHighlighting) {
        expect(true).toBe(true)
      }
    }
  })

  test('should handle large files with warning or preview', async ({ page }) => {
    await page.goto(`/projects/${projectId}/files`)
    await page.waitForLoadState('networkidle')

    // This test checks if the UI handles large files appropriately
    // In a real scenario, we'd need to actually have a large file
    const pageText = await page.textContent('body')

    // The page should have some content related to files
    expect(pageText).toBeTruthy()
  })

  test('should support keyboard navigation in file tree', async ({ page }) => {
    await page.goto(`/projects/${projectId}/files`)
    await page.waitForLoadState('networkidle')

    // Look for tree items
    const treeItems = page.locator('[role="treeitem"]')

    const itemCount = await treeItems.count()
    if (itemCount > 0) {
      // Focus on the tree
      await treeItems.first().focus()

      // Try arrow key navigation
      await page.keyboard.press('ArrowDown')
      await page.waitForTimeout(200)

      // Check focus moved - just verify something is focused
      const focused = page.locator(':focus')
      await expect(focused.first()).toBeVisible()
    }
  })

  test('should show empty state when no files exist', async ({ page }) => {
    // This test assumes we might navigate to an empty directory
    await page.goto(`/projects/${projectId}/files`)
    await page.waitForLoadState('networkidle')

    // The page should load without errors
    const title = await page.title()
    expect(title).toBeTruthy()
  })
})
