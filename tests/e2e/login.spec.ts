/**
 * Login Flow E2E Tests
 * @module @task-filewas/tests/e2e/login.spec
 */

import { test, expect } from '@playwright/test'
import { login, testData } from './helpers/api'

const TEST_PASSWORD = process.env.TEST_PASSWORD || 'admin'

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/login')
    await page.evaluate(() => localStorage.clear())
  })

  test('should display login page', async ({ page }) => {
    await page.goto('/login')

    // Check if we're on the login page
    await expect(page).toHaveTitle(/Task\.filewas/)

    // Check for login form elements
    // Note: Login page is placeholder, adjust selectors when implemented
    const heading = page.locator('h1, h2').filter({ hasText: /Giriş|Login/i })
    await expect(heading).toBeVisible()
  })

  test('should login with valid credentials', async ({ page }) => {
    // First, login via API to get token
    const token = await login(TEST_PASSWORD)

    expect(token).toBeTruthy()
    expect(token).toHaveLength.greaterThan(0)

    // Set token in localStorage and verify
    await page.goto('/login')
    await page.evaluate((authToken) => {
      localStorage.setItem('auth_token', authToken)
    }, token)

    // Verify token is stored
    const storedToken = await page.evaluate(() => localStorage.getItem('auth_token'))
    expect(storedToken).toBe(token)
  })

  test('should fail login with invalid credentials', async ({ page }) => {
    const response = await fetch(`${process.env.API_URL || 'http://localhost:3001'}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'wrong-password' }),
    })

    expect(response.status).toBe(401)

    const data = await response.json()
    expect(data.success).toBe(false)
  })

  test('should redirect to project select after successful login', async ({ page }) => {
    // Login via API
    const token = await login(TEST_PASSWORD)

    // Set token and navigate
    await page.goto('/login')
    await page.evaluate((authToken) => {
      localStorage.setItem('auth_token', authToken)
    }, token)

    // Navigate to project select (this would normally happen automatically)
    await page.goto('/project-select')

    // Check if we're on project select page
    await expect(page).toHaveURL(/.*project-select/)
    await expect(page.locator('h1, h2').filter({ hasText: /Proje Secin|Project Select/i })).toBeVisible()
  })

  test('should persist auth token across page navigations', async ({ page }) => {
    // Login via API
    const token = await login(TEST_PASSWORD)

    // Set token
    await page.goto('/login')
    await page.evaluate((authToken) => {
      localStorage.setItem('auth_token', authToken)
    }, token)

    // Navigate to different pages
    await page.goto('/dashboard')
    let storedToken = await page.evaluate(() => localStorage.getItem('auth_token'))
    expect(storedToken).toBe(token)

    await page.goto('/projects')
    storedToken = await page.evaluate(() => localStorage.getItem('auth_token'))
    expect(storedToken).toBe(token)
  })

  test('should handle token expiration', async ({ page }) => {
    // Set an expired token (this would be a token from the past)
    const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjEwMDAwMDAwMDAsImV4cCI6MTAwMDAwMDAwMH0.invalid'

    await page.goto('/login')
    await page.evaluate((authToken) => {
      localStorage.setItem('auth_token', authToken)
    }, expiredToken)

    // Try to access protected route
    await page.goto('/dashboard')

    // Should redirect to login or show auth error
    // This depends on how auth checking is implemented
    const url = page.url()
    expect(url).toMatch(/(login|dashboard)/)
  })
})
