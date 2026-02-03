/**
 * Environment Configuration
 * Loads and validates environment variables
 */

import * as dotenv from 'dotenv'
import { resolve } from 'node:path'

// Load .env file from current working directory (backend root)
// When running via npm scripts, cwd is always the package root
// override: true ensures .env values take precedence over existing env vars
dotenv.config({
  path: resolve(process.cwd(), '.env'),
  override: true
})

// Environment variable types
interface EnvConfig {
  PORT: number
  JWT_SECRET: string
  AUTH_PASSWORD: string
  DATA_PATH: string
  NODE_ENV: 'development' | 'production' | 'test'
  CORS_ORIGIN: string
  LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error'
}

// Default values
const defaults = {
  PORT: 3001,
  NODE_ENV: 'development',
  CORS_ORIGIN: 'http://localhost:3000',
  LOG_LEVEL: 'info',
  DATA_PATH: './data',
} as const

// Parse and validate environment variables
function getEnvString(key: string, defaultValue?: string): string {
  const value = process.env[key]
  if (value !== undefined) return value
  if (defaultValue !== undefined) return defaultValue
  throw new Error(`Missing required environment variable: ${key}`)
}

function getEnvNumber(key: string, defaultValue?: number): number {
  const value = process.env[key]
  if (value !== undefined) {
    const parsed = parseInt(value, 10)
    if (isNaN(parsed)) {
      throw new Error(`Environment variable ${key} must be a number, got: ${value}`)
    }
    return parsed
  }
  if (defaultValue !== undefined) return defaultValue
  throw new Error(`Missing required environment variable: ${key}`)
}

function validateNodeEnv(value: string): 'development' | 'production' | 'test' {
  if (value === 'development' || value === 'production' || value === 'test') {
    return value
  }
  throw new Error(`Invalid NODE_ENV: ${value}. Must be development, production, or test`)
}

function validateLogLevel(value: string): 'debug' | 'info' | 'warn' | 'error' {
  if (value === 'debug' || value === 'info' || value === 'warn' || value === 'error') {
    return value
  }
  throw new Error(`Invalid LOG_LEVEL: ${value}. Must be debug, info, warn, or error`)
}

// Export validated config
export const env: EnvConfig = {
  PORT: getEnvNumber('PORT', defaults.PORT),
  JWT_SECRET: getEnvString('JWT_SECRET'),
  AUTH_PASSWORD: getEnvString('AUTH_PASSWORD', 'admin'),
  DATA_PATH: getEnvString('DATA_PATH', defaults.DATA_PATH),
  NODE_ENV: validateNodeEnv(getEnvString('NODE_ENV', defaults.NODE_ENV)),
  CORS_ORIGIN: getEnvString('CORS_ORIGIN', defaults.CORS_ORIGIN),
  LOG_LEVEL: validateLogLevel(getEnvString('LOG_LEVEL', defaults.LOG_LEVEL)),
}

// Helper to check if we're in production
export const isProduction = env.NODE_ENV === 'production'

// Helper to check if we're in development
export const isDevelopment = env.NODE_ENV === 'development'

// Helper to check if we're in test
export const isTest = env.NODE_ENV === 'test'

export default env
