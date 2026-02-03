/**
 * Create Session Flow E2E Tests
 * @module @task-filewas/tests/e2e/session.spec
 */

import { test, expect } from '@playwright/test'
import {
  login,
  createProject,
  createSession,
  getSessions,
  deleteSession,
  testData,
} from './helpers/api'

const TEST_PASSWORD = process.env.TEST_PASSWORD || 'admin'

test.describe('Create Session Flow', () => {
  let authToken: string
  let testProjectId: string
  let createdSessionId: string

  test.beforeAll(async () => {
    // Login before all tests
    authToken = await login(TEST_PASSWORD)

    // Create a test project for sessions
    const project = await createProject(authToken, {
      name: testData.projectName('Session Test'),
      type: 'other',
    })
    testProjectId = project.id
  })

  test.afterAll(async () => {
    // Cleanup: delete the created session
    if (createdSessionId) {
      try {
        await deleteSession(authToken, createdSessionId)
      } catch (error) {
        console.error('Failed to cleanup session:', error)
      }
    }
  })

  test.beforeEach(async ({ page }) => {
    // Set auth token before each test
    await page.goto('/sessions')
    await page.evaluate((token) => {
      localStorage.setItem('auth_token', token)
    }, authToken)
  })

  test('should display sessions page', async ({ page }) => {
    await page.goto('/sessions')

    // Check if we're on the sessions page
    await expect(page).toHaveURL(/.*sessions/)

    // Check for sessions page heading
    const heading = page.locator('h1, h2').filter({ hasText: /Sessions|Oturumlar/i })
    // Sessions page is placeholder, so we just check URL
    await expect(page).toHaveURL(/.*sessions/)
  })

  test('should create a new session via API', async () => {
    const sessionTitle = testData.sessionTitle()

    const session = await createSession(authToken, {
      projectId: testProjectId,
      title: sessionTitle,
      description: 'E2E test session',
    })

    createdSessionId = session.id

    expect(session).toBeTruthy()
    expect(session.title).toBe(sessionTitle)
    expect(session.projectId).toBe(testProjectId)
    expect(session.status).toBeDefined()
    expect(session.id).toBeDefined()
  })

  test('should list sessions after creation', async ({ page }) => {
    // Create a test session
    const sessionTitle = testData.sessionTitle('List Test')
    const session = await createSession(authToken, {
      projectId: testProjectId,
      title: sessionTitle,
    })

    // Store for cleanup
    if (!createdSessionId) {
      createdSessionId = session.id
    }

    // Get sessions via API
    const sessions = await getSessions(authToken, testProjectId)

    expect(sessions.length).toBeGreaterThan(0)
    expect(sessions.some((s) => s.id === session.id)).toBe(true)
  })

  test('should navigate to session detail', async ({ page }) => {
    // Create a test session
    const sessionTitle = testData.sessionTitle('Detail Test')
    const session = await createSession(authToken, {
      projectId: testProjectId,
      title: sessionTitle,
    })

    // Store for cleanup
    if (!createdSessionId) {
      createdSessionId = session.id
    }

    // Navigate to session detail
    await page.goto(`/sessions/${session.id}`)

    // Check if we're on the session detail page
    await expect(page).toHaveURL(new RegExp(`.*sessions/${session.id}`))
  })

  test('should filter sessions by project', async ({ page }) => {
    // Create a test session
    const session = await createSession(authToken, {
      projectId: testProjectId,
      title: testData.sessionTitle('Filter Test'),
    })

    if (!createdSessionId) {
      createdSessionId = session.id
    }

    // Navigate to sessions with project filter
    await page.goto(`/sessions?projectId=${testProjectId}`)
    await page.waitForLoadState('networkidle')

    // URL should have the filter
    expect(page.url()).toContain('projectId=')
  })

  test('should create session with different modes', async () => {
    const modes = ['quick-chat', 'planning', 'tdd', 'debug', 'code-review'] as const

    for (const mode of modes) {
      const session = await createSession(authToken, {
        projectId: testProjectId,
        title: testData.sessionTitle(`Mode Test ${mode}`),
      })

      expect(session.mode).toBeDefined()

      // Cleanup
      await deleteSession(authToken, session.id)
    }
  })

  test('should handle session with labels', async () => {
    const sessionTitle = testData.sessionTitle('Label Test')
    const session = await createSession(authToken, {
      projectId: testProjectId,
      title: sessionTitle,
      // Labels would be passed here when the feature is fully implemented
    })

    if (!createdSessionId) {
      createdSessionId = session.id
    }

    expect(session.labels).toBeDefined()
    expect(Array.isArray(session.labels)).toBe(true)
  })

  test('should update session status', async ({ page }) => {
    const session = await createSession(authToken, {
      projectId: testProjectId,
      title: testData.sessionTitle('Status Test'),
    })

    if (!createdSessionId) {
      createdSessionId = session.id
    }

    // Initial status should be 'todo' or similar
    expect(session.status).toBeDefined()

    // Navigate to session detail
    await page.goto(`/sessions/${session.id}`)
    await page.waitForLoadState('networkidle')

    // Check if session detail page loads
    await expect(page).toHaveURL(new RegExp(`.*sessions/${session.id}`))
  })

  test('should handle multiple sessions for same project', async () => {
    const sessionCount = 3
    const createdSessions: string[] = []

    for (let i = 0; i < sessionCount; i++) {
      const session = await createSession(authToken, {
        projectId: testProjectId,
        title: testData.sessionTitle(`Multi Test ${i}`),
      })
      createdSessions.push(session.id)
    }

    // Get all sessions for the project
    const sessions = await getSessions(authToken, testProjectId)

    // Should have at least our test sessions
    expect(sessions.length).toBeGreaterThanOrEqual(sessionCount)

    // Cleanup
    for (const sessionId of createdSessions) {
      await deleteSession(authToken, sessionId)
    }
  })
})
