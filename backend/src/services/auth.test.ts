/**
 * Authentication Service Tests
 * @module @task-filewas/backend/services/auth.test
 */

import { describe, it, expect, vi } from 'vitest'
import { generateToken, verifyToken, decodeToken, hashPassword, verifyPassword, verifyEnvPassword, extractBearerToken, calculateExpirationDate } from './auth.js'

// Mock the env module - must use inline values, not variables
vi.mock('../config/env.js', () => ({
  env: {
    JWT_SECRET: 'test-secret-key-for-jwt-signing',
    AUTH_PASSWORD: 'test-password-123',
    PORT: 3001,
    DATA_PATH: './data',
    NODE_ENV: 'test',
    CORS_ORIGIN: 'http://localhost:3000',
    LOG_LEVEL: 'info',
  },
}))

// =============================================================================
// generateToken Tests
// =============================================================================

describe('generateToken', () => {
  it('should generate a valid JWT token', () => {
    const token = generateToken()
    expect(typeof token).toBe('string')
    expect(token.split('.')).toHaveLength(3) // JWT has 3 parts
  })

  it('should generate token with default expiration', () => {
    const token = generateToken()
    const decoded = decodeToken(token)
    expect(decoded).toBeDefined()
    expect(decoded?.type).toBe('access')
  })

  it('should generate token with custom expiration', () => {
    const token = generateToken({ expiresIn: 3600 }) // 1 hour
    expect(typeof token).toBe('string')
  })

  it('should include type in payload', () => {
    const token = generateToken()
    const decoded = decodeToken(token)
    expect(decoded?.type).toBe('access')
  })
})

// =============================================================================
// verifyToken Tests
// =============================================================================

describe('verifyToken', () => {
  it('should verify a valid token', () => {
    const token = generateToken()
    const result = verifyToken(token)

    expect(result.valid).toBe(true)
    expect(result.payload).toBeDefined()
    expect(result.payload?.type).toBe('access')
  })

  it('should return error for invalid token', () => {
    const result = verifyToken('invalid.token.here')

    expect(result.valid).toBe(false)
    expect(result.error).toBe('Invalid token')
  })

  it('should return error for malformed token', () => {
    const result = verifyToken('not-a-jwt')

    expect(result.valid).toBe(false)
    expect(result.error).toBe('Invalid token')
  })

  it('should return error for empty token', () => {
    const result = verifyToken('')

    expect(result.valid).toBe(false)
  })

  it('should return expired error for expired token', () => {
    // Generate a token that expired immediately
    const jwt = require('jsonwebtoken')
    const expiredToken = jwt.sign({ type: 'access' }, 'test-secret-key-for-jwt-signing', { expiresIn: '0s' })

    const result = verifyToken(expiredToken)

    expect(result.valid).toBe(false)
    expect(result.error).toBe('Token expired')
  })
})

// =============================================================================
// decodeToken Tests
// =============================================================================

describe('decodeToken', () => {
  it('should decode a valid token without verification', () => {
    const token = generateToken()
    const decoded = decodeToken(token)

    expect(decoded).toBeDefined()
    expect(decoded?.type).toBe('access')
    expect(decoded?.iat).toBeDefined()
  })

  it('should decode an expired token', () => {
    const jwt = require('jsonwebtoken')
    const expiredToken = jwt.sign({ type: 'access' }, 'test-secret-key-for-jwt-signing', { expiresIn: '-1h' })

    const decoded = decodeToken(expiredToken)

    // Decode should still work even for expired tokens
    expect(decoded).toBeDefined()
  })

  it('should return null for invalid token', () => {
    const decoded = decodeToken('invalid.token')
    expect(decoded).toBeNull()
  })

  it('should return null for empty token', () => {
    const decoded = decodeToken('')
    expect(decoded).toBeNull()
  })
})

// =============================================================================
// hashPassword Tests
// =============================================================================

describe('hashPassword', () => {
  it('should hash a password', async () => {
    const password = 'plain-text-password'
    const hash = await hashPassword(password)

    expect(hash).toBeDefined()
    expect(typeof hash).toBe('string')
    expect(hash).not.toBe(password)
    expect(hash.length).toBeGreaterThan(20) // bcrypt hashes are typically 60 chars
  })

  it('should generate different hashes for same password', async () => {
    const password = 'same-password'
    const hash1 = await hashPassword(password)
    const hash2 = await hashPassword(password)

    expect(hash1).not.toBe(hash2) // Salt should be different
  })

  it('should generate bcrypt hash format', async () => {
    const password = 'test-password'
    const hash = await hashPassword(password)

    // bcrypt hashes always start with $2a$ or $2b$
    expect(hash).toMatch(/^\$2[ab]\$/)
  })
})

// =============================================================================
// verifyPassword Tests
// =============================================================================

describe('verifyPassword', () => {
  it('should verify correct password', async () => {
    const password = 'my-password'
    const hash = await hashPassword(password)

    const isValid = await verifyPassword(password, hash)
    expect(isValid).toBe(true)
  })

  it('should reject incorrect password', async () => {
    const password = 'my-password'
    const hash = await hashPassword(password)

    const isValid = await verifyPassword('wrong-password', hash)
    expect(isValid).toBe(false)
  })

  it('should reject empty password', async () => {
    const password = 'my-password'
    const hash = await hashPassword(password)

    const isValid = await verifyPassword('', hash)
    expect(isValid).toBe(false)
  })
})

// =============================================================================
// verifyEnvPassword Tests
// =============================================================================

describe('verifyEnvPassword', () => {
  it('should verify correct password', () => {
    const isValid = verifyEnvPassword('test-password-123')
    expect(isValid).toBe(true)
  })

  it('should reject incorrect password', () => {
    const isValid = verifyEnvPassword('wrong-password')
    expect(isValid).toBe(false)
  })

  it('should reject empty password', () => {
    const isValid = verifyEnvPassword('')
    expect(isValid).toBe(false)
  })
})

// =============================================================================
// extractBearerToken Tests
// =============================================================================

describe('extractBearerToken', () => {
  it('should extract token from valid Bearer header', () => {
    const authHeader = 'Bearer my-token-123'
    const token = extractBearerToken(authHeader)

    expect(token).toBe('my-token-123')
  })

  it('should handle lowercase bearer', () => {
    const authHeader = 'bearer my-token-123'
    const token = extractBearerToken(authHeader)

    expect(token).toBe('my-token-123')
  })

  it('should handle mixed case', () => {
    const authHeader = 'BEARER my-token-123'
    const token = extractBearerToken(authHeader)

    expect(token).toBe('my-token-123')
  })

  it('should return null for missing header', () => {
    const token = extractBearerToken(undefined)
    expect(token).toBeNull()
  })

  it('should return null for empty header', () => {
    const token = extractBearerToken('')
    expect(token).toBeNull()
  })

  it('should return null for header without Bearer', () => {
    const token = extractBearerToken('my-token-123')
    expect(token).toBeNull()
  })

  it('should return null for header with only Bearer', () => {
    const token = extractBearerToken('Bearer')
    expect(token).toBeNull()
  })

  it('should return null for header with wrong scheme', () => {
    const token = extractBearerToken('Basic my-token-123')
    expect(token).toBeNull()
  })

  it('should return null for header with too many parts', () => {
    const token = extractBearerToken('Bearer token extra')
    expect(token).toBeNull()
  })
})

// =============================================================================
// calculateExpirationDate Tests
// =============================================================================

describe('calculateExpirationDate', () => {
  it('should calculate expiration date with default seconds', () => {
    const dateStr = calculateExpirationDate()
    const date = new Date(dateStr)

    const now = Date.now()
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000

    // Allow 1 second tolerance for test execution time
    expect(date.getTime()).toBeGreaterThanOrEqual(now + sevenDaysInMs - 1000)
    expect(date.getTime()).toBeLessThanOrEqual(now + sevenDaysInMs + 1000)
  })

  it('should calculate expiration date with custom seconds', () => {
    const oneHour = 60 * 60 // 3600 seconds
    const dateStr = calculateExpirationDate(oneHour)
    const date = new Date(dateStr)

    const now = Date.now()
    const oneHourInMs = 60 * 60 * 1000

    // Allow 1 second tolerance
    expect(date.getTime()).toBeGreaterThanOrEqual(now + oneHourInMs - 1000)
    expect(date.getTime()).toBeLessThanOrEqual(now + oneHourInMs + 1000)
  })

  it('should return ISO string format', () => {
    const dateStr = calculateExpirationDate()
    expect(dateStr).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
  })

  it('should handle zero expiration', () => {
    const dateStr = calculateExpirationDate(0)
    const date = new Date(dateStr)

    const now = Date.now()
    // Should be very close to now
    expect(Math.abs(date.getTime() - now)).toBeLessThan(1000)
  })
})
