/**
 * ActivitySection - Collapsible activity list for assistant turns
 * @module @task-filewas/frontend/components/chat/ActivitySection
 *
 * Layout (Collapsed):
 * ┌───────────────────────────────────────────────────────────────┐
 * │ ▶ [Badge: 12 steps] Read, Edit, Bash...                       │
 * └───────────────────────────────────────────────────────────────┘
 *
 * Layout (Expanded):
 * ┌───────────────────────────────────────────────────────────────┐
 * │ ▼ [Badge: 12 steps] Read, Edit, Bash...                       │
 * ├───────────────────────────────────────────────────────────────┤
 * │ │  ✓ Todo List Updated                                        │
 * │ │  📖 Read src/components/Checkout.tsx                        │
 * │ │  ✏️ Edit src/services/payment.ts                            │
 * │ │  ⬡ Bash npm install stripe                                  │
 * │ │  ...                                                        │
 * └───────────────────────────────────────────────────────────────┘
 *
 * Features:
 * - Collapsible with Framer Motion animation
 * - Tool icons for each activity type
 * - Clickable file paths
 * - Preview text when collapsed
 * - Activity count badge
 */

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronRight,
  FileText,
  FilePlus,
  Pencil,
  Terminal,
  Search,
  FileSearch,
  Bot,
  Globe,
  CheckSquare,
  HelpCircle,
  ListTodo,
  LogOut,
  Zap,
  Sparkles,
  BookOpen,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { Activity, ToolName } from '@task-filewas/shared'

// =============================================================================
// Types
// =============================================================================

export interface ActivitySectionProps {
  /** Activities to display */
  activities: Activity[]
  /** Whether section is expanded by default */
  defaultExpanded?: boolean | undefined
  /** Maximum visible activities when expanded (scroll after this) */
  maxVisibleActivities?: number | undefined
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
  maxVisibleActivities: 14,
}

/**
 * Tool icons mapping
 */
const TOOL_ICONS: Record<ToolName, LucideIcon> = {
  Read: FileText,
  Write: FilePlus,
  Edit: Pencil,
  Bash: Terminal,
  Glob: Search,
  Grep: FileSearch,
  Task: Bot,
  WebFetch: Globe,
  TodoWrite: CheckSquare,
  AskUserQuestion: HelpCircle,
  EnterPlanMode: ListTodo,
  ExitPlanMode: LogOut,
  Skill: Zap,
  WebSearch: Sparkles,
  NotebookEdit: BookOpen,
}

/**
 * Tool color classes
 */
const TOOL_COLORS: Record<ToolName, string> = {
  Read: 'text-accent',
  Write: 'text-success',
  Edit: 'text-info',
  Bash: 'text-accent',
  Glob: 'text-muted-foreground',
  Grep: 'text-muted-foreground',
  Task: 'text-accent',
  WebFetch: 'text-accent',
  TodoWrite: 'text-success',
  AskUserQuestion: 'text-info',
  EnterPlanMode: 'text-accent',
  ExitPlanMode: 'text-success',
  Skill: 'text-accent',
  WebSearch: 'text-accent',
  NotebookEdit: 'text-accent',
}

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * Single activity row
 */
interface ActivityRowProps {
  activity: Activity
  onFileClick?: ((filePath: string) => void) | undefined
  index: number
}

function ActivityRow({ activity, onFileClick, index }: ActivityRowProps) {
  if (activity.type !== 'tool' || !activity.tool) {
    // System or text activity
    return (
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.03, duration: 0.15 }}
        className={cn(
          'flex items-center gap-2 py-0.5',
          SIZE_CONFIG.typography
        )}
      >
        <span className="text-muted-foreground">
          {activity.text || activity.system?.message}
        </span>
      </motion.div>
    )
  }

  const { name, summary, input } = activity.tool
  const Icon = TOOL_ICONS[name] || FileText
  const colorClass = TOOL_COLORS[name] || 'text-muted-foreground'

  // Extract file path from input
  const filePath = (input?.['file_path'] || input?.['path'] || input?.['pattern']) as string | undefined

  // Handle file click
  const handleFileClick = () => {
    if (filePath && onFileClick) {
      onFileClick(filePath)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03, duration: 0.15 }}
      className={cn(
        'flex items-center gap-2 py-0.5',
        SIZE_CONFIG.typography
      )}
    >
      {/* Tool icon */}
      <Icon className={cn(SIZE_CONFIG.iconSize, 'shrink-0', colorClass)} />

      {/* Tool name */}
      <span className="font-medium shrink-0">{name}</span>

      {/* File path or summary */}
      {filePath ? (
        <button
          onClick={handleFileClick}
          className={cn(
            'text-accent truncate cursor-pointer hover:underline',
            'focus:outline-none focus:ring-1 focus:ring-accent focus:ring-offset-1 focus:ring-offset-background',
            'rounded px-0.5'
          )}
          title={filePath}
          type="button"
        >
          {filePath}
        </button>
      ) : (
        <span className="text-muted-foreground truncate" title={summary}>
          {summary}
        </span>
      )}

      {/* Duration (if available) */}
      {activity.tool.duration && (
        <span className="text-muted-foreground text-[11px] ml-auto shrink-0">
          {formatDuration(activity.tool.duration)}
        </span>
      )}
    </motion.div>
  )
}

/**
 * Format duration in milliseconds to human readable
 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`
}

/**
 * Get preview text for collapsed state
 */
function getPreviewText(activities: Activity[]): string {
  const toolNames = activities
    .filter((a) => a.type === 'tool' && a.tool)
    .map((a) => a.tool!.name)
    .slice(0, 5)

  if (toolNames.length === 0) return ''

  const uniqueNames = [...new Set(toolNames)]
  const preview = uniqueNames.join(', ')

  if (activities.length > 5) {
    return `${preview}...`
  }

  return preview
}

// =============================================================================
// Component
// =============================================================================

/**
 * ActivitySection - Collapsible activity list with animation
 *
 * @example
 * ```tsx
 * <ActivitySection
 *   activities={turn.activities}
 *   defaultExpanded={false}
 *   onFileClick={handleFileClick}
 * />
 * ```
 */
export function ActivitySection({
  activities,
  defaultExpanded = false,
  maxVisibleActivities = SIZE_CONFIG.maxVisibleActivities,
  onFileClick,
  className,
}: ActivitySectionProps) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded)

  // Don't render if no activities
  if (activities.length === 0) {
    return null
  }

  const previewText = getPreviewText(activities)
  const hasOverflow = activities.length > maxVisibleActivities

  return (
    <div className={cn('space-y-1', className)}>
      {/* Header - Clickable to toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          // Layout
          'flex items-center gap-2 w-full',
          // Styling
          'px-3 py-2 rounded-[8px]',
          'bg-foreground/[0.02] hover:bg-foreground/[0.04]',
          'shadow-minimal',
          // Text
          SIZE_CONFIG.typography,
          'text-muted-foreground',
          // Transition
          'transition-colors duration-150',
          // Focus
          'focus:outline-none focus:ring-2 focus:ring-accent/50'
        )}
        type="button"
        aria-expanded={isExpanded}
        aria-controls="activity-list"
      >
        {/* Chevron with rotation animation */}
        <motion.div
          animate={{ rotate: isExpanded ? 90 : 0 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
        >
          <ChevronRight className={cn(SIZE_CONFIG.iconSize, 'shrink-0')} />
        </motion.div>

        {/* Activity count badge */}
        <Badge
          variant="secondary"
          className="h-[18px] px-1.5 text-[10px] font-medium rounded"
        >
          {activities.length} {activities.length === 1 ? 'step' : 'steps'}
        </Badge>

        {/* Preview text (when collapsed) */}
        {!isExpanded && previewText && (
          <span className="truncate text-muted-foreground/70">
            {previewText}
          </span>
        )}
      </button>

      {/* Activity list with animation */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            id="activity-list"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div
              className={cn(
                // Border styling
                'border-l-2 border-muted ml-[13px] pl-4 pr-2 py-0',
                // Scroll if overflow
                hasOverflow && 'max-h-[350px] overflow-y-auto scrollbar-thin'
              )}
            >
              {activities.map((activity, index) => (
                <ActivityRow
                  key={activity.id}
                  activity={activity}
                  onFileClick={onFileClick}
                  index={index}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default ActivitySection
