/**
 * Health Check Route Tests
 * @module @task-filewas/backend/routes/health.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import request from 'supertest'
import express, { type Express } from 'express'
import { mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { healthRouter } from './health.js'

// Mock the env module
let testDataDir: string

vi.mock('../config/env.js', () => ({
  get env() {
    return {
      PORT: 3001,
      JWT_SECRET: 'test-secret',
      AUTH_PASSWORD: 'test-password',
      DATA_PATH: testDataDir,
      NODE_ENV: 'test',
      CORS_ORIGIN: 'http://localhost:3000',
      LOG_LEVEL: 'info',
    }
  },
}))

// =============================================================================
// Test Fixtures
// =============================================================================

let app: Express

function createTestApp(): Express {
  const app = express()
  app.use(express.json())
  app.use('/api/health', healthRouter)
  return app
}

beforeEach(async () => {
  // Create test data directory
  testDataDir = join(tmpdir(), `health-test-${Date.now()}`)
  await mkdir(testDataDir, { recursive: true })
  app = createTestApp()
})

afterEach(async () => {
  vi.restoreAllMocks()
  // Cleanup test directory
  await rm(testDataDir, { recursive: true, force: true })
})

// =============================================================================
// GET /api/health Tests
// =============================================================================

describe('GET /api/health', () => {
  it('should return health status', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200)

    expect(response.body).toHaveProperty('success', true)
    expect(response.body.data).toHaveProperty('status', 'healthy')
    expect(response.body.data).toHaveProperty('version')
    expect(response.body.data).toHaveProperty('uptime')
    expect(response.body.data).toHaveProperty('timestamp')
  })

  it('should return numeric uptime', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200)

    expect(response.body.data.uptime).toBeGreaterThanOrEqual(0)
    expect(typeof response.body.data.uptime).toBe('number')
  })

  it('should return ISO timestamp', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200)

    expect(response.body.data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
  })

  it('should return version string', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200)

    expect(response.body.data.version).toBeDefined()
    expect(typeof response.body.data.version).toBe('string')
  })
})

// =============================================================================
// GET /api/health/detailed Tests
// =============================================================================

describe('GET /api/health/detailed', () => {
  it('should return detailed health status', async () => {
    const response = await request(app)
      .get('/api/health/detailed')
      .expect(200)

    expect(response.body).toHaveProperty('success', true)
    expect(response.body.data).toHaveProperty('status')
    expect(response.body.data).toHaveProperty('services')
    expect(Array.isArray(response.body.data.services)).toBe(true)
  })

  it('should include data-storage service check', async () => {
    const response = await request(app)
      .get('/api/health/detailed')
      .expect(200)

    const services = response.body.data.services
    const dataStorage = services.find((s: { name: string }) => s.name === 'data-storage')
    expect(dataStorage).toBeDefined()
    expect(dataStorage).toHaveProperty('status')
    expect(dataStorage).toHaveProperty('responseTime')
    expect(dataStorage).toHaveProperty('lastCheck')
  })

  it('should return healthy status when all services are up', async () => {
    const response = await request(app)
      .get('/api/health/detailed')
      .expect(200)

    expect(response.body.data.status).toBe('healthy')
  })

  it('should return 200 for healthy status', async () => {
    const response = await request(app)
      .get('/api/health/detailed')
      .expect(200)

    expect(response.status).toBe(200)
  })

  it('should return service with response time in ms', async () => {
    const response = await request(app)
      .get('/api/health/detailed')
      .expect(200)

    const services = response.body.data.services
    const dataStorage = services.find((s: { name: string }) => s.name === 'data-storage')
    expect(dataStorage.responseTime).toBeGreaterThanOrEqual(0)
    expect(typeof dataStorage.responseTime).toBe('number')
  })

  it('should include lastCheck timestamp', async () => {
    const response = await request(app)
      .get('/api/health/detailed')
      .expect(200)

    const services = response.body.data.services
    const dataStorage = services.find((s: { name: string }) => s.name === 'data-storage')
    expect(dataStorage.lastCheck).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
  })
})
