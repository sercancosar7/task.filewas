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

// Session storage
export {
  createSession,
  getSession,
  updateSession,
  deleteSession,
  listSessions,
  countSessions,
  addMessage,
  getMessages,
  addEntry,
  getEntries,
  getEntriesByType,
  getSessionFilename,
  getSessionPath,
  generateSessionId,
} from './sessions.js'

export type {
  SessionEntryType,
  SessionHeaderEntry,
  SessionMessageEntry,
  SessionToolEntry,
  SessionPhaseEntry,
  SessionOverviewEntry,
  SessionRoadmapEntry,
  SessionSummaryEntry,
  SessionEntry,
  SessionStatus,
  SessionMode,
  SessionProcessingState,
  PermissionMode,
  ThinkingLevel,
  ModelProvider,
  SessionLabelEntry,
  PhaseProgressEntry,
  TokenUsageEntry,
  SessionCreateInput,
  SessionUpdateInput,
  SessionFilterOptions,
} from './sessions.js'

// Project storage
export {
  createProject,
  getProject,
  updateProject,
  deleteProject,
  hardDeleteProject,
  listProjects,
  countProjects,
  addProjectVersion,
  updateProjectVersion,
  updateSessionCount,
  projectExists,
  getProjectsIndexPath,
  getProjectDirPath,
  generateProjectId,
  generateProjectPath,
} from './projects.js'

export type {
  ProjectStatus,
  ProjectType,
  ProjectVersion,
  GitHubInfo,
  ProjectSettings,
  TechStack,
  Project,
  ProjectCreateInput,
  ProjectUpdateInput,
} from './projects.js'

// Settings storage
export {
  getSettings,
  updateSettings,
  resetSettings,
  getSetting,
  setSetting,
  DEFAULT_SETTINGS,
} from './settings.js'

export type { DefaultModel, DefaultPermissionMode, DefaultThinkingLevel } from './settings.js'

// Logs storage
export {
  getLogs,
  getLogsByType,
  getRecentLogs,
  getLogById,
  addLog,
  addApiLog,
  addAgentLog,
  addErrorLog,
  addSessionLog,
  cleanOldLogs,
  getLogStats,
} from './logs.js'

export type {
  LogEntry,
  LogType,
  LogLevel,
  LogsData,
  LogFilterOptions,
} from './logs.js'
