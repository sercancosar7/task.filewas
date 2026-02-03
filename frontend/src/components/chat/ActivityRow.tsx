/**
 * ActivityRow - Single activity row in the activity section
 * @module @task-filewas/frontend/components/chat/ActivityRow
 *
 * Layout Structure:
 * ┌────────────────────────────────────────────────────────────────┐
 * │ [Icon] [Tool Name]  [Detail/Path]                      [Time]  │
 * └────────────────────────────────────────────────────────────────┘
 *
 * Features:
 * - Tool icon with appropriate color
 * - Tool name (bold)
 * - File path or summary (clickable if file path)
 * - Duration display
 * - Stagger animation (30ms delay per item)
 */

import * as React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { ToolIcon } from './ToolIcon'
import type { Activity } from '@task-filewas/shared'

// =============================================================================
// Types
// =============================================================================

export interface ActivityRowProps {
  /** Activity data */
  activity: Activity
  /** Index for stagger animation */
  index: number
  /** Callback when a file path is clicked */
  onFileClick?: ((filePath: string) => void) | undefined
  /** Additional CSS classes */
  className?: string | undefined
}

// =============================================================================
// Constants
// =============================================================================

const SIZE_CONFIG = {
  typography: 'text-[13px]',
  iconSize: 'w-3 h-3',
}

/**
 * Animation stagger delay in seconds
 * 30ms = 0.03s per item
 */
const STAGGER_DELAY = 0.03

/**
 * Animation duration
 */
const ANIMATION_DURATION = 0.15

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Format duration in milliseconds to human readable
 * @param ms - Duration in milliseconds
 * @returns Formatted duration string
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`
}

/**
 * Extract file path from tool input
 * @param input - Tool input object
 * @returns File path if found, undefined otherwise
 */
function extractFilePath(input: Record<string, unknown> | undefined): string | undefined {
  if (!input) return undefined

  // Check common path keys
  const pathKeys = ['file_path', 'path', 'pattern', 'notebook_path']
  for (const key of pathKeys) {
    const value = input[key]
    if (typeof value === 'string' && value.length > 0) {
      return value
    }
  }

  return undefined
}

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * System/Text activity row (non-tool)
 */
interface SystemActivityProps {
  activity: Activity
  index: number
  className?: string | undefined
}

function SystemActivityRow({ activity, index, className }: SystemActivityProps) {
  const content = activity.text || activity.system?.message || ''
  const variant = activity.system?.variant || 'info'

  // Variant color mapping
  const getVariantClass = (v: string): string => {
    switch (v) {
      case 'warning':
        return 'text-info'
      case 'error':
        return 'text-destructive'
      case 'info':
      default:
        return 'text-muted-foreground'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        delay: index * STAGGER_DELAY,
        duration: ANIMATION_DURATION,
      }}
      className={cn(
        'flex items-center gap-2 py-0.5',
        SIZE_CONFIG.typography,
        getVariantClass(variant),
        className
      )}
    >
      <span>{content}</span>
    </motion.div>
  )
}

/**
 * Tool activity row
 */
interface ToolActivityProps {
  activity: Activity
  index: number
  onFileClick?: ((filePath: string) => void) | undefined
  className?: string | undefined
}

function ToolActivityRow({ activity, index, onFileClick, className }: ToolActivityProps) {
  const { name, summary, input, duration } = activity.tool!
  const filePath = extractFilePath(input)

  // Handle file click
  const handleFileClick = React.useCallback(() => {
    if (filePath && onFileClick) {
      onFileClick(filePath)
    }
  }, [filePath, onFileClick])

  // Handle keyboard navigation
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        handleFileClick()
      }
    },
    [handleFileClick]
  )

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        delay: index * STAGGER_DELAY,
        duration: ANIMATION_DURATION,
      }}
      className={cn(
        'flex items-center gap-2 py-0.5',
        SIZE_CONFIG.typography,
        className
      )}
    >
      {/* Tool icon */}
      <ToolIcon name={name} size={SIZE_CONFIG.iconSize} colored />

      {/* Tool name */}
      <span className="font-medium shrink-0">{name}</span>

      {/* File path or summary */}
      {filePath ? (
        <button
          onClick={handleFileClick}
          onKeyDown={handleKeyDown}
          className={cn(
            'text-accent truncate cursor-pointer hover:underline',
            'focus:outline-none focus:ring-1 focus:ring-accent focus:ring-offset-1 focus:ring-offset-background',
            'rounded px-0.5',
            'text-left'
          )}
          title={filePath}
          type="button"
          tabIndex={0}
        >
          {filePath}
        </button>
      ) : summary ? (
        <span className="text-muted-foreground truncate" title={summary}>
          {summary}
        </span>
      ) : null}

      {/* Duration (right aligned) */}
      {duration !== undefined && duration > 0 && (
        <span className="text-muted-foreground text-[11px] ml-auto shrink-0">
          {formatDuration(duration)}
        </span>
      )}
    </motion.div>
  )
}

// =============================================================================
// Component
// =============================================================================

/**
 * ActivityRow - Renders a single activity in the activity section
 *
 * Features:
 * - Automatic type detection (tool vs system/text)
 * - Tool icon with color coding
 * - Clickable file paths
 * - Duration display
 * - Stagger animation based on index
 *
 * @example
 * ```tsx
 * // Tool activity
 * <ActivityRow
 *   activity={toolActivity}
 *   index={0}
 *   onFileClick={handleFileClick}
 * />
 *
 * // System message activity
 * <ActivityRow
 *   activity={systemActivity}
 *   index={1}
 * />
 * ```
 */
export function ActivityRow({
  activity,
  index,
  onFileClick,
  className,
}: ActivityRowProps) {
  // Determine activity type and render appropriate component
  if (activity.type !== 'tool' || !activity.tool) {
    return (
      <SystemActivityRow
        activity={activity}
        index={index}
        className={className}
      />
    )
  }

  return (
    <ToolActivityRow
      activity={activity}
      index={index}
      onFileClick={onFileClick}
      className={className}
    />
  )
}

export default ActivityRow
