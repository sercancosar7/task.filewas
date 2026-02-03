/**
 * useDragDrop Hook
 * React hook for handling drag and drop file uploads
 * @module @task-filewas/frontend/hooks/useDragDrop
 */

import { useState, useCallback, useRef } from 'react'

// =============================================================================
// Types
// =============================================================================

/**
 * File type categories for upload handling
 */
export type FileCategory = 'image' | 'pdf' | 'code' | 'text' | 'archive' | 'other'

/**
 * File with additional preview properties
 */
export interface FileWithPreview extends File {
  /** File category */
  category?: FileCategory
  /** Preview URL (for images) */
  preview?: string
}

/**
 * Drag and drop state
 */
export type DragDropState = 'idle' | 'dragging' | 'processing' | 'error'

/**
 * Options for useDragDrop hook
 */
export interface UseDragDropOptions {
  /** Callback when files are dropped and accepted */
  onDrop?: (files: File[]) => void | Promise<void>
  /** Callback when a file is rejected */
  onReject?: (file: File, reason: string) => void
  /** Maximum file size in bytes (default: 50MB) */
  maxSize?: number
  /** Allowed MIME types (default: all) */
  accept?: string
  /** Whether multiple files are allowed (default: true) */
  multiple?: boolean
  /** Whether to prevent default behavior on drag over (default: true) */
  preventDefaultOnDragOver?: boolean
}

/**
 * File rejection reason
 */
export interface FileRejection {
  file: File
  reason: string
}

/**
 * Hook return type
 */
export interface UseDragDropReturn {
  /** Current drag state */
  state: DragDropState
  /** Whether a drag operation is in progress */
  isDragging: boolean
  /** Rejected files with reasons */
  rejections: FileRejection[]
  /** Root element ref to attach drag events to */
  rootRef: React.RefObject<HTMLDivElement>
  /** Clear rejections */
  clearRejections: () => void
  /** Reset state to idle */
  reset: () => void
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_MAX_SIZE = 50 * 1024 * 1024 // 50MB

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
export function getFileCategory(file: File): FileCategory {
  // First check MIME type
  const category = MIME_CATEGORIES[file.type]
  if (category) return category

  // Fallback to extension
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (!ext) return 'other'

  const extMap: Record<string, FileCategory> = {
    // Images
    jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', webp: 'image',
    svg: 'image', avif: 'image', bmp: 'image', tiff: 'image', ico: 'image',

    // PDF
    pdf: 'pdf',

    // Code
    js: 'code', jsx: 'code', ts: 'code', tsx: 'code',
    html: 'code', htm: 'code', css: 'code', scss: 'code', less: 'code',
    json: 'code', xml: 'code', yaml: 'code', yml: 'code',
    py: 'code', rb: 'code', php: 'code', go: 'code', rs: 'code',
    java: 'code', c: 'code', cpp: 'code', h: 'code', hpp: 'code',
    cs: 'code', swift: 'code', kt: 'code', kts: 'code',
    sh: 'code', bash: 'code', zsh: 'code', fish: 'code',
    sql: 'code', graphql: 'code', gql: 'code',
    md: 'text', markdown: 'text', txt: 'text',

    // Archives
    zip: 'archive', tar: 'archive', gz: 'archive', '7z': 'archive', rar: 'archive',
  }

  return extMap[ext] || 'other'
}

/**
 * Check if file is an image
 */
export function isImage(file: File): boolean {
  return file.type.startsWith('image/')
}

/**
 * Check if file is a PDF
 */
export function isPdf(file: File): boolean {
  return file.type === 'application/pdf'
}

/**
 * Check if file is a code file
 */
export function isCode(file: File): boolean {
  return getFileCategory(file) === 'code'
}

/**
 * Create a file with preview URL for images
 */
export function createFileWithPreview(file: File): FileWithPreview {
  const fileWithPreview = file as FileWithPreview
  fileWithPreview.category = getFileCategory(file)

  if (isImage(file)) {
    fileWithPreview.preview = URL.createObjectURL(file)
  }

  return fileWithPreview
}

/**
 * Validate file against constraints
 */
export function validateFile(
  file: File,
  options: { maxSize?: number; accept?: string } = {}
): { valid: boolean; reason?: string } {
  const maxSize = options.maxSize ?? DEFAULT_MAX_SIZE

  // Check file size
  if (file.size > maxSize) {
    return {
      valid: false,
      reason: `Dosya boyutu çok büyük (maksimum ${formatFileSize(maxSize)})`,
    }
  }

  // Check MIME type if accept pattern provided
  if (options.accept) {
    const acceptPatterns = options.accept
      .split(',')
      .map((p) => p.trim().toLowerCase())

    const fileType = file.type.toLowerCase()
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase()

    const matches = acceptPatterns.some((pattern) => {
      // Exact MIME type match
      if (pattern.startsWith('.') && pattern === fileExt) return true
      // Wildcard MIME type
      if (pattern.includes('/*')) {
        const baseType = pattern.split('/')[0]
        return fileType.startsWith(baseType + '/')
      }
      // Exact MIME type
      if (pattern === fileType) return true
      return false
    })

    if (!matches) {
      return {
        valid: false,
        reason: `Dosya türü desteklenmiyor (${file.type || fileExt})`,
      }
    }
  }

  return { valid: true }
}

/**
 * Format file size to human readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * React hook for handling drag and drop file uploads
 *
 * @example
 * ```tsx
 * function FileUpload() {
 *   const { state, isDragging, rootRef, clearRejections } = useDragDrop({
 *     onDrop: async (files) => {
 *       await uploadFiles(files)
 *     },
 *     maxSize: 10 * 1024 * 1024, // 10MB
 *     accept: 'image/*,.pdf,.txt',
 *   })
 *
 *   return (
 *     <div ref={rootRef} className={isDragging ? 'dragging' : ''}>
 *       Drop files here
 *     </div>
 *   )
 * }
 * ```
 */
export function useDragDrop(options: UseDragDropOptions = {}): UseDragDropReturn {
  const {
    onDrop,
    onReject,
    maxSize = DEFAULT_MAX_SIZE,
    accept,
    multiple = true,
    preventDefaultOnDragOver = true,
  } = options

  // State
  const [state, setState] = useState<DragDropState>('idle')
  const [rejections, setRejections] = useState<FileRejection[]>([])

  // Refs
  const rootRef = useRef<HTMLDivElement>(null)
  const dragCounterRef = useRef(0)
  const onDropRef = useRef(onDrop)
  const onRejectRef = useRef(onReject)

  // Update refs when callbacks change
  if (onDrop) onDropRef.current = onDrop
  if (onReject) onRejectRef.current = onReject

  // ==========================================================================
  // Handlers
  // ==========================================================================

  /**
   * Handle drag enter event
   */
  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault()
    dragCounterRef.current++

    // Only set dragging state on the first enter
    if (dragCounterRef.current === 1) {
      setState('dragging')
    }
  }, [])

  /**
   * Handle drag over event
   */
  const handleDragOver = useCallback((e: DragEvent) => {
    if (preventDefaultOnDragOver) {
      e.preventDefault()
    }
    // Set dragging state (might have been reset by drag leave)
    setState('dragging')
  }, [preventDefaultOnDragOver])

  /**
   * Handle drag leave event
   */
  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault()
    dragCounterRef.current--

    // Only reset when counter reaches 0 (all drags left)
    if (dragCounterRef.current === 0) {
      setState('idle')
    }
  }, [])

  /**
   * Handle drop event
   */
  const handleDrop = useCallback(
    async (e: DragEvent) => {
      e.preventDefault()
      dragCounterRef.current = 0

      // Get files from drop event
      const dataTransfer = e.dataTransfer
      if (!dataTransfer) return

      const files: File[] = []

      if (dataTransfer.items) {
        // Use DataTransferItemList (modern browsers)
        const items = Array.from(dataTransfer.items)

        for (const item of items) {
          if (item.kind === 'file') {
            const file = item.getAsFile()
            if (file) files.push(file)
          }
        }
      } else {
        // Fallback to dataTransfer.files
        files.push(...Array.from(dataTransfer.files ?? []))
      }

      // Filter and validate files
      const validFiles: File[] = []
      const newRejections: FileRejection[] = []

      for (const file of files) {
        const validation = validateFile(file, {
          maxSize,
          ...(accept && { accept }),
        })

        if (validation.valid) {
          validFiles.push(file)
        } else {
          newRejections.push({
            file,
            reason: validation.reason ?? 'Dosya kabul edilmedi',
          })
        }
      }

      // Update rejections state
      if (newRejections.length > 0) {
        setRejections(newRejections)

        // Call reject callback for each rejected file
        if (onRejectRef.current) {
          for (const rejection of newRejections) {
            onRejectRef.current(rejection.file, rejection.reason)
          }
        }
      }

      // Process valid files
      if (validFiles.length > 0) {
        // Check if multiple files allowed
        const filesToProcess = multiple ? validFiles : validFiles.slice(0, 1)

        setState('processing')

        try {
          await onDropRef.current?.(filesToProcess)
        } catch (error) {
          console.error('Error processing dropped files:', error)
          setState('error')
          return
        }

        setState('idle')
      } else {
        setState('idle')
      }
    },
    [maxSize, accept, multiple]
  )

  /**
   * Clear rejections
   */
  const clearRejectionsCallback = useCallback(() => {
    setRejections([])
  }, [])

  /**
   * Reset state to idle
   */
  const resetCallback = useCallback(() => {
    setState('idle')
    setRejections([])
  }, [])

  // ==========================================================================
  // Event Listener Setup
  // ==========================================================================

  // Attach listeners on mount
  const listenersRef = useRef<(() => void) | null>(null)

  // Simple ref-based setup to avoid stale closure issues
  // We attach listeners directly via ref callback
  const setRootRef = useCallback(
    (node: HTMLDivElement | null) => {
      // Clean up previous listeners
      listenersRef.current?.()

      if (node) {
        // Attach new listeners
        node.addEventListener('dragenter', handleDragEnter)
        node.addEventListener('dragover', handleDragOver)
        node.addEventListener('dragleave', handleDragLeave)
        node.addEventListener('drop', handleDrop)

        listenersRef.current = () => {
          node.removeEventListener('dragenter', handleDragEnter)
          node.removeEventListener('dragover', handleDragOver)
          node.removeEventListener('dragleave', handleDragLeave)
          node.removeEventListener('drop', handleDrop)
        }
      } else {
        listenersRef.current = null
      }

      // Store node in ref (using a mutable ref object)
      ;(rootRef as { current: HTMLDivElement | null }).current = node
    },
    [handleDragEnter, handleDragOver, handleDragLeave, handleDrop]
  )

  // ==========================================================================
  // Return
  // ==========================================================================

  return {
    state,
    isDragging: state === 'dragging',
    rejections,
    rootRef: setRootRef as unknown as React.RefObject<HTMLDivElement>,
    clearRejections: clearRejectionsCallback,
    reset: resetCallback,
  }
}

// =============================================================================
// Default export
// =============================================================================

export default useDragDrop
