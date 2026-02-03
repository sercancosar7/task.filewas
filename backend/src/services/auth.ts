/**
 * Authentication Service
 * JWT token generation and verification
 * @module @task-filewas/backend/services/auth
 */

import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { env } from '../config/env.js'

// =============================================================================
// Types
// =============================================================================

/**
 * JWT token payload
 */
export interface TokenPayload {
  /** Issued at timestamp */
  iat: number
  /** Expiration timestamp */
  exp?: number
  /** Token type */
  type: 'access'
}

/**
 * Token generation options
 */
export interface GenerateTokenOptions {
  /** Token expiration time in seconds or string (e.g., '7d', '1h') */
  expiresIn?: number
}

/**
 * Token verification result
 */
export interface VerifyTokenResult {
  /** Whether the token is valid */
  valid: boolean
  /** Decoded payload if valid */
  payload?: TokenPayload
  /** Error message if invalid */
  error?: string
}

// =============================================================================
// Constants
// =============================================================================

/** Default token expiration: 7 days in seconds */
const DEFAULT_TOKEN_EXPIRY_SECONDS = 7 * 24 * 60 * 60

/** BCrypt salt rounds */
const SALT_ROUNDS = 10

// =============================================================================
// Token Functions
// =============================================================================

/**
 * Generate a JWT access token
 * @param options - Token generation options
 * @returns JWT token string
 */
export function generateToken(options: GenerateTokenOptions = {}): string {
  const { expiresIn = DEFAULT_TOKEN_EXPIRY_SECONDS } = options

  const payload: Omit<TokenPayload, 'iat' | 'exp'> = {
    type: 'access',
  }

  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn,
  })
}

/**
 * Verify a JWT token
 * @param token - JWT token to verify
 * @returns Verification result with payload or error
 */
export function verifyToken(token: string): VerifyTokenResult {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as TokenPayload

    return {
      valid: true,
      payload: decoded,
    }
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return {
        valid: false,
        error: 'Token expired',
      }
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return {
        valid: false,
        error: 'Invalid token',
      }
    }

    return {
      valid: false,
      error: 'Token verification failed',
    }
  }
}

/**
 * Decode a JWT token without verification
 * Useful for getting payload from expired tokens
 * @param token - JWT token to decode
 * @returns Decoded payload or null
 */
export function decodeToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.decode(token) as TokenPayload | null
    return decoded
  } catch {
    return null
  }
}

// =============================================================================
// Password Functions
// =============================================================================

/**
 * Hash a password using bcrypt
 * @param password - Plain text password
 * @returns Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

/**
 * Verify a password against a hash
 * @param password - Plain text password
 * @param hash - Hashed password to compare
 * @returns True if password matches
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/**
 * Verify password against environment variable
 * For simple single-user authentication
 * @param password - Plain text password to verify
 * @returns True if password matches AUTH_PASSWORD env var
 */
export function verifyEnvPassword(password: string): boolean {
  return password === env.AUTH_PASSWORD
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Extract Bearer token from Authorization header
 * @param authHeader - Authorization header value
 * @returns Token string or null if not found
 */
export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null

  const parts = authHeader.split(' ')
  const scheme = parts[0]
  const token = parts[1]

  if (parts.length !== 2 || !scheme || scheme.toLowerCase() !== 'bearer' || !token) {
    return null
  }

  return token
}

/**
 * Calculate token expiration date
 * @param expiresInSeconds - Expiration time in seconds (default: 7 days)
 * @returns Expiration date as ISO string
 */
export function calculateExpirationDate(expiresInSeconds: number = DEFAULT_TOKEN_EXPIRY_SECONDS): string {
  const now = Date.now()
  const msToAdd = expiresInSeconds * 1000
  return new Date(now + msToAdd).toISOString()
}

export default {
  generateToken,
  verifyToken,
  decodeToken,
  hashPassword,
  verifyPassword,
  verifyEnvPassword,
  extractBearerToken,
  calculateExpirationDate,
}
