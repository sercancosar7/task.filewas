/**
 * JSONL Storage Utilities Tests
 * @module @task-filewas/backend/storage/jsonl.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { rm, mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  readJsonl,
  readJsonlHeader,
  readJsonlTail,
  countJsonlLines,
  writeJsonl,
  appendJsonl,
  appendJsonlBatch,
  updateJsonl,
  deleteFromJsonl,
  findInJsonl,
  filterJsonl,
  resolveDataPath,
  fileExists,
  ensureDir,
} from './jsonl.js'
import type { StorageSuccess } from './jsonl.js'

// Test data interfaces
interface TestItem {
  id: string
  name: string
  value: number
}

interface TestEntry {
  type: string
  ts: string
  data: unknown
}

// Helper to narrow result type
function assertSuccess<T>(result: { success: boolean }): asserts result is StorageSuccess<T> {
  expect(result.success).toBe(true)
}

// =============================================================================
// Test Fixtures
// =============================================================================

let testDir: string

async function setupTestDir(): Promise<string> {
  const dir = join(tmpdir(), `jsonl-test-${Date.now()}`)
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

// =============================================================================
// resolveDataPath Tests
// =============================================================================

describe('resolveDataPath', () => {
  it('should resolve relative path to absolute', () => {
    const result = resolveDataPath('test/file.jsonl')
    expect(result).toContain('test/file.jsonl')
  })

  it('should handle absolute paths', () => {
    const absolutePath = '/var/data/test.jsonl'
    const result = resolveDataPath(absolutePath)
    expect(result).toContain('test.jsonl')
  })
})

// =============================================================================
// fileExists Tests
// =============================================================================

describe('fileExists', () => {
  it('should return false for non-existent file', async () => {
    const result = await fileExists('/nonexistent/file.jsonl')
    expect(result).toBe(false)
  })

  it('should return true for existing file', async () => {
    const { writeFile } = await import('node:fs/promises')
    const testFile = join(testDir, 'test.jsonl')
    await writeFile(testFile, '{}')
    const result = await fileExists(testFile)
    expect(result).toBe(true)
  })
})

// =============================================================================
// ensureDir Tests
// =============================================================================

describe('ensureDir', () => {
  it('should create directory if not exists', async () => {
    const newDir = join(testDir, 'new/nested/dir')
    await ensureDir(newDir)
    const exists = await fileExists(newDir)
    expect(exists).toBe(true)
  })

  it('should not error if directory already exists', async () => {
    const existingDir = testDir
    await expect(ensureDir(existingDir)).resolves.toBeUndefined()
  })
})

// =============================================================================
// readJsonl Tests
// =============================================================================

describe('readJsonl', () => {
  it('should return empty array for non-existent file', async () => {
    const result = await readJsonl<TestItem>('/nonexistent/file.jsonl')
    assertSuccess<TestItem[]>(result)
    expect(result.data).toEqual([])
  })

  it('should parse valid JSONL file', async () => {
    const { writeFile } = await import('node:fs/promises')
    const testFile = join(testDir, 'test.jsonl')
    const content = '{"id":"1","name":"first","value":10}\n{"id":"2","name":"second","value":20}\n'
    await writeFile(testFile, content, 'utf-8')

    const result = await readJsonl<TestItem>(testFile)
    assertSuccess<TestItem[]>(result)
    expect(result.data).toHaveLength(2)
    expect(result.data[0]).toEqual({ id: '1', name: 'first', value: 10 })
  })

  it('should handle empty lines', async () => {
    const { writeFile } = await import('node:fs/promises')
    const testFile = join(testDir, 'test.jsonl')
    const content = '{"id":"1","name":"first","value":10}\n\n{"id":"2","name":"second","value":20}\n'
    await writeFile(testFile, content, 'utf-8')

    const result = await readJsonl<TestItem>(testFile)
    assertSuccess<TestItem[]>(result)
    expect(result.data).toHaveLength(2)
  })

  it('should skip malformed lines', async () => {
    const { writeFile } = await import('node:fs/promises')
    const testFile = join(testDir, 'test.jsonl')
    const content = '{"id":"1","name":"first","value":10}\ninvalid json\n{"id":"2","name":"second","value":20}\n'
    await writeFile(testFile, content, 'utf-8')

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const result = await readJsonl<TestItem>(testFile)
    assertSuccess<TestItem[]>(result)
    expect(result.data).toHaveLength(2)

    warnSpy.mockRestore()
  })

  it('should apply filter option', async () => {
    const { writeFile } = await import('node:fs/promises')
    const testFile = join(testDir, 'test.jsonl')
    const content = '{"id":"1","name":"first","value":10}\n{"id":"2","name":"second","value":20}\n'
    await writeFile(testFile, content, 'utf-8')

    const result = await readJsonl<TestItem>(testFile, {
      filter: (item) => item.value > 15,
    })
    assertSuccess<TestItem[]>(result)
    expect(result.data).toHaveLength(1)
    expect(result.data[0].id).toBe('2')
  })

  it('should apply limit option', async () => {
    const { writeFile } = await import('node:fs/promises')
    const testFile = join(testDir, 'test.jsonl')
    const content = '{"id":"1","name":"first","value":10}\n{"id":"2","name":"second","value":20}\n{"id":"3","name":"third","value":30}\n'
    await writeFile(testFile, content, 'utf-8')

    const result = await readJsonl<TestItem>(testFile, { limit: 2 })
    assertSuccess<TestItem[]>(result)
    expect(result.data).toHaveLength(2)
  })

  it('should apply offset option', async () => {
    const { writeFile } = await import('node:fs/promises')
    const testFile = join(testDir, 'test.jsonl')
    const content = '{"id":"1","name":"first","value":10}\n{"id":"2","name":"second","value":20}\n{"id":"3","name":"third","value":30}\n'
    await writeFile(testFile, content, 'utf-8')

    const result = await readJsonl<TestItem>(testFile, { offset: 1 })
    assertSuccess<TestItem[]>(result)
    expect(result.data).toHaveLength(2)
    expect(result.data[0].id).toBe('2')
  })

  it('should reverse order when reverse option is true', async () => {
    const { writeFile } = await import('node:fs/promises')
    const testFile = join(testDir, 'test.jsonl')
    const content = '{"id":"1","name":"first","value":10}\n{"id":"2","name":"second","value":20}\n'
    await writeFile(testFile, content, 'utf-8')

    const result = await readJsonl<TestItem>(testFile, { reverse: true })
    assertSuccess<TestItem[]>(result)
    expect(result.data[0].id).toBe('2')
    expect(result.data[1].id).toBe('1')
  })
})

// =============================================================================
// readJsonlHeader Tests
// =============================================================================

describe('readJsonlHeader', () => {
  it('should return first line as header', async () => {
    const { writeFile } = await import('node:fs/promises')
    const testFile = join(testDir, 'test.jsonl')
    const content = '{"type":"header","ts":"2024-01-01","data":"first"}\n{"type":"entry","ts":"2024-01-02","data":"second"}\n'
    await writeFile(testFile, content, 'utf-8')

    const result = await readJsonlHeader<TestEntry>(testFile)
    assertSuccess<TestEntry | null>(result)
    expect(result.data).toEqual({
      type: 'header',
      ts: '2024-01-01',
      data: 'first',
    })
  })

  it('should return null for empty file', async () => {
    const { writeFile } = await import('node:fs/promises')
    const testFile = join(testDir, 'test.jsonl')
    await writeFile(testFile, '', 'utf-8')

    const result = await readJsonlHeader<TestEntry>(testFile)
    assertSuccess<TestEntry | null>(result)
    expect(result.data).toBeNull()
  })
})

// =============================================================================
// readJsonlTail Tests
// =============================================================================

describe('readJsonlTail', () => {
  it('should return last N entries in reverse order', async () => {
    const { writeFile } = await import('node:fs/promises')
    const testFile = join(testDir, 'test.jsonl')
    const content = [
      '{"id":"1","name":"first"}',
      '{"id":"2","name":"second"}',
      '{"id":"3","name":"third"}',
      '{"id":"4","name":"fourth"}',
      '{"id":"5","name":"fifth"}',
    ].join('\n') + '\n'
    await writeFile(testFile, content, 'utf-8')

    const result = await readJsonlTail<TestItem>(testFile, 2)
    assertSuccess<TestItem[]>(result)
    expect(result.data).toHaveLength(2)
    expect(result.data[0].id).toBe('5')
    expect(result.data[1].id).toBe('4')
  })
})

// =============================================================================
// countJsonlLines Tests
// =============================================================================

describe('countJsonlLines', () => {
  it('should return 0 for non-existent file', async () => {
    const result = await countJsonlLines('/nonexistent/file.jsonl')
    assertSuccess<number>(result)
    expect(result.data).toBe(0)
  })

  it('should count valid JSON lines', async () => {
    const { writeFile } = await import('node:fs/promises')
    const testFile = join(testDir, 'test.jsonl')
    const content = '{"id":"1"}\ninvalid\n{"id":"2"}\n\n{"id":"3"}\n'
    await writeFile(testFile, content, 'utf-8')

    const result = await countJsonlLines(testFile)
    assertSuccess<number>(result)
    expect(result.data).toBe(3)
  })
})

// =============================================================================
// writeJsonl Tests
// =============================================================================

describe('writeJsonl', () => {
  it('should write items to JSONL file', async () => {
    const testFile = join(testDir, 'test.jsonl')
    const items: TestItem[] = [
      { id: '1', name: 'first', value: 10 },
      { id: '2', name: 'second', value: 20 },
    ]

    const result = await writeJsonl(testFile, items)
    expect(result.success).toBe(true)

    const content = await readFile(testFile, 'utf-8')
    const lines = content.trim().split('\n')
    expect(lines).toHaveLength(2)
    expect(JSON.parse(lines[0])).toEqual(items[0])
    expect(JSON.parse(lines[1])).toEqual(items[1])
  })

  it('should create parent directories with createDirs option', async () => {
    const testFile = join(testDir, 'nested/dir/test.jsonl')
    const items: TestItem[] = [{ id: '1', name: 'first', value: 10 }]

    const result = await writeJsonl(testFile, items, { createDirs: true })
    expect(result.success).toBe(true)

    const exists = await fileExists(testFile)
    expect(exists).toBe(true)
  })

  it('should add trailing newline', async () => {
    const testFile = join(testDir, 'test.jsonl')
    const items: TestItem[] = [{ id: '1', name: 'first', value: 10 }]

    await writeJsonl(testFile, items)
    const content = await readFile(testFile, 'utf-8')
    expect(content.endsWith('\n')).toBe(true)
  })

  it('should handle empty array', async () => {
    const testFile = join(testDir, 'test.jsonl')
    const result = await writeJsonl(testFile, [])
    expect(result.success).toBe(true)

    const content = await readFile(testFile, 'utf-8')
    // Empty array results in empty string (no newline for empty content)
    expect(content).toBe('')
  })
})

// =============================================================================
// appendJsonl Tests
// =============================================================================

describe('appendJsonl', () => {
  it('should append item to existing file', async () => {
    const { writeFile } = await import('node:fs/promises')
    const testFile = join(testDir, 'test.jsonl')
    await writeFile(testFile, '{"id":"1","name":"first"}\n', 'utf-8')

    const result = await appendJsonl(testFile, { id: '2', name: 'second', value: 20 })
    expect(result.success).toBe(true)

    const content = await readFile(testFile, 'utf-8')
    const lines = content.trim().split('\n')
    expect(lines).toHaveLength(2)
    expect(JSON.parse(lines[1])).toEqual({ id: '2', name: 'second', value: 20 })
  })

  it('should create new file if not exists', async () => {
    const testFile = join(testDir, 'test.jsonl')
    const item: TestItem = { id: '1', name: 'first', value: 10 }

    const result = await appendJsonl(testFile, item)
    expect(result.success).toBe(true)

    const exists = await fileExists(testFile)
    expect(exists).toBe(true)
  })
})

// =============================================================================
// appendJsonlBatch Tests
// =============================================================================

describe('appendJsonlBatch', () => {
  it('should append multiple items', async () => {
    const { writeFile } = await import('node:fs/promises')
    const testFile = join(testDir, 'test.jsonl')
    await writeFile(testFile, '{"id":"0","name":"zero"}\n', 'utf-8')

    const items: TestItem[] = [
      { id: '1', name: 'first', value: 10 },
      { id: '2', name: 'second', value: 20 },
    ]

    const result = await appendJsonlBatch(testFile, items)
    expect(result.success).toBe(true)

    const readResult = await readJsonl<TestItem>(testFile)
    assertSuccess<TestItem[]>(readResult)
    expect(readResult.data).toHaveLength(3)
  })

  it('should return success for empty array', async () => {
    const testFile = join(testDir, 'test.jsonl')
    const result = await appendJsonlBatch(testFile, [])
    expect(result.success).toBe(true)
  })
})

// =============================================================================
// updateJsonl Tests
// =============================================================================

describe('updateJsonl', () => {
  it('should update matching lines', async () => {
    const { writeFile } = await import('node:fs/promises')
    const testFile = join(testDir, 'test.jsonl')
    const content = [
      '{"id":"1","name":"first","value":10}',
      '{"id":"2","name":"second","value":20}',
      '{"id":"3","name":"third","value":30}',
    ].join('\n') + '\n'
    await writeFile(testFile, content, 'utf-8')

    const result = await updateJsonl<TestItem>(
      testFile,
      (item) => item.id === '2',
      (item) => ({ ...item, value: 999 })
    )

    expect(result.success).toBe(true)
    assertSuccess<number>(result)
    expect(result.data).toBe(1)

    const readResult = await readJsonl<TestItem>(testFile)
    assertSuccess<TestItem[]>(readResult)
    const updated = readResult.data.find((i) => i.id === '2')
    expect(updated?.value).toBe(999)
  })

  it('should return 0 when no matches found', async () => {
    const { writeFile } = await import('node:fs/promises')
    const testFile = join(testDir, 'test.jsonl')
    await writeFile(testFile, '{"id":"1","name":"first"}\n', 'utf-8')

    const result = await updateJsonl<TestItem>(
      testFile,
      (item) => item.id === '999',
      (item) => ({ ...item, value: 999 })
    )

    expect(result.success).toBe(true)
    assertSuccess<number>(result)
    expect(result.data).toBe(0)
  })
})

// =============================================================================
// deleteFromJsonl Tests
// =============================================================================

describe('deleteFromJsonl', () => {
  it('should delete matching lines', async () => {
    const { writeFile } = await import('node:fs/promises')
    const testFile = join(testDir, 'test.jsonl')
    const content = [
      '{"id":"1","name":"first","value":10}',
      '{"id":"2","name":"second","value":20}',
      '{"id":"3","name":"third","value":30}',
    ].join('\n') + '\n'
    await writeFile(testFile, content, 'utf-8')

    const result = await deleteFromJsonl<TestItem>(testFile, (item) => item.id === '2')

    expect(result.success).toBe(true)
    assertSuccess<number>(result)
    expect(result.data).toBe(1)

    const readResult = await readJsonl<TestItem>(testFile)
    assertSuccess<TestItem[]>(readResult)
    expect(readResult.data).toHaveLength(2)
    expect(readResult.data.find((i) => i.id === '2')).toBeUndefined()
  })

  it('should return 0 when no matches found', async () => {
    const { writeFile } = await import('node:fs/promises')
    const testFile = join(testDir, 'test.jsonl')
    await writeFile(testFile, '{"id":"1","name":"first"}\n', 'utf-8')

    const result = await deleteFromJsonl<TestItem>(testFile, (item) => item.id === '999')

    expect(result.success).toBe(true)
    assertSuccess<number>(result)
    expect(result.data).toBe(0)
  })
})

// =============================================================================
// findInJsonl Tests
// =============================================================================

describe('findInJsonl', () => {
  it('should return first matching item', async () => {
    const { writeFile } = await import('node:fs/promises')
    const testFile = join(testDir, 'test.jsonl')
    const content = [
      '{"id":"1","name":"first","value":10}',
      '{"id":"2","name":"second","value":20}',
      '{"id":"3","name":"third","value":30}',
    ].join('\n') + '\n'
    await writeFile(testFile, content, 'utf-8')

    const result = await findInJsonl<TestItem>(testFile, (item) => item.value > 15)
    assertSuccess<TestItem | null>(result)
    expect(result.data).toEqual({ id: '2', name: 'second', value: 20 })
  })

  it('should return null when no match found', async () => {
    const { writeFile } = await import('node:fs/promises')
    const testFile = join(testDir, 'test.jsonl')
    await writeFile(testFile, '{"id":"1","name":"first"}\n', 'utf-8')

    const result = await findInJsonl<TestItem>(testFile, (item) => item.id === '999')
    assertSuccess<TestItem | null>(result)
    expect(result.data).toBeNull()
  })
})

// =============================================================================
// filterJsonl Tests
// =============================================================================

describe('filterJsonl', () => {
  it('should return all matching items', async () => {
    const { writeFile } = await import('node:fs/promises')
    const testFile = join(testDir, 'test.jsonl')
    const content = [
      '{"id":"1","name":"first","value":10}',
      '{"id":"2","name":"second","value":20}',
      '{"id":"3","name":"third","value":30}',
      '{"id":"4","name":"fourth","value":40}',
    ].join('\n') + '\n'
    await writeFile(testFile, content, 'utf-8')

    const result = await filterJsonl<TestItem>(testFile, (item) => item.value >= 20)
    assertSuccess<TestItem[]>(result)
    expect(result.data).toHaveLength(3)
  })

  it('should return empty array when no matches', async () => {
    const { writeFile } = await import('node:fs/promises')
    const testFile = join(testDir, 'test.jsonl')
    await writeFile(testFile, '{"id":"1","name":"first"}\n', 'utf-8')

    const result = await filterJsonl<TestItem>(testFile, (item) => item.value > 100)
    assertSuccess<TestItem[]>(result)
    expect(result.data).toEqual([])
  })
})
