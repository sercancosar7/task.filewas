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

// Project Storage Service
export {
  ProjectStorageService,
  projectStorage,
} from './project-storage.js'

export type {
  ProjectFilterOptions,
} from './project-storage.js'

// Session Storage Service
export {
  SessionStorageService,
  sessionStorage,
} from './session-storage.js'
