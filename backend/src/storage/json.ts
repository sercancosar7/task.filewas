/**
 * JSON Storage Utilities
 * Read and write operations for JSON files (settings, sources, etc.)
 * @module @task-filewas/backend/storage/json
 */

import { readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { fileExists, ensureDir, resolveDataPath } from './jsonl.js'
import type { StorageResult } from './jsonl.js'

// Re-export common utilities
export { fileExists, ensureDir, resolveDataPath }
export type { StorageResult, StorageSuccess, StorageError } from './jsonl.js'

// =============================================================================
// Types
// =============================================================================

/**
 * Options for reading JSON files
 */
export interface JsonReadOptions {
  /** Return default value if file doesn't exist */
  defaultValue?: unknown
}

/**
 * Options for writing JSON files
 */
export interface JsonWriteOptions {
  /** Create parent directories if they don't exist */
  createDirs?: boolean
  /** Pretty print with specified indent (default: 2) */
  indent?: number
  /** Overwrite existing file */
  overwrite?: boolean
}

// =============================================================================
// JSON Read Operations
// =============================================================================

/**
 * Read and parse a JSON file
 * @param filePath Absolute path to JSON file
 * @param options Read options
 * @returns Parsed JSON object
 */
export async function readJson<T>(
  filePath: string,
  options: JsonReadOptions = {}
): Promise<StorageResult<T>> {
  try {
    const exists = await fileExists(filePath)
    if (!exists) {
      if (options.defaultValue !== undefined) {
        return { success: true, data: options.defaultValue as T }
      }
      return { success: false, error: `File not found: ${filePath}` }
    }

    const content = await readFile(filePath, 'utf-8')
    const data = JSON.parse(content) as T
    return { success: true, data }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: `Failed to read JSON file: ${message}` }
  }
}

/**
 * Read a JSON file with a default value if not exists
 * @param filePath Absolute path to JSON file
 * @param defaultValue Default value to return if file doesn't exist
 * @returns Parsed JSON object or default value
 */
export async function readJsonWithDefault<T>(
  filePath: string,
  defaultValue: T
): Promise<StorageResult<T>> {
  return readJson<T>(filePath, { defaultValue })
}

// =============================================================================
// JSON Write Operations
// =============================================================================

/**
 * Write an object to a JSON file
 * @param filePath Absolute path to JSON file
 * @param data Object to write
 * @param options Write options
 */
export async function writeJson<T>(
  filePath: string,
  data: T,
  options: JsonWriteOptions = {}
): Promise<StorageResult<void>> {
  const { createDirs = true, indent = 2 } = options

  try {
    // Ensure parent directory exists
    if (createDirs) {
      await ensureDir(dirname(filePath))
    }

    const content = JSON.stringify(data, null, indent)
    await writeFile(filePath, content + '\n', 'utf-8')
    return { success: true, data: undefined }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: `Failed to write JSON file: ${message}` }
  }
}

// =============================================================================
// JSON Update Operations
// =============================================================================

/**
 * Update a JSON file using an updater function
 * @param filePath Absolute path to JSON file
 * @param updater Function that receives current data and returns updated data
 * @param defaultValue Default value if file doesn't exist
 * @returns Updated data
 */
export async function updateJson<T>(
  filePath: string,
  updater: (data: T) => T,
  defaultValue?: T
): Promise<StorageResult<T>> {
  try {
    // Read current data
    const readResult = await readJson<T>(filePath, {
      defaultValue: defaultValue,
    })

    if (!readResult.success) {
      // If no default provided and file doesn't exist, fail
      if (defaultValue === undefined) {
        return readResult
      }
      // Use default value
      const updated = updater(defaultValue)
      const writeResult = await writeJson(filePath, updated)
      if (!writeResult.success) {
        return writeResult
      }
      return { success: true, data: updated }
    }

    // Apply updater
    const updated = updater(readResult.data)

    // Write back
    const writeResult = await writeJson(filePath, updated)
    if (!writeResult.success) {
      return writeResult
    }

    return { success: true, data: updated }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: `Failed to update JSON file: ${message}` }
  }
}

/**
 * Merge data into an existing JSON file
 * @param filePath Absolute path to JSON file
 * @param partial Partial data to merge
 * @param defaultValue Default value if file doesn't exist
 * @returns Merged data
 */
export async function mergeJson<T extends object>(
  filePath: string,
  partial: Partial<T>,
  defaultValue?: T
): Promise<StorageResult<T>> {
  return updateJson<T>(
    filePath,
    (data) => ({ ...data, ...partial }),
    defaultValue
  )
}

// =============================================================================
// JSON Delete Operations
// =============================================================================

/**
 * Delete a key from a JSON object file
 * @param filePath Absolute path to JSON file
 * @param key Key to delete
 * @returns Updated data without the deleted key
 */
export async function deleteJsonKey<T extends object>(
  filePath: string,
  key: keyof T
): Promise<StorageResult<Partial<T>>> {
  return updateJson<T>(filePath, (data) => {
    const { [key]: _, ...rest } = data
    return rest as T
  })
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Check if a JSON file has a specific key
 * @param filePath Absolute path to JSON file
 * @param key Key to check
 * @returns True if key exists
 */
export async function hasJsonKey<T extends object>(
  filePath: string,
  key: keyof T
): Promise<StorageResult<boolean>> {
  const result = await readJson<T>(filePath)
  if (!result.success) {
    return { success: true, data: false }
  }
  return { success: true, data: key in result.data }
}

/**
 * Get a specific key from a JSON file
 * @param filePath Absolute path to JSON file
 * @param key Key to get
 * @returns Value at key or null if not found
 */
export async function getJsonKey<T extends object, K extends keyof T>(
  filePath: string,
  key: K
): Promise<StorageResult<T[K] | null>> {
  const result = await readJson<T>(filePath)
  if (!result.success) {
    return { success: true, data: null }
  }
  return { success: true, data: result.data[key] ?? null }
}

/**
 * Set a specific key in a JSON file
 * @param filePath Absolute path to JSON file
 * @param key Key to set
 * @param value Value to set
 * @param defaultValue Default value for the file if it doesn't exist
 * @returns Updated data
 */
export async function setJsonKey<T extends object, K extends keyof T>(
  filePath: string,
  key: K,
  value: T[K],
  defaultValue?: T
): Promise<StorageResult<T>> {
  return updateJson<T>(
    filePath,
    (data) => ({ ...data, [key]: value }),
    defaultValue
  )
}

export default {
  readJson,
  readJsonWithDefault,
  writeJson,
  updateJson,
  mergeJson,
  deleteJsonKey,
  hasJsonKey,
  getJsonKey,
  setJsonKey,
  fileExists,
  ensureDir,
  resolveDataPath,
}
