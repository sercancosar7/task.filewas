/**
 * SessionList - Session list container with scroll area
 * @module @task-filewas/frontend/components/session/SessionList
 *
 * Features:
 * - Scrollable session list
 * - Date grouping (Today, Yesterday, This Week, etc.)
 * - Loading and error states
 * - Empty state message
 * - Selection highlighting
 *
 * Uses extracted components:
 * - SessionItem: Individual session card
 * - DateGroupHeader: Date group headers
 * - BadgeRow: Scrollable badge container
 */

import { ScrollArea } from '@/components/ui/scroll-area'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import type { SessionSummary } from '@task-filewas/shared'
import { SessionItem } from './SessionItem'
import { DateGroupHeader, useSessionGroups } from './DateGroup'

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
  // Group sessions by date using memoized hook
  const groups = useSessionGroups(sessions)

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
