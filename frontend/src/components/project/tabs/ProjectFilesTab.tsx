/**
 * ProjectFilesTab - Files tab içeriği
 * @module @task-filewas/frontend/components/project/tabs/ProjectFilesTab
 *
 * Proje dosya yapısı ve file browser
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import { FileBrowser } from '@/components/files/FileBrowser'
import { FileViewer } from '@/components/files/FileViewer'
import type { FileBrowserProps, FileNode } from '@/components/files/types'

// =============================================================================
// Types
// =============================================================================

export interface ProjectFilesTabProps {
  projectId: string
  className?: string
}

// =============================================================================
// Component
// =============================================================================

/**
 * ProjectFilesTab - Proje dosya yapısı görüntüleme
 *
 * 2 panel layout:
 * - Sol: File Browser (directory tree)
 * - Sağ: File Viewer (file content preview)
 */
export function ProjectFilesTab({ projectId, className }: ProjectFilesTabProps) {
  const [selectedFile, setSelectedFile] = React.useState<string | null>(null)

  const handleSelectFile = React.useCallback((path: string) => {
    setSelectedFile(path)
  }, [])

  const handleCloseViewer = React.useCallback(() => {
    setSelectedFile(null)
  }, [])

  return (
    <div className={cn('flex h-full gap-4', className)}>
      {/* File Browser Panel */}
      <div className={cn(
        'flex flex-col rounded-lg border border-foreground/10 bg-background',
        selectedFile ? 'w-80' : 'flex-1'
      )}>
        <FileBrowser
          projectId={projectId}
          selectedFile={selectedFile}
          onSelectFile={handleSelectFile}
        />
      </div>

      {/* File Viewer Panel */}
      {selectedFile && (
        <div className="flex-1 rounded-lg border border-foreground/10 bg-background overflow-hidden">
          <FileViewer
            projectId={projectId}
            filePath={selectedFile}
            onClose={handleCloseViewer}
          />
        </div>
      )}
    </div>
  )
}

export default ProjectFilesTab
