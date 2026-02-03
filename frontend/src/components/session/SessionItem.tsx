/**
 * SessionItem - Session card component for inbox list
 * @module @task-filewas/frontend/components/session/SessionItem
 *
 * Features:
 * - Status icon with color coding
 * - Title with truncation
 * - Scrollable badge row with fade mask
 * - Relative timestamp
 * - Selected/hover states
 * - Processing indicator (shimmer animation)
 *
 * Design Reference: Craft Agents session cards
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Spinner } from '@/components/ui/spinner'
import { BadgeRow } from './BadgeRow'
import type { SessionSummary } from '@task-filewas/shared'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'

// =============================================================================
// Types
// =============================================================================

export interface SessionItemProps {
  /** Session data */
  session: SessionSummary
  /** Whether this session is selected */
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
  if (diffMins < 60) return `${diffMins}dk`
  if (diffHours < 24) return `${diffHours}sa`
  if (diffDays === 1) return 'Dun'
  if (diffDays < 7) return `${diffDays}g`

  return format(date, 'd MMM', { locale: tr })
}

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * Status icon component with Craft Agents styling
 */
export function StatusIcon({
  status,
  className,
}: {
  status: SessionSummary['status']
  className?: string
}) {
  // Unicode icons for each status
  const icons: Record<string, string> = {
    todo: '\u25CB',           // ○ Circle
    'in-progress': '\u25C9',  // ◉ CircleDot
    'needs-review': '\u25CE', // ◎ CircleDashed
    done: '\u25CF',           // ● Filled Circle
    cancelled: '\u2298',      // ⊘ XCircle
  }

  // Colors matching sidebar navigation
  const colors: Record<string, string> = {
    todo: 'text-foreground/40',
    'in-progress': 'text-accent',
    'needs-review': 'text-info',
    done: 'text-success',
    cancelled: 'text-foreground/40',
  }

  return (
    <span
      className={cn(
        'shrink-0 text-sm leading-none',
        colors[status] || 'text-foreground/40',
        className
      )}
      aria-label={status}
    >
      {icons[status] || '\u25CB'}
    </span>
  )
}

/**
 * Processing indicator with shimmer effect
 */
function ProcessingIndicator() {
  return (
    <span className="inline-flex items-center gap-1 shrink-0">
      <Spinner size="xs" className="text-accent" />
    </span>
  )
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * SessionItem - Individual session card in the inbox list
 *
 * Structure (Craft Agents pattern):
 * ┌────────────────────────────────────────────────────────────┐
 * │ [Status] Title                              [Action Btns]  │
 * │                                                            │
 * │ [Badges Row - Scrollable with fade mask]     [Timestamp]  │
 * └────────────────────────────────────────────────────────────┘
 *
 * @example
 * ```tsx
 * <SessionItem
 *   session={session}
 *   isSelected={session.id === selectedId}
 *   onClick={() => onSessionClick(session)}
 * />
 * ```
 */
export const SessionItem = React.forwardRef<HTMLButtonElement, SessionItemProps>(
  ({ session, isSelected = false, onClick, className }, ref) => {
    const timeAgo = formatRelativeTime(session.updatedAt || session.createdAt)
    const isProcessing = session.processingState === 'running'

    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        data-selected={isSelected}
        className={cn(
          // Base container styles (Craft Agents)
          'session-item relative group select-none w-full text-left',
          // Padding - asymmetric for content alignment
          'pl-2 pr-4 py-3',
          // Border radius
          'rounded-[8px]',
          // Hover states
          'hover:bg-foreground/[0.02]',
          'data-[selected=true]:bg-foreground/5',
          'data-[selected=true]:hover:bg-foreground/[0.07]',
          // Transition
          'transition-colors duration-150',
          // Focus styles
          'focus:outline-none focus-visible:ring-1 focus-visible:ring-ring',
          className
        )}
      >
        {/* Row 1: Status + Title */}
        <div className="flex items-center gap-2">
          <StatusIcon status={session.status} />

          <span
            className={cn(
              'flex-1 truncate text-[13px] leading-tight',
              isSelected
                ? 'text-foreground font-medium'
                : 'text-foreground/90',
              // Shimmer animation when processing
              isProcessing && 'animate-shimmer-text'
            )}
          >
            {session.title}
          </span>

          {/* Processing indicator (absolute positioned on hover area) */}
          {isProcessing && (
            <div className="shrink-0">
              <ProcessingIndicator />
            </div>
          )}
        </div>

        {/* Row 2: Badges + Timestamp */}
        <div className="flex items-center gap-2 mt-1.5 pl-5">
          {/* Badge row with fade mask */}
          <BadgeRow session={session} />

          {/* Spacer */}
          <span className="flex-1 min-w-0" />

          {/* Timestamp */}
          <span className="shrink-0 text-[11px] text-foreground/40 whitespace-nowrap">
            {timeAgo}
          </span>
        </div>
      </button>
    )
  }
)
SessionItem.displayName = 'SessionItem'

export default SessionItem
