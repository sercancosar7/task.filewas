/**
 * Upload Type Definitions
 * @module @task-filewas/frontend/types/upload
 */

/**
 * File with additional preview properties
 */
export interface FileWithPreview extends File {
  /** File category */
  category?: 'image' | 'pdf' | 'code' | 'text' | 'archive' | 'other'
  /** Preview URL (for images) */
  preview?: string
}

/**
 * Upload result from API
 */
export interface UploadResult {
  /** Uploaded file path (relative) */
  path: string
  /** Original filename */
  filename: string
  /** File size in bytes */
  size: number
  /** MIME type */
  mimeType: string
  /** File category */
  category: 'image' | 'pdf' | 'code' | 'text' | 'archive' | 'other'
  /** Upload URL for accessing the file */
  url?: string
}

/**
 * Upload API response
 */
export interface UploadResponse {
  success: boolean
  data?: UploadResult[]
  error?: string
}

/**
 * Upload progress callback
 */
export type UploadProgressCallback = (progress: {
  loaded: number
  total: number
  percentage: number
}) => void

export default {}
