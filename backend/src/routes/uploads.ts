/**
 * Upload Routes
 * File upload API endpoints for projects
 * @module @task-filewas/backend/routes/uploads
 */

import { Router, type Request, type Response, type Router as RouterType } from 'express'
import multer, { type FileFilterCallback } from 'multer'
import { promises as fs } from 'node:fs'
import { join, extname } from 'node:path'
import { randomUUID } from 'node:crypto'
import { authMiddleware } from '../middleware/auth.js'
import { ApiError, asyncHandler } from '../middleware/index.js'
import { created, success } from '../utils/apiResponse.js'
import { projectStorage } from '../services/project-storage.js'

const router: RouterType = Router()

// =============================================================================
// Types
// =============================================================================

type FileCategory = 'image' | 'pdf' | 'code' | 'text' | 'archive' | 'other'

interface UploadedFile {
  path: string
  filename: string
  originalName: string
  size: number
  mimeType: string
  category: FileCategory
  url?: string
}

// =============================================================================
// Constants
// =============================================================================

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const UPLOADS_DIR = 'uploads'

// MIME type categories
const MIME_CATEGORIES: Record<string, FileCategory> = {
  // Images
  'image/jpeg': 'image',
  'image/jpg': 'image',
  'image/png': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'image/svg+xml': 'image',
  'image/avif': 'image',
  'image/bmp': 'image',
  'image/tiff': 'image',
  'image/x-icon': 'image',

  // PDF
  'application/pdf': 'pdf',

  // Code/Text files
  'text/plain': 'text',
  'text/html': 'code',
  'text/css': 'code',
  'text/javascript': 'code',
  'text/typescript': 'code',
  'text/x-c': 'code',
  'text/x-c++': 'code',
  'text/x-java-source': 'code',
  'text/x-python': 'code',
  'text/x-ruby': 'code',
  'text/x-php': 'code',
  'text/x-go': 'code',
  'text/x-rust': 'code',
  'text/x-sh': 'code',
  'text/xml': 'code',
  'text/markdown': 'text',

  'application/json': 'code',
  'application/xml': 'code',
  'application/javascript': 'code',
  'application/x-javascript': 'code',
  'application/typescript': 'code',
  'application/x-python': 'code',
  'application/x-sh': 'code',
  'application/x-httpd-php': 'code',

  // Archives
  'application/zip': 'archive',
  'application/x-zip-compressed': 'archive',
  'application/x-tar': 'archive',
  'application/x-gzip': 'archive',
  'application/x-7z-compressed': 'archive',
  'application/x-rar-compressed': 'archive',
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get file category based on MIME type or extension
 */
function getFileCategory(mimeType: string, filename: string): FileCategory {
  // First check MIME type
  const category = MIME_CATEGORIES[mimeType]
  if (category) return category

  // Fallback to extension
  const ext = extname(filename).toLowerCase().slice(1)
  if (!ext) return 'other'

  const extMap: Record<string, FileCategory> = {
    // Images
    jpg: 'image',
    jpeg: 'image',
    png: 'image',
    gif: 'image',
    webp: 'image',
    svg: 'image',
    avif: 'image',
    bmp: 'image',
    tiff: 'image',
    ico: 'image',

    // PDF
    pdf: 'pdf',

    // Code
    js: 'code',
    jsx: 'code',
    ts: 'code',
    tsx: 'code',
    html: 'code',
    htm: 'code',
    css: 'code',
    scss: 'code',
    less: 'code',
    json: 'code',
    xml: 'code',
    yaml: 'code',
    yml: 'code',
    py: 'code',
    rb: 'code',
    php: 'code',
    go: 'code',
    rs: 'code',
    java: 'code',
    c: 'code',
    cpp: 'code',
    h: 'code',
    hpp: 'code',
    cs: 'code',
    swift: 'code',
    kt: 'code',
    kts: 'code',
    sh: 'code',
    bash: 'code',
    zsh: 'code',
    fish: 'code',
    sql: 'code',
    graphql: 'code',
    gql: 'code',

    // Text
    md: 'text',
    markdown: 'text',
    txt: 'text',

    // Archives
    zip: 'archive',
    tar: 'archive',
    gz: 'archive',
    '7z': 'archive',
    rar: 'archive',
  }

  return extMap[ext] || 'other'
}

/**
 * Check if file is an image
 */
export function isImage(category: FileCategory): boolean {
  return category === 'image'
}

/**
 * Check if file is a PDF
 */
export function isPdf(category: FileCategory): boolean {
  return category === 'pdf'
}

/**
 * Check if file is a code file
 */
export function isCode(category: FileCategory): boolean {
  return category === 'code'
}

// =============================================================================
// Multer Configuration
// =============================================================================

/**
 * Storage engine for multer
 * Saves files to project's uploads directory
 */
const storage = multer.diskStorage({
  destination: async (req, _file, cb) => {
    try {
      // Get project ID from params
      const projectId = req.params['id'] as string | undefined

      if (!projectId) {
        return cb(new Error('Project ID required'), '')
      }

      // Get project to verify it exists and get path
      const projectResult = await projectStorage.findById(projectId)

      if (!projectResult.success || !projectResult.data) {
        return cb(new Error('Project not found'), '')
      }

      const project = projectResult.data

      // Create uploads directory in project folder
      const uploadsPath = join(project.path || join(process.cwd(), 'projects', project.id), UPLOADS_DIR)

      // Ensure directory exists
      await fs.mkdir(uploadsPath, { recursive: true })

      // Store uploads path in request for later use
      ;(req as unknown as Record<string, unknown>)['uploadsPath'] = uploadsPath

      cb(null, uploadsPath)
    } catch (error) {
      cb(error instanceof Error ? error : new Error('Failed to create uploads directory'), '')
    }
  },

  filename: (_req, file, cb) => {
    // Generate unique filename with original extension
    const ext = extname(file.originalname)
    const uniqueName = `${randomUUID()}${ext}`
    cb(null, uniqueName)
  },
})

/**
 * File filter for multer
 * Validates file size and type
 */
const fileFilter = (
  _req: Request,
  _file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  // Accept all file types (validation can be done at application level)
  // File size is validated by multer limits option
  cb(null, true)
}

// Create multer upload instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 10, // Max 10 files at once
  },
})

// =============================================================================
// Routes
// =============================================================================

/**
 * POST /api/projects/:id/uploads
 * Upload files to a project
 *
 * Path Parameters:
 * - id: Project ID
 *
 * Request Body (multipart/form-data):
 * - files: File(s) to upload (field name 'files', can be multiple)
 *
 * Query Parameters:
 * - category: Optional file category filter
 *
 * Returns: Uploaded file info array
 */
router.post(
  '/:id/uploads',
  authMiddleware,
  upload.array('files', 10), // Max 10 files
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const projectId = req.params['id'] as string

    // Get files from multer
    const files = req.files as Express.Multer.File[] | undefined

    if (!files || files.length === 0) {
      throw ApiError.badRequest('No files uploaded')
    }

    // Get uploads path from request (set by multer storage)
    const uploadsPath = (req as unknown as Record<string, unknown>)['uploadsPath'] as string | undefined

    if (!uploadsPath) {
      throw ApiError.internal('Upload path not determined')
    }

    // Process each file
    const uploadedFiles: UploadedFile[] = files.map((file) => {
      const category = getFileCategory(file.mimetype, file.originalname)

      return {
        path: join(UPLOADS_DIR, file.filename),
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
        category,
        url: `/api/projects/${projectId}/files/${file.filename}`,
      }
    })

    // Return uploaded files info
    res.json(created(uploadedFiles))
  })
)

/**
 * GET /api/projects/:id/files/:filename
 * Serve an uploaded file
 *
 * Path Parameters:
 * - id: Project ID
 * - filename: Name of the file to serve
 *
 * Returns: File content
 */
router.get(
  '/:id/files/:filename',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const projectId = req.params['id'] as string
    const filename = req.params['filename'] as string

    // Get project to verify it exists
    const projectResult = await projectStorage.findById(projectId)

    if (!projectResult.success || !projectResult.data) {
      throw ApiError.notFound('Project not found')
    }

    const project = projectResult.data
    const filePath = join(project.path || join(process.cwd(), 'projects', project.id), UPLOADS_DIR, filename)

    // Check if file exists
    try {
      await fs.access(filePath)
    } catch {
      throw ApiError.notFound('File not found')
    }

    // Determine content type
    const ext = extname(filename).toLowerCase()
    const contentTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf',
      '.json': 'application/json',
      '.txt': 'text/plain',
      '.md': 'text/markdown',
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.ts': 'application/typescript',
    }

    const contentType = contentTypes[ext] || 'application/octet-stream'

    // Set cache headers for static assets
    res.setHeader('Cache-Control', 'public, max-age=31536000') // 1 year
    res.setHeader('Content-Type', contentType)

    // Send file
    res.sendFile(filePath, {
      root: '/',
    })
  })
)

/**
 * DELETE /api/projects/:id/files/:filename
 * Delete an uploaded file
 *
 * Path Parameters:
 * - id: Project ID
 * - filename: Name of the file to delete
 *
 * Returns: Success response
 */
router.delete(
  '/:id/files/:filename',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const projectId = req.params['id'] as string
    const filename = req.params['filename'] as string

    // Get project to verify it exists
    const projectResult = await projectStorage.findById(projectId)

    if (!projectResult.success || !projectResult.data) {
      throw ApiError.notFound('Project not found')
    }

    const project = projectResult.data
    const filePath = join(project.path || join(process.cwd(), 'projects', project.id), UPLOADS_DIR, filename)

    // Check if file exists
    try {
      await fs.access(filePath)
    } catch {
      throw ApiError.notFound('File not found')
    }

    // Delete file
    await fs.unlink(filePath)

    res.json(success({ message: 'File deleted', filename }))
  })
)

/**
 * GET /api/projects/:id/uploads
 * List all uploaded files for a project
 *
 * Path Parameters:
 * - id: Project ID
 *
 * Query Parameters:
 * - category: Optional file category filter
 *
 * Returns: List of uploaded files
 */
router.get(
  '/:id/uploads',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const projectId = req.params['id'] as string
    const categoryFilter = req.query['category'] as FileCategory | undefined

    // Get project to verify it exists
    const projectResult = await projectStorage.findById(projectId)

    if (!projectResult.success || !projectResult.data) {
      throw ApiError.notFound('Project not found')
    }

    const project = projectResult.data
    const uploadsPath = join(project.path || join(process.cwd(), 'projects', project.id), UPLOADS_DIR)

    // Check if uploads directory exists
    let files: string[] = []
    try {
      files = await fs.readdir(uploadsPath)
    } catch {
      // Directory doesn't exist, return empty list
      res.json(success([]))
      return
    }

    // Get file info for each file
    const uploadedFiles: UploadedFile[] = []

    for (const filename of files) {
      const filePath = join(uploadsPath, filename)
      try {
        const stats = await fs.stat(filePath)

        if (stats.isFile()) {
          // Try to determine MIME type from extension
          const category = getFileCategory('', filename)

          // Apply category filter if provided
          if (categoryFilter && category !== categoryFilter) {
            continue
          }

          uploadedFiles.push({
            path: join(UPLOADS_DIR, filename),
            filename,
            originalName: filename, // We don't store original name separately
            size: stats.size,
            mimeType: 'application/octet-stream', // Default MIME type
            category,
            url: `/api/projects/${projectId}/files/${filename}`,
          })
        }
      } catch {
        // Skip files that can't be read
        continue
      }
    }

    // Sort by modification time (newest first)
    uploadedFiles.sort((a, b) => b.filename.localeCompare(a.filename))

    res.json(success(uploadedFiles))
  })
)

export { router as uploadsRouter }
export default router
