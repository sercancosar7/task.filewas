/**
 * PhaseCard - Faz kartı component'i
 * @module @task-filewas/frontend/components/roadmap/PhaseCard
 *
 * Tek faz icin gorsel kart - status, tasks, details
 */

import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle2,
  Circle,
  Clock,
  ChevronDown,
  ChevronRight,
  AlertCircle,
} from 'lucide-react'
import type { Phase, PhaseStatus, TaskStatus } from '@task-filewas/shared'

// =============================================================================
// Types
// =============================================================================

export interface PhaseCardProps {
  phase: Phase
  isCurrent?: boolean
  isExpanded?: boolean
  onToggle?: () => void
  className?: string
  showTasks?: boolean
  variant?: 'compact' | 'detailed'
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Get status icon for phase
 */
function getStatusIcon(status: PhaseStatus, isCurrent: boolean) {
  if (isCurrent) {
    return <AlertCircle className="h-4 w-4 text-accent" />
  }
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-4 w-4 text-success" />
    case 'in_progress':
      return <Clock className="h-4 w-4 text-info" />
    default:
      return <Circle className="h-4 w-4 text-foreground/30" />
  }
}

/**
 * Get status badge variant
 */
function getStatusBadgeVariant(status: PhaseStatus, isCurrent: boolean) {
  if (isCurrent) {
    return 'bg-accent/10 text-accent hover:bg-accent/20 border-accent/20'
  }
  switch (status) {
    case 'completed':
      return 'bg-success/10 text-success hover:bg-success/20 border-success/20'
    case 'in_progress':
      return 'bg-info/10 text-info hover:bg-info/20 border-info/20'
    default:
      return 'bg-foreground/5 text-foreground/60 hover:bg-foreground/10 border-foreground/10'
  }
}

/**
 * Get status badge text
 */
function getStatusBadgeText(status: PhaseStatus, isCurrent: boolean) {
  if (isCurrent) return 'Aktif Faz'
  switch (status) {
    case 'completed':
      return 'Tamamlandı'
    case 'in_progress':
      return 'Devam Ediyor'
    default:
      return 'Bekliyor'
  }
}

/**
 * Get task status icon
 */
function getTaskStatusIcon(status: TaskStatus) {
  switch (status) {
    case 'done':
      return <CheckCircle2 className="h-3.5 w-3.5 text-success" />
    case 'in_progress':
      return <Clock className="h-3.5 w-3.5 text-info animate-spin" />
    default:
      return <Circle className="h-3.5 w-3.5 text-foreground/20" />
  }
}

/**
 * Calculate phase completion percentage
 */
function calculatePhaseProgress(phase: Phase): { completed: number; total: number; percentage: number } {
  if (!phase.tasks || phase.tasks.length === 0) {
    const isCompleted = phase.status === 'completed'
    return { completed: isCompleted ? 1 : 0, total: 1, percentage: isCompleted ? 100 : 0 }
  }

  const total = phase.tasks.length
  const completed = phase.tasks.filter(t => t.status === 'done').length
  const percentage = total > 0 ? (completed / total) * 100 : 0

  return { completed, total, percentage }
}

// =============================================================================
// Component
// =============================================================================

/**
 * PhaseCard - Tek faz için kart component'i
 *
 * - Compact: Sadece numara, başlık ve durum
 * - Detailed: Açıklama, görevler, ilerleme barı
 */
export function PhaseCard({
  phase,
  isCurrent = false,
  isExpanded = false,
  onToggle,
  className,
  showTasks = true,
  variant = 'detailed',
}: PhaseCardProps) {
  const tasks = phase.tasks ?? []
  const hasTasks = tasks.length > 0
  const hasDetails = phase.description || hasTasks
  const taskProgress = calculatePhaseProgress(phase)

  return (
    <Card
      className={cn(
        'p-4 transition-all duration-200',
        'hover:bg-foreground/[0.02]',
        isCurrent && 'border-accent/50 bg-accent/5 shadow-sm',
        isExpanded && 'bg-foreground/[0.03]',
        className
      )}
    >
      {/* Header - Always Visible */}
      <div className="flex items-start gap-3">
        {/* Phase Number Badge */}
        <div
          className={cn(
            'flex items-center justify-center w-8 h-8 rounded-full text-[12px] font-semibold shrink-0',
            isCurrent && 'bg-accent text-white',
            !isCurrent && phase.status === 'completed' && 'bg-success/10 text-success',
            !isCurrent && phase.status === 'in_progress' && 'bg-info/10 text-info',
            !isCurrent && phase.status === 'pending' && 'bg-foreground/10 text-foreground/40'
          )}
        >
          {phase.id}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title Row */}
          <div className="flex items-center gap-2 mb-1">
            <h4 className={cn(
              'text-[13px] font-medium truncate',
              isCurrent && 'text-accent'
            )}>
              {phase.name}
            </h4>
            <Badge
              variant="outline"
              className={cn('text-[10px] shrink-0', getStatusBadgeVariant(phase.status, isCurrent))}
            >
              {getStatusBadgeText(phase.status, isCurrent)}
            </Badge>
          </div>

          {/* Description (compact variant) */}
          {variant === 'compact' && phase.description && (
            <p className="text-[11px] text-foreground/50 truncate">
              {phase.description}
            </p>
          )}

          {/* Task Progress (compact variant) */}
          {variant === 'compact' && hasTasks && (
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 h-1 bg-foreground/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-success rounded-full transition-all"
                  style={{ width: `${taskProgress.percentage}%` }}
                />
              </div>
              <span className="text-[10px] text-foreground/40">
                {taskProgress.completed}/{taskProgress.total}
              </span>
            </div>
          )}

          {/* Description (detailed variant) */}
          {variant === 'detailed' && phase.description && !isExpanded && (
            <p className="text-[12px] text-foreground/60 mt-1 line-clamp-2">
              {phase.description}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Status Icon */}
          <div className="shrink-0">
            {getStatusIcon(phase.status, isCurrent)}
          </div>

          {/* Expand/Collapse */}
          {hasDetails && onToggle && (
            <button
              type="button"
              onClick={onToggle}
              className="p-1 rounded hover:bg-foreground/5 transition-colors"
              aria-label={isExpanded ? 'Daralt' : 'Genişlet'}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-foreground/40" />
              ) : (
                <ChevronRight className="h-4 w-4 text-foreground/40" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Expanded Content (detailed variant) */}
      {variant === 'detailed' && isExpanded && (
        <div className="mt-4 pt-4 border-t border-foreground/5 space-y-3">
          {/* Description */}
          {phase.description && (
            <div>
              <p className="text-[12px] text-foreground/70">
                {phase.description}
              </p>
            </div>
          )}

          {/* Task Progress Bar */}
          {hasTasks && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-foreground/60">
                  Görevler
                </span>
                <span className="text-[11px] text-foreground/40">
                  {taskProgress.completed} / {taskProgress.total}
                </span>
              </div>
              <div className="h-1.5 bg-foreground/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-success rounded-full transition-all"
                  style={{ width: `${taskProgress.percentage}%` }}
                />
              </div>
            </div>
          )}

          {/* Task List */}
          {showTasks && hasTasks && (
            <ul className="space-y-1.5">
              {tasks.map((task) => (
                <li
                  key={task.id}
                  className={cn(
                    'flex items-start gap-2 text-[12px]',
                    task.status === 'done' && 'text-foreground/40'
                  )}
                >
                  <span className="shrink-0 mt-0.5">
                    {getTaskStatusIcon(task.status)}
                  </span>
                  <span
                    className={cn(
                      'flex-1',
                      task.status === 'done' && 'line-through'
                    )}
                  >
                    {task.title}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {/* Acceptance Criteria */}
          {phase.acceptanceCriteria && phase.acceptanceCriteria.length > 0 && (
            <div>
              <p className="text-[11px] font-medium text-foreground/60 mb-2">
                Kabul Kriterleri
              </p>
              <ul className="space-y-1">
                {phase.acceptanceCriteria.map((criteria, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-[11px] text-foreground/70"
                  >
                    <span className="text-accent mt-0.5">✓</span>
                    <span>{criteria}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Technical Notes */}
          {phase.technicalNotes && phase.technicalNotes.length > 0 && (
            <div>
              <p className="text-[11px] font-medium text-foreground/60 mb-2">
                Teknik Notlar
              </p>
              <ul className="space-y-1">
                {phase.technicalNotes.map((note, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-[11px] text-foreground/50"
                  >
                    <span className="text-info mt-0.5">ℹ</span>
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Duration Info */}
          {phase.durationMinutes && (
            <div className="flex items-center gap-2 text-[11px] text-foreground/40">
              <Clock className="h-3 w-3" />
              <span>Tahmini Süre: {phase.durationMinutes} dakika</span>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

export default PhaseCard
