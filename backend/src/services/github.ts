/**
 * GitHub Service
 * GitHub API operations for repository management
 * @module @task-filewas/backend/services/github
 */


// =============================================================================
// Types
// =============================================================================

/**
 * GitHub repository visibility
 */
export type GitHubRepoVisibility = 'public' | 'private'

/**
 * GitHub repository creation options
 */
export interface CreateRepoOptions {
  /** Repository name (required) */
  name: string
  /** Repository description */
  description?: string
  /** Repository visibility (default: private) */
  visibility?: GitHubRepoVisibility
  /** Auto-initialize with README (default: true) */
  autoInit?: boolean
  /** .gitignore template */
  gitignoreTemplate?: string
  /** License template */
  licenseTemplate?: string
  /** Whether to enable issues (default: true) */
  hasIssues?: boolean
  /** Whether to enable projects (default: false) */
  hasProjects?: boolean
  /** Whether to enable wiki (default: false) */
  hasWiki?: boolean
}

/**
 * GitHub repository response
 */
export interface GitHubRepo {
  /** Repository ID */
  id: number
  /** Repository name */
  name: string
  /** Full name (owner/repo) */
  fullName: string
  /** Repository description */
  description: string | null
  /** Clone URL (HTTPS) */
  cloneUrl: string
  /** SSH clone URL */
  sshUrl: string
  /** Git clone URL */
  gitUrl: string
  /** Repository URL */
  htmlUrl: string
  /** Default branch */
  defaultBranch: string | null
  /** Repository visibility */
  private: boolean
  /** Owner information */
  owner: {
    login: string
    id: number
    type: string
  }
  /** Creation timestamp */
  createdAt: string
  /** Last update timestamp */
  updatedAt: string
}

/**
 * GitHub API error response
 */
export interface GitHubApiError {
  message: string
  documentation_url?: string
  errors?: Array<{
    resource: string
    field: string
    code: string
  }>
}

// =============================================================================
// Service Result Types
// =============================================================================

export interface ServiceSuccess<T> {
  success: true
  data: T
}

export interface ServiceError {
  success: false
  error: string
  code?: string
}

export type ServiceResult<T> = ServiceSuccess<T> | ServiceError

// =============================================================================
// Constants
// =============================================================================

/** GitHub API base URL */
const GITHUB_API_BASE = 'https://api.github.com'

/** User agent for GitHub API requests */
const USER_AGENT = 'TaskFilewas/0.1.0'

/** Default request timeout (ms) */
const DEFAULT_TIMEOUT = 30000

// =============================================================================
// Service Functions
// =============================================================================

/**
 * Get GitHub token from environment
 * @returns GitHub token or null if not configured
 */
function getGitHubToken(): string | null {
  // Check for GitHub token in environment
  const token = process.env['GITHUB_TOKEN'] || process.env['GH_TOKEN']
  return token || null
}

/**
 * Make authenticated request to GitHub API
 * @param endpoint - API endpoint (e.g., /user/repos)
 * @param options - Fetch options
 * @returns Response data or error
 */
async function githubRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ServiceResult<T>> {
  const token = getGitHubToken()

  if (!token) {
    return {
      success: false,
      error: 'GitHub token not configured. Please set GITHUB_TOKEN or GH_TOKEN environment variable.',
      code: 'NO_TOKEN',
    }
  }

  const url = `${GITHUB_API_BASE}${endpoint}`

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT),
    })

    const data = await response.json()

    if (!response.ok) {
      const githubError = data as GitHubApiError
      return {
        success: false,
        error: githubError.message || `GitHub API error: ${response.status}`,
        code: `GITHUB_${response.status}`,
      }
    }

    return {
      success: true,
      data: data as T,
    }
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        success: false,
        error: 'Failed to connect to GitHub API. Check your network connection.',
        code: 'NETWORK_ERROR',
      }
    }

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: 'GitHub API request timed out.',
          code: 'TIMEOUT',
        }
      }

      return {
        success: false,
        error: error.message,
        code: 'UNKNOWN_ERROR',
      }
    }

    return {
      success: false,
      error: 'Unknown error occurred',
      code: 'UNKNOWN_ERROR',
    }
  }
}

/**
 * Get authenticated GitHub user information
 * @returns User data or error
 */
export async function getGitHubUser(): Promise<ServiceResult<{ login: string; id: number }>> {
  return githubRequest<{ login: string; id: number }>('/user')
}

/**
 * Create a new GitHub repository
 * @param options - Repository creation options
 * @returns Created repository data or error
 */
export async function createRepo(options: CreateRepoOptions): Promise<ServiceResult<GitHubRepo>> {
  // Validate repository name
  if (!options.name || options.name.trim().length === 0) {
    return {
      success: false,
      error: 'Repository name is required',
      code: 'INVALID_NAME',
    }
  }

  // Validate name format (GitHub repo name rules)
  const sanitizedName = options.name.trim().toLowerCase().replace(/\s+/g, '-')
  if (!/^[a-z0-9._-]+$/.test(sanitizedName)) {
    return {
      success: false,
      error: 'Repository name can only contain alphanumeric characters, hyphens, underscores, and periods',
      code: 'INVALID_NAME',
    }
  }

  // Build request body
  const body = {
    name: sanitizedName,
    description: options.description || '',
    private: options.visibility !== 'public',
    auto_init: options.autoInit !== false,
    gitignore_template: options.gitignoreTemplate || 'Node',
    license_template: options.licenseTemplate,
    has_issues: options.hasIssues !== false,
    has_projects: options.hasProjects === true,
    has_wiki: options.hasWiki === true,
  }

  const result = await githubRequest<GitHubRepo>('/user/repos', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (result.success) {
    // Clone and format the response
    return {
      success: true,
      data: {
        id: result.data.id,
        name: result.data.name,
        fullName: result.data.fullName,
        description: result.data.description ?? null,
        cloneUrl: result.data.cloneUrl,
        sshUrl: result.data.sshUrl,
        gitUrl: result.data.gitUrl,
        htmlUrl: result.data.htmlUrl,
        defaultBranch: result.data.defaultBranch ?? 'main',
        private: result.data.private,
        owner: result.data.owner,
        createdAt: result.data.createdAt,
        updatedAt: result.data.updatedAt,
      },
    }
  }

  return result
}

/**
 * Clone a repository to local filesystem
 * @param cloneUrl - Git clone URL
 * @param targetPath - Local target directory
 * @returns Success or error
 */
export async function cloneRepo(
  cloneUrl: string,
  targetPath: string
): Promise<ServiceResult<void>> {
  const { spawn } = await import('node:child_process')

  return new Promise((resolve) => {
    const git = spawn('git', ['clone', cloneUrl, targetPath], {
      stdio: 'pipe',
    })

    let stderr = ''

    git.stderr?.on('data', (data) => {
      stderr += data.toString()
    })

    git.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, data: undefined })
      } else {
        resolve({
          success: false,
          error: `Git clone failed: ${stderr || 'Unknown error'}`,
          code: 'GIT_ERROR',
        })
      }
    })

    git.on('error', (error) => {
      resolve({
        success: false,
        error: `Failed to spawn git process: ${error.message}`,
        code: 'SPAWN_ERROR',
      })
    })
  })
}

/**
 * Initialize a new git repository in local directory
 * @param projectPath - Local project path
 * @returns Success or error
 */
export async function initGitRepo(projectPath: string): Promise<ServiceResult<void>> {
  const { spawn } = await import('node:child_process')

  return new Promise((resolve) => {
    const git = spawn('git', ['init'], {
      cwd: projectPath,
      stdio: 'pipe',
    })

    let stderr = ''

    git.stderr?.on('data', (data) => {
      stderr += data.toString()
    })

    git.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, data: undefined })
      } else {
        resolve({
          success: false,
          error: `Git init failed: ${stderr || 'Unknown error'}`,
          code: 'GIT_ERROR',
        })
      }
    })

    git.on('error', (error) => {
      resolve({
        success: false,
        error: `Failed to spawn git process: ${error.message}`,
        code: 'SPAWN_ERROR',
      })
    })
  })
}

/**
 * Add remote to local git repository
 * @param projectPath - Local project path
 * @param remoteName - Remote name (default: origin)
 * @param remoteUrl - Remote URL
 * @returns Success or error
 */
export async function addRemote(
  projectPath: string,
  remoteName: string,
  remoteUrl: string
): Promise<ServiceResult<void>> {
  const { spawn } = await import('node:child_process')

  return new Promise((resolve) => {
    const git = spawn('git', ['remote', 'add', remoteName, remoteUrl], {
      cwd: projectPath,
      stdio: 'pipe',
    })

    let stderr = ''

    git.stderr?.on('data', (data) => {
      stderr += data.toString()
    })

    git.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, data: undefined })
      } else {
        resolve({
          success: false,
          error: `Failed to add remote: ${stderr || 'Unknown error'}`,
          code: 'GIT_ERROR',
        })
      }
    })

    git.on('error', (error) => {
      resolve({
        success: false,
        error: `Failed to spawn git process: ${error.message}`,
        code: 'SPAWN_ERROR',
      })
    })
  })
}

/**
 * Create initial commit in local repository
 * @param projectPath - Local project path
 * @param message - Commit message
 * @returns Success or error
 */
export async function initialCommit(
  projectPath: string,
  message = 'Initial commit'
): Promise<ServiceResult<void>> {
  const { spawn } = await import('node:child_process')

  return new Promise((resolve) => {
    // Add all files and commit
    const git = spawn('git', ['commit', '-m', message, '--allow-empty'], {
      cwd: projectPath,
      stdio: 'pipe',
    })

    let stderr = ''

    git.stderr?.on('data', (data) => {
      stderr += data.toString()
    })

    git.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, data: undefined })
      } else {
        resolve({
          success: false,
          error: `Failed to create commit: ${stderr || 'Unknown error'}`,
          code: 'GIT_ERROR',
        })
      }
    })

    git.on('error', (error) => {
      resolve({
        success: false,
        error: `Failed to spawn git process: ${error.message}`,
        code: 'SPAWN_ERROR',
      })
    })
  })
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if git is available
 * @returns True if git is installed and accessible
 */
export async function isGitAvailable(): Promise<boolean> {
  const { spawn } = await import('node:child_process')

  return new Promise((resolve) => {
    const git = spawn('git', ['--version'], {
      stdio: 'ignore',
    })

    git.on('close', (code) => {
      resolve(code === 0)
    })

    git.on('error', () => {
      resolve(false)
    })
  })
}

/**
 * Parse owner and repo from GitHub URL
 * @param url - GitHub URL
 * @returns Owner and repo or null
 */
export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  const patterns = [
    /^https?:\/\/github\.com\/([^/]+)\/([^/]+?)(\.git)?$/,
    /^git@github\.com:([^/]+)\/([^/]+?)(\.git)?$/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1] && match[2]) {
      return {
        owner: match[1],
        repo: match[2].replace(/\.git$/, ''),
      }
    }
  }

  return null
}

// =============================================================================
// Tech Stack Analysis
// =============================================================================

/**
 * Tech stack detection result
 */
export interface TechStackAnalysis {
  /** Detected languages */
  languages?: string[]
  /** Detected frameworks */
  frameworks?: string[]
  /** Detected build tools */
  buildTools?: string[]
  /** Detected package managers */
  packageManagers?: string[]
  /** Inferred project type */
  projectType?: 'web' | 'backend' | 'fullstack' | 'mobile' | 'cli' | 'library' | 'monorepo' | 'other'
  /** Confidence level (0-1) */
  confidence: number
}

/**
 * Analyze project directory to detect tech stack
 * @param projectPath - Path to the project directory
 * @returns Detected tech stack
 */
export async function analyzeTechStack(
  projectPath: string
): Promise<ServiceResult<TechStackAnalysis>> {
  const { readFile } = await import('node:fs/promises')
  const { resolve } = await import('node:path')

  try {
    const analysis: TechStackAnalysis = {
      confidence: 0,
    }

    // Check for package.json
    const packageJsonPath = resolve(projectPath, 'package.json')
    try {
      const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'))

      const deps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      }

      // Detect languages
      const languages: string[] = []
      if (deps.typescript || deps['@types/node']) languages.push('TypeScript')
      if (deps.react || deps['@types/react']) languages.push('React')
      if (deps.vue) languages.push('Vue')
      if (deps.angular) languages.push('Angular')
      if (deps.svelte) languages.push('Svelte')
      if (!languages.includes('JavaScript')) languages.push('JavaScript')

      // Detect frameworks
      const frameworks: string[] = []
      if (deps.react) frameworks.push('React')
      if (deps.vue) frameworks.push('Vue')
      if (deps.angular) frameworks.push('Angular')
      if (deps.svelte) frameworks.push('Svelte')
      if (deps.next || deps['next/link']) frameworks.push('Next.js')
      if (deps.nuxt) frameworks.push('Nuxt')
      if (deps.express) frameworks.push('Express')
      if (deps.fastify) frameworks.push('Fastify')
      if (deps.nest || deps['@nestjs/core']) frameworks.push('NestJS')
      if (deps['@nestjs/common']) frameworks.push('NestJS')
      if (deps.hapi) frameworks.push('Hapi')
      if (deps.koa) frameworks.push('Koa')
      if (deps.django || deps['@types/django']) frameworks.push('Django')
      if (deps.flask) frameworks.push('Flask')
      if (deps.spring || deps['@types/spring']) frameworks.push('Spring')
      if (deps['@nestjs/core']) frameworks.push('NestJS')

      // Detect build tools
      const buildTools: string[] = []
      if (deps.vite) buildTools.push('Vite')
      if (deps.webpack) buildTools.push('Webpack')
      if (deps.rollup) buildTools.push('Rollup')
      if (deps.esbuild) buildTools.push('esbuild')
      if (deps.parcel) buildTools.push('Parcel')
      if (deps.turbopack) buildTools.push('Turbopack')
      if (deps['@babel/core']) buildTools.push('Babel')
      if (deps.tsup) buildTools.push('tsup')

      // Detect package managers
      const packageManagers: string[] = []
      if (packageJson.packageManager) {
        packageManagers.push(packageJson.packageManager.split('@')[0])
      } else {
        // Default to npm if no lockfile check
        packageManagers.push('npm')
      }

      // Detect project type
      const projectName = (packageJson.name || '').toLowerCase()
      if (deps.react || deps.vue || deps.angular || deps.svelte || deps.next || deps.nuxt) {
        analysis.projectType = 'web'
      } else if (deps.express || deps.fastify || deps.nest || deps.hapi || deps.koa) {
        analysis.projectType = 'backend'
      } else if (
        (deps.react && deps.express) ||
        (deps.next && deps['@nestjs/common']) ||
        projectName.includes('fullstack') || projectName.includes('full-stack')
      ) {
        analysis.projectType = 'fullstack'
      } else if (deps['react-native'] || deps.expo || deps.ionic) {
        analysis.projectType = 'mobile'
      } else if (deps.commander || deps.inquirer || deps.yargs || deps.cli) {
        analysis.projectType = 'cli'
      } else if (packageJson.name?.toLowerCase().includes('lib') || packageJson.name?.toLowerCase().includes('package')) {
        analysis.projectType = 'library'
      } else if (deps.turbo || deps.nx || deps.lerna) {
        analysis.projectType = 'monorepo'
      }

      if (languages.length > 0) analysis.languages = languages
      if (frameworks.length > 0) analysis.frameworks = frameworks
      if (buildTools.length > 0) analysis.buildTools = buildTools
      if (packageManagers.length > 0) analysis.packageManagers = packageManagers

      // Calculate confidence based on amount of detected info
      const detectedCount = [languages, frameworks, buildTools, packageManagers]
        .filter((arr) => arr.length > 0).length
      analysis.confidence = Math.min(detectedCount / 4, 1)
    } catch {
      // package.json not found or invalid
    }

    // Check for Python projects
    try {
      await readFile(resolve(projectPath, 'requirements.txt'), 'utf-8')
      analysis.languages = [...(analysis.languages || []), 'Python']
      analysis.projectType = analysis.projectType || 'backend'
      analysis.confidence = Math.max(analysis.confidence, 0.3)
    } catch {
      // requirements.txt not found
    }

    // Check for Go projects
    try {
      await readFile(resolve(projectPath, 'go.mod'), 'utf-8')
      analysis.languages = [...(analysis.languages || []), 'Go']
      analysis.projectType = analysis.projectType || 'backend'
      analysis.confidence = Math.max(analysis.confidence, 0.3)
    } catch {
      // go.mod not found
    }

    // Check for Rust projects
    try {
      await readFile(resolve(projectPath, 'Cargo.toml'), 'utf-8')
      analysis.languages = [...(analysis.languages || []), 'Rust']
      analysis.projectType = analysis.projectType || 'other'
      analysis.confidence = Math.max(analysis.confidence, 0.3)
    } catch {
      // Cargo.toml not found
    }

    // Check for Java/Kotlin projects
    try {
      await readFile(resolve(projectPath, 'pom.xml'), 'utf-8')
      analysis.languages = [...(analysis.languages || []), 'Java']
      analysis.buildTools = [...(analysis.buildTools || []), 'Maven']
      analysis.projectType = analysis.projectType || 'backend'
      analysis.confidence = Math.max(analysis.confidence, 0.3)
    } catch {
      // pom.xml not found
    }

    try {
      await readFile(resolve(projectPath, 'build.gradle'), 'utf-8')
      analysis.languages = [...(analysis.languages || []), 'Kotlin']
      analysis.buildTools = [...(analysis.buildTools || []), 'Gradle']
      analysis.projectType = analysis.projectType || 'other'
      analysis.confidence = Math.max(analysis.confidence, 0.3)
    } catch {
      // build.gradle not found
    }

    // Ensure unique values
    if (analysis.languages) analysis.languages = [...new Set(analysis.languages)]
    if (analysis.frameworks) analysis.frameworks = [...new Set(analysis.frameworks)]
    if (analysis.buildTools) analysis.buildTools = [...new Set(analysis.buildTools)]
    if (analysis.packageManagers) analysis.packageManagers = [...new Set(analysis.packageManagers)]

    return {
      success: true,
      data: analysis,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to analyze tech stack',
      code: 'ANALYSIS_ERROR',
    }
  }
}

export default {
  getGitHubToken,
  getGitHubUser,
  createRepo,
  cloneRepo,
  initGitRepo,
  addRemote,
  initialCommit,
  isGitAvailable,
  parseGitHubUrl,
  analyzeTechStack,
}
