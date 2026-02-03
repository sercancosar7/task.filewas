/**
 * RecentProjects - Recent projects list for dashboard
 * @module @task-filewas/frontend/components/dashboard/RecentProjects
 *
 * Features:
 * - Displays recent projects (max 5)
 * - Project type icons
 * - Quick action buttons
 * - Click to navigate to project
 *
 * Design Reference: Craft Agents dashboard lists
 */

import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import type { ProjectSummary } from '@task-filewas/shared'
import {
  FolderKanban,
  Globe,
  Server,
  Layers,
  Smartphone,
  Terminal,
  Package,
  FolderGit2,
  Folder,
  ChevronRight,
  Loader2,
  Plus,
} from 'lucide-react'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import type { LucideIcon } from 'lucide-react'

// =============================================================================
// Types
// =============================================================================

export interface RecentProjectsProps {
  /** Projects to display (max 5-6 recommended) */
  projects?: ProjectSummary[]
  /** Loading state */
  isLoading?: boolean
  /** Error state */
  error?: string | null
  /** "View all" click handler */
  onViewAll?: () => void
  /** "Create project" click handler */
  onCreateProject?: () => void
  /** Additional CSS classes */
  className?: string
}

// =============================================================================
// Helper Functions
// =============================================================================

function getTypeIcon(type: ProjectSummary['type']): LucideIcon {
  const icons: Record<ProjectSummary['type'], LucideIcon> = {
    web: Globe,
    backend: Server,
    fullstack: Layers,
    mobile: Smartphone,
    cli: Terminal,
    library: Package,
    monorepo: FolderGit2,
    other: Folder,
  }
  return icons[type] || Folder
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return 'Az önce'
  if (diffMins < 60) return `${diffMins}dk önce`
  if (diffHours < 24) return `${diffHours}sa önce`
  if (diffDays === 1) return 'Dün'
  if (diffDays < 7) return `${diffDays} gün önce`

  return format(date, 'd MMM', { locale: tr })
}

// =============================================================================
// Sub-Components
// =============================================================================

interface ProjectRowProps {
  project: ProjectSummary
  onClick: () => void
}

function ProjectRow({ project, onClick }: ProjectRowProps) {
  const TypeIcon = getTypeIcon(project.type)
  const timeAgo = project.lastActivityAt
    ? formatRelativeTime(project.lastActivityAt)
    : null

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex items-center gap-3 w-full text-left',
        'p-3 rounded-[6px] border border-transparent',
        'hover:bg-foreground/[0.02] hover:border-foreground/5',
        'transition-all duration-150'
      )}
    >
      {/* Icon */}
      <span
        className={cn(
          'flex items-center justify-center h-9 w-9 rounded-[6px] shrink-0',
          project.color
            ? 'bg-opacity-10'
            : 'bg-foreground/5',
          project.color ? '' : 'text-foreground/60'
        )}
        style={
          project.color
            ? { backgroundColor: `${project.color}20`, color: project.color }
            : undefined
        }
      >
        {project.icon ? (
          <span className="text-lg">{project.icon}</span>
        ) : (
          <TypeIcon className="h-5 w-5" />
        )}
      </span>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-[15px] font-medium text-foreground/90 truncate">
            {project.name}
          </span>
          {timeAgo && (
            <span className="text-[11px] text-foreground/40 whitespace-nowrap">
              {timeAgo}
            </span>
          )}
        </div>
        {project.description && (
          <p className="text-[13px] text-foreground/50 truncate mt-0.5">
            {project.description}
          </p>
        )}
      </div>

      {/* Chevron */}
      <ChevronRight className="h-4 w-4 text-foreground/20 group-hover:text-foreground/40 transition-colors shrink-0" />
    </button>
  )
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * RecentProjects - Recent projects list widget
 *
 * Structure:
 * ┌────────────────────────────────────────────────────────────┐
 * │ Son Projeler                                    View All →  │
 * ├────────────────────────────────────────────────────────────┤
 * │ [icon] task.filewas                      2 saat önce     →   │
 * │        Otonom AI proje gelistirme platformu                  │
 * ├────────────────────────────────────────────────────────────┤
 * │ [icon] e-commerce-app                    1 gün önce      →   │
 * │        E-commerce uygulama                                       │
 * └────────────────────────────────────────────────────────────┘
 *
 * @example
 * ```tsx
 * <RecentProjects
 *   projects={recentProjects}
 *   onViewAll={() => navigate('/projects')}
 * />
 * ```
 */
export const RecentProjects = React.forwardRef<HTMLDivElement, RecentProjectsProps>(
  ({ projects = [], isLoading = false, error = null, onViewAll, onCreateProject, className }, ref) => {
    const navigate = useNavigate()

    const handleProjectClick = React.useCallback(
      (projectId: string) => {
        navigate(`/projects/${projectId}`)
      },
      [navigate]
    )

    // Empty state
    if (!isLoading && projects.length === 0) {
      return (
        <div
          ref={ref}
          className={cn(
            'rounded-[8px] border border-foreground/10 bg-card',
            'p-6',
            className
          )}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[15px] font-semibold">Son Projeler</h3>
          </div>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FolderKanban className="h-10 w-10 text-foreground/20 mb-3" />
            <p className="text-[15px] text-foreground/60 mb-1">Henüz proje yok</p>
            <p className="text-[13px] text-foreground/40 mb-4">
              İlk projenizi oluşturarak başlayın
            </p>
            {onCreateProject && (
              <button
                type="button"
                onClick={onCreateProject}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2 rounded-[6px]',
                  'bg-accent text-white text-[13px] font-medium',
                  'hover:bg-accent/90 transition-colors'
                )}
              >
                <Plus className="h-4 w-4" />
                Yeni Proje
              </button>
            )}
          </div>
        </div>
      )
    }

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-[8px] border border-foreground/10 bg-card',
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-foreground/5">
          <h3 className="text-[15px] font-semibold">Son Projeler</h3>
          {onViewAll && projects.length > 0 && (
            <button
              type="button"
              onClick={onViewAll}
              className={cn(
                'text-[13px] text-accent hover:text-accent/80',
                'flex items-center gap-1 transition-colors'
              )}
            >
              Tümü
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-foreground/40" />
            </div>
          ) : error ? (
            <div className="px-2 py-8 text-center">
              <p className="text-[13px] text-destructive">{error}</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {projects.slice(0, 5).map((project) => (
                <ProjectRow
                  key={project.id}
                  project={project}
                  onClick={() => handleProjectClick(project.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }
)

RecentProjects.displayName = 'RecentProjects'

export default RecentProjects
