/**
 * MilestoneList - Milestone listesi component'i
 * @module @task-filewas/frontend/components/roadmap/MilestoneList
 *
 * Milestone'lari gorsel olarak gosterir, progress bar ile
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Circle, ChevronDown, ChevronRight } from 'lucide-react'
import type { Milestone, RoadmapProgress } from '@task-filewas/shared'

// =============================================================================
// Types
// =============================================================================

export interface MilestoneListProps {
  milestones: Milestone[]
  progress: RoadmapProgress
  currentPhase: number
  expandedMilestoneIds?: Set<number>
  onToggleMilestone?: (milestoneId: number) => void
  className?: string
}

interface MilestoneProgress {
  total: number
  completed: number
  percentage: number
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Calculate progress for a single milestone
 */
function calculateMilestoneProgress(
  milestone: Milestone,
  currentPhase: number
): MilestoneProgress {
  const total = milestone.phases.length
  const completed = milestone.phases.filter(id => id < currentPhase).length
  const inProgress = milestone.phases.includes(currentPhase)
  const adjustedCompleted = inProgress ? completed + 0.5 : completed
  const percentage = total > 0 ? (adjustedCompleted / total) * 100 : 0

  return { total, completed, percentage }
}

/**
 * Get milestone status based on progress
 */
function getMilestoneStatus(progress: MilestoneProgress): 'completed' | 'in_progress' | 'pending' {
  if (progress.percentage >= 100) return 'completed'
  if (progress.percentage > 0) return 'in_progress'
  return 'pending'
}

/**
 * Get status badge variant
 */
function getStatusBadgeVariant(status: 'completed' | 'in_progress' | 'pending') {
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
function getStatusBadgeText(status: 'completed' | 'in_progress' | 'pending') {
  switch (status) {
    case 'completed':
      return 'Tamamlandı'
    case 'in_progress':
      return 'Devam Ediyor'
    default:
      return 'Bekliyor'
  }
}

// =============================================================================
// Component
// =============================================================================

/**
 * MilestoneList - Milestone listesi ve progress visualization
 */
export function MilestoneList({
  milestones,
  progress,
  currentPhase,
  expandedMilestoneIds,
  onToggleMilestone,
  className,
}: MilestoneListProps) {
  const [internalExpanded, setInternalExpanded] = React.useState<Set<number>>(new Set())

  const expanded = expandedMilestoneIds ?? internalExpanded

  const handleToggle = React.useCallback((milestoneId: number) => {
    if (onToggleMilestone) {
      onToggleMilestone(milestoneId)
    } else {
      setInternalExpanded((prev) => {
        const next = new Set(prev)
        if (next.has(milestoneId)) {
          next.delete(milestoneId)
        } else {
          next.add(milestoneId)
        }
        return next
      })
    }
  }, [onToggleMilestone])

  return (
    <div className={cn('space-y-3', className)}>
      {/* Overall Progress */}
      <div className="p-4 rounded-lg bg-foreground/5 border border-foreground/10">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[13px] font-medium">Toplam İlerleme</span>
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-foreground/60">
              {progress.completed} / {progress.total} faz
            </span>
            <Badge variant="outline" className={cn('text-[11px]', getStatusBadgeVariant(
              progress.completed === progress.total ? 'completed' :
              progress.completed > 0 ? 'in_progress' : 'pending'
            ))}>
              {Math.round(progress.percentage)}%
            </Badge>
          </div>
        </div>
        <div className="h-2 bg-foreground/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-accent to-accent/80 rounded-full transition-all duration-500"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
      </div>

      {/* Milestones */}
      <div className="space-y-2">
        <h3 className="text-[13px] font-semibold text-foreground/60 mb-3 uppercase tracking-wide">
          Milestone'lar ({milestones.length})
        </h3>
        {milestones.map((milestone) => {
          const milestoneProgress = calculateMilestoneProgress(milestone, currentPhase)
          const status = getMilestoneStatus(milestoneProgress)
          const isExpanded = expanded.has(milestone.id)

          return (
            <div
              key={milestone.id}
              className={cn(
                'rounded-lg border transition-all',
                status === 'completed' && 'border-success/20 bg-success/5',
                status === 'in_progress' && 'border-info/20 bg-info/5',
                status === 'pending' && 'border-foreground/10 bg-foreground/[0.02]'
              )}
            >
              {/* Milestone Header */}
              <button
                type="button"
                onClick={() => handleToggle(milestone.id)}
                className="w-full px-4 py-3 flex items-center gap-3 text-left"
              >
                {/* Status Icon */}
                <div className="shrink-0">
                  {status === 'completed' && (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  )}
                  {status === 'in_progress' && (
                    <div className="h-5 w-5 rounded-full border-2 border-info border-t-transparent animate-spin" />
                  )}
                  {status === 'pending' && (
                    <Circle className="h-5 w-5 text-foreground/20" />
                  )}
                </div>

                {/* Milestone Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[13px] font-medium truncate">
                      {milestone.name}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn('text-[10px] shrink-0', getStatusBadgeVariant(status))}
                    >
                      {getStatusBadgeText(status)}
                    </Badge>
                  </div>
                  {milestone.description && (
                    <p className="text-[11px] text-foreground/50 truncate">
                      {milestone.description}
                    </p>
                  )}
                </div>

                {/* Phase Count */}
                <div className="shrink-0 text-right">
                  <div className="text-[11px] text-foreground/40">
                    {milestoneProgress.completed} / {milestoneProgress.total}
                  </div>
                </div>

                {/* Expand Icon */}
                <div className="shrink-0">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-foreground/40" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-foreground/40" />
                  )}
                </div>
              </button>

              {/* Milestone Progress Bar */}
              <div className="px-4 pb-2">
                <div className="h-1 bg-foreground/10 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      status === 'completed' && 'bg-success',
                      status === 'in_progress' && 'bg-info',
                      status === 'pending' && 'bg-foreground/20'
                    )}
                    style={{ width: `${milestoneProgress.percentage}%` }}
                  />
                </div>
              </div>

              {/* Expanded Content - Phase List */}
              {isExpanded && (
                <div className="px-4 pb-3 pt-2 border-t border-foreground/5">
                  <div className="flex flex-wrap gap-1.5">
                    {milestone.phases.map((phaseId) => {
                      const isCompleted = phaseId < currentPhase
                      const isCurrent = phaseId === currentPhase
                      const isPending = phaseId > currentPhase

                      return (
                        <Badge
                          key={phaseId}
                          variant="outline"
                          className={cn(
                            'px-2 py-0.5 text-[11px] font-mono',
                            isCompleted && 'bg-success/10 text-success border-success/20',
                            isCurrent && 'bg-info/10 text-info border-info/20 animate-pulse',
                            isPending && 'bg-foreground/5 text-foreground/40 border-foreground/10'
                          )}
                        >
                          Faz {phaseId}
                          {isCurrent && ' ✓'}
                        </Badge>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default MilestoneList
