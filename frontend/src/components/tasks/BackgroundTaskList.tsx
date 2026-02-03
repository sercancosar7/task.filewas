/**
 * BackgroundTaskList - List of background tasks
 * @module @task-filewas/frontend/components/tasks/BackgroundTaskList
 *
 * Displays a list of background tasks with their progress
 */

import { AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, Trash2, Minus } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useActiveTasks, useCompletedTasks, useTaskStore } from '@/stores/tasks'
import { TaskProgress, CompactTaskProgress } from './TaskProgress'

// =============================================================================
// Types
// =============================================================================

export interface BackgroundTaskListProps {
  /** Maximum number of completed tasks to show */
  maxCompleted?: number
  /** Whether to show the header */
  showHeader?: boolean
  /** Position variant */
  position?: 'sidebar' | 'panel' | 'inline'
  /** Additional CSS classes */
  className?: string
}

// =============================================================================
// Helper Components
// =============================================================================

interface TaskListHeaderProps {
  activeCount: number
  completedCount: number
  isExpanded: boolean
  onToggleExpand: () => void
  onClearCompleted: () => void
  position: 'sidebar' | 'panel' | 'inline'
}

function TaskListHeader({
  activeCount,
  completedCount,
  isExpanded,
  onToggleExpand,
  onClearCompleted,
  position,
}: TaskListHeaderProps) {
  const hasCompleted = completedCount > 0

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-2 py-1',
        position === 'sidebar' ? 'text-xs' : 'text-sm'
      )}
    >
      <button
        type="button"
        onClick={onToggleExpand}
        className={cn(
          'flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors',
          'flex-1 text-left'
        )}
      >
        {isExpanded ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronUp className="h-3 w-3" />
        )}
        <span>Arka Plan Görevleri</span>
        {activeCount > 0 && (
          <span className="bg-accent text-white text-[10px] px-1 rounded font-medium tabular-nums">
            {activeCount}
          </span>
        )}
      </button>

      {isExpanded && hasCompleted && (
        <button
          type="button"
          onClick={onClearCompleted}
          className={cn(
            'p-1 rounded hover:bg-foreground/10 text-muted-foreground hover:text-destructive transition-colors',
            'shrink-0'
          )}
          aria-label="Clear completed"
          title="Tamamlananları temizle"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * BackgroundTaskList - List of background tasks with expand/collapse
 *
 * @example
 * ```tsx
 * <BackgroundTaskList position="sidebar" maxCompleted={5} />
 * ```
 */
export function BackgroundTaskList({
  maxCompleted = 10,
  showHeader = true,
  position = 'panel',
  className,
}: BackgroundTaskListProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const activeTasks = useActiveTasks()
  const completedTasks = useCompletedTasks()
  const { removeTask, clearCompleted } = useTaskStore()

  // Only show recent completed tasks
  const recentCompleted = completedTasks.slice(-maxCompleted).reverse()

  // Don't render if no tasks and not expanded
  if (activeTasks.length === 0 && completedTasks.length === 0 && !isExpanded) {
    return null
  }

  const hasActiveTasks = activeTasks.length > 0
  const hasCompletedTasks = completedTasks.length > 0

  // Inline variant is more compact
  if (position === 'inline') {
    return (
      <div className={cn('flex flex-col gap-1', className)}>
        {activeTasks.map((task) => (
          <CompactTaskProgress key={task.id} task={task} />
        ))}
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col', className)}>
      {showHeader && (
        <TaskListHeader
          activeCount={activeTasks.length}
          completedCount={completedTasks.length}
          isExpanded={isExpanded}
          onToggleExpand={() => setIsExpanded(!isExpanded)}
          onClearCompleted={clearCompleted}
          position={position}
        />
      )}

      {/* Always show active tasks */}
      {hasActiveTasks && (
        <div className={cn('flex flex-col gap-1', position === 'sidebar' ? 'mt-1' : 'mt-2')}>
          <AnimatePresence initial={false}>
            {activeTasks.map((task) => (
              <TaskProgress
                key={task.id}
                task={task}
                showCancel
                onCancel={removeTask}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Show completed when expanded */}
      {isExpanded && hasCompletedTasks && (
        <div className={cn(
          'flex flex-col gap-1 mt-2 pt-2 border-t border-foreground/10',
          position === 'sidebar' ? 'max-h-[200px] overflow-y-auto' : 'max-h-[300px] overflow-y-auto'
        )}>
          <AnimatePresence initial={false}>
            {recentCompleted.map((task) => (
              <TaskProgress
                key={task.id}
                task={task}
                showCancel={false}
                onCancel={removeTask}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Empty state when expanded but no tasks */}
      {isExpanded && !hasActiveTasks && !hasCompletedTasks && (
        <div className="text-center py-4 text-muted-foreground text-sm">
          <Minus className="h-4 w-4 mx-auto mb-1 opacity-50" />
          <p>Aktif görev yok</p>
        </div>
      )}
    </div>
  )
}

/**
 * CollapsibleTaskPanel - Floating panel version of task list
 */
export interface CollapsibleTaskPanelProps {
  /** Whether panel is open */
  isOpen: boolean
  /** Callback when close is requested */
  onClose: () => void
  /** Additional CSS classes */
  className?: string
}

/**
 * CollapsibleTaskPanel - Floating panel for background tasks
 *
 * @example
 * ```tsx
 * <CollapsibleTaskPanel
 *   isOpen={isTaskPanelOpen}
 *   onClose={() => setTaskPanelOpen(false)}
 * />
 * ```
 */
export function CollapsibleTaskPanel({
  isOpen,
  onClose,
  className,
}: CollapsibleTaskPanelProps) {
  if (!isOpen) return null

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50 w-80 max-h-[400px]',
        'bg-background border border-foreground/10 rounded-[8px]',
        'shadow-modal-small',
        'flex flex-col',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-foreground/10">
        <span className="text-sm font-medium">Arka Plan Görevleri</span>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded hover:bg-foreground/10 text-muted-foreground hover:text-foreground"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto p-2">
        <BackgroundTaskList
          showHeader={false}
          position="panel"
          maxCompleted={20}
        />
      </div>
    </div>
  )
}

export default BackgroundTaskList
