/**
 * Authentication Routes Tests
 * @module @task-filewas/backend/routes/auth.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import request from 'supertest'
import express, { type Express } from 'express'
import { authRouter } from './auth.js'
import { generateToken } from '../services/auth.js'
import { errorMiddleware } from '../middleware/error.js'

vi.mock('../config/env.js', () => ({
  env: {
    PORT: 3001,
    JWT_SECRET: 'test-secret-key-for-jwt',
    AUTH_PASSWORD: 'correct-password',
    DATA_PATH: './data',
    NODE_ENV: 'test',
    CORS_ORIGIN: 'http://localhost:3000',
    LOG_LEVEL: 'info',
  },
  isDevelopment: false,
}))

let app: Express

function createTestApp(): Express {
  const app = express()
  app.use(express.json())
  app.use('/api/auth', authRouter)
  // Add error middleware to handle ApiError responses
  app.use(errorMiddleware)
  return app
}

beforeEach(() => {
  app = createTestApp()
})

afterEach(() => {
  vi.restoreAllMocks()
})

// POST /api/auth/login Tests
describe('POST /api/auth/login', () => {
  it('should return token for correct password', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ password: 'correct-password' })
      .expect(200)

    expect(response.body.success).toBe(true)
    expect(response.body.data).toHaveProperty('token')
    expect(response.body.data).toHaveProperty('expiresAt')
  })

  it('should return 401 for incorrect password', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ password: 'wrong-password' })
      .expect(401)

    // Error responses have success: false
    expect(response.body).toHaveProperty('success', false)
    expect(response.body).toHaveProperty('error')
  })

  it('should return 400 for missing password', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({})
      .expect(400)

    expect(response.body).toHaveProperty('success', false)
    expect(response.body).toHaveProperty('error')
  })

  it('should return 400 for empty password', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ password: '' })
      .expect(400)

    expect(response.body).toHaveProperty('success', false)
    expect(response.body).toHaveProperty('error')
  })
})

// GET /api/auth/verify Tests
describe('GET /api/auth/verify', () => {
  it('should verify valid token', async () => {
    const token = generateToken()

    const response = await request(app)
      .get('/api/auth/verify')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(response.body.success).toBe(true)
    expect(response.body.data.valid).toBe(true)
  })

  it('should return 401 for missing Authorization header', async () => {
    await request(app)
      .get('/api/auth/verify')
      .expect(401)
  })

  it('should return 401 for invalid token', async () => {
    await request(app)
      .get('/api/auth/verify')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401)
  })

  it('should return 401 for malformed Authorization header', async () => {
    await request(app)
      .get('/api/auth/verify')
      .set('Authorization', 'InvalidFormat token')
      .expect(401)
  })

  it('should return 401 for Bearer without token', async () => {
    await request(app)
      .get('/api/auth/verify')
      .set('Authorization', 'Bearer ')
      .expect(401)
  })
})

// POST /api/auth/refresh Tests
describe('POST /api/auth/refresh', () => {
  it('should generate new token with valid auth', async () => {
    const token = generateToken()

    const response = await request(app)
      .post('/api/auth/refresh')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(response.body.success).toBe(true)
    expect(response.body.data).toHaveProperty('token')
  })

  it('should return different token on refresh', async () => {
    const originalToken = generateToken()

    // Wait a bit to ensure different timestamp (JWT iat is in seconds)
    await new Promise(resolve => setTimeout(resolve, 1100))

    const response = await request(app)
      .post('/api/auth/refresh')
      .set('Authorization', `Bearer ${originalToken}`)
      .expect(200)

    const newToken = response.body.data.token
    expect(newToken).toBeDefined()
    expect(newToken).not.toBe(originalToken)
  })

  it('should return 401 for missing auth', async () => {
    await request(app)
      .post('/api/auth/refresh')
      .expect(401)
  })
})

// POST /api/auth/validate Tests
describe('POST /api/auth/validate', () => {
  it('should validate a valid token', async () => {
    const token = generateToken()

    const response = await request(app)
      .post('/api/auth/validate')
      .send({ token })
      .expect(200)

    expect(response.body.success).toBe(true)
    expect(response.body.data.valid).toBe(true)
  })

  it('should return invalid for incorrect token', async () => {
    const response = await request(app)
      .post('/api/auth/validate')
      .send({ token: 'invalid-token' })
      .expect(200)

    expect(response.body.success).toBe(true)
    expect(response.body.data.valid).toBe(false)
  })

  it('should return 400 for missing token', async () => {
    await request(app)
      .post('/api/auth/validate')
      .send({})
      .expect(400)
  })

  it('should return 400 for empty token', async () => {
    await request(app)
      .post('/api/auth/validate')
      .send({ token: '' })
      .expect(400)
  })

  it('should return 400 for non-string token', async () => {
    await request(app)
      .post('/api/auth/validate')
      .send({ token: 12345 })
      .expect(400)
  })
})
