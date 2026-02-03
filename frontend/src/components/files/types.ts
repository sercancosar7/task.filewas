/**
 * File Browser Types
 */

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
  /** Language for syntax highlighting */
  language?: string
  /** Whether the directory is expanded */
  isExpanded?: boolean
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
  /** Whether file is binary */
  isBinary?: boolean
}

/**
 * File browser API response
 */
export interface FileListResponse {
  /** Current path */
  path: string
  /** File nodes */
  files: FileNode[]
  /** Current depth */
  depth: number
  /** Project root path */
  projectRoot: string
}

/**
 * File browser props
 */
export interface FileBrowserProps {
  /** Project ID */
  projectId: string
  /** Currently selected file path */
  selectedFile?: string
  /** Callback when file is selected */
  onSelectFile?: (path: string) => void
  /** Additional class names */
  className?: string
  /** Initial depth for file tree */
  initialDepth?: number
}

/**
 * File viewer props
 */
export interface FileViewerProps {
  /** Project ID */
  projectId: string
  /** File path to view */
  filePath: string
  /** Additional class names */
  className?: string
  /** Callback when close is requested */
  onClose?: () => void
}

/**
 * File browser and viewer combined props
 */
export interface FileExplorerProps {
  /** Project ID */
  projectId: string
  /** Additional class names */
  className?: string
}
