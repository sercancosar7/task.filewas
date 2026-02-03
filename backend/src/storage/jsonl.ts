/**
 * JSONL Storage Utilities
 * Read, write, and append operations for JSONL (JSON Lines) files
 * @module @task-filewas/backend/storage/jsonl
 */

import { readFile, writeFile, appendFile, mkdir, access, constants } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { env } from '../config/env.js'

// =============================================================================
// Types
// =============================================================================

/**
 * Successful result wrapper
 */
export interface StorageSuccess<T> {
  success: true
  data: T
}

/**
 * Failed result wrapper
 */
export interface StorageError {
  success: false
  error: string
}

/**
 * Result wrapper for storage operations
 */
export type StorageResult<T> = StorageSuccess<T> | StorageError

/**
 * Options for reading JSONL files
 */
export interface JsonlReadOptions<T> {
  /** Filter function to select specific lines */
  filter?: (item: T, index: number) => boolean
  /** Maximum number of lines to read */
  limit?: number
  /** Number of lines to skip from the beginning */
  offset?: number
  /** Read from end of file (for most recent entries) */
  reverse?: boolean
}

/**
 * Options for writing JSONL files
 */
export interface JsonlWriteOptions {
  /** Create parent directories if they don't exist */
  createDirs?: boolean
  /** Overwrite existing file */
  overwrite?: boolean
}

// =============================================================================
// Path Resolution
// =============================================================================

/**
 * Resolve a path relative to the data directory
 * @param relativePath Path relative to data directory
 * @returns Absolute path
 */
export function resolveDataPath(relativePath: string): string {
  // env.DATA_PATH could be relative (./data) or absolute (/var/data)
  const dataPath = env.DATA_PATH.startsWith('/')
    ? env.DATA_PATH
    : resolve(process.cwd(), env.DATA_PATH)

  return resolve(dataPath, relativePath)
}

/**
 * Check if a file exists
 * @param filePath Absolute path to file
 * @returns True if file exists and is readable
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.R_OK)
    return true
  } catch {
    return false
  }
}

/**
 * Ensure a directory exists, creating it if necessary
 * @param dirPath Directory path
 */
export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await mkdir(dirPath, { recursive: true })
  } catch (error) {
    // Ignore if directory already exists
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw error
    }
  }
}

// =============================================================================
// JSONL Read Operations
// =============================================================================

/**
 * Read all lines from a JSONL file
 * @param filePath Absolute path to JSONL file
 * @param options Read options
 * @returns Array of parsed objects
 */
export async function readJsonl<T>(
  filePath: string,
  options: JsonlReadOptions<T> = {}
): Promise<StorageResult<T[]>> {
  try {
    const exists = await fileExists(filePath)
    if (!exists) {
      return { success: true, data: [] }
    }

    const content = await readFile(filePath, 'utf-8')
    const lines = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)

    let items: T[] = []

    // Parse each line
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line) as T
        items.push(parsed)
      } catch {
        // Skip malformed lines but log for debugging
        console.warn(`[JSONL] Skipping malformed line: ${line.slice(0, 50)}...`)
      }
    }

    // Apply reverse if needed (before filtering to get "most recent")
    if (options.reverse) {
      items = items.reverse()
    }

    // Apply filter
    if (options.filter) {
      items = items.filter(options.filter)
    }

    // Apply offset
    if (options.offset && options.offset > 0) {
      items = items.slice(options.offset)
    }

    // Apply limit
    if (options.limit && options.limit > 0) {
      items = items.slice(0, options.limit)
    }

    return { success: true, data: items }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: `Failed to read JSONL file: ${message}` }
  }
}

/**
 * Read the first line (header) from a JSONL file
 * @param filePath Absolute path to JSONL file
 * @returns Parsed header object or undefined
 */
export async function readJsonlHeader<T>(filePath: string): Promise<StorageResult<T | null>> {
  const result = await readJsonl<T>(filePath, { limit: 1 })
  if (!result.success) {
    return { success: false, error: result.error }
  }
  return { success: true, data: result.data[0] ?? null }
}

/**
 * Read the last N lines from a JSONL file
 * @param filePath Absolute path to JSONL file
 * @param count Number of lines to read
 * @returns Array of parsed objects (most recent first)
 */
export async function readJsonlTail<T>(
  filePath: string,
  count: number
): Promise<StorageResult<T[]>> {
  return readJsonl<T>(filePath, { reverse: true, limit: count })
}

/**
 * Count lines in a JSONL file
 * @param filePath Absolute path to JSONL file
 * @returns Number of valid JSON lines
 */
export async function countJsonlLines(filePath: string): Promise<StorageResult<number>> {
  try {
    const exists = await fileExists(filePath)
    if (!exists) {
      return { success: true, data: 0 }
    }

    const content = await readFile(filePath, 'utf-8')
    const count = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => {
        if (line.length === 0) return false
        try {
          JSON.parse(line)
          return true
        } catch {
          return false
        }
      }).length

    return { success: true, data: count }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: `Failed to count JSONL lines: ${message}` }
  }
}

// =============================================================================
// JSONL Write Operations
// =============================================================================

/**
 * Write objects to a JSONL file (overwrites existing content)
 * @param filePath Absolute path to JSONL file
 * @param items Array of objects to write
 * @param options Write options
 */
export async function writeJsonl<T>(
  filePath: string,
  items: T[],
  options: JsonlWriteOptions = {}
): Promise<StorageResult<void>> {
  const { createDirs = true } = options

  try {
    // Ensure parent directory exists
    if (createDirs) {
      await ensureDir(dirname(filePath))
    }

    // Convert items to JSONL format
    const content = items
      .map(item => JSON.stringify(item))
      .join('\n')

    // Add trailing newline if content exists
    const finalContent = content.length > 0 ? content + '\n' : ''

    await writeFile(filePath, finalContent, 'utf-8')
    return { success: true, data: undefined }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: `Failed to write JSONL file: ${message}` }
  }
}

/**
 * Append a single object to a JSONL file
 * @param filePath Absolute path to JSONL file
 * @param item Object to append
 * @param options Write options
 */
export async function appendJsonl<T>(
  filePath: string,
  item: T,
  options: JsonlWriteOptions = {}
): Promise<StorageResult<void>> {
  const { createDirs = true } = options

  try {
    // Ensure parent directory exists
    if (createDirs) {
      await ensureDir(dirname(filePath))
    }

    const line = JSON.stringify(item) + '\n'
    await appendFile(filePath, line, 'utf-8')
    return { success: true, data: undefined }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: `Failed to append to JSONL file: ${message}` }
  }
}

/**
 * Append multiple objects to a JSONL file
 * @param filePath Absolute path to JSONL file
 * @param items Array of objects to append
 * @param options Write options
 */
export async function appendJsonlBatch<T>(
  filePath: string,
  items: T[],
  options: JsonlWriteOptions = {}
): Promise<StorageResult<void>> {
  const { createDirs = true } = options

  try {
    if (items.length === 0) {
      return { success: true, data: undefined }
    }

    // Ensure parent directory exists
    if (createDirs) {
      await ensureDir(dirname(filePath))
    }

    const content = items.map(item => JSON.stringify(item)).join('\n') + '\n'
    await appendFile(filePath, content, 'utf-8')
    return { success: true, data: undefined }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: `Failed to append batch to JSONL file: ${message}` }
  }
}

// =============================================================================
// JSONL Update Operations
// =============================================================================

/**
 * Update lines in a JSONL file based on a predicate
 * @param filePath Absolute path to JSONL file
 * @param predicate Function to identify lines to update
 * @param updater Function to update matching lines
 * @returns Number of updated lines
 */
export async function updateJsonl<T>(
  filePath: string,
  predicate: (item: T, index: number) => boolean,
  updater: (item: T) => T
): Promise<StorageResult<number>> {
  try {
    const readResult = await readJsonl<T>(filePath)
    if (!readResult.success) {
      return { success: false, error: readResult.error }
    }

    const items = readResult.data
    let updateCount = 0

    const updatedItems = items.map((item, index) => {
      if (predicate(item, index)) {
        updateCount++
        return updater(item)
      }
      return item
    })

    if (updateCount > 0) {
      const writeResult = await writeJsonl(filePath, updatedItems)
      if (!writeResult.success) {
        return { success: false, error: writeResult.error }
      }
    }

    return { success: true, data: updateCount }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: `Failed to update JSONL file: ${message}` }
  }
}

/**
 * Delete lines from a JSONL file based on a predicate
 * @param filePath Absolute path to JSONL file
 * @param predicate Function to identify lines to delete (return true to delete)
 * @returns Number of deleted lines
 */
export async function deleteFromJsonl<T>(
  filePath: string,
  predicate: (item: T, index: number) => boolean
): Promise<StorageResult<number>> {
  try {
    const readResult = await readJsonl<T>(filePath)
    if (!readResult.success) {
      return { success: false, error: readResult.error }
    }

    const items = readResult.data
    const filteredItems = items.filter((item, index) => !predicate(item, index))
    const deleteCount = items.length - filteredItems.length

    if (deleteCount > 0) {
      const writeResult = await writeJsonl(filePath, filteredItems)
      if (!writeResult.success) {
        return { success: false, error: writeResult.error }
      }
    }

    return { success: true, data: deleteCount }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: `Failed to delete from JSONL file: ${message}` }
  }
}

// =============================================================================
// JSONL Search Operations
// =============================================================================

/**
 * Find first matching item in a JSONL file
 * @param filePath Absolute path to JSONL file
 * @param predicate Function to identify the item
 * @returns Matching item or null
 */
export async function findInJsonl<T>(
  filePath: string,
  predicate: (item: T, index: number) => boolean
): Promise<StorageResult<T | null>> {
  const result = await readJsonl<T>(filePath, { filter: predicate, limit: 1 })
  if (!result.success) {
    return { success: false, error: result.error }
  }
  return { success: true, data: result.data[0] ?? null }
}

/**
 * Find all matching items in a JSONL file
 * @param filePath Absolute path to JSONL file
 * @param predicate Function to identify items
 * @returns Array of matching items
 */
export async function filterJsonl<T>(
  filePath: string,
  predicate: (item: T, index: number) => boolean
): Promise<StorageResult<T[]>> {
  return readJsonl<T>(filePath, { filter: predicate })
}

export default {
  resolveDataPath,
  fileExists,
  ensureDir,
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
}
