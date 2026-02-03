/**
 * ProjectRoadmapTab - Roadmap tab içeriği
 * @module @task-filewas/frontend/components/project/tabs/ProjectRoadmapTab
 *
 * Faz listesi, milestone'lar ve ilerleme takibi
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ListTodo, CheckCircle2, Circle, Clock, AlertCircle } from 'lucide-react'

// =============================================================================
// Types
// =============================================================================

export interface ProjectRoadmapTabProps {
  projectId: string
  className?: string
}

type PhaseStatus = 'pending' | 'in_progress' | 'completed'

interface Phase {
  id: number
  name: string
  status: PhaseStatus
  description?: string
  tasks?: Array<{
    id: string
    title: string
    status: 'pending' | 'in_progress' | 'done'
  }>
}

interface Milestone {
  id: number
  name: string
  color: string
  phases: number[]
}

// =============================================================================
// Mock Data (placeholder)
// =============================================================================

const MOCK_MILESTONES: Milestone[] = [
  { id: 1, name: 'Proje Altyapısı', color: 'bg-blue-500', phases: [1, 2, 3] },
  { id: 2, name: 'Backend Temelleri', color: 'bg-purple-500', phases: [4, 5, 6] },
  { id: 3, name: 'Frontend Temelleri', color: 'bg-green-500', phases: [7, 8, 9] },
]

const MOCK_PHASES: Phase[] = [
  {
    id: 1,
    name: 'Proje kurulumu',
    status: 'completed',
    description: 'Monorepo, TypeScript, ESLint',
  },
  {
    id: 2,
    name: 'Storage setup',
    status: 'completed',
    description: 'File-based storage, JSONL',
  },
  {
    id: 3,
    name: 'Auth API',
    status: 'in_progress',
    description: 'JWT authentication',
    tasks: [
      { id: '3.1', title: 'Login endpoint', status: 'in_progress' },
      { id: '3.2', title: 'Register endpoint', status: 'pending' },
    ],
  },
  {
    id: 4,
    name: 'Product API',
    status: 'pending',
    description: 'CRUD endpoints',
  },
]

// =============================================================================
// Helpers
// =============================================================================

function getStatusIcon(status: PhaseStatus) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-4 w-4 text-success" />
    case 'in_progress':
      return <Clock className="h-4 w-4 text-info" />
    default:
      return <Circle className="h-4 w-4 text-foreground/30" />
  }
}

function getStatusBadge(status: PhaseStatus) {
  switch (status) {
    case 'completed':
      return <Badge className="bg-success/10 text-success hover:bg-success/20">Tamamlandı</Badge>
    case 'in_progress':
      return <Badge className="bg-info/10 text-info hover:bg-info/20">Devam Ediyor</Badge>
    default:
      return <Badge className="bg-foreground/5 text-foreground/60 hover:bg-foreground/10">Bekliyor</Badge>
  }
}

// =============================================================================
// Component
// =============================================================================

/**
 * ProjectRoadmapTab - Faz listesi ve ilerleme takibi
 */
export function ProjectRoadmapTab({ projectId, className }: ProjectRoadmapTabProps) {
  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Progress Overview */}
      <div className="mb-6 p-4 rounded-lg bg-foreground/5 border border-foreground/10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[13px] font-medium">İlerleme Durumu</span>
          <span className="text-[12px] text-foreground/60">2 / 4 faz tamamlandı</span>
        </div>
        <div className="h-2 bg-foreground/10 rounded-full overflow-hidden">
          <div className="h-full bg-accent rounded-full transition-all" style={{ width: '50%' }} />
        </div>
      </div>

      {/* Milestones */}
      <div className="mb-6">
        <h3 className="text-[13px] font-semibold text-foreground/60 mb-3 uppercase tracking-wide">
          Milestone'lar
        </h3>
        <div className="flex gap-2 flex-wrap">
          {MOCK_MILESTONES.map((milestone) => (
            <Badge
              key={milestone.id}
              className={cn('px-3 py-1 text-[11px]', milestone.color, 'text-white')}
            >
              {milestone.name}
            </Badge>
          ))}
        </div>
      </div>

      {/* Phase List */}
      <div className="flex-1 overflow-y-auto space-y-2">
        <h3 className="text-[13px] font-semibold text-foreground/60 mb-3 uppercase tracking-wide">
          Fazlar
        </h3>
        {MOCK_PHASES.map((phase) => (
          <Card
            key={phase.id}
            className={cn(
              'p-4 transition-colors hover:bg-foreground/[0.02]',
              phase.status === 'in_progress' && 'border-accent/50 bg-accent/5'
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <div className="mt-0.5">{getStatusIcon(phase.status)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[13px] font-medium">
                      Faz {phase.id}: {phase.name}
                    </span>
                    {getStatusBadge(phase.status)}
                  </div>
                  {phase.description && (
                    <p className="text-[12px] text-foreground/60 mb-2">{phase.description}</p>
                  )}
                  {phase.tasks && phase.tasks.length > 0 && (
                    <ul className="space-y-1 mt-2">
                      {phase.tasks.map((task) => (
                        <li key={task.id} className="flex items-center gap-2 text-[12px]">
                          <span className={cn(
                            'shrink-0',
                            task.status === 'done' && 'text-success',
                            task.status === 'in_progress' && 'text-info'
                          )}>
                            {task.status === 'done' && <CheckCircle2 className="h-3 w-3" />}
                            {task.status === 'in_progress' && <Clock className="h-3 w-3 animate-spin" />}
                            {task.status === 'pending' && <Circle className="h-3 w-3 text-foreground/20" />}
                          </span>
                          <span className={cn(
                            task.status === 'done' && 'line-through text-foreground/40'
                          )}>
                            {task.title}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              {phase.status === 'in_progress' && (
                <AlertCircle className="h-4 w-4 text-accent shrink-0" />
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Empty State Note */}
      <div className="mt-4 p-3 rounded-md bg-foreground/5 text-center">
        <p className="text-[11px] text-foreground/40">
          Roadmap verisi placeholder'dır. Gerçek veri API'den gelecektir.
        </p>
      </div>
    </div>
  )
}

export default ProjectRoadmapTab
