/**
 * SessionList - Session list container with scroll area
 * @module @task-filewas/frontend/components/session/SessionList
 *
 * Features:
 * - Scrollable session list
 * - Date grouping (Today, Yesterday, This Week, etc.)
 * - Loading and error states
 * - Empty state message
 */

import { useMemo } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import type { SessionSummary } from '@task-filewas/shared'
import { isToday, isYesterday, isThisWeek, isThisMonth, format } from 'date-fns'
import { tr } from 'date-fns/locale'

// =============================================================================
// Types
// =============================================================================

export interface SessionListProps {
  /** Sessions to display */
  sessions: SessionSummary[]
  /** Currently selected session ID */
  selectedId?: string
  /** Loading state */
  isLoading?: boolean
  /** Error message */
  error?: string | null
  /** Session click handler */
  onSessionClick?: (session: SessionSummary) => void
  /** Additional CSS classes */
  className?: string
}

interface SessionGroup {
  /** Group label */
  label: string
  /** Sessions in this group */
  sessions: SessionSummary[]
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get date group label for a session
 */
function getDateGroup(dateStr: string): string {
  const date = new Date(dateStr)

  if (isToday(date)) {
    return 'Bugun'
  }
  if (isYesterday(date)) {
    return 'Dun'
  }
  if (isThisWeek(date, { weekStartsOn: 1 })) {
    return 'Bu Hafta'
  }
  if (isThisMonth(date)) {
    return 'Bu Ay'
  }

  // Format as month name for older dates
  return format(date, 'MMMM yyyy', { locale: tr })
}

/**
 * Group sessions by date
 */
function groupSessionsByDate(sessions: SessionSummary[]): SessionGroup[] {
  const groups: Map<string, SessionSummary[]> = new Map()

  // Sort sessions by date (newest first)
  const sortedSessions = [...sessions].sort((a, b) => {
    const dateA = new Date(a.updatedAt || a.createdAt).getTime()
    const dateB = new Date(b.updatedAt || b.createdAt).getTime()
    return dateB - dateA
  })

  // Group by date label
  for (const session of sortedSessions) {
    const dateStr = session.updatedAt || session.createdAt
    const label = getDateGroup(dateStr)

    const existing = groups.get(label) || []
    existing.push(session)
    groups.set(label, existing)
  }

  // Convert to array preserving order
  const result: SessionGroup[] = []
  for (const [label, groupSessions] of groups) {
    result.push({ label, sessions: groupSessions })
  }

  return result
}

/**
 * Format relative time
 */
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return 'Az once'
  if (diffMins < 60) return `${diffMins} dk once`
  if (diffHours < 24) return `${diffHours} saat once`
  if (diffDays === 1) return 'Dun'
  if (diffDays < 7) return `${diffDays} gun once`

  return format(date, 'd MMM', { locale: tr })
}

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * Session status icon based on status
 */
function StatusIcon({ status }: { status: SessionSummary['status'] }) {
  const icons: Record<string, string> = {
    todo: '\u25CB',           // ○
    'in-progress': '\u25C9',  // ◉
    'needs-review': '\u25CE', // ◎
    done: '\u25CF',           // ●
    cancelled: '\u2298',      // ⊘
  }

  const colors: Record<string, string> = {
    todo: 'text-muted-foreground',
    'in-progress': 'text-accent',
    'needs-review': 'text-info',
    done: 'text-success',
    cancelled: 'text-muted-foreground',
  }

  return (
    <span className={cn('text-sm', colors[status] || 'text-muted-foreground')}>
      {icons[status] || '\u25CB'}
    </span>
  )
}

/**
 * Session item card
 */
function SessionItem({
  session,
  isSelected,
  onClick,
}: {
  session: SessionSummary
  isSelected: boolean
  onClick?: () => void
}) {
  const timeAgo = formatRelativeTime(session.updatedAt || session.createdAt)

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        // Base styles
        'w-full text-left px-3 py-3 rounded-[8px]',
        // Hover and selected states
        'hover:bg-foreground/[0.02] transition-colors',
        isSelected && 'bg-foreground/5 hover:bg-foreground/[0.07]',
        // Focus styles
        'focus:outline-none focus-visible:ring-1 focus-visible:ring-ring'
      )}
    >
      {/* Row 1: Status + Title */}
      <div className="flex items-center gap-2">
        <StatusIcon status={session.status} />
        <span
          className={cn(
            'flex-1 truncate text-[13px]',
            isSelected ? 'text-foreground font-medium' : 'text-foreground/90'
          )}
        >
          {session.title}
        </span>
      </div>

      {/* Row 2: Badges + Time */}
      <div className="flex items-center gap-2 mt-1.5 pl-5">
        {/* Processing indicator */}
        {session.processingState === 'running' && (
          <span className="flex items-center gap-1 text-[10px] text-accent">
            <Spinner size="xs" />
            <span>Calisiyor</span>
          </span>
        )}

        {/* Flag indicator */}
        {session.isFlagged && (
          <span className="text-[11px] text-info" title="Isaretli">
            {'\uD83D\uDEA9'}
          </span>
        )}

        {/* Unread indicator */}
        {session.hasUnread && (
          <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-accent text-white">
            Yeni
          </span>
        )}

        {/* Permission mode badge */}
        <span
          className={cn(
            'h-[18px] px-1.5 text-[10px] font-medium rounded flex items-center',
            session.permissionMode === 'safe' && 'bg-accent/10 text-accent',
            session.permissionMode === 'ask' && 'bg-info/10 text-info',
            session.permissionMode === 'auto' && 'bg-success/10 text-success'
          )}
        >
          {session.permissionMode === 'safe' && '\uD83D\uDD0D Safe'}
          {session.permissionMode === 'ask' && '\u2753 Ask'}
          {session.permissionMode === 'auto' && '\uD83D\uDD13 Auto'}
        </span>

        {/* Phase progress (if autonomous) */}
        {session.phaseProgress && (
          <span className="text-[10px] text-muted-foreground">
            Faz {session.phaseProgress.currentPhase}/{session.phaseProgress.totalPhases}
          </span>
        )}

        {/* Spacer */}
        <span className="flex-1" />

        {/* Time */}
        <span className="shrink-0 text-[11px] text-muted-foreground whitespace-nowrap">
          {timeAgo}
        </span>
      </div>
    </button>
  )
}

/**
 * Date group header
 */
function DateGroupHeader({ label }: { label: string }) {
  return (
    <div className="px-3 py-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
      {label}
    </div>
  )
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * SessionList - Scrollable session list with date grouping
 *
 * @example
 * ```tsx
 * <SessionList
 *   sessions={sessions}
 *   selectedId={selectedSessionId}
 *   isLoading={isLoading}
 *   onSessionClick={(session) => setSelectedSessionId(session.id)}
 * />
 * ```
 */
export function SessionList({
  sessions,
  selectedId,
  isLoading = false,
  error = null,
  onSessionClick,
  className,
}: SessionListProps) {
  // Group sessions by date
  const groups = useMemo(() => groupSessionsByDate(sessions), [sessions])

  // Loading state
  if (isLoading && sessions.length === 0) {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <div className="flex flex-col items-center gap-3">
          <Spinner size="md" />
          <span className="text-[13px] text-muted-foreground">
            Yukluyor...
          </span>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <div className="flex flex-col items-center gap-2 px-4 text-center">
          <span className="text-destructive text-lg">{'\u26A0\uFE0F'}</span>
          <span className="text-[13px] text-destructive">{error}</span>
        </div>
      </div>
    )
  }

  // Empty state
  if (sessions.length === 0) {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <div className="flex flex-col items-center gap-2 px-4 text-center">
          <span className="text-muted-foreground text-2xl">{'\uD83D\uDCAC'}</span>
          <span className="text-[13px] text-muted-foreground">
            Henuz session yok
          </span>
          <span className="text-[11px] text-muted-foreground/70">
            Yeni bir sohbet baslatin
          </span>
        </div>
      </div>
    )
  }

  // Sessions list
  return (
    <ScrollArea className={cn('h-full', className)}>
      <div className="pb-4">
        {groups.map((group) => (
          <div key={group.label}>
            <DateGroupHeader label={group.label} />
            <div className="px-1">
              {group.sessions.map((session) => (
                <SessionItem
                  key={session.id}
                  session={session}
                  isSelected={session.id === selectedId}
                  onClick={() => onSessionClick?.(session)}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Loading more indicator */}
        {isLoading && sessions.length > 0 && (
          <div className="flex justify-center py-4">
            <Spinner size="sm" />
          </div>
        )}
      </div>
    </ScrollArea>
  )
}

export default SessionList
