/**
 * Base Storage Service
 * Generic abstract class for file-based storage operations
 * Supports both JSON (single object/array) and JSONL (append-only) formats
 * @module @task-filewas/backend/services/base-storage
 */

import {
  readJsonl,
  appendJsonl,
  updateJsonl,
  deleteFromJsonl,
  findInJsonl,
  filterJsonl,
  writeJsonl,
  resolveDataPath,
  fileExists,
  ensureDir,
} from '../storage/jsonl.js'

import {
  readJsonWithDefault,
  writeJson,
  updateJson,
} from '../storage/json.js'

import type { StorageResult, StorageError, JsonlReadOptions } from '../storage/jsonl.js'

// =============================================================================
// Type Helpers
// =============================================================================

/**
 * Helper to extract error from StorageResult
 * Needed for TypeScript exact optional property types
 */
function getError<T>(result: StorageResult<T>): string {
  return (result as StorageError).error ?? 'Unknown error'
}

// =============================================================================
// Types
// =============================================================================

/**
 * Storage format type
 */
export type StorageFormat = 'json' | 'jsonl'

/**
 * Base entity interface - all entities must have an id
 */
export interface BaseEntity {
  id: string
  createdAt?: string
  updatedAt?: string
}

/**
 * Filter options for findAll
 */
export interface FindAllOptions<T> {
  /** Filter predicate */
  filter?: (item: T, index: number) => boolean
  /** Maximum number of results */
  limit?: number
  /** Skip first N results */
  offset?: number
  /** Sort direction */
  sortDirection?: 'asc' | 'desc'
  /** Sort by field */
  sortBy?: keyof T
}

/**
 * Storage service configuration
 */
export interface StorageConfig {
  /** Relative path from data directory */
  relativePath: string
  /** Storage format */
  format: StorageFormat
  /** Default value for JSON storage when file doesn't exist */
  defaultValue?: unknown
  /** Automatically add createdAt/updatedAt timestamps */
  timestamps?: boolean
}

// =============================================================================
// Base Storage Service
// =============================================================================

/**
 * Abstract base class for storage services
 * Provides common CRUD operations for file-based storage
 *
 * @typeParam T - Entity type extending BaseEntity
 *
 * @example
 * ```typescript
 * interface User extends BaseEntity {
 *   name: string
 *   email: string
 * }
 *
 * class UserStorageService extends BaseStorageService<User> {
 *   constructor() {
 *     super({
 *       relativePath: 'users.jsonl',
 *       format: 'jsonl',
 *       timestamps: true,
 *     })
 *   }
 *
 *   // Custom methods specific to users
 *   async findByEmail(email: string): Promise<StorageResult<User | null>> {
 *     return this.findOne((user) => user.email === email)
 *   }
 * }
 * ```
 */
export abstract class BaseStorageService<T extends BaseEntity> {
  protected readonly config: StorageConfig
  protected readonly filePath: string

  constructor(config: StorageConfig) {
    this.config = {
      timestamps: true,
      ...config,
    }
    this.filePath = resolveDataPath(config.relativePath)
  }

  // ===========================================================================
  // Read Operations
  // ===========================================================================

  /**
   * Find all entities matching optional filters
   * @param options - Filter and pagination options
   * @returns Array of matching entities
   */
  async findAll(options?: FindAllOptions<T>): Promise<StorageResult<T[]>> {
    if (this.config.format === 'jsonl') {
      return this.findAllJsonl(options)
    }
    return this.findAllJson(options)
  }

  /**
   * Find all entities from JSONL file
   */
  private async findAllJsonl(options?: FindAllOptions<T>): Promise<StorageResult<T[]>> {
    const readOptions: JsonlReadOptions<T> = {}

    if (options?.filter) {
      readOptions.filter = options.filter
    }
    if (options?.limit) {
      readOptions.limit = options.limit
    }
    if (options?.offset) {
      readOptions.offset = options.offset
    }
    if (options?.sortDirection === 'desc') {
      readOptions.reverse = true
    }

    const result = await readJsonl<T>(this.filePath, readOptions)

    if (!result.success) {
      return result
    }

    let items = result.data

    // Apply custom sorting if sortBy is specified
    if (options?.sortBy) {
      items = this.sortItems(items, options.sortBy, options.sortDirection ?? 'asc')
    }

    return { success: true, data: items }
  }

  /**
   * Find all entities from JSON file (array format)
   */
  private async findAllJson(options?: FindAllOptions<T>): Promise<StorageResult<T[]>> {
    const defaultValue = (this.config.defaultValue ?? []) as T[]
    const result = await readJsonWithDefault<T[]>(this.filePath, defaultValue)

    if (!result.success) {
      return result
    }

    let items = result.data

    // Apply filter
    if (options?.filter) {
      items = items.filter(options.filter)
    }

    // Apply sorting
    if (options?.sortBy) {
      items = this.sortItems(items, options.sortBy, options.sortDirection ?? 'asc')
    } else if (options?.sortDirection === 'desc') {
      items = items.reverse()
    }

    // Apply pagination
    if (options?.offset && options.offset > 0) {
      items = items.slice(options.offset)
    }
    if (options?.limit && options.limit > 0) {
      items = items.slice(0, options.limit)
    }

    return { success: true, data: items }
  }

  /**
   * Find entity by ID
   * @param id - Entity ID
   * @returns Entity or null if not found
   */
  async findById(id: string): Promise<StorageResult<T | null>> {
    if (this.config.format === 'jsonl') {
      return findInJsonl<T>(this.filePath, (item) => item.id === id)
    }

    // JSON format - read array and find
    const result = await this.findAll()
    if (!result.success) {
      return { success: false, error: getError(result) }
    }

    const item = result.data.find((entity) => entity.id === id)
    return { success: true, data: item ?? null }
  }

  /**
   * Find first entity matching predicate
   * @param predicate - Filter function
   * @returns First matching entity or null
   */
  async findOne(predicate: (item: T) => boolean): Promise<StorageResult<T | null>> {
    if (this.config.format === 'jsonl') {
      return findInJsonl<T>(this.filePath, predicate)
    }

    // JSON format
    const result = await this.findAll({ filter: predicate, limit: 1 })
    if (!result.success) {
      return { success: false, error: getError(result) }
    }

    return { success: true, data: result.data[0] ?? null }
  }

  /**
   * Find all entities matching predicate
   * @param predicate - Filter function
   * @returns Array of matching entities
   */
  async findWhere(predicate: (item: T, index: number) => boolean): Promise<StorageResult<T[]>> {
    if (this.config.format === 'jsonl') {
      return filterJsonl<T>(this.filePath, predicate)
    }

    return this.findAll({ filter: predicate })
  }

  /**
   * Check if entity exists by ID
   * @param id - Entity ID
   * @returns True if entity exists
   */
  async exists(id: string): Promise<boolean> {
    const result = await this.findById(id)
    return result.success && result.data !== null
  }

  /**
   * Count entities matching optional filter
   * @param predicate - Optional filter function
   * @returns Count of matching entities
   */
  async count(predicate?: (item: T, index: number) => boolean): Promise<StorageResult<number>> {
    const options: FindAllOptions<T> = {}
    if (predicate) {
      options.filter = predicate
    }
    const result = await this.findAll(options)
    if (!result.success) {
      return { success: false, error: getError(result) }
    }
    return { success: true, data: result.data.length }
  }

  // ===========================================================================
  // Write Operations
  // ===========================================================================

  /**
   * Create a new entity
   * @param data - Entity data (without id if auto-generated)
   * @returns Created entity
   */
  async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<StorageResult<T>> {
    const now = new Date().toISOString()
    const id = data.id ?? this.generateId()

    const entity = {
      ...data,
      id,
      ...(this.config.timestamps && {
        createdAt: now,
        updatedAt: now,
      }),
    } as T

    if (this.config.format === 'jsonl') {
      const result = await appendJsonl(this.filePath, entity)
      if (!result.success) {
        return { success: false, error: getError(result) }
      }
      return { success: true, data: entity }
    }

    // JSON format - read array, append, write back
    const result = await updateJson<T[]>(
      this.filePath,
      (items) => [...items, entity],
      []
    )

    if (!result.success) {
      return { success: false, error: getError(result) }
    }

    return { success: true, data: entity }
  }

  /**
   * Update an entity by ID
   * @param id - Entity ID
   * @param updates - Partial entity data to update
   * @returns Updated entity
   */
  async update(id: string, updates: Partial<Omit<T, 'id' | 'createdAt'>>): Promise<StorageResult<T>> {
    const now = new Date().toISOString()

    if (this.config.format === 'jsonl') {
      // JSONL: Update in place
      const result = await updateJsonl<T>(
        this.filePath,
        (item) => item.id === id,
        (item) => ({
          ...item,
          ...updates,
          ...(this.config.timestamps && { updatedAt: now }),
        })
      )

      if (!result.success) {
        return { success: false, error: getError(result) }
      }

      if (result.data === 0) {
        return { success: false, error: `Entity not found: ${id}` }
      }

      // Read back the updated entity
      const findResult = await this.findById(id)
      if (!findResult.success || !findResult.data) {
        return { success: false, error: 'Failed to read updated entity' }
      }

      return { success: true, data: findResult.data }
    }

    // JSON format - read array, update, write back
    let updatedEntity: T | null = null

    const result = await updateJson<T[]>(
      this.filePath,
      (items) => {
        return items.map((item) => {
          if (item.id === id) {
            updatedEntity = {
              ...item,
              ...updates,
              ...(this.config.timestamps && { updatedAt: now }),
            }
            return updatedEntity
          }
          return item
        })
      },
      []
    )

    if (!result.success) {
      return { success: false, error: getError(result) }
    }

    if (!updatedEntity) {
      return { success: false, error: `Entity not found: ${id}` }
    }

    return { success: true, data: updatedEntity }
  }

  /**
   * Delete an entity by ID
   * @param id - Entity ID
   * @returns Success status
   */
  async delete(id: string): Promise<StorageResult<void>> {
    if (this.config.format === 'jsonl') {
      const result = await deleteFromJsonl<T>(this.filePath, (item) => item.id === id)
      if (!result.success) {
        return { success: false, error: getError(result) }
      }
      if (result.data === 0) {
        return { success: false, error: `Entity not found: ${id}` }
      }
      return { success: true, data: undefined }
    }

    // JSON format - filter out the entity
    let deleted = false
    const result = await updateJson<T[]>(
      this.filePath,
      (items) => {
        const filtered = items.filter((item) => {
          if (item.id === id) {
            deleted = true
            return false
          }
          return true
        })
        return filtered
      },
      []
    )

    if (!result.success) {
      return { success: false, error: getError(result) }
    }

    if (!deleted) {
      return { success: false, error: `Entity not found: ${id}` }
    }

    return { success: true, data: undefined }
  }

  /**
   * Delete all entities matching predicate
   * @param predicate - Filter function (return true to delete)
   * @returns Number of deleted entities
   */
  async deleteWhere(predicate: (item: T) => boolean): Promise<StorageResult<number>> {
    if (this.config.format === 'jsonl') {
      return deleteFromJsonl<T>(this.filePath, predicate)
    }

    // JSON format
    let deleteCount = 0
    const result = await updateJson<T[]>(
      this.filePath,
      (items) => {
        const filtered = items.filter((item) => {
          if (predicate(item)) {
            deleteCount++
            return false
          }
          return true
        })
        return filtered
      },
      []
    )

    if (!result.success) {
      return { success: false, error: getError(result) }
    }

    return { success: true, data: deleteCount }
  }

  /**
   * Bulk create entities
   * @param items - Array of entity data
   * @returns Created entities
   */
  async createMany(
    items: Array<Omit<T, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }>
  ): Promise<StorageResult<T[]>> {
    const now = new Date().toISOString()

    const entities = items.map((data) => ({
      ...data,
      id: data.id ?? this.generateId(),
      ...(this.config.timestamps && {
        createdAt: now,
        updatedAt: now,
      }),
    })) as T[]

    if (this.config.format === 'jsonl') {
      // Append all at once
      for (const entity of entities) {
        const result = await appendJsonl(this.filePath, entity)
        if (!result.success) {
          return { success: false, error: getError(result) }
        }
      }
      return { success: true, data: entities }
    }

    // JSON format
    const result = await updateJson<T[]>(
      this.filePath,
      (existing) => [...existing, ...entities],
      []
    )

    if (!result.success) {
      return { success: false, error: getError(result) }
    }

    return { success: true, data: entities }
  }

  // ===========================================================================
  // Utility Methods
  // ===========================================================================

  /**
   * Generate a unique ID
   * Override in subclass for custom ID generation
   */
  protected generateId(): string {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substring(2, 8)
    return `${timestamp}-${random}`
  }

  /**
   * Sort items by field
   */
  private sortItems(items: T[], sortBy: keyof T, direction: 'asc' | 'desc'): T[] {
    return [...items].sort((a, b) => {
      const aVal = a[sortBy]
      const bVal = b[sortBy]

      // Handle undefined values
      if (aVal === undefined && bVal === undefined) return 0
      if (aVal === undefined) return direction === 'asc' ? 1 : -1
      if (bVal === undefined) return direction === 'asc' ? -1 : 1

      // Compare values
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return direction === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal)
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return direction === 'asc' ? aVal - bVal : bVal - aVal
      }

      // Fallback string comparison
      const aStr = String(aVal)
      const bStr = String(bVal)
      return direction === 'asc'
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr)
    })
  }

  /**
   * Check if storage file exists
   */
  async storageExists(): Promise<boolean> {
    return fileExists(this.filePath)
  }

  /**
   * Get the absolute file path
   */
  getFilePath(): string {
    return this.filePath
  }

  /**
   * Ensure storage directory exists
   */
  async ensureStorage(): Promise<StorageResult<void>> {
    try {
      const { dirname } = await import('node:path')
      await ensureDir(dirname(this.filePath))

      // Initialize empty file if it doesn't exist
      const exists = await this.storageExists()
      if (!exists) {
        if (this.config.format === 'jsonl') {
          await writeJsonl(this.filePath, [])
        } else {
          const defaultValue = this.config.defaultValue ?? []
          await writeJson(this.filePath, defaultValue)
        }
      }

      return { success: true, data: undefined }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, error: `Failed to ensure storage: ${message}` }
    }
  }

  /**
   * Clear all entities (use with caution!)
   */
  async clear(): Promise<StorageResult<void>> {
    if (this.config.format === 'jsonl') {
      const result = await writeJsonl(this.filePath, [])
      if (!result.success) {
        return { success: false, error: getError(result) }
      }
      return { success: true, data: undefined }
    }

    const result = await writeJson(this.filePath, this.config.defaultValue ?? [])
    if (!result.success) {
      return { success: false, error: getError(result) }
    }
    return { success: true, data: undefined }
  }
}

// =============================================================================
// Export Types
// =============================================================================

export type {
  StorageResult,
  JsonlReadOptions,
}

export default BaseStorageService
