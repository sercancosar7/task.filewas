/**
 * DropZone Component
 * Visual overlay for drag and drop file uploads (Craft Agents style)
 * @module @task-filewas/frontend/components/chat/DropZone
 */

import * as React from 'react'
import {
  Upload,
  FileImage,
  FileText,
  Code,
  Archive,
  X,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDragDrop, formatFileSize, type FileCategory } from '@/hooks/useDragDrop'

// =============================================================================
// Types
// =============================================================================

export interface DropZoneProps {
  /** Callback when files are accepted */
  onUpload: (files: File[]) => void | Promise<void>
  /** Callback when a file is rejected */
  onReject?: (file: File, reason: string) => void
  /** Whether drop zone is active/visible */
  active?: boolean
  /** Maximum file size in bytes (default: 50MB) */
  maxSize?: number
  /** Accepted MIME types (e.g., 'image/*,.pdf') */
  accept?: string
  /** Allow multiple files (default: true) */
  multiple?: boolean
  /** Additional CSS classes */
  className?: string
  /** Custom upload button icon */
  icon?: React.ReactNode
  /** Custom message */
  message?: string
  /** Custom sub-message */
  subMessage?: string
}

// =============================================================================
// File Category Icons
// =============================================================================

const CATEGORY_ICONS: Record<FileCategory, React.ReactNode> = {
  image: <FileImage className="w-5 h-5" />,
  pdf: <FileText className="w-5 h-5" />,
  code: <Code className="w-5 h-5" />,
  text: <FileText className="w-5 h-5" />,
  archive: <Archive className="w-5 h-5" />,
  other: <FileText className="w-5 h-5" />,
}

const CATEGORY_COLORS: Record<FileCategory, string> = {
  image: 'text-green-400',
  pdf: 'text-red-400',
  code: 'text-blue-400',
  text: 'text-yellow-400',
  archive: 'text-purple-400',
  other: 'text-muted-foreground',
}

// =============================================================================
// Component
// =============================================================================

/**
 * DropZone - Drag and drop file upload overlay
 *
 * @example
 * ```tsx
 * <DropZone
 *   active={isDragging}
 *   onUpload={handleFileUpload}
 *   accept="image/*,.pdf,.txt"
 *   maxSize={10 * 1024 * 1024}
 * />
 * ```
 */
export function DropZone({
  onUpload,
  onReject,
  active = true,
  maxSize = 50 * 1024 * 1024, // 50MB default
  accept,
  multiple = true,
  className,
  icon,
  message,
  subMessage,
}: DropZoneProps) {
  // Use drag drop hook
  const { isDragging, rejections, rootRef, clearRejections } = useDragDrop({
    onDrop: onUpload,
    ...(onReject && { onReject }),
    maxSize,
    ...(accept && { accept }),
    multiple,
  })

  // ==========================================================================
  // Derived State
  // ==========================================================================

  const isVisible = active && isDragging
  const hasRejections = rejections.length > 0

  // ==========================================================================
  // Auto-dismiss rejections after delay
  // ==========================================================================

  React.useEffect(() => {
    if (hasRejections) {
      const timer = setTimeout(() => {
        clearRejections()
      }, 5000) // 5 seconds

      return () => clearTimeout(timer)
    }
  }, [hasRejections, clearRejections])

  // ==========================================================================
  // Render
  // ==========================================================================

  if (!isVisible && !hasRejections) {
    return null
  }

  return (
    <div
      ref={rootRef}
      className={cn(
        // Fixed overlay covering entire drop area
        'fixed inset-0 z-50',
        // Flex centering
        'flex items-center justify-center',
        // Transitions
        'transition-opacity duration-200',
        // State-based visibility
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none',
        className
      )}
    >
      {/* Backdrop */}
      <div
        className={cn(
          'absolute inset-0',
          'bg-accent/5',
          'backdrop-blur-[2px]'
        )}
        aria-hidden="true"
      />

      {/* Drop Zone Card */}
      <div
        className={cn(
          // Relative positioning for z-index
          'relative z-10',
          // Sizing
          'w-full max-w-md mx-4',
          // Spacing
          'p-8',
          // Border radius
          'rounded-[12px]',
          // Border (dashed when dragging)
          'border-2 border-dashed border-accent/50',
          // Background
          'bg-background/80',
          // Shadow
          'shadow-lg',
          // Animation
          'animate-in fade-in zoom-in duration-200'
        )}
      >
        {/* Icon */}
        <div
          className={cn(
            'flex items-center justify-center',
            'w-16 h-16 mx-auto mb-4',
            'rounded-full',
            'bg-accent/10',
            'text-accent'
          )}
        >
          {icon || <Upload className="w-8 h-8" />}
        </div>

        {/* Message */}
        <div className="text-center mb-4">
          <h3 className="text-lg font-medium text-foreground mb-1">
            {message || 'Dosyaları buraya bırakın'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {subMessage ||
              `Sürükle bırak veya tıklayarak seçin ${
                accept ? `(${accept})` : ''
              }`}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Maksimum dosya boyutu: {formatFileSize(maxSize)}
          </p>
        </div>

        {/* Rejections */}
        {hasRejections && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm font-medium text-destructive mb-2">
              <span className="flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                Bazı dosyalar kabul edilmedi
              </span>
              <button
                type="button"
                onClick={clearRejections}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Kapat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {rejections.map((rejection, index) => (
                <div
                  key={`${rejection.file.name}-${index}`}
                  className="flex items-start gap-2 text-xs p-2 rounded-md bg-destructive/10"
                >
                  <AlertCircle className="w-3 h-3 text-destructive shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-destructive truncate">
                      {rejection.file.name}
                    </div>
                    <div className="text-muted-foreground">
                      {rejection.reason}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Supported file types indicator */}
        {accept && !hasRejections && (
          <div className="mt-4 pt-4 border-t border-foreground/10">
            <p className="text-xs text-center text-muted-foreground">
              Desteklenen formatlar: {accept}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// File Preview Item
// =============================================================================

export interface FilePreviewItemProps {
  /** File to preview */
  file: File
  /** File category */
  category: FileCategory
  /** Upload progress (0-100) */
  progress?: number
  /** Upload status */
  status?: 'pending' | 'uploading' | 'success' | 'error'
  /** Error message */
  error?: string
  /** On remove callback */
  onRemove?: () => void
  /** Preview URL for images */
  preview?: string
}

/**
 * FilePreviewItem - Single file preview with progress
 */
export function FilePreviewItem({
  file,
  category,
  progress = 0,
  status = 'pending',
  error,
  onRemove,
  preview,
}: FilePreviewItemProps) {
  const categoryIcon = CATEGORY_ICONS[category]
  const categoryColor = CATEGORY_COLORS[category]

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg',
        'bg-foreground/5',
        'border border-foreground/10',
        status === 'error' && 'border-destructive/50 bg-destructive/5',
        status === 'success' && 'border-success/50 bg-success/5'
      )}
    >
      {/* File Icon or Preview */}
      <div
        className={cn(
          'flex items-center justify-center shrink-0',
          'w-10 h-10 rounded-md',
          'bg-foreground/10',
          categoryColor
        )}
      >
        {category === 'image' && preview ? (
          <img
            src={preview}
            alt={file.name}
            className="w-full h-full object-cover rounded-md"
          />
        ) : (
          categoryIcon
        )}
      </div>

      {/* File Info */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground truncate">
          {file.name}
        </div>
        <div className="text-xs text-muted-foreground">
          {formatFileSize(file.size)}
        </div>

        {/* Progress Bar */}
        {status === 'uploading' && progress < 100 && (
          <div className="mt-1.5 h-1 bg-foreground/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Error Message */}
        {status === 'error' && error && (
          <div className="text-xs text-destructive mt-0.5">{error}</div>
        )}
      </div>

      {/* Status Icon */}
      <div className="shrink-0">
        {status === 'uploading' && (
          <div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        )}
        {status === 'success' && (
          <div className="w-5 h-5 rounded-full bg-success flex items-center justify-center">
            <svg
              className="w-3 h-3 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        )}
        {status === 'error' && (
          <div className="w-5 h-5 rounded-full bg-destructive flex items-center justify-center">
            <X className="w-3 h-3 text-white" />
          </div>
        )}
        {(status === 'pending' || status === 'success') && onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-foreground/10 transition-colors"
            aria-label="Kaldır"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// File Upload Button
// =============================================================================

export interface FileUploadButtonProps {
  /** Callback when files are selected */
  onUpload: (files: File[]) => void | Promise<void>
  /** Accepted file types */
  accept?: string
  /** Allow multiple files */
  multiple?: boolean
  /** Button variant */
  variant?: 'default' | 'ghost' | 'outline'
  /** Button size */
  size?: 'default' | 'sm' | 'icon'
  /** Child content */
  children?: React.ReactNode
  /** Additional CSS classes */
  className?: string
}

/**
 * FileUploadButton - Button that opens file picker
 */
export function FileUploadButton({
  onUpload,
  accept,
  multiple = true,
  children,
  className,
}: FileUploadButtonProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)

  const handleClick = () => {
    inputRef.current?.click()
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      void onUpload(files)
    }
    // Reset input so same file can be selected again
    e.target.value = ''
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
        className="hidden"
        aria-label="Dosya seç"
      />
      <button
        type="button"
        onClick={handleClick}
        className={className}
        aria-label="Dosya yükle"
      >
        {children || <Upload className="w-4 h-4" />}
      </button>
    </>
  )
}

// =============================================================================
// Default Export
// =============================================================================

export default DropZone
