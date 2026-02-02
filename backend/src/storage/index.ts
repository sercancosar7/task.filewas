/**
 * Storage Module Exports
 * File-based storage utilities for JSONL and JSON files
 * @module @task-filewas/backend/storage
 */

// JSONL utilities
export {
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

export type {
  StorageResult,
  StorageSuccess,
  StorageError,
  JsonlReadOptions,
  JsonlWriteOptions,
} from './jsonl.js'

// JSON utilities
export {
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

export type { JsonReadOptions, JsonWriteOptions } from './json.js'

// Initialization
export { initStorage, getStorageStatus } from './init.js'

export type { PlatformSettings, SourcesConfig, StatusesConfig } from './init.js'
