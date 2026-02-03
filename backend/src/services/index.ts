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

// Auth Service
export {
  generateToken,
  verifyToken,
  decodeToken,
  hashPassword,
  verifyPassword,
  verifyEnvPassword,
  extractBearerToken,
  calculateExpirationDate,
} from './auth.js'

export type {
  TokenPayload,
  GenerateTokenOptions,
  VerifyTokenResult,
} from './auth.js'

// CLAUDE.md Service
export {
  // Path utilities
  getPlatformClaudeMdPath,
  getProjectClaudeMdPath,
  getProjectDirPath,
  // Template generation
  generatePlatformClaudeMd,
  generateProjectClaudeMd,
  // Read operations
  readPlatformClaudeMd,
  readProjectClaudeMd,
  readClaudeMd,
  // Write operations
  writePlatformClaudeMd,
  writeProjectClaudeMd,
  writeClaudeMd,
  // Initialize operations
  initPlatformClaudeMd,
  initProjectClaudeMd,
  // Update operations
  updateClaudeMdSection,
  appendToClaudeMd,
  // Templates
  PLATFORM_CLAUDE_MD_TEMPLATE,
  PROJECT_CLAUDE_MD_TEMPLATE,
} from './claudeMd.js'

export type {
  ClaudeMdType,
  ClaudeMdContent,
  ReadClaudeMdOptions,
  WriteClaudeMdOptions,
} from './claudeMd.js'

// CLI Service
export {
  // Constants
  CLI_EVENTS,
  DEFAULT_TIMEOUT_MS,
  // Events
  cliEvents,
  // Spawn
  spawnCli,
  writeToProcess,
  endStdin,
  // Kill
  killProcess,
  forceKillProcess,
  killAllProcesses,
  // Query
  getProcess,
  getProcessStatus,
  isProcessRunning,
  getAllProcesses,
  getRunningProcessCount,
  getProcessBySessionId,
  // Session
  setProcessSessionId,
  setProcessCliSessionId,
  // Cleanup
  cleanupFinishedProcesses,
  removeProcess,
  clearAllProcesses,
  // Buffer
  getOutputBuffer,
  getStderrBuffer,
  clearOutputBuffer,
} from './cli.js'

export type {
  CliProcessStatus,
  CliSpawnOptions,
  CliProcess,
  CliOutputEvent,
  CliExitEvent,
  CliErrorEvent,
} from './cli.js'

// Git Service
export {
  getGitStatus,
  buildCommitMessage,
  createCommit,
  pushChanges,
  pullChanges,
  autoCommitPhase,
  autoPush,
  isGitRepo,
  getCurrentBranch,
  getCommitHistory,
  getFileDiff,
  DEFAULT_CO_AUTHOR,
} from './git.js'

export type {
  GitStatus,
  CommitOptions,
  PushOptions,
  PullOptions,
  GitResult,
  CommitResult,
} from './git.js'
