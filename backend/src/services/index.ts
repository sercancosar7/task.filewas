/**
 * Services Module Exports
 * Business logic and storage service abstractions
 * @module @task-filewas/backend/services
 */

// Base Storage Service
export {
  BaseStorageService,
} from './base-storage.js'

export type {
  StorageFormat,
  BaseEntity,
  FindAllOptions,
  StorageConfig,
  StorageResult,
  JsonlReadOptions,
} from './base-storage.js'
