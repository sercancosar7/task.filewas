/**
 * ActivityFeed - Activity feed widget for dashboard
 * @module @task-filewas/frontend/components/dashboard/ActivityFeed
 *
 * Features:
 * - Displays recent activities (phases, tests, sessions, commits)
 * - Activity type icons and colors
 * - Relative time display
 * - Scrollable list with max items
 *
 * Design Reference: Craft Agents dashboard activity feed
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import {
  CheckCircle2,
  GitBranch,
  Loader2,
  AlertCircle,
  Play,
  FileCode,
  XCircle,
} from 'lucide-react'

// =============================================================================
// Types
// =============================================================================

export type ActivityType =
  | 'phase_completed'
  | 'phase_started'
  | 'test_passed'
  | 'test_failed'
  | 'session_started'
  | 'commit'
  | 'error'

export interface ActivityItem {
  /** Unique identifier */
  id: string
  /** Activity type */
  type: ActivityType
  /** Activity title/message */
  title: string
  /** Optional description */
  description?: string
  /** Related project name */
  projectName?: string
  /** Related phase number */
  phaseNumber?: number
  /** Timestamp (ISO string) */
  timestamp: string
}

export interface ActivityFeedProps {
  /** Activities to display (max 10-12 recommended) */
  activities?: ActivityItem[]
  /** Maximum number of activities to show */
  maxItems?: number
  /** Loading state */
  isLoading?: boolean
  /** Error state */
  error?: string | null
  /** "View all" click handler */
  onViewAll?: () => void
  /** Additional CSS classes */
  className?: string
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

  if (diffMins < 1) return 'Az önce'
  if (diffMins < 60) return `${diffMins}dk önce`
  if (diffHours < 24) return `${diffHours}sa önce`

  // Format: DD MMM
  const day = date.getDate()
  const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']
  const month = months[date.getMonth()]

  return `${day} ${month}`
}

function getActivityIcon(type: ActivityType): React.ReactNode {
  const iconProps = "h-4 w-4"

  switch (type) {
    case 'phase_completed':
      return <CheckCircle2 className={iconProps} />
    case 'phase_started':
      return <Play className={iconProps} />
    case 'test_passed':
      return <CheckCircle2 className={iconProps} />
    case 'test_failed':
      return <XCircle className={iconProps} />
    case 'session_started':
      return <Loader2 className={iconProps} />
    case 'commit':
      return <GitBranch className={iconProps} />
    case 'error':
      return <AlertCircle className={iconProps} />
    default:
      return <FileCode className={iconProps} />
  }
}

function getActivityColor(type: ActivityType): string {
  switch (type) {
    case 'phase_completed':
      return 'text-success bg-success/10'
    case 'phase_started':
      return 'text-accent bg-accent/10'
    case 'test_passed':
      return 'text-success bg-success/10'
    case 'test_failed':
      return 'text-destructive bg-destructive/10'
    case 'session_started':
      return 'text-info bg-info/10'
    case 'commit':
      return 'text-foreground/60 bg-foreground/5'
    case 'error':
      return 'text-destructive bg-destructive/10'
    default:
      return 'text-foreground/60 bg-foreground/5'
  }
}

function getActivityLabel(type: ActivityType): string {
  switch (type) {
    case 'phase_completed':
      return 'Faz tamamlandı'
    case 'phase_started':
      return 'Faz başladı'
    case 'test_passed':
      return 'Test başarılı'
    case 'test_failed':
      return 'Test başarısız'
    case 'session_started':
      return 'Session başladı'
    case 'commit':
      return 'Commit'
    case 'error':
      return 'Hata'
    default:
      return 'Aktivite'
  }
}

// =============================================================================
// Sub-Components
// =============================================================================

interface ActivityRowProps {
  activity: ActivityItem
}

function ActivityRow({ activity }: ActivityRowProps) {
  const icon = getActivityIcon(activity.type)
  const iconColor = getActivityColor(activity.type)
  const timeAgo = formatRelativeTime(activity.timestamp)
  const label = getActivityLabel(activity.type)

  return (
    <div className="group flex items-start gap-3 py-2">
      {/* Icon container */}
      <span
        className={cn(
          'flex items-center justify-center h-7 w-7 rounded-[6px] shrink-0 mt-0.5',
          iconColor
        )}
      >
        {icon}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] text-foreground/80 truncate">
            {activity.title}
          </span>
          <span className="text-[11px] text-foreground/40 whitespace-nowrap shrink-0">
            {timeAgo}
          </span>
        </div>

        <div className="flex items-center gap-2 mt-0.5">
          {/* Type label badge */}
          <span
            className={cn(
              'text-[10px] px-1.5 py-0.5 rounded font-medium whitespace-nowrap',
              activity.type === 'phase_completed' || activity.type === 'test_passed'
                ? 'bg-success/10 text-success'
                : activity.type === 'error' || activity.type === 'test_failed'
                  ? 'bg-destructive/10 text-destructive'
                  : 'bg-foreground/5 text-foreground/60'
            )}
          >
            {label}
          </span>

          {/* Project name */}
          {activity.projectName && (
            <span className="text-[11px] text-foreground/40 truncate">
              {activity.projectName}
            </span>
          )}

          {/* Phase number */}
          {activity.phaseNumber !== undefined && (
            <span className="text-[11px] text-foreground/40 font-mono">
              Faz {activity.phaseNumber}
            </span>
          )}
        </div>

        {/* Description */}
        {activity.description && (
          <p className="text-[12px] text-foreground/50 mt-1 line-clamp-1">
            {activity.description}
          </p>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * ActivityFeed - Activity feed widget for dashboard
 *
 * Structure:
 * ┌────────────────────────────────────────────────────────────┐
 * │ Activity Feed                                    View All →  │
 * ├────────────────────────────────────────────────────────────┤
 * │ [✓] 10:23 - Faz 3 tamamlandı                    task.filewas│
 * │ [✓] 10:15 - Test başarılı                       Phase 3    │
 * │ [▶] 10:02 - Session başladı                     e-commerce │
 * │ [⑂] 09:45 - Kod yazıldı                        Phase 2    │
 * └────────────────────────────────────────────────────────────┘
 *
 * @example
 * ```tsx
 * <ActivityFeed
 *   activities={recentActivities}
 *   maxItems={10}
 *   onViewAll={() => navigate('/activity')}
 * />
 * ```
 */
export const ActivityFeed = React.forwardRef<HTMLDivElement, ActivityFeedProps>(
  ({ activities = [], maxItems = 10, isLoading = false, error = null, onViewAll, className }, ref) => {
    const displayActivities = activities.slice(0, maxItems)

    // Empty state
    if (!isLoading && activities.length === 0) {
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
            <h3 className="text-[15px] font-semibold">Aktivite Akışı</h3>
          </div>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileCode className="h-10 w-10 text-foreground/20 mb-3" />
            <p className="text-[15px] text-foreground/60 mb-1">Henüz aktivite yok</p>
            <p className="text-[13px] text-foreground/40">
              Projelerde çalışma başladığında burada görünecek
            </p>
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
          <h3 className="text-[15px] font-semibold">Aktivite Akışı</h3>
          {onViewAll && activities.length > 0 && (
            <button
              type="button"
              onClick={onViewAll}
              className={cn(
                'text-[13px] text-accent hover:text-accent/80',
                'flex items-center gap-1 transition-colors'
              )}
            >
              Tümü
              <span className="text-[11px]">→</span>
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-3 max-h-[320px] overflow-y-auto scrollbar-thin">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-foreground/40" />
            </div>
          ) : error ? (
            <div className="px-2 py-8 text-center">
              <p className="text-[13px] text-destructive">{error}</p>
            </div>
          ) : (
            <div className="space-y-0">
              {displayActivities.map((activity) => (
                <ActivityRow
                  key={activity.id}
                  activity={activity}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }
)

ActivityFeed.displayName = 'ActivityFeed'

export default ActivityFeed
