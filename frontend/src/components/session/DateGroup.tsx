/**
 * DateGroup - Date group header component
 * @module @task-filewas/frontend/components/session/DateGroup
 *
 * Features:
 * - TODAY, YESTERDAY, THIS WEEK, etc. headers
 * - Uppercase styling with tracking
 * - Date grouping utilities
 *
 * Design Reference: Craft Agents date group headers
 */

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { isToday, isYesterday, isThisWeek, isThisMonth, format } from 'date-fns'
import { tr } from 'date-fns/locale'
import type { SessionSummary } from '@task-filewas/shared'

// =============================================================================
// Types
// =============================================================================

export interface DateGroupHeaderProps {
  /** Group label text */
  label: string
  /** Session count in this group */
  count?: number
  /** Additional CSS classes */
  className?: string
}

export interface SessionGroup {
  /** Group label (TODAY, YESTERDAY, etc.) */
  label: string
  /** Sessions in this group */
  sessions: SessionSummary[]
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get date group label for a given date string
 * Returns Turkish labels for date ranges
 */
export function getDateGroupLabel(dateStr: string): string {
  const date = new Date(dateStr)

  if (isToday(date)) {
    return 'BUGUN'
  }
  if (isYesterday(date)) {
    return 'DUN'
  }
  if (isThisWeek(date, { weekStartsOn: 1 })) {
    return 'BU HAFTA'
  }
  if (isThisMonth(date)) {
    return 'BU AY'
  }

  // Format as month and year for older dates
  return format(date, 'MMMM yyyy', { locale: tr }).toUpperCase()
}

/**
 * Group sessions by date
 * Returns array of session groups sorted by date (newest first)
 */
export function groupSessionsByDate(sessions: SessionSummary[]): SessionGroup[] {
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
    const label = getDateGroupLabel(dateStr)

    const existing = groups.get(label) || []
    existing.push(session)
    groups.set(label, existing)
  }

  // Convert to array preserving insertion order
  const result: SessionGroup[] = []
  for (const [label, groupSessions] of groups) {
    result.push({ label, sessions: groupSessions })
  }

  return result
}

/**
 * Custom hook for grouping sessions by date
 * Memoized for performance
 */
export function useSessionGroups(sessions: SessionSummary[]): SessionGroup[] {
  return useMemo(() => groupSessionsByDate(sessions), [sessions])
}

// =============================================================================
// Components
// =============================================================================

/**
 * DateGroupHeader - Header component for date groups
 *
 * Style reference (Craft Agents):
 * - 11px font size
 * - Medium weight
 * - Muted foreground color
 * - Uppercase with tracking
 * - Horizontal padding matching session items
 *
 * @example
 * ```tsx
 * <DateGroupHeader label="BUGUN" count={5} />
 * ```
 */
export function DateGroupHeader({
  label,
  count,
  className,
}: DateGroupHeaderProps) {
  return (
    <div
      className={cn(
        // Padding aligned with session items
        'px-3 py-2',
        // Typography
        'text-[11px] font-medium',
        // Color
        'text-foreground/40',
        // Letter spacing for uppercase
        'uppercase tracking-wider',
        // Flex for count badge
        'flex items-center gap-2',
        className
      )}
    >
      <span>{label}</span>
      {count !== undefined && count > 0 && (
        <span className="text-foreground/30">({count})</span>
      )}
    </div>
  )
}

/**
 * DateGroupDivider - Subtle divider between date groups
 * Optional component for visual separation
 */
export function DateGroupDivider({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'h-px mx-3 my-1 bg-foreground/5',
        className
      )}
    />
  )
}

export default DateGroupHeader
