/**
 * ProjectRoadmapTab - Roadmap tab içeriği
 * @module @task-filewas/frontend/components/project/tabs/ProjectRoadmapTab
 *
 * Faz listesi, milestone'lar ve ilerleme takibi
 */

import * as React from 'react'
import { useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { MilestoneList } from '@/components/roadmap/MilestoneList'
import { PhaseCard } from '@/components/roadmap/PhaseCard'
import { ListTodo, Loader2, AlertCircle, RefreshCw, Filter } from 'lucide-react'
import type {
  Roadmap,
  RoadmapProgress,
} from '@task-filewas/shared'

// =============================================================================
// Types
// =============================================================================

export interface ProjectRoadmapTabProps {
  projectId: string
  className?: string
}

interface RoadmapResponse {
  roadmap: Roadmap
  progress: RoadmapProgress
  meta: {
    totalPhases: number
    filteredPhases: number
    version: string
    currentPhase: number
  }
}

interface ApiResponse<T> {
  success: boolean
  data: T
  error?: string
}

type ViewMode = 'all' | 'pending' | 'in_progress' | 'completed'

// =============================================================================
// Helpers
// =============================================================================

/**
 * Simple API fetch helper
 */
async function apiGet<T>(url: string): Promise<{ data: T | null; error: string | null }> {
  const token = localStorage.getItem('auth_token')

  try {
    const response = await fetch(`/api${url}`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const result: ApiResponse<T> = await response.json()

    if (result.success && result.data) {
      return { data: result.data, error: null }
    }

    return { data: null, error: result.error || 'Unknown error' }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Fetch error' }
  }
}

// =============================================================================
// Component
// =============================================================================

/**
 * ProjectRoadmapTab - Faz listesi ve ilerleme takibi
 */
export function ProjectRoadmapTab({ projectId, className }: ProjectRoadmapTabProps) {
  // State
  const [roadmap, setRoadmap] = React.useState<Roadmap | null>(null)
  const [progress, setProgress] = React.useState<RoadmapProgress | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  // UI State
  const [viewMode, setViewMode] = React.useState<ViewMode>('all')
  const [expandedPhases, setExpandedPhases] = React.useState<Set<number>>(new Set())
  const [expandedMilestones, setExpandedMilestones] = React.useState<Set<number>>(new Set())

  // Fetch roadmap data
  const fetchRoadmap = React.useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await apiGet<RoadmapResponse>(`/projects/${projectId}/roadmap`)
      if (response.data) {
        setRoadmap(response.data.roadmap)
        setProgress(response.data.progress)
      } else {
        setError(response.error || 'Roadmap yüklenemedi')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Roadmap yüklenemedi'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  // Initial fetch
  useEffect(() => {
    if (projectId) {
      fetchRoadmap()
    }
  }, [projectId, fetchRoadmap])

  // Toggle phase expansion
  const togglePhase = React.useCallback((phaseId: number) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev)
      if (next.has(phaseId)) {
        next.delete(phaseId)
      } else {
        next.add(phaseId)
      }
      return next
    })
  }, [])

  // Toggle milestone expansion
  const toggleMilestone = React.useCallback((milestoneId: number) => {
    setExpandedMilestones((prev) => {
      const next = new Set(prev)
      if (next.has(milestoneId)) {
        next.delete(milestoneId)
      } else {
        next.add(milestoneId)
      }
      return next
    })
  }, [])

  // Filter phases based on view mode
  const filteredPhases = React.useMemo(() => {
    if (!roadmap) return []

    if (viewMode === 'all') return roadmap.phases

    return roadmap.phases.filter(phase => phase.status === viewMode)
  }, [roadmap, viewMode])

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('flex flex-col items-center justify-center h-full', className)}>
        <Loader2 className="h-8 w-8 text-accent animate-spin mb-3" />
        <p className="text-[13px] text-foreground/60">Roadmap yükleniyor...</p>
      </div>
    )
  }

  // Error state
  if (error || !roadmap) {
    return (
      <div className={cn('flex flex-col items-center justify-center h-full', className)}>
        <AlertCircle className="h-8 w-8 text-destructive mb-3" />
        <p className="text-[13px] text-foreground/60 mb-4">{error || 'Roadmap bulunamadı'}</p>
        <button
          type="button"
          onClick={fetchRoadmap}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-accent/10 text-accent hover:bg-accent/20 transition-colors text-[13px]"
        >
          <RefreshCw className="h-4 w-4" />
          Tekrar Dene
        </button>
      </div>
    )
  }

  const currentPhase = roadmap.currentPhase

  return (
    <div className={cn('flex flex-col h-full gap-6', className)}>
      {/* Header with Title and Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ListTodo className="h-5 w-5 text-accent" />
          <h2 className="text-[17px] font-semibold">Roadmap</h2>
          <Badge variant="outline" className="text-[11px]">
            {roadmap.version}
          </Badge>
        </div>

        {/* View Mode Filter */}
        <div className="flex items-center gap-1.5 bg-foreground/5 rounded-lg p-1">
          <Filter className="h-3.5 w-3.5 text-foreground/40 ml-1" />
          {[
            { value: 'all' as ViewMode, label: 'Tümü' },
            { value: 'pending' as ViewMode, label: 'Bekleyen' },
            { value: 'in_progress' as ViewMode, label: 'Devam Eden' },
            { value: 'completed' as ViewMode, label: 'Tamamlanan' },
          ].map((mode) => (
            <button
              key={mode.value}
              type="button"
              onClick={() => setViewMode(mode.value)}
              className={cn(
                'px-3 py-1 text-[12px] font-medium rounded-md transition-colors',
                viewMode === mode.value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-foreground/60 hover:text-foreground hover:bg-foreground/5'
              )}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 min-h-0">
        {/* Left Column - Milestones */}
        <div className={cn(
          'lg:w-80 shrink-0',
          'flex flex-col gap-4'
        )}>
          <MilestoneList
            milestones={roadmap.milestones}
            progress={progress!}
            currentPhase={currentPhase}
            expandedMilestoneIds={expandedMilestones}
            onToggleMilestone={toggleMilestone}
          />
        </div>

        {/* Right Column - Phase List */}
        <div className="flex-1 overflow-y-auto pr-2">
          <div className="flex items-center justify-between mb-3 sticky top-0 bg-background py-2 z-10">
            <h3 className="text-[13px] font-semibold text-foreground/60">
              Fazlar ({filteredPhases.length})
            </h3>
            <span className="text-[11px] text-foreground/40">
              Aktif: Faz {currentPhase}
            </span>
          </div>

          {filteredPhases.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48">
              <p className="text-[13px] text-foreground/40">
                Bu filtrede faz bulunmuyor
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredPhases.map((phase) => (
                <PhaseCard
                  key={phase.id}
                  phase={phase}
                  isCurrent={phase.id === currentPhase}
                  isExpanded={expandedPhases.has(phase.id)}
                  onToggle={() => togglePhase(phase.id)}
                  showTasks={true}
                  variant="detailed"
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProjectRoadmapTab
