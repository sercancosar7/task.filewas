/**
 * ProjectCard - Project card component for list views
 * @module @task-filewas/frontend/components/project/ProjectCard
 *
 * Features:
 * - Project icon/emoji display
 * - Project name and description
 * - Version and session count badges
 * - Status indicator
 * - Type badge
 * - Last activity timestamp
 * - Selected/hover states
 *
 * Design Reference: Craft Agents card components
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import {
  Folder,
  FolderGit2,
  Globe,
  Server,
  Smartphone,
  Terminal,
  Package,
  Layers,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import type { ProjectSummary, ProjectType, ProjectStatus } from '@task-filewas/shared'

// =============================================================================
// Types
// =============================================================================

export interface ProjectCardProps {
  /** Project data */
  project: ProjectSummary
  /** Whether this project is selected */
  isSelected?: boolean
  /** Click handler */
  onClick?: () => void
  /** Additional CSS classes */
  className?: string
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get icon component for project type
 */
function getTypeIcon(type: ProjectType): LucideIcon {
  const icons: Record<ProjectType, LucideIcon> = {
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

/**
 * Get Turkish label for project type
 */
function getTypeLabel(type: ProjectType): string {
  const labels: Record<ProjectType, string> = {
    web: 'Web',
    backend: 'Backend',
    fullstack: 'Fullstack',
    mobile: 'Mobile',
    cli: 'CLI',
    library: 'Library',
    monorepo: 'Monorepo',
    other: 'Diger',
  }
  return labels[type] || type
}

/**
 * Get status color classes
 */
function getStatusClasses(status: ProjectStatus): string {
  const colors: Record<ProjectStatus, string> = {
    active: 'bg-success/10 text-success',
    archived: 'bg-foreground/5 text-foreground/40',
    deleted: 'bg-destructive/10 text-destructive',
  }
  return colors[status] || 'bg-foreground/5 text-foreground/40'
}

/**
 * Get Turkish label for status
 */
function getStatusLabel(status: ProjectStatus): string {
  const labels: Record<ProjectStatus, string> = {
    active: 'Aktif',
    archived: 'Arsiv',
    deleted: 'Silindi',
  }
  return labels[status] || status
}

/**
 * Format relative time string
 */
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return 'Az once'
  if (diffMins < 60) return `${diffMins}dk once`
  if (diffHours < 24) return `${diffHours}sa once`
  if (diffDays === 1) return 'Dun'
  if (diffDays < 7) return `${diffDays} gun once`

  return format(date, 'd MMM', { locale: tr })
}

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * Project icon with custom emoji or type icon
 */
function ProjectIcon({
  icon,
  type,
  color,
  className,
}: {
  icon?: string
  type: ProjectType
  color?: string
  className?: string
}) {
  const TypeIcon = getTypeIcon(type)

  // If custom icon (emoji) is provided
  if (icon) {
    return (
      <span
        className={cn(
          'flex items-center justify-center h-10 w-10 rounded-[8px] text-xl shrink-0',
          color ? '' : 'bg-foreground/5',
          className
        )}
        style={color ? { backgroundColor: `${color}20` } : undefined}
      >
        {icon}
      </span>
    )
  }

  // Default type icon
  return (
    <span
      className={cn(
        'flex items-center justify-center h-10 w-10 rounded-[8px] shrink-0',
        color ? '' : 'bg-foreground/5',
        className
      )}
      style={color ? { backgroundColor: `${color}20`, color } : undefined}
    >
      <TypeIcon className={cn('h-5 w-5', color ? '' : 'text-foreground/60')} />
    </span>
  )
}

/**
 * Badge component for metadata
 */
function Badge({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 h-[18px] text-[10px] font-medium rounded bg-foreground/5 text-foreground/60',
        className
      )}
    >
      {children}
    </span>
  )
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * ProjectCard - Individual project card for list views
 *
 * Structure:
 * ┌────────────────────────────────────────────────────────────┐
 * │ [Icon]  Project Name                           [Status]    │
 * │         Description text truncated...                      │
 * │         [v0.1.0] [12 sessions] [Web]       3 gun once      │
 * └────────────────────────────────────────────────────────────┘
 *
 * @example
 * ```tsx
 * <ProjectCard
 *   project={project}
 *   isSelected={project.id === selectedId}
 *   onClick={() => onProjectClick(project)}
 * />
 * ```
 */
export const ProjectCard = React.forwardRef<HTMLButtonElement, ProjectCardProps>(
  ({ project, isSelected = false, onClick, className }, ref) => {
    const timeAgo = project.lastActivityAt
      ? formatRelativeTime(project.lastActivityAt)
      : null

    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        data-selected={isSelected}
        className={cn(
          // Base container styles
          'project-card relative group select-none w-full text-left',
          // Padding
          'p-4',
          // Border radius
          'rounded-[8px]',
          // Border
          'border border-foreground/5',
          // Hover states
          'hover:bg-foreground/[0.02] hover:border-foreground/10',
          'data-[selected=true]:bg-foreground/5',
          'data-[selected=true]:border-accent/30',
          'data-[selected=true]:hover:bg-foreground/[0.07]',
          // Transition
          'transition-all duration-150',
          // Focus styles
          'focus:outline-none focus-visible:ring-1 focus-visible:ring-ring',
          className
        )}
      >
        {/* Row 1: Icon + Name + Status */}
        <div className="flex items-start gap-3">
          <ProjectIcon
            icon={project.icon}
            type={project.type}
            color={project.color}
          />

          <div className="flex-1 min-w-0">
            {/* Name and Status Row */}
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'flex-1 truncate text-[15px] leading-tight font-medium',
                  isSelected ? 'text-foreground' : 'text-foreground/90'
                )}
              >
                {project.name}
              </span>

              {/* Status badge (only show for non-active) */}
              {project.status !== 'active' && (
                <span
                  className={cn(
                    'shrink-0 px-1.5 h-[18px] text-[10px] font-medium rounded inline-flex items-center',
                    getStatusClasses(project.status)
                  )}
                >
                  {getStatusLabel(project.status)}
                </span>
              )}
            </div>

            {/* Description */}
            {project.description && (
              <p className="mt-1 text-[13px] text-foreground/50 line-clamp-1">
                {project.description}
              </p>
            )}

            {/* Badges Row */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {/* Version badge */}
              <Badge className="bg-accent/10 text-accent">
                v{project.activeVersion}
              </Badge>

              {/* Session count */}
              <Badge>
                {project.sessionCount} session
              </Badge>

              {/* Type badge */}
              <Badge>
                {getTypeLabel(project.type)}
              </Badge>

              {/* Tags */}
              {project.tags?.slice(0, 2).map((tag) => (
                <Badge key={tag} className="bg-foreground/5 text-foreground/40">
                  {tag}
                </Badge>
              ))}

              {/* Spacer */}
              <span className="flex-1" />

              {/* Last activity */}
              {timeAgo && (
                <span className="shrink-0 text-[11px] text-foreground/40">
                  {timeAgo}
                </span>
              )}
            </div>
          </div>
        </div>
      </button>
    )
  }
)
ProjectCard.displayName = 'ProjectCard'

export default ProjectCard
