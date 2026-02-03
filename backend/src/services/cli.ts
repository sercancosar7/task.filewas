/**
 * CLI Subprocess Service
 * Manages Claude/GLM CLI subprocess spawning and lifecycle
 * @module @task-filewas/backend/services/cli
 */

import { spawn, ChildProcess } from 'node:child_process'
import { EventEmitter } from 'node:events'
import type { ModelProvider } from '@task-filewas/shared'

// =============================================================================
// Types
// =============================================================================

/**
 * CLI process status
 */
export type CliProcessStatus =
  | 'idle'
  | 'starting'
  | 'running'
  | 'paused'
  | 'stopping'
  | 'stopped'
  | 'error'

/**
 * CLI spawn options
 */
export interface CliSpawnOptions {
  /** Working directory for the CLI */
  cwd: string
  /** Model provider to use (claude or glm) */
  model: ModelProvider
  /** Initial prompt to send */
  prompt?: string
  /** System prompt to use */
  systemPrompt?: string
  /** Resume from session ID */
  resumeSessionId?: string
  /** Maximum agentic turns */
  maxTurns?: number
  /** Skip permission prompts (dangerous) */
  dangerouslySkipPermissions?: boolean
  /** Custom environment variables */
  env?: Record<string, string>
  /** Timeout in milliseconds */
  timeout?: number
}

/**
 * CLI process instance
 */
export interface CliProcess {
  /** Unique process ID */
  id: string
  /** Node.js ChildProcess reference */
  process: ChildProcess
  /** Current status */
  status: CliProcessStatus
  /** Model provider used */
  model: ModelProvider
  /** Working directory */
  cwd: string
  /** Start timestamp */
  startedAt: Date
  /** End timestamp */
  endedAt?: Date
  /** Associated session/phase ID */
  sessionId?: string
  /** CLI session ID (from init message) */
  cliSessionId?: string
  /** Timeout handle */
  timeoutHandle?: NodeJS.Timeout | undefined
  /** Output buffer for parsing */
  outputBuffer: string
  /** Stderr buffer */
  stderrBuffer: string
}

/**
 * CLI output event
 */
export interface CliOutputEvent {
  /** Process ID */
  processId: string
  /** Output type */
  type: 'stdout' | 'stderr'
  /** Raw data */
  data: string
  /** Timestamp */
  timestamp: Date
}

/**
 * CLI exit event
 */
export interface CliExitEvent {
  /** Process ID */
  processId: string
  /** Exit code (null if killed by signal) */
  code: number | null
  /** Signal that killed the process */
  signal: NodeJS.Signals | null
  /** Timestamp */
  timestamp: Date
  /** Final status */
  status: CliProcessStatus
}

/**
 * CLI error event
 */
export interface CliErrorEvent {
  /** Process ID */
  processId: string
  /** Error object */
  error: Error
  /** Timestamp */
  timestamp: Date
}

// =============================================================================
// Constants
// =============================================================================

/** CLI event names */
export const CLI_EVENTS = {
  OUTPUT: 'cli:output',
  EXIT: 'cli:exit',
  ERROR: 'cli:error',
  TIMEOUT: 'cli:timeout',
} as const

/** Default timeout: 10 minutes (exported for external use) */
export const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000

/** Force kill timeout: 5 seconds after SIGTERM */
const FORCE_KILL_TIMEOUT_MS = 5 * 1000

/** CLI commands by model */
const CLI_COMMANDS: Record<ModelProvider, string> = {
  claude: 'claude',
  glm: 'glm',
}

// =============================================================================
// Module State
// =============================================================================

/** Active CLI processes */
const processes = new Map<string, CliProcess>()

/** Event emitter for CLI events */
export const cliEvents = new EventEmitter()

// Increase max listeners for high-concurrency scenarios
cliEvents.setMaxListeners(50)

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Generate unique process ID
 */
function generateProcessId(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 10)
  return `cli-${timestamp}-${random}`
}

/**
 * Build CLI arguments from options
 */
function buildCliArgs(options: CliSpawnOptions): string[] {
  const args: string[] = [
    '-p',                        // Print mode (non-interactive)
    '--output-format', 'stream-json',  // NDJSON streaming output
  ]

  // Resume from session
  if (options.resumeSessionId) {
    args.push('-r', options.resumeSessionId)
  }

  // Max turns limit
  if (options.maxTurns !== undefined && options.maxTurns > 0) {
    args.push('--max-turns', options.maxTurns.toString())
  }

  // System prompt
  if (options.systemPrompt) {
    args.push('--system-prompt', options.systemPrompt)
  }

  // Skip permissions (autonomous mode)
  if (options.dangerouslySkipPermissions) {
    args.push('--dangerously-skip-permissions')
  }

  return args
}

/**
 * Build process environment
 */
function buildProcessEnv(customEnv?: Record<string, string>): NodeJS.ProcessEnv {
  return {
    ...process.env,
    // Disable color codes for clean output
    FORCE_COLOR: '0',
    NO_COLOR: '1',
    // Custom environment variables
    ...customEnv,
  }
}

// =============================================================================
// Core Functions
// =============================================================================

/**
 * Spawn a new CLI process
 */
export function spawnCli(options: CliSpawnOptions): CliProcess {
  const processId = generateProcessId()
  const command = CLI_COMMANDS[options.model]
  const args = buildCliArgs(options)
  const env = buildProcessEnv(options.env)

  // Spawn the child process
  const childProcess = spawn(command, args, {
    cwd: options.cwd,
    env,
    shell: true,
    stdio: ['pipe', 'pipe', 'pipe'],
  })

  // Create process record
  const cliProcess: CliProcess = {
    id: processId,
    process: childProcess,
    status: 'starting',
    model: options.model,
    cwd: options.cwd,
    startedAt: new Date(),
    outputBuffer: '',
    stderrBuffer: '',
  }

  // Store process
  processes.set(processId, cliProcess)

  // Setup stdout handler
  if (childProcess.stdout) {
    childProcess.stdout.on('data', (data: Buffer) => {
      const text = data.toString()
      cliProcess.outputBuffer += text
      cliProcess.status = 'running'

      const event: CliOutputEvent = {
        processId,
        type: 'stdout',
        data: text,
        timestamp: new Date(),
      }
      cliEvents.emit(CLI_EVENTS.OUTPUT, event)
    })
  }

  // Setup stderr handler
  if (childProcess.stderr) {
    childProcess.stderr.on('data', (data: Buffer) => {
      const text = data.toString()
      cliProcess.stderrBuffer += text

      const event: CliOutputEvent = {
        processId,
        type: 'stderr',
        data: text,
        timestamp: new Date(),
      }
      cliEvents.emit(CLI_EVENTS.OUTPUT, event)
    })
  }

  // Setup exit handler
  childProcess.on('exit', (code, signal) => {
    cliProcess.endedAt = new Date()

    // Determine final status
    if (signal) {
      cliProcess.status = signal === 'SIGTERM' ? 'stopped' : 'error'
    } else if (code === 0) {
      cliProcess.status = 'stopped'
    } else {
      cliProcess.status = 'error'
    }

    // Clear timeout if set
    if (cliProcess.timeoutHandle) {
      clearTimeout(cliProcess.timeoutHandle)
      cliProcess.timeoutHandle = undefined
    }

    const event: CliExitEvent = {
      processId,
      code,
      signal,
      timestamp: new Date(),
      status: cliProcess.status,
    }
    cliEvents.emit(CLI_EVENTS.EXIT, event)
  })

  // Setup error handler
  childProcess.on('error', (error) => {
    cliProcess.status = 'error'
    cliProcess.endedAt = new Date()

    // Clear timeout if set
    if (cliProcess.timeoutHandle) {
      clearTimeout(cliProcess.timeoutHandle)
      cliProcess.timeoutHandle = undefined
    }

    const event: CliErrorEvent = {
      processId,
      error,
      timestamp: new Date(),
    }
    cliEvents.emit(CLI_EVENTS.ERROR, event)
  })

  // Setup timeout if specified
  if (options.timeout && options.timeout > 0) {
    cliProcess.timeoutHandle = setTimeout(() => {
      if (cliProcess.status === 'running' || cliProcess.status === 'starting') {
        cliEvents.emit(CLI_EVENTS.TIMEOUT, { processId, timestamp: new Date() })
        killProcess(processId)
      }
    }, options.timeout)
  }

  // Send initial prompt via stdin
  if (options.prompt && childProcess.stdin) {
    childProcess.stdin.write(options.prompt)
    childProcess.stdin.end()
  }

  return cliProcess
}

/**
 * Write data to process stdin
 */
export function writeToProcess(processId: string, data: string): boolean {
  const cliProcess = processes.get(processId)
  if (!cliProcess) {
    return false
  }

  const { process: proc, status } = cliProcess
  if (status !== 'running' && status !== 'starting') {
    return false
  }

  if (proc.stdin && !proc.stdin.destroyed) {
    proc.stdin.write(data)
    return true
  }

  return false
}

/**
 * End stdin stream for a process
 */
export function endStdin(processId: string): boolean {
  const cliProcess = processes.get(processId)
  if (!cliProcess) {
    return false
  }

  if (cliProcess.process.stdin && !cliProcess.process.stdin.destroyed) {
    cliProcess.process.stdin.end()
    return true
  }

  return false
}

// =============================================================================
// Process Termination
// =============================================================================

/**
 * Gracefully kill a process with SIGTERM
 * Falls back to SIGKILL after timeout
 */
export function killProcess(processId: string, forceAfterMs: number = FORCE_KILL_TIMEOUT_MS): boolean {
  const cliProcess = processes.get(processId)
  if (!cliProcess) {
    return false
  }

  const { process: proc, status } = cliProcess

  // Already stopped
  if (status === 'stopped' || status === 'error') {
    return true
  }

  // Mark as stopping
  cliProcess.status = 'stopping'

  // Clear any existing timeout
  if (cliProcess.timeoutHandle) {
    clearTimeout(cliProcess.timeoutHandle)
    cliProcess.timeoutHandle = undefined
  }

  // Try graceful shutdown
  const killed = proc.kill('SIGTERM')

  if (killed) {
    // Setup force kill timeout
    const forceKillTimeout = setTimeout(() => {
      if (cliProcess.status === 'stopping') {
        forceKillProcess(processId)
      }
    }, forceAfterMs)

    // Store timeout handle for cleanup
    cliProcess.timeoutHandle = forceKillTimeout
  }

  return killed
}

/**
 * Force kill a process with SIGKILL
 */
export function forceKillProcess(processId: string): boolean {
  const cliProcess = processes.get(processId)
  if (!cliProcess) {
    return false
  }

  const { process: proc, status } = cliProcess

  // Already stopped
  if (status === 'stopped' || status === 'error') {
    return true
  }

  // Clear any timeout
  if (cliProcess.timeoutHandle) {
    clearTimeout(cliProcess.timeoutHandle)
    cliProcess.timeoutHandle = undefined
  }

  return proc.kill('SIGKILL')
}

/**
 * Kill all active processes
 */
export function killAllProcesses(): void {
  for (const [processId, cliProcess] of processes) {
    if (cliProcess.status === 'running' || cliProcess.status === 'starting' || cliProcess.status === 'stopping') {
      killProcess(processId)
    }
  }
}

// =============================================================================
// Process Query Functions
// =============================================================================

/**
 * Get a process by ID
 */
export function getProcess(processId: string): CliProcess | undefined {
  return processes.get(processId)
}

/**
 * Get process status
 */
export function getProcessStatus(processId: string): CliProcessStatus | undefined {
  return processes.get(processId)?.status
}

/**
 * Check if process is running
 */
export function isProcessRunning(processId: string): boolean {
  const status = getProcessStatus(processId)
  return status === 'running' || status === 'starting'
}

/**
 * Get all active processes
 */
export function getAllProcesses(): CliProcess[] {
  return Array.from(processes.values())
}

/**
 * Get count of running processes
 */
export function getRunningProcessCount(): number {
  let count = 0
  for (const proc of processes.values()) {
    if (proc.status === 'running' || proc.status === 'starting') {
      count++
    }
  }
  return count
}

/**
 * Find process by session ID
 */
export function getProcessBySessionId(sessionId: string): CliProcess | undefined {
  for (const proc of processes.values()) {
    if (proc.sessionId === sessionId) {
      return proc
    }
  }
  return undefined
}

/**
 * Set session ID for a process
 */
export function setProcessSessionId(processId: string, sessionId: string): boolean {
  const cliProcess = processes.get(processId)
  if (!cliProcess) {
    return false
  }
  cliProcess.sessionId = sessionId
  return true
}

/**
 * Set CLI session ID for a process
 */
export function setProcessCliSessionId(processId: string, cliSessionId: string): boolean {
  const cliProcess = processes.get(processId)
  if (!cliProcess) {
    return false
  }
  cliProcess.cliSessionId = cliSessionId
  return true
}

// =============================================================================
// Cleanup Functions
// =============================================================================

/**
 * Remove finished processes from tracking
 */
export function cleanupFinishedProcesses(): number {
  let removed = 0
  for (const [processId, proc] of processes) {
    if (proc.status === 'stopped' || proc.status === 'error') {
      processes.delete(processId)
      removed++
    }
  }
  return removed
}

/**
 * Remove a specific process from tracking
 */
export function removeProcess(processId: string): boolean {
  return processes.delete(processId)
}

/**
 * Clear all processes (for testing/shutdown)
 */
export function clearAllProcesses(): void {
  killAllProcesses()
  processes.clear()
}

// =============================================================================
// Output Buffer Functions
// =============================================================================

/**
 * Get output buffer for a process
 */
export function getOutputBuffer(processId: string): string | undefined {
  return processes.get(processId)?.outputBuffer
}

/**
 * Get stderr buffer for a process
 */
export function getStderrBuffer(processId: string): string | undefined {
  return processes.get(processId)?.stderrBuffer
}

/**
 * Clear output buffer for a process
 */
export function clearOutputBuffer(processId: string): boolean {
  const proc = processes.get(processId)
  if (!proc) {
    return false
  }
  proc.outputBuffer = ''
  return true
}

// =============================================================================
// Export Default
// =============================================================================

export default {
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
  // Events
  cliEvents,
  CLI_EVENTS,
}
