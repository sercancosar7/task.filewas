/**
 * File Routes
 * File browser and file content API endpoints
 * @module @task-filewas/backend/routes/files
 */

import { Router, type Request, type Response, type Router as RouterType } from 'express'
import { z } from 'zod'
import { promises as fs } from 'node:fs'
import { join, relative, normalize, sep } from 'node:path'
import { authMiddleware } from '../middleware/auth.js'
import { ApiError, asyncHandler } from '../middleware/index.js'
import { success } from '../utils/apiResponse.js'
import { projectStorage } from '../services/project-storage.js'

const router: RouterType = Router()

// =============================================================================
// Types
// =============================================================================

/**
 * File type for display
 */
export type FileType = 'file' | 'directory' | 'symlink'

/**
 * File node in the tree
 */
export interface FileNode {
  /** File name */
  name: string
  /** Full relative path from project root */
  path: string
  /** File type */
  type: FileType
  /** File size in bytes (files only) */
  size?: number
  /** Last modified timestamp */
  mtime?: string
  /** File extension (files only) */
  extension?: string
  /** Children (directories only) */
  children?: FileNode[]
  /** Depth in tree (for rendering) */
  depth: number
  /** Language for syntax highlighting (files only) */
  language?: string
}

/**
 * File content response
 */
export interface FileContent {
  /** File path */
  path: string
  /** File name */
  name: string
  /** File content */
  content: string
  /** File size */
  size: number
  /** Encoding used */
  encoding: string
  /** Language for syntax highlighting */
  language?: string
  /** Whether file is binary (content may be truncated) */
  isBinary?: boolean
}

// =============================================================================
// Validation Schemas
// =============================================================================

/**
 * Query parameters for file list endpoint
 */
const fileListQuerySchema = z.object({
  depth: z.string().optional().transform((val) => val ? parseInt(val, 10) : 1),
  includeHidden: z.string().optional().transform((val) => val === 'true'),
})

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get language from file extension for syntax highlighting
 */
function getLanguageFromExtension(filename: string): string | undefined {
  const ext = filename.split('.').pop()?.toLowerCase()

  const languageMap: Record<string, string> = {
    // JavaScript/TypeScript
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    mjs: 'javascript',
    cjs: 'javascript',
    mts: 'typescript',
    cts: 'typescript',

    // Styles
    css: 'css',
    scss: 'scss',
    sass: 'sass',
    less: 'less',
    styl: 'stylus',

    // Markup
    html: 'html',
    htm: 'html',
    xml: 'xml',
    svg: 'xml',
    md: 'markdown',
    markdown: 'markdown',

    // Config/Data
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    toml: 'toml',
    ini: 'ini',

    // Python
    py: 'python',
    pyc: 'python',

    // Go
    go: 'go',

    // Rust
    rs: 'rust',

    // C/C++
    c: 'c',
    cpp: 'cpp',
    cc: 'cpp',
    h: 'c',
    hpp: 'cpp',

    // Java
    java: 'java',

    // C#
    cs: 'csharp',

    // PHP
    php: 'php',

    // Ruby
    rb: 'ruby',

    // Shell
    sh: 'bash',
    bash: 'bash',
    zsh: 'bash',
    fish: 'bash',

    // SQL
    sql: 'sql',

    // Other
    txt: 'text',
    graphql: 'graphql',
    gql: 'graphql',
    dockerfile: 'dockerfile',
    dockerignore: 'ignore',
    gitignore: 'ignore',
    env: 'bash',
  }

  // Check for Dockerfile, etc. without extension
  if (filename.toLowerCase() === 'dockerfile') return 'dockerfile'
  if (filename.toLowerCase() === 'gitignore') return 'ignore'
  if (filename.toLowerCase() === 'dockerignore') return 'ignore'
  if (filename.toLowerCase() === 'env') return 'bash'
  if (filename.toLowerCase() === '.env') return 'bash'
  if (filename.toLowerCase().endsWith('.env.example')) return 'bash'
  if (filename.toLowerCase().endsWith('.env.local')) return 'bash'
  if (filename.toLowerCase().endsWith('.env.production')) return 'bash'

  return ext ? languageMap[ext] : undefined
}

/**
 * Check if file is likely binary based on extension
 */
function isBinaryFile(filename: string): boolean {
  const binaryExtensions = [
    'png', 'jpg', 'jpeg', 'gif', 'bmp', 'ico', 'webp', 'svg',
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
    'zip', 'tar', 'gz', 'rar', '7z',
    'exe', 'dll', 'so', 'dylib',
    'mp3', 'mp4', 'avi', 'mov', 'wav',
    'ttf', 'otf', 'woff', 'woff2', 'eot',
    'class', 'jar', 'war',
    'node', 'wasm',
  ]

  const ext = filename.split('.').pop()?.toLowerCase()
  return ext ? binaryExtensions.includes(ext) : false
}

/**
 * Check if path should be hidden
 */
function isHidden(name: string): boolean {
  return name.startsWith('.') || name === 'node_modules' || name === 'dist' || name === 'build'
}

/**
 * Build file tree from directory entries
 */
async function buildFileTree(
  dirPath: string,
  projectRoot: string,
  depth = 1,
  currentDepth = 0,
  includeHidden = false
): Promise<FileNode[]> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true })
    const nodes: FileNode[] = []

    for (const entry of entries) {
      // Skip hidden files/directories if not included
      if (!includeHidden && isHidden(entry.name)) {
        continue
      }

      const fullPath = join(dirPath, entry.name)
      const relPath = relative(projectRoot, fullPath)
      const normalizedPath = relPath.split(sep).join('/')

      const node: FileNode = {
        name: entry.name,
        path: normalizedPath,
        type: entry.isDirectory() ? 'directory' : entry.isSymbolicLink() ? 'symlink' : 'file',
        depth: currentDepth,
      }

      if (entry.isDirectory()) {
        // Recursively get children if depth allows
        if (currentDepth < depth - 1) {
          node.children = await buildFileTree(fullPath, projectRoot, depth, currentDepth + 1, includeHidden)
        }
      } else if (entry.isFile()) {
        try {
          const stats = await fs.stat(fullPath)
          node.size = stats.size
          node.mtime = stats.mtime.toISOString()
          const parts = entry.name.split('.')
          if (parts.length > 1) {
            const ext = parts.pop()
            if (ext) node.extension = ext
          }
          const lang = getLanguageFromExtension(entry.name)
          if (lang) node.language = lang
        } catch {
          // Skip files we can't stat
          continue
        }
      } else if (entry.isSymbolicLink()) {
        try {
          const stats = await fs.stat(fullPath)
          node.size = stats.size
          node.mtime = stats.mtime.toISOString()
        } catch {
          // Broken symlink, still include but no stats
        }
      }

      nodes.push(node)
    }

    // Sort: directories first, then files, both alphabetically
    return nodes.sort((a, b) => {
      if (a.type === 'directory' && b.type !== 'directory') return -1
      if (a.type !== 'directory' && b.type === 'directory') return 1
      return a.name.localeCompare(b.name)
    })
  } catch {
    return []
  }
}

/**
 * Validate and resolve file path to prevent directory traversal
 */
function resolveFilePath(projectRoot: string, requestPath: string): { valid: boolean; fullPath?: string; error?: string } {
  // Normalize paths
  const normalizedRoot = normalize(projectRoot)
  const normalizedReq = normalize(join(projectRoot, requestPath))

  // Check if resolved path is within project root
  const relPath = relative(normalizedRoot, normalizedReq)

  // Check for directory traversal (path starts with ..)
  if (relPath.startsWith('..') || relPath.includes('..')) {
    return { valid: false, error: 'Path traversal detected' }
  }

  // Additional check: ensure the resolved path starts with root
  if (!normalizedReq.startsWith(normalizedRoot)) {
    return { valid: false, error: 'Invalid path' }
  }

  return { valid: true, fullPath: normalizedReq }
}

// =============================================================================
// Routes
// =============================================================================

/**
 * GET /api/projects/:id/files
 * List files in a project directory
 *
 * Path Parameters:
 * - id: Project ID
 *
 * Query Parameters:
 * - path: Relative path from project root (default: root)
 * - depth: Directory tree depth (default: 1, max: 5)
 * - includeHidden: Include hidden files (default: false)
 *
 * Returns: File tree structure
 */
router.get(
  '/:id/files',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params['id'] as string | undefined

    if (!id || typeof id !== 'string') {
      throw ApiError.badRequest('Project ID is required')
    }

    // Validate query parameters
    const queryResult = fileListQuerySchema.safeParse(req.query)
    if (!queryResult.success) {
      throw ApiError.badRequest(
        'Invalid query parameters',
        queryResult.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }))
      )
    }

    const { depth, includeHidden } = queryResult.data

    // Limit depth to prevent performance issues
    const safeDepth = Math.min(Math.max(depth, 1), 5)

    // Get project to find root path
    const projectResult = await projectStorage.findById(id)
    if (!projectResult.success || !projectResult.data) {
      throw ApiError.notFound(`Project not found: ${id}`)
    }

    const project = projectResult.data
    const projectRoot = project.path

    // Get requested path (default to root)
    const requestPath = (req.query['path'] as string) || ''

    // Validate and resolve path
    const resolved = resolveFilePath(projectRoot, requestPath)
    if (!resolved.valid) {
      throw ApiError.forbidden(resolved.error || 'Invalid path')
    }

    const targetPath = resolved.fullPath!

    // Check if path exists
    try {
      await fs.access(targetPath)
    } catch {
      throw ApiError.notFound(`Path not found: ${requestPath || '/'}`)
    }

    // Check if it's a directory
    const stats = await fs.stat(targetPath)
    if (!stats.isDirectory()) {
      throw ApiError.badRequest('Path is not a directory')
    }

    // Build file tree
    const files = await buildFileTree(targetPath, projectRoot, safeDepth, 0, includeHidden)

    res.json(success({
      path: requestPath || '/',
      files,
      depth: safeDepth,
      projectRoot,
    }))
  })
)

/**
 * GET /api/projects/:id/files/*
 * Get file content
 *
 * Path Parameters:
 * - id: Project ID
 * - *: File path (catch-all route)
 *
 * Query Parameters:
 * - encoding: File encoding (default: utf-8)
 *
 * Returns: File content with metadata
 */
router.get(
  '/:id/files/*',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params['id'] as string | undefined

    if (!id || typeof id !== 'string') {
      throw ApiError.badRequest('Project ID is required')
    }

    // Get project to find root path
    const projectResult = await projectStorage.findById(id)
    if (!projectResult.success || !projectResult.data) {
      throw ApiError.notFound(`Project not found: ${id}`)
    }

    const project = projectResult.data
    const projectRoot = project.path

    // Get file path from wildcard
    const requestPath = req.params[0] as string || ''
    const encoding = (req.query['encoding'] as string) || 'utf-8'

    if (!requestPath) {
      throw ApiError.badRequest('File path is required')
    }

    // Validate and resolve path
    const resolved = resolveFilePath(projectRoot, requestPath)
    if (!resolved.valid) {
      throw ApiError.forbidden(resolved.error || 'Invalid path')
    }

    const targetPath = resolved.fullPath!

    // Check if path exists
    try {
      await fs.access(targetPath)
    } catch {
      throw ApiError.notFound(`File not found: ${requestPath}`)
    }

    // Check if it's a file (not directory)
    const stats = await fs.stat(targetPath)
    if (stats.isDirectory()) {
      throw ApiError.badRequest('Path is a directory, not a file')
    }

    // Check file size (limit to 1MB for API response)
    const maxSize = 1024 * 1024 // 1MB
    if (stats.size > maxSize) {
      throw ApiError.badRequest(`File too large (${stats.size} bytes). Max size: ${maxSize} bytes`)
    }

    // Check if file is binary
    const isBinary = isBinaryFile(requestPath.split('/').pop() || '')

    let content: string

    if (isBinary) {
      // For binary files, return a placeholder
      content = `[Binary file - ${stats.size} bytes]`
    } else {
      try {
        content = await fs.readFile(targetPath, { encoding: encoding as BufferEncoding })
      } catch (readError) {
        // If encoding fails, try utf-8 as fallback
        try {
          content = await fs.readFile(targetPath, 'utf-8')
        } catch {
          throw ApiError.internal('Failed to read file')
        }
      }
    }

    const filename = requestPath.split('/').pop() || ''
    const fileLang = getLanguageFromExtension(filename)

    // Build FileContent object conditionally
    const fileContentBase = {
      path: requestPath,
      name: filename,
      content,
      size: stats.size,
      encoding,
      isBinary,
    } as Omit<FileContent, 'language'> & { language?: string }

    if (fileLang) {
      fileContentBase.language = fileLang
    }

    res.json(success(fileContentBase))
  })
)

/**
 * POST /api/projects/:id/files/search
 * Search for files by name pattern
 *
 * Path Parameters:
 * - id: Project ID
 *
 * Request Body:
 * - pattern: Glob pattern to search
 * - excludePatterns: Patterns to exclude
 *
 * Returns: List of matching files
 */
const searchSchema = z.object({
  pattern: z.string().min(1),
  excludePatterns: z.array(z.string()).optional(),
})

router.post(
  '/:id/files/search',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params['id'] as string | undefined

    if (!id || typeof id !== 'string') {
      throw ApiError.badRequest('Project ID is required')
    }

    // Validate request body
    const parseResult = searchSchema.safeParse(req.body)
    if (!parseResult.success) {
      throw ApiError.badRequest(
        'Invalid request body',
        parseResult.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }))
      )
    }

    const { pattern, excludePatterns = [] } = parseResult.data

    // Get project
    const projectResult = await projectStorage.findById(id)
    if (!projectResult.success || !projectResult.data) {
      throw ApiError.notFound(`Project not found: ${id}`)
    }

    const project = projectResult.data
    const projectRoot = project.path

    // Simple recursive search function
    async function searchDir(dir: string, pattern: string): Promise<string[]> {
      const results: string[] = []

      // Convert glob pattern to regex
      const regexPattern = pattern
        .replace(/\*\*/g, '.*')
        .replace(/\*/g, '[^/]*')
        .replace(/\./g, '\\.')
        .replace(/\{/g, '(')
        .replace(/\}/g, ')')
        .replace(/,/g, '|')

      const regex = new RegExp(regexPattern)

      async function walk(currentPath: string) {
        try {
          const entries = await fs.readdir(currentPath, { withFileTypes: true })

          for (const entry of entries) {
            // Skip hidden and common exclusions
            if (entry.name.startsWith('.') || entry.name === 'node_modules') {
              continue
            }

            const fullPath = join(currentPath, entry.name)
            const relPath = relative(projectRoot, fullPath).split(sep).join('/')

            // Check excludes
            const isExcluded = excludePatterns.some((exclude) => {
              try {
                const excludeRegex = new RegExp(
                  exclude.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*').replace(/\./g, '\\.')
                )
                return excludeRegex.test(relPath)
              } catch {
                return false
              }
            })

            if (isExcluded) continue

            if (entry.isDirectory()) {
              await walk(fullPath)
            } else if (entry.isFile() && regex.test(relPath)) {
              results.push(relPath)
            }
          }
        } catch {
          // Skip directories we can't read
        }
      }

      await walk(dir)
      return results
    }

    const matchedFiles = await searchDir(projectRoot, pattern)

    // Get stats for each file
    const fileNodes: FileNode[] = await Promise.all(
      matchedFiles.map(async (filePath: string) => {
        const fullPath = join(projectRoot, filePath)
        try {
          const stats = await fs.stat(fullPath)
          const filename = filePath.split('/').pop() || ''
          const extParts = filename.split('.')
          const ext = extParts.length > 1 ? extParts.pop() : undefined
          const lang = getLanguageFromExtension(filename)

          return {
            name: filename,
            path: filePath,
            type: 'file' as FileType,
            size: stats.size,
            mtime: stats.mtime.toISOString(),
            ...(ext ? { extension: ext } : {}),
            ...(lang ? { language: lang } : {}),
            depth: 0,
          }
        } catch {
          return {
            name: filePath.split('/').pop() || '',
            path: filePath,
            type: 'file' as FileType,
            depth: 0,
          }
        }
      })
    )

    res.json(success({
      pattern,
      files: fileNodes,
      count: fileNodes.length,
    }))
  })
)

export { router as filesRouter }
export default router
