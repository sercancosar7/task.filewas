/**
 * TaskProgress - Task progress indicator component
 * @module @task-filewas/frontend/components/tasks/TaskProgress
 *
 * Displays a background task with its progress
 */

import { motion } from 'framer-motion'
import { Loader2, CheckCircle2, XCircle, X, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { type BackgroundTask } from '@/stores/tasks'

// =============================================================================
// Types
// =============================================================================

export interface TaskProgressProps {
  /** Task to display */
  task: BackgroundTask
  /** Whether to show the cancel button */
  showCancel?: boolean
  /** Callback when cancel is clicked */
  onCancel?: (taskId: string) => void
  /** Callback when task is clicked */
  onClick?: (task: BackgroundTask) => void
  /** Additional CSS classes */
  className?: string
}

// =============================================================================
// Helper Components
// =============================================================================

interface TaskStatusIconProps {
  status: BackgroundTask['status']
  className?: string
}

function TaskStatusIcon({ status, className }: TaskStatusIconProps) {
  switch (status) {
    case 'running':
      return <Loader2 className={cn('animate-spin', className)} />
    case 'completed':
      return <CheckCircle2 className={cn('text-success', className)} />
    case 'error':
      return <XCircle className={cn('text-destructive', className)} />
    case 'cancelled':
      return <X className={cn('text-muted-foreground', className)} />
    case 'pending':
    default:
      return <Clock className={cn('text-muted-foreground', className)} />
  }
}

function getStatusVariant(status: BackgroundTask['status']): string {
  switch (status) {
    case 'running':
      return 'border-accent bg-accent/5'
    case 'completed':
      return 'border-success/30'
    case 'error':
      return 'border-destructive/30'
    case 'cancelled':
      return 'border-muted-foreground/30'
    case 'pending':
    default:
      return 'border-muted'
  }
}

function getStatusText(status: BackgroundTask['status']): string {
  switch (status) {
    case 'running':
      return 'Çalışıyor'
    case 'completed':
      return 'Tamamlandı'
    case 'error':
      return 'Hata'
    case 'cancelled':
      return 'İptal'
    case 'pending':
      return 'Beklemede'
    default:
      return ''
  }
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * TaskProgress - Single task progress card
 *
 * @example
 * ```tsx
 * <TaskProgress
 *   task={backgroundTask}
 *   showCancel
 *   onCancel={(id) => cancelTask(id)}
 * />
 * ```
 */
export function TaskProgress({
  task,
  showCancel = true,
  onCancel,
  onClick,
  className,
}: TaskProgressProps) {
  const isRunning = task.status === 'running'
  const isError = task.status === 'error'

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 100 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'flex items-center gap-3 p-3 rounded-[8px] border',
        'bg-background shadow-minimal',
        getStatusVariant(task.status),
        onClick && 'cursor-pointer hover:bg-foreground/5',
        className
      )}
      onClick={() => onClick?.(task)}
    >
      {/* Status icon */}
      <div className="shrink-0">
        <TaskStatusIcon status={task.status} className="h-4 w-4" />
      </div>

      {/* Task info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{task.title}</span>
          <span className="text-[10px] text-muted-foreground shrink-0">
            {getStatusText(task.status)}
          </span>
        </div>

        {/* Progress bar or current step */}
        {(isRunning || task.currentStep) && (
          <div className="mt-2">
            {isRunning && task.progress > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-foreground/10 rounded-full overflow-hidden h-1">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${task.progress}%` }}
                    transition={{ duration: 0.3 }}
                    className="h-full bg-accent rounded-full"
                  />
                </div>
                <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
                  {task.progress}%
                </span>
              </div>
            )}
            {task.currentStep && (
              <p className="text-[11px] text-muted-foreground truncate">
                {task.currentStep}
              </p>
            )}
          </div>
        )}

        {/* Error message */}
        {isError && task.error && (
          <p className="mt-1 text-[11px] text-destructive truncate">
            {task.error}
          </p>
        )}
      </div>

      {/* Cancel button */}
      {showCancel && isRunning && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onCancel?.(task.id)
          }}
          className="shrink-0 p-1 rounded hover:bg-foreground/10 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Cancel task"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </motion.div>
  )
}

/**
 * CompactTaskProgress - Smaller variant for inline display
 */
export interface CompactTaskProgressProps {
  task: BackgroundTask
  className?: string
}

export function CompactTaskProgress({
  task,
  className,
}: CompactTaskProgressProps) {
  const isRunning = task.status === 'running'

  return (
    <div
      className={cn(
        'flex items-center gap-2 text-xs',
        'text-muted-foreground',
        className
      )}
    >
      <TaskStatusIcon status={task.status} className="h-3 w-3 shrink-0" />
      <span className="truncate max-w-[120px]">{task.title}</span>
      {isRunning && (
        <>
          <span className="text-muted-foreground/50">·</span>
          <span className="font-mono tabular-nums">{task.progress}%</span>
        </>
      )}
    </div>
  )
}

export default TaskProgress
