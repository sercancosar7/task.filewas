/**
 * API Helper Functions for E2E Tests
 * @module @task-filewas/tests/e2e/helpers/api
 */

interface LoginResponse {
  success: boolean
  data: {
    token: string
    expiresAt: string
  }
}

interface ProjectCreateResponse {
  success: boolean
  data: {
    id: string
    name: string
    type: string
    status: string
    createdAt: string
  }
}

interface SessionCreateResponse {
  success: boolean
  data: {
    id: string
    projectId: string
    title: string
    status: string
    createdAt: string
  }
}

/**
 * API base URL from environment or default
 */
const API_URL = process.env.API_URL || 'http://localhost:3001'

/**
 * Login and get auth token
 */
export async function login(password: string = 'admin'): Promise<string> {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ password }),
  })

  if (!response.ok) {
    throw new Error(`Login failed: ${response.status} ${response.statusText}`)
  }

  const data: LoginResponse = await response.json()
  return data.data.token
}

/**
 * Create a new project
 */
export async function createProject(
  token: string,
  data: { name: string; description?: string; type?: string }
): Promise<ProjectCreateResponse['data']> {
  const response = await fetch(`${API_URL}/api/projects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error(`Create project failed: ${response.status} ${response.statusText}`)
  }

  const result: ProjectCreateResponse = await response.json()
  return result.data
}

/**
 * Get project list
 */
export async function getProjects(token: string): Promise<ProjectCreateResponse['data'][]> {
  const response = await fetch(`${API_URL}/api/projects`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Get projects failed: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  return data.data
}

/**
 * Delete a project (soft delete)
 */
export async function deleteProject(token: string, projectId: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/projects/${projectId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Delete project failed: ${response.status} ${response.statusText}`)
  }
}

/**
 * Create a new session
 */
export async function createSession(
  token: string,
  data: { projectId: string; title: string; description?: string }
): Promise<SessionCreateResponse['data']> {
  const response = await fetch(`${API_URL}/api/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error(`Create session failed: ${response.status} ${response.statusText}`)
  }

  const result: SessionCreateResponse = await response.json()
  return result.data
}

/**
 * Get sessions list
 */
export async function getSessions(token: string, projectId?: string): Promise<SessionCreateResponse['data'][]> {
  const url = projectId
    ? `${API_URL}/api/sessions?projectId=${projectId}`
    : `${API_URL}/api/sessions`

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Get sessions failed: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  return data.data
}

/**
 * Delete a session
 */
export async function deleteSession(token: string, sessionId: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/sessions/${sessionId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Delete session failed: ${response.status} ${response.statusText}`)
  }
}

/**
 * Store token in localStorage
 */
export function setAuthToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('auth_token', token)
  }
}

/**
 * Get auth token from localStorage
 */
export function getAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('auth_token')
  }
  return null
}

/**
 * Clear auth token from localStorage
 */
export function clearAuthToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_token')
  }
}

/**
 * Generate random test data
 */
export const testData = {
  projectName: (prefix = 'Test Project') => `${prefix} ${Date.now()}`,
  sessionTitle: (prefix = 'Test Session') => `${prefix} ${Date.now()}`,
  description: (prefix = 'Test Description') => `${prefix} created at ${new Date().toISOString()}`,
}
