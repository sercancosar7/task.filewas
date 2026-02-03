/**
 * FileBrowser Component
 *
 * Proje dosya ağacını gösteren sidebar component
 * Craft Agents tarzı directory tree
 */

import * as React from 'react'
import {
  Folder,
  FolderOpen,
  File,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Search,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FileBrowserProps, FileNode } from './types'

// File type icon mappings
const FILE_ICONS: Partial<Record<string, React.ReactNode>> = {
  javascript: '📜',
  typescript: '📘',
  jsx: '⚛️',
  tsx: '⚛️',
  json: '📋',
  markdown: '📝',
  html: '🌐',
  css: '🎨',
  scss: '🎨',
  svg: '🖼️',
  png: '🖼️',
  jpg: '🖼️',
  pdf: '📕',
  zip: '📦',
}

// Get icon for file based on extension
function getFileIcon(node: FileNode): React.ReactNode {
  if (node.type === 'directory') {
    return null // Handled separately
  }

  const ext = node.extension?.toLowerCase()
  const lang = node.language?.toLowerCase()

  if (lang && FILE_ICONS[lang]) {
    return FILE_ICONS[lang]
  }

  if (ext && FILE_ICONS[ext]) {
    return FILE_ICONS[ext]
  }

  return <File className="h-3.5 w-3.5 text-foreground/40" />
}

// Format file size
function formatSize(bytes?: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export const FileBrowser: React.FC<FileBrowserProps> = ({
  projectId,
  selectedFile,
  onSelectFile,
  className,
  initialDepth = 2,
}) => {
  const [files, setFiles] = React.useState<FileNode[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [expandedDirs, setExpandedDirs] = React.useState<Set<string>>(new Set())
  const [currentPath, setCurrentPath] = React.useState<string>('/')

  // Expanded nodes state for lazy loading
  const [expandedPaths, setExpandedPaths] = React.useState<Set<string>>(new Set(['']))

  // Fetch file list
  const fetchFiles = React.useCallback(async (path: string = '/', depth = 1) => {
    setLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('Authentication required')
      }

      const queryParams = new URLSearchParams()
      if (path !== '/') {
        queryParams.set('path', path)
      }
      queryParams.set('depth', depth.toString())

      const response = await fetch(
        `/api/projects/${projectId}/files?${queryParams.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to load files')
      }

      const data = await response.json()
      setFiles(data.data.files)
      setCurrentPath(data.data.path)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files')
      setFiles([])
    } finally {
      setLoading(false)
    }
  }, [projectId])

  // Initial load
  React.useEffect(() => {
    fetchFiles('/', initialDepth)
  }, [fetchFiles, initialDepth])

  // Toggle directory expansion
  const toggleDirectory = (path: string, hasChildren: boolean) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
        // Fetch children if not already loaded
        if (!expandedPaths.has(path) && hasChildren) {
          fetchFiles(path, 1)
          setExpandedPaths((prev) => new Set(prev).add(path))
        }
      }
      return next
    })
  }

  // Handle file selection
  const handleSelect = (node: FileNode) => {
    if (node.type === 'directory') {
      toggleDirectory(node.path, !!node.children && node.children.length > 0)
    } else if (onSelectFile) {
      onSelectFile(node.path)
    }
  }

  // Refresh current view
  const handleRefresh = () => {
    fetchFiles(currentPath, initialDepth)
  }

  // Render file tree node
  const renderNode = (node: FileNode, level: number = 0): React.ReactNode => {
    const isExpanded = expandedDirs.has(node.path)
    const isSelected = selectedFile === node.path
    const isDir = node.type === 'directory'
    const hasChildren = node.children && node.children.length > 0

    return (
      <div key={node.path}>
        {/* Node Row */}
        <button
          type="button"
          onClick={() => handleSelect(node)}
          className={cn(
            'w-full flex items-center gap-1.5 px-2 py-1 text-left text-[13px]',
            'transition-colors rounded-[4px]',
            'hover:bg-foreground/5',
            isSelected && 'bg-foreground/10',
            isSelected && 'text-foreground'
          )}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
        >
          {/* Expand/Collapse Icon for Directories */}
          {isDir ? (
            <span
              className="shrink-0 text-foreground/40 hover:text-foreground/60"
              onClick={(e) => {
                e.stopPropagation()
                toggleDirectory(node.path, hasChildren ?? false)
              }}
            >
              {hasChildren || node.path.includes('src') || node.path.includes('components') ? (
                isExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )
              ) : (
                <ChevronRight className="h-3 w-3 opacity-0" />
              )}
            </span>
          ) : (
            <span className="w-3 shrink-0" />
          )}

          {/* Type Icon */}
          <span className="shrink-0">
            {isDir ? (
              isExpanded ? (
                <FolderOpen className="h-3.5 w-3.5 text-info" />
              ) : (
                <Folder className="h-3.5 w-3.5 text-info" />
              )
            ) : (
              getFileIcon(node)
            )}
          </span>

          {/* File Name */}
          <span className="flex-1 truncate">{node.name}</span>

          {/* Size for files */}
          {!isDir && node.size !== undefined && (
            <span className="text-[10px] text-foreground/30 shrink-0">
              {formatSize(node.size)}
            </span>
          )}
        </button>

        {/* Children (if expanded and directory) */}
        {isDir && isExpanded && node.children && node.children.length > 0 && (
          <div className="mt-0.5">
            {node.children.map((child) => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-foreground/10">
        <span className="text-[11px] font-medium text-foreground/40 uppercase tracking-wide">
          Dosyalar
        </span>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading}
          className={cn(
            'shrink-0 text-foreground/40 hover:text-foreground/60 transition-colors',
            loading && 'animate-spin'
          )}
        >
          {loading ? <Loader2 className="h-3.5 w-3.5" /> : <RefreshCw className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Search Bar */}
      <div className="px-3 py-2 border-b border-foreground/10">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground/30" />
          <input
            type="text"
            placeholder="Dosya ara..."
            className={cn(
              'w-full h-7 pl-7 pr-2 text-[12px] bg-foreground/5 border border-foreground/10 rounded-[4px]',
              'placeholder:text-foreground/30',
              'focus:outline-none focus:border-accent/50'
            )}
          />
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="px-3 py-4 text-center">
          <p className="text-[12px] text-destructive">{error}</p>
          <button
            type="button"
            onClick={handleRefresh}
            className="mt-2 text-[11px] text-accent hover:underline"
          >
            Tekrar dene
          </button>
        </div>
      )}

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-1 py-1">
        {loading && files.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-foreground/30" />
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-8">
            <Folder className="h-8 w-8 text-foreground/20 mx-auto mb-2" />
            <p className="text-[12px] text-foreground/40">Dosya bulunamadı</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {/* Current path indicator */}
            {currentPath !== '/' && (
              <div className="px-2 py-1 text-[11px] text-foreground/30 border-b border-foreground/5 mb-1">
                {currentPath}
              </div>
            )}
            {files.map((file) => renderNode(file))}
          </div>
        )}
      </div>

      {/* Footer - File count */}
      <div className="px-3 py-1.5 border-t border-foreground/10 text-[10px] text-foreground/30 flex justify-between">
        <span>{files.length} öğe</span>
        <span>{currentPath}</span>
      </div>
    </div>
  )
}

FileBrowser.displayName = 'FileBrowser'
