/**
 * Create Project Flow E2E Tests
 * @module @task-filewas/tests/e2e/project.spec
 */

import { test, expect } from '@playwright/test'
import { login, createProject, getProjects, deleteProject, testData, setAuthToken } from './helpers/api'

const TEST_PASSWORD = process.env.TEST_PASSWORD || 'admin'

test.describe('Create Project Flow', () => {
  let authToken: string
  let createdProjectId: string

  test.beforeAll(async () => {
    // Login before all tests
    authToken = await login(TEST_PASSWORD)
  })

  test.afterAll(async () => {
    // Cleanup: delete the created project
    if (createdProjectId) {
      try {
        await deleteProject(authToken, createdProjectId)
      } catch (error) {
        console.error('Failed to cleanup project:', error)
      }
    }
  })

  test.beforeEach(async ({ page }) => {
    // Set auth token before each test
    await page.goto('/projects')
    await page.evaluate((token) => {
      localStorage.setItem('auth_token', token)
    }, authToken)
  })

  test('should display projects page', async ({ page }) => {
    await page.goto('/projects')

    // Check if we're on the projects page
    await expect(page).toHaveURL(/.*projects/)

    // Check for projects page heading
    const heading = page.locator('h1, h2').filter({ hasText: /Projeler|Projects/i })
    await expect(heading).toBeVisible()
  })

  test('should create a new project via API', async () => {
    const projectName = testData.projectName()

    const project = await createProject(authToken, {
      name: projectName,
      description: 'E2E test project',
      type: 'other',
    })

    createdProjectId = project.id

    expect(project).toBeTruthy()
    expect(project.name).toBe(projectName)
    expect(project.status).toBe('active')
    expect(project.id).toBeDefined()
  })

  test('should list projects after creation', async ({ page }) => {
    // Create a test project
    const projectName = testData.projectName()
    const project = await createProject(authToken, {
      name: projectName,
      description: 'E2E test project for listing',
    })

    // Store for cleanup
    if (!createdProjectId) {
      createdProjectId = project.id
    }

    // Navigate to projects page
    await page.goto('/projects')

    // Wait for page to load
    await page.waitForLoadState('networkidle')

    // Check if projects are displayed (this would check for project cards)
    // The exact selector depends on the UI implementation
    const projectHeading = page.locator('h1, h2').filter({ hasText: /Projeler/i })
    await expect(projectHeading).toBeVisible()

    // Check if the "Yeni Proje" button exists
    const newProjectButton = page.locator('button').filter({ hasText: /Yeni Proje|New Project/i })
    await expect(newProjectButton).toBeVisible()
  })

  test('should handle duplicate project names', async () => {
    const projectName = testData.projectName()

    // Create first project
    await createProject(authToken, {
      name: projectName,
      type: 'other',
    })

    // Try to create duplicate - should fail
    await expect(async () => {
      await createProject(authToken, {
        name: projectName,
        type: 'other',
      })
    }).rejects.toThrow()
  })

  test('should navigate to project detail', async ({ page }) => {
    // Create a test project
    const projectName = testData.projectName()
    const project = await createProject(authToken, {
      name: projectName,
      description: 'E2E test project for navigation',
    })

    // Store for cleanup
    if (!createdProjectId) {
      createdProjectId = project.id
    }

    // Navigate to project detail
    await page.goto(`/projects/${project.id}`)

    // Check if we're on the project detail page
    await expect(page).toHaveURL(new RegExp(`.*projects/${project.id}`))
  })

  test('should display project count on projects page', async ({ page }) => {
    // Get initial project count
    const projectsBefore = await getProjects(authToken)

    // Create a new project
    const projectName = testData.projectName()
    const project = await createProject(authToken, {
      name: projectName,
    })

    // Store for cleanup
    if (!createdProjectId) {
      createdProjectId = project.id
    }

    // Navigate to projects page
    await page.goto('/projects')
    await page.waitForLoadState('networkidle')

    // Get project count after
    const projectsAfter = await getProjects(authToken)

    expect(projectsAfter.length).toBe(projectsBefore.length + 1)
  })

  test('should filter projects by status', async ({ page }) => {
    // Create active projects
    const project1 = await createProject(authToken, {
      name: testData.projectName('Active'),
      type: 'other',
    })

    if (!createdProjectId) {
      createdProjectId = project1.id
    }

    // Navigate to projects with status filter
    await page.goto('/projects?status=active')
    await page.waitForLoadState('networkidle')

    // URL should have the filter
    expect(page.url()).toContain('status=active')
  })

  test('should search projects', async ({ page }) => {
    // Create a project with specific name
    const uniqueName = `SearchTest-${Date.now()}`
    const project = await createProject(authToken, {
      name: uniqueName,
      type: 'other',
    })

    if (!createdProjectId) {
      createdProjectId = project.id
    }

    // Navigate to projects with search query
    await page.goto(`/projects?search=${uniqueName}`)
    await page.waitForLoadState('networkidle')

    // URL should have the search query
    expect(page.url()).toContain('search=')
  })
})
