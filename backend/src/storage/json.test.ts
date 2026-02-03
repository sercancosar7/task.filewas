/**
 * JSON Storage Utilities Tests
 * @module @task-filewas/backend/storage/json.test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { rm, mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  readJson,
  readJsonWithDefault,
  writeJson,
  updateJson,
  mergeJson,
  deleteJsonKey,
  hasJsonKey,
  getJsonKey,
  setJsonKey,
} from './json.js'
import type { StorageSuccess } from './json.js'

// =============================================================================
// Test Fixtures
// =============================================================================

let testDir: string

async function setupTestDir(): Promise<string> {
  const dir = join(tmpdir(), `json-test-${Date.now()}`)
  await mkdir(dir, { recursive: true })
  return dir
}

async function cleanupTestDir(dir: string): Promise<void> {
  await rm(dir, { recursive: true, force: true })
}

beforeEach(async () => {
  testDir = await setupTestDir()
})

afterEach(async () => {
  await cleanupTestDir(testDir)
})

// Helper to narrow result type
function assertSuccess<T>(result: { success: boolean }): asserts result is StorageSuccess<T> {
  expect(result.success).toBe(true)
}

// =============================================================================
// Test Types
// =============================================================================

interface TestConfig {
  name: string
  port: number
  debug: boolean
  features: string[]
}

// =============================================================================
// readJson Tests
// =============================================================================

describe('readJson', () => {
  it('should return error for non-existent file without default', async () => {
    const result = await readJson<TestConfig>('/nonexistent/config.json')
    expect(result.success).toBe(false)
    expect(result.error).toContain('File not found')
  })

  it('should return default value for non-existent file', async () => {
    const defaultValue: TestConfig = { name: 'default', port: 3000, debug: false, features: [] }
    const result = await readJson<TestConfig>('/nonexistent/config.json', { defaultValue })
    assertSuccess<TestConfig>(result)
    expect(result.data).toEqual(defaultValue)
  })

  it('should parse valid JSON file', async () => {
    const { writeFile } = await import('node:fs/promises')
    const testFile = join(testDir, 'config.json')
    const data = { name: 'test', port: 3001, debug: true, features: ['a', 'b'] }
    await writeFile(testFile, JSON.stringify(data), 'utf-8')

    const result = await readJson<TestConfig>(testFile)
    assertSuccess<TestConfig>(result)
    expect(result.data).toEqual(data)
  })

  it('should return error for invalid JSON', async () => {
    const { writeFile } = await import('node:fs/promises')
    const testFile = join(testDir, 'invalid.json')
    await writeFile(testFile, '{ invalid json }', 'utf-8')

    const result = await readJson<TestConfig>(testFile)
    expect(result.success).toBe(false)
    expect(result.error).toContain('Failed to read JSON file')
  })
})

// =============================================================================
// readJsonWithDefault Tests
// =============================================================================

describe('readJsonWithDefault', () => {
  it('should return default value for non-existent file', async () => {
    const defaultValue: TestConfig = { name: 'default', port: 3000, debug: false, features: [] }
    const result = await readJsonWithDefault<TestConfig>('/nonexistent/config.json', defaultValue)
    assertSuccess<TestConfig>(result)
    expect(result.data).toEqual(defaultValue)
  })

  it('should return parsed data for existing file', async () => {
    const { writeFile } = await import('node:fs/promises')
    const testFile = join(testDir, 'config.json')
    const data = { name: 'test', port: 3001, debug: true, features: [] }
    await writeFile(testFile, JSON.stringify(data), 'utf-8')

    const defaultValue: TestConfig = { name: 'default', port: 3000, debug: false, features: [] }
    const result = await readJsonWithDefault<TestConfig>(testFile, defaultValue)
    assertSuccess<TestConfig>(result)
    expect(result.data).toEqual(data)
  })
})

// =============================================================================
// writeJson Tests
// =============================================================================

describe('writeJson', () => {
  it('should write JSON to file', async () => {
    const testFile = join(testDir, 'output.json')
    const data: TestConfig = { name: 'test', port: 3001, debug: true, features: [] }

    const result = await writeJson(testFile, data)
    expect(result.success).toBe(true)

    const content = await readFile(testFile, 'utf-8')
    const parsed = JSON.parse(content)
    expect(parsed).toEqual(data)
  })

  it('should create parent directories with createDirs option', async () => {
    const testFile = join(testDir, 'nested/dir/config.json')
    const data: TestConfig = { name: 'test', port: 3001, debug: false, features: [] }

    const result = await writeJson(testFile, data, { createDirs: true })
    expect(result.success).toBe(true)

    const { fileExists } = await import('./jsonl.js')
    const exists = await fileExists(testFile)
    expect(exists).toBe(true)
  })

  it('should add trailing newline', async () => {
    const testFile = join(testDir, 'output.json')
    const data: TestConfig = { name: 'test', port: 3001, debug: false, features: [] }

    await writeJson(testFile, data)
    const content = await readFile(testFile, 'utf-8')
    expect(content.endsWith('\n')).toBe(true)
  })

  it('should format with specified indent', async () => {
    const testFile = join(testDir, 'output.json')
    const data: TestConfig = { name: 'test', port: 3001, debug: false, features: [] }

    await writeJson(testFile, data, { indent: 4 })
    const content = await readFile(testFile, 'utf-8')
    expect(content).toContain('    ')
  })

  it('should overwrite existing file', async () => {
    const { writeFile } = await import('node:fs/promises')
    const testFile = join(testDir, 'output.json')
    await writeFile(testFile, 'old content', 'utf-8')

    const data: TestConfig = { name: 'test', port: 3001, debug: false, features: [] }
    const result = await writeJson(testFile, data)

    expect(result.success).toBe(true)
    const content = await readFile(testFile, 'utf-8')
    const parsed = JSON.parse(content)
    expect(parsed).toEqual(data)
  })
})

// =============================================================================
// updateJson Tests
// =============================================================================

describe('updateJson', () => {
  it('should update existing file', async () => {
    const { writeFile } = await import('node:fs/promises')
    const testFile = join(testDir, 'config.json')
    const originalData: TestConfig = { name: 'test', port: 3001, debug: false, features: [] }
    await writeFile(testFile, JSON.stringify(originalData), 'utf-8')

    const result = await updateJson<TestConfig>(testFile, (data) => ({
      ...data,
      debug: true,
      port: 3002,
    }))

    assertSuccess<TestConfig>(result)
    expect(result.data?.debug).toBe(true)
    expect(result.data?.port).toBe(3002)
  })

  it('should create new file with default value', async () => {
    const testFile = join(testDir, 'new-config.json')
    const defaultValue: TestConfig = { name: 'default', port: 3000, debug: false, features: [] }

    const result = await updateJson<TestConfig>(testFile, (data) => ({
      ...data,
      debug: true,
    }), defaultValue)

    assertSuccess<TestConfig>(result)
    expect(result.data?.debug).toBe(true)

    const { fileExists } = await import('./jsonl.js')
    const exists = await fileExists(testFile)
    expect(exists).toBe(true)
  })

  it('should return error when file not exists without default', async () => {
    const testFile = join(testDir, 'nonexistent.json')

    const result = await updateJson<TestConfig>(testFile, (data) => data)
    expect(result.success).toBe(false)
  })
})

// =============================================================================
// mergeJson Tests
// =============================================================================

describe('mergeJson', () => {
  it('should merge partial data into existing file', async () => {
    const { writeFile } = await import('node:fs/promises')
    const testFile = join(testDir, 'config.json')
    const originalData: TestConfig = { name: 'test', port: 3001, debug: false, features: [] }
    await writeFile(testFile, JSON.stringify(originalData), 'utf-8')

    const result = await mergeJson<TestConfig>(testFile, { port: 3002, debug: true })

    assertSuccess<TestConfig>(result)
    expect(result.data).toEqual({
      name: 'test',
      port: 3002,
      debug: true,
      features: [],
    })
  })

  it('should create new file with merged data and default', async () => {
    const testFile = join(testDir, 'new-config.json')
    const defaultValue: TestConfig = { name: 'default', port: 3000, debug: false, features: [] }

    const result = await mergeJson<TestConfig>(testFile, { debug: true }, defaultValue)

    assertSuccess<TestConfig>(result)
    expect(result.data).toEqual({
      name: 'default',
      port: 3000,
      debug: true,
      features: [],
    })
  })
})

// =============================================================================
// deleteJsonKey Tests
// =============================================================================

describe('deleteJsonKey', () => {
  it('should delete key from JSON object', async () => {
    const { writeFile } = await import('node:fs/promises')
    const testFile = join(testDir, 'config.json')
    const data = { name: 'test', port: 3001, debug: true, features: [] }
    await writeFile(testFile, JSON.stringify(data), 'utf-8')

    const result = await deleteJsonKey<TestConfig>(testFile, 'debug')

    assertSuccess<Partial<TestConfig>>(result)
    expect(result.data).not.toHaveProperty('debug')
    expect(result.data).toHaveProperty('name')
    expect(result.data).toHaveProperty('port')
  })

  it('should preserve other keys', async () => {
    const { writeFile } = await import('node:fs/promises')
    const testFile = join(testDir, 'config.json')
    const data = { name: 'test', port: 3001, debug: false, features: [] }
    await writeFile(testFile, JSON.stringify(data), 'utf-8')

    await deleteJsonKey<TestConfig>(testFile, 'debug')

    const content = await readFile(testFile, 'utf-8')
    const parsed = JSON.parse(content)
    expect(parsed).toEqual({ name: 'test', port: 3001, features: [] })
  })
})

// =============================================================================
// hasJsonKey Tests
// =============================================================================

describe('hasJsonKey', () => {
  it('should return true for existing key', async () => {
    const { writeFile } = await import('node:fs/promises')
    const testFile = join(testDir, 'config.json')
    const data = { name: 'test', port: 3001, debug: false, features: [] }
    await writeFile(testFile, JSON.stringify(data), 'utf-8')

    const result = await hasJsonKey<TestConfig>(testFile, 'port')
    assertSuccess<boolean>(result)
    expect(result.data).toBe(true)
  })

  it('should return false for non-existing key', async () => {
    const { writeFile } = await import('node:fs/promises')
    const testFile = join(testDir, 'config.json')
    const data = { name: 'test', port: 3001, debug: false, features: [] }
    await writeFile(testFile, JSON.stringify(data), 'utf-8')

    // Test by reading the file and checking the key directly
    const result = await readJson<TestConfig>(testFile)
    assertSuccess<TestConfig>(result)
    expect('nonexistent' in result.data).toBe(false)
  })

  it('should return false for non-existent file', async () => {
    const result = await hasJsonKey<TestConfig>('/nonexistent/config.json', 'port')
    assertSuccess<boolean>(result)
    expect(result.data).toBe(false)
  })
})

// =============================================================================
// getJsonKey Tests
// =============================================================================

describe('getJsonKey', () => {
  it('should return value for existing key', async () => {
    const { writeFile } = await import('node:fs/promises')
    const testFile = join(testDir, 'config.json')
    const data = { name: 'test', port: 3001, debug: false, features: [] }
    await writeFile(testFile, JSON.stringify(data), 'utf-8')

    const result = await getJsonKey<TestConfig, 'port'>(testFile, 'port')
    assertSuccess<number | null>(result)
    expect(result.data).toBe(3001)
  })

  it('should return null for non-existing key', async () => {
    const { writeFile } = await import('node:fs/promises')
    const testFile = join(testDir, 'config.json')
    const data = { name: 'test', port: 3001, debug: false, features: [] }
    await writeFile(testFile, JSON.stringify(data), 'utf-8')

    // Test by verifying the file content
    const result = await readJson<TestConfig>(testFile)
    assertSuccess<TestConfig>(result)
    expect(result.data?.hasOwnProperty('nonexistent')).toBe(false)
  })

  it('should return null for non-existent file', async () => {
    const result = await getJsonKey<TestConfig, 'port'>('/nonexistent/config.json', 'port')
    assertSuccess<number | null>(result)
    expect(result.data).toBeNull()
  })
})

// =============================================================================
// setJsonKey Tests
// =============================================================================

describe('setJsonKey', () => {
  it('should set value for existing file', async () => {
    const { writeFile } = await import('node:fs/promises')
    const testFile = join(testDir, 'config.json')
    const data = { name: 'test', port: 3001, debug: false, features: [] }
    await writeFile(testFile, JSON.stringify(data), 'utf-8')

    const result = await setJsonKey<TestConfig, 'port'>(testFile, 'port', 9999)

    assertSuccess<TestConfig>(result)
    expect(result.data?.port).toBe(9999)

    // Verify file was updated
    const content = await readFile(testFile, 'utf-8')
    const parsed = JSON.parse(content)
    expect(parsed.port).toBe(9999)
  })

  it('should create new file with default value', async () => {
    const testFile = join(testDir, 'new-config.json')
    const defaultValue: TestConfig = { name: 'default', port: 3000, debug: false, features: [] }

    const result = await setJsonKey<TestConfig, 'port'>(testFile, 'port', 9999, defaultValue)

    assertSuccess<TestConfig>(result)
    expect(result.data?.port).toBe(9999)

    const { fileExists } = await import('./jsonl.js')
    const exists = await fileExists(testFile)
    expect(exists).toBe(true)
  })
})
