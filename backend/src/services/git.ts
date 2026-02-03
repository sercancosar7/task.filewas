/**
 * Git Service
 * Git operations for version control (commit, push, pull, status)
 * @module @task-filewas/backend/services/git
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Git status result
 */
export interface GitStatus {
  /** Branch name */
  branch: string
  /** Remote branch (empty string if none) */
  remoteBranch: string
  /** Staged files */
  staged: string[]
  /** Modified unstaged files */
  modified: string[]
  /** Untracked files */
  untracked: string[]
  /** Whether there are changes */
  hasChanges: boolean
  /** Ahead commits */
  ahead: number
  /** Behind commits */
  behind: number
}

/**
 * Git commit options
 */
export interface CommitOptions {
  /** Commit message (required if phaseId not provided) */
  message?: string
  /** Phase ID for auto-generated message */
  phaseId?: number
  /** Phase title for auto-generated message */
  phaseTitle?: string
  /** Co-author name */
  coAuthorName?: string
  /** Co-author email */
  coAuthorEmail?: string
  /** Whether to add all changes */
  addAll?: boolean
  /** Specific files to stage */
  files?: string[]
}

/**
 * Git push options
 */
export interface PushOptions {
  /** Remote name (default: origin) */
  remote?: string
  /** Branch name (default: current) */
  branch?: string
  /** Force push */
  force?: boolean
}

/**
 * Git pull options
 */
export interface PullOptions {
  /** Remote name (default: origin) */
  remote?: string
  /** Branch name (default: current) */
  branch?: string
}

/**
 * Git operation result
 */
export interface GitResult {
  /** Success status */
  success: boolean
  /** Error message if failed (empty string if success) */
  error: string
  /** Output from git command */
  output: string
}

/**
 * Commit result with hash
 */
export interface CommitResult extends GitResult {
  /** Commit hash (empty string if not available) */
  commitHash: string
}

// =============================================================================
// Constants
// =============================================================================

/** Default co-author for auto-commits */
const DEFAULT_CO_AUTHOR = {
  name: 'Task.filewas',
  email: 'noreply@task.filewas.com'
}

/** Git command timeout (ms) */
const GIT_TIMEOUT = 60000

// =============================================================================
// Service Functions
// =============================================================================

/**
 * Execute git command in a directory
 */
async function execGit(
  args: string[],
  cwd: string,
  timeout = GIT_TIMEOUT
): Promise<{ success: boolean; stdout: string; stderr: string; code: number | null }> {
  const { spawn } = await import('node:child_process')

  return new Promise((resolve) => {
    const git = spawn('git', args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''
    let killed = false

    // Timeout handling
    const timeoutHandle = setTimeout(() => {
      killed = true
      git.kill('SIGTERM')
      stderr += '\nGit command timed out'
    }, timeout)

    git.stdout?.on('data', (data) => {
      stdout += data.toString()
    })

    git.stderr?.on('data', (data) => {
      stderr += data.toString()
    })

    git.on('close', (code) => {
      clearTimeout(timeoutHandle)
      resolve({
        success: !killed && code === 0,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        code: killed ? null : code
      })
    })

    git.on('error', (error) => {
      clearTimeout(timeoutHandle)
      resolve({
        success: false,
        stdout: '',
        stderr: error.message,
        code: null
      })
    })
  })
}

/**
 * Get current git status
 */
export async function getGitStatus(projectPath: string): Promise<GitStatus | null> {
  // Get branch info
  const branchResult = await execGit(['branch', '--show-current'], projectPath)
  if (!branchResult.success) {
    return null
  }

  const branch = branchResult.stdout || 'HEAD'

  // Get remote branch
  const remoteResult = await execGit(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'], projectPath)
  const remoteBranch = remoteResult.success && remoteResult.stdout ? remoteResult.stdout : ''

  // Get ahead/behind info
  const aheadBehindResult = await execGit(['rev-list', '--left-right', '--count', 'HEAD...@{u}'], projectPath)
  let ahead = 0
  let behind = 0

  if (aheadBehindResult.success) {
    const match = aheadBehindResult.stdout.match(/^(\d+)\s+(\d+)$/)
    if (match && match[1] && match[2]) {
      ahead = parseInt(match[1], 10)
      behind = parseInt(match[2], 10)
    }
  }

  // Get status porcelain
  const statusResult = await execGit(['status', '--porcelain'], projectPath)
  if (!statusResult.success) {
    return null
  }

  const staged: string[] = []
  const modified: string[] = []
  const untracked: string[] = []

  const lines = statusResult.stdout.split('\n')
  for (const line of lines) {
    if (!line) continue

    const statusCode = line.substring(0, 2)
    const filePath = line.substring(3)

    // Staged files (first character is not space or ?)
    if (statusCode[0] !== ' ' && statusCode[0] !== '?') {
      staged.push(filePath)
    }

    // Modified unstaged (second character is M)
    if (statusCode[1] === 'M') {
      modified.push(filePath)
    }

    // Untracked files (??)
    if (statusCode === '??') {
      untracked.push(filePath)
    }
  }

  return {
    branch,
    remoteBranch,
    staged,
    modified,
    untracked,
    hasChanges: staged.length > 0 || modified.length > 0 || untracked.length > 0,
    ahead,
    behind
  }
}

/**
 * Build formatted commit message with Co-Authored-By
 */
export function buildCommitMessage(options: CommitOptions): string {
  const lines: string[] = []

  // Main message
  if (options.phaseId !== undefined) {
    lines.push(`[Faz ${options.phaseId}] ${options.phaseTitle || options.message || 'Update'}`)
  } else {
    lines.push(options.message || 'Update')
  }

  // Empty line before body
  lines.push('')

  // Co-author trailer
  const coAuthorName = options.coAuthorName || DEFAULT_CO_AUTHOR.name
  const coAuthorEmail = options.coAuthorEmail || DEFAULT_CO_AUTHOR.email
  lines.push(`Co-Authored-By: ${coAuthorName} <${coAuthorEmail}>`)

  return lines.join('\n')
}

/**
 * Stage files for commit
 */
async function stageFiles(
  projectPath: string,
  files: string[] | undefined,
  addAll = false
): Promise<GitResult> {
  const args = ['add']

  if (addAll) {
    args.push('-A')
  } else if (files && files.length > 0) {
    args.push(...files)
  } else {
    // Stage only modified/deleted files, not untracked
    args.push('-u')
  }

  const result = await execGit(args, projectPath)

  return {
    success: result.success,
    error: result.success ? '' : result.stderr,
    output: result.stdout
  }
}

/**
 * Create a commit
 */
export async function createCommit(
  projectPath: string,
  options: CommitOptions
): Promise<CommitResult> {
  try {
    // Stage files
    const stageResult = await stageFiles(projectPath, options.files, options.addAll)
    if (!stageResult.success) {
      return {
        success: false,
        error: `Failed to stage files: ${stageResult.error}`,
        output: '',
        commitHash: ''
      }
    }

    // Build commit message
    const message = buildCommitMessage(options)

    // Create commit
    const commitResult = await execGit(['commit', '-m', message], projectPath)

    if (!commitResult.success) {
      // Check if nothing to commit
      if (commitResult.stderr.includes('nothing to commit')) {
        return {
          success: true,
          output: 'Nothing to commit',
          error: '',
          commitHash: ''
        }
      }
      return {
        success: false,
        error: commitResult.stderr,
        output: '',
        commitHash: ''
      }
    }

    // Get commit hash
    const hashResult = await execGit(['rev-parse', 'HEAD'], projectPath)
    const commitHash = hashResult.success ? hashResult.stdout : ''

    return {
      success: true,
      commitHash,
      error: '',
      output: commitResult.stdout
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      output: '',
      commitHash: ''
    }
  }
}

/**
 * Push commits to remote
 */
export async function pushChanges(
  projectPath: string,
  options: PushOptions = {}
): Promise<GitResult> {
  const { remote = 'origin', branch, force = false } = options

  const args = ['push']
  if (force) {
    args.push('--force')
  }

  args.push(remote)

  if (branch) {
    args.push(branch)
  } else {
    // Push current branch to same name on remote
    args.push('HEAD')
  }

  const result = await execGit(args, projectPath)

  return {
    success: result.success,
    error: result.success ? '' : result.stderr,
    output: result.stdout
  }
}

/**
 * Pull changes from remote
 */
export async function pullChanges(
  projectPath: string,
  options: PullOptions = {}
): Promise<GitResult> {
  const { remote = 'origin', branch } = options

  const args = ['pull']
  if (remote) {
    args.push(remote)
  }
  if (branch) {
    args.push(branch)
  }

  const result = await execGit(args, projectPath)

  return {
    success: result.success,
    error: result.success ? '' : result.stderr,
    output: result.stdout
  }
}

/**
 * Auto-commit after phase completion
 */
export async function autoCommitPhase(
  projectPath: string,
  phaseId: number,
  phaseTitle: string
): Promise<CommitResult> {
  return createCommit(projectPath, {
    phaseId,
    phaseTitle,
    coAuthorName: DEFAULT_CO_AUTHOR.name,
    coAuthorEmail: DEFAULT_CO_AUTHOR.email,
    addAll: true
  })
}

/**
 * Auto-push after commit
 */
export async function autoPush(
  projectPath: string,
  remote = 'origin'
): Promise<GitResult> {
  return pushChanges(projectPath, { remote })
}

/**
 * Check if git repository exists
 */
export async function isGitRepo(projectPath: string): Promise<boolean> {
  const result = await execGit(['rev-parse', '--git-dir'], projectPath, 5000)
  return result.success
}

/**
 * Get current branch name
 */
export async function getCurrentBranch(projectPath: string): Promise<string | null> {
  const result = await execGit(['branch', '--show-current'], projectPath)
  return result.success ? result.stdout : null
}

/**
 * Get commit history
 */
export async function getCommitHistory(
  projectPath: string,
  maxCount = 10
): Promise<Array<{ hash: string; message: string; author: string; date: string }>> {
  const result = await execGit(
    ['log', `-${maxCount}`, '--pretty=%H|%s|%an|%ad', '--date=iso'],
    projectPath
  )

  if (!result.success) {
    return []
  }

  const commits: Array<{ hash: string; message: string; author: string; date: string }> = []

  for (const line of result.stdout.split('\n')) {
    if (!line) continue

    const parts = line.split('|')
    if (parts.length >= 4) {
      commits.push({
        hash: parts[0] || '',
        message: parts[1] || '',
        author: parts[2] || '',
        date: parts[3] || ''
      })
    }
  }

  return commits
}

/**
 * Get file diff
 */
export async function getFileDiff(
  projectPath: string,
  filePath: string,
  staged = false
): Promise<string | null> {
  const args = ['diff']
  if (staged) {
    args.push('--staged')
  }
  args.push('--', filePath)

  const result = await execGit(args, projectPath)
  return result.success ? result.stdout : null
}

// =============================================================================
// Export Default
// =============================================================================

export default {
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
}

export { DEFAULT_CO_AUTHOR }
