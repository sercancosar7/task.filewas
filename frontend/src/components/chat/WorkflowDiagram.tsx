/**
 * WorkflowDiagram - Multi-agent workflow visualization
 * @module @task-filewas/frontend/components/chat/WorkflowDiagram
 *
 * Layout Structure:
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ WORKFLOW: feature                                                    │
 * │ Task: "Authentication sistemi ekle"                                  │
 * ├─────────────────────────────────────────────────────────────────────┤
 * │  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐      │
 * │  │ Planner  │ → │ TDD Guide│ → │ Reviewer │ → │ Security │      │
 * │  │    ✅    │    │    🔄    │    │    ⏳    │    │    ⏳    │      │
 * │  │ 2m 34s   │    │ running  │    │ pending  │    │ pending  │      │
 * │  └──────────┘    └──────────┘    └──────────┘    └──────────┘      │
 * │                                                                          │
 * │  Progress: ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 35%      │
 * │  Agent 2/4 · TDD Guide · glm · Test yaziyor...                         │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * Features:
 * - Horizontal agent chain visualization
 * - Agent states: pending, running, completed, error
 * - Connecting arrows between agents
 * - Overall workflow progress indicator
 * - Current active agent highlight
 * - Agent duration display
 * - Compact and full display modes
 */

import { motion } from 'framer-motion'
import {
  ChevronRight,
  Clock,
  Loader2,
  CheckCircle2,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SessionAgent } from '@task-filewas/shared'

// =============================================================================
// Types
// =============================================================================

export interface WorkflowDiagramProps {
  /** List of agents in the workflow (in order) */
  agents: SessionAgent[]
  /** Overall workflow progress (0-100) */
  overallProgress?: number
  /** Currently active agent type */
  activeAgentType?: string | undefined
  /** Current action description */
  currentAction?: string | undefined
  /** Display mode */
  variant?: 'full' | 'compact' | 'minimal'
  /** Additional CSS classes */
  className?: string
}

// =============================================================================
// Constants
// =============================================================================

type AgentStatus = 'pending' | 'running' | 'completed' | 'error'

interface StatusConfig {
  icon: LucideIcon
  bgColor: string
  textColor: string
  borderColor: string
  label: string
  animate?: boolean
}

const STATUS_CONFIG: Record<AgentStatus, StatusConfig> = {
  pending: {
    icon: Clock,
    bgColor: 'bg-muted/50',
    textColor: 'text-muted-foreground',
    borderColor: 'border-muted',
    label: 'Bekliyor',
  },
  running: {
    icon: Loader2,
    bgColor: 'bg-blue-500/10',
    textColor: 'text-blue-500',
    borderColor: 'border-blue-500/30',
    label: 'Calisiyor',
    animate: true,
  },
  completed: {
    icon: CheckCircle2,
    bgColor: 'bg-green-500/10',
    textColor: 'text-green-500',
    borderColor: 'border-green-500/30',
    label: 'Tamamlandi',
  },
  error: {
    icon: XCircle,
    bgColor: 'bg-red-500/10',
    textColor: 'text-red-500',
    borderColor: 'border-red-500/30',
    label: 'Hata',
  },
}

// Agent display names
const AGENT_NAMES: Record<string, string> = {
  orchestrator: 'Orchestrator',
  planner: 'Planner',
  architect: 'Architect',
  implementer: 'Implementer',
  reviewer: 'Reviewer',
  tester: 'Tester',
  security: 'Security',
  debugger: 'Debugger',
}

// =============================================================================
// Helper Components
// =============================================================================

/**
 * Agent node in the workflow diagram
 */
interface AgentNodeProps {
  agent: SessionAgent
  isActive: boolean
  showDuration?: boolean
}

function AgentNode({ agent, isActive, showDuration = false }: AgentNodeProps) {
  const status = agent.status as AgentStatus
  const config = STATUS_CONFIG[status]
  const StatusIcon = config.icon

  const displayName = AGENT_NAMES[agent.type] || agent.type

  // Format duration if available
  const formatDuration = (ms?: number): string => {
    if (!ms) return ''
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.round((ms % 60000) / 1000)
    return `${minutes}m ${seconds}s`
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'flex flex-col items-center gap-1.5',
        'min-w-[100px] max-w-[120px]',
        'p-3 rounded-lg border-2',
        config.bgColor,
        config.borderColor,
        isActive && 'ring-2 ring-accent/50 ring-offset-2 ring-offset-background',
        'transition-all duration-200'
      )}
    >
      {/* Status icon */}
      <div className={cn('p-1.5 rounded-full', config.bgColor)}>
        <StatusIcon
          className={cn(
            'h-4 w-4',
            config.textColor,
            config.animate && 'animate-spin'
          )}
        />
      </div>

      {/* Agent name */}
      <span className="text-[11px] font-semibold text-center text-foreground/80">
        {displayName}
      </span>

      {/* Status label */}
      <span className={cn('text-[10px]', config.textColor)}>
        {config.label}
      </span>

      {/* Duration if completed and showDuration */}
      {showDuration && agent.duration && (
        <span className="text-[9px] text-muted-foreground">
          {formatDuration(agent.duration)}
        </span>
      )}

      {/* Model badge (minimal) */}
      <span className="text-[9px] px-1.5 py-0.5 rounded bg-foreground/5 text-foreground/50">
        {agent.model === 'claude' ? 'Claude' : agent.model}
      </span>
    </motion.div>
  )
}

/**
 * Connector arrow between agents
 */
interface ConnectorProps {
  isActive: boolean
}

function Connector({ isActive }: ConnectorProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center',
        'w-6 h-6 shrink-0',
        isActive ? 'text-accent' : 'text-muted-foreground/30'
      )}
    >
      <ChevronRight className="h-4 w-4" />
    </div>
  )
}

/**
 * Overall progress bar for the workflow
 */
interface WorkflowProgressProps {
  progress: number
  current?: string | undefined
  className?: string
}

function WorkflowProgress({ progress, current, className }: WorkflowProgressProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {/* Progress bar */}
      <div className="relative h-2 w-full bg-muted rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-accent/80 to-accent rounded-full"
        />
      </div>

      {/* Progress text */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Progress: {progress}%</span>
        {current !== undefined && current !== '' && (
          <span className="text-foreground/60 truncate ml-2">{current}</span>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// Component Variants
// =============================================================================

/**
 * Full workflow diagram with all details
 */
function FullWorkflowDiagram({
  agents,
  overallProgress = 0,
  activeAgentType,
  currentAction,
}: WorkflowDiagramProps) {
  const runningAgent = agents.find((a) => a.status === 'running')
  const completedCount = agents.filter((a) => a.status === 'completed').length
  const totalCount = agents.length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[11px] text-muted-foreground uppercase tracking-wider">
            Workflow
          </span>
          {runningAgent && (
            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500">
              Agent {completedCount + 1}/{totalCount}
            </span>
          )}
        </div>
        {runningAgent && (
          <span className="text-[10px] text-muted-foreground">
            {AGENT_NAMES[runningAgent.type]} · {runningAgent.model}
          </span>
        )}
      </div>

      {/* Agent chain */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-thin">
        {agents.map((agent, index) => (
          <div key={agent.id} className="flex items-center">
            <AgentNode
              agent={agent}
              isActive={activeAgentType !== undefined && agent.type === activeAgentType}
              showDuration
            />
            {index < agents.length - 1 && (
              <Connector isActive={agent.status === 'completed'} />
            )}
          </div>
        ))}
      </div>

      {/* Progress section */}
      <WorkflowProgress
        progress={overallProgress}
        current={currentAction}
      />
    </div>
  )
}

/**
 * Compact workflow diagram (horizontal, minimal details)
 */
function CompactWorkflowDiagram({
  agents,
  overallProgress = 0,
  activeAgentType,
}: WorkflowDiagramProps) {
  const runningAgent = agents.find((a) => a.status === 'running')

  return (
    <div className="flex items-center gap-3">
      {/* Agent dots */}
      {agents.map((agent) => {
        const status = agent.status as AgentStatus
        const config = STATUS_CONFIG[status]
        const StatusIcon = config.icon

        return (
          <div key={agent.id} className="flex items-center">
            <div
              className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center',
                'border',
                config.borderColor,
                config.bgColor,
                activeAgentType !== undefined && agent.type === activeAgentType && 'ring-2 ring-accent'
              )}
            >
              <StatusIcon
                className={cn(
                  'h-3 w-3',
                  config.textColor,
                  config.animate && 'animate-spin'
                )}
              />
            </div>
          </div>
        )
      })}
      {agents.length > 1 && agents.map((agent, index) => {
        return index < agents.length - 1 ? (
          <ChevronRight key={`connector-${agent.id}`} className="h-3 w-3 text-muted-foreground/30 mx-0.5" />
        ) : null
      })}

      {/* Progress info */}
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <span>{overallProgress}%</span>
        {runningAgent && (
          <>
            <span>·</span>
            <span className="text-accent">{AGENT_NAMES[runningAgent.type]}</span>
          </>
        )}
      </div>
    </div>
  )
}

/**
 * Minimal workflow diagram (dots only)
 */
function MinimalWorkflowDiagram({
  agents,
  overallProgress = 0,
}: WorkflowDiagramProps) {
  return (
    <div className="flex items-center gap-2">
      {/* Progress dots */}
      {agents.map((agent) => {
        const status = agent.status as AgentStatus
        const isActive = status === 'running'
        const isCompleted = status === 'completed'
        const isError = status === 'error'

        return (
          <div
            key={agent.id}
            className={cn(
              'w-2 h-2 rounded-full transition-all duration-200',
              isError && 'bg-red-500',
              isCompleted && 'bg-green-500',
              isActive && 'bg-accent animate-pulse',
              status === 'pending' && 'bg-muted'
            )}
          />
        )
      })}

      {/* Progress percentage */}
      <span className="text-[10px] text-muted-foreground ml-1">
        {overallProgress}%
      </span>
    </div>
  )
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * WorkflowDiagram - Multi-agent workflow visualization
 *
 * @example
 * ```tsx
 * <WorkflowDiagram
 *   agents={[
 *     { id: '1', type: 'planner', model: 'claude', status: 'completed' },
 *     { id: '2', type: 'implementer', model: 'glm', status: 'running' },
 *     { id: '3', type: 'reviewer', model: 'glm', status: 'pending' },
 *   ]}
 *   overallProgress={35}
 *   activeAgentType="implementer"
 *   currentAction="Kod yaziyor..."
 *   variant="full"
 * />
 * ```
 */
export function WorkflowDiagram({
  agents,
  overallProgress = 0,
  activeAgentType,
  currentAction,
  variant = 'full',
  className,
}: WorkflowDiagramProps) {
  // Calculate overall progress from agents if not provided
  const calculatedProgress =
    overallProgress > 0
      ? overallProgress
      : agents.length > 0
        ? Math.round(
            (agents.filter((a) => a.status === 'completed').length / agents.length) * 100
          )
        : 0

  // Auto-detect active agent if not provided
  const detectedActiveAgent = activeAgentType ?? agents.find((a) => a.status === 'running')?.type

  // Empty state
  if (agents.length === 0) {
    return (
      <div className={cn('text-center py-4', className)}>
        <p className="text-[11px] text-muted-foreground">No agents in workflow</p>
      </div>
    )
  }

  // Render based on variant
  const content = (() => {
    switch (variant) {
      case 'compact':
        return (
          <CompactWorkflowDiagram
            agents={agents}
            overallProgress={calculatedProgress}
            activeAgentType={detectedActiveAgent}
            currentAction={currentAction}
          />
        )
      case 'minimal':
        return (
          <MinimalWorkflowDiagram
            agents={agents}
            overallProgress={calculatedProgress}
          />
        )
      default:
        return (
          <FullWorkflowDiagram
            agents={agents}
            overallProgress={calculatedProgress}
            activeAgentType={detectedActiveAgent}
            currentAction={currentAction}
          />
        )
    }
  })()

  return (
    <div className={cn('rounded-lg bg-foreground/5 border border-foreground/10 p-4', className)}>
      {content}
    </div>
  )
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Calculate workflow progress from agents
 */
export function calculateWorkflowProgress(agents: SessionAgent[]): number {
  if (agents.length === 0) return 0

  const weights: Record<string, number> = {
    orchestrator: 1.5,
    planner: 1.2,
    architect: 1.2,
    security: 1.2,
    implementer: 1,
    reviewer: 0.8,
    tester: 0.8,
    debugger: 0.5,
  }

  const totalWeight = agents.reduce((sum, agent) => {
    return sum + (weights[agent.type] || 1)
  }, 0)

  const completedWeight = agents.reduce((sum, agent) => {
    if (agent.status === 'completed') {
      return sum + (weights[agent.type] || 1)
    } else if (agent.status === 'running') {
      // Running agents count as 50% of their weight
      return sum + (weights[agent.type] || 1) * 0.5
    }
    return sum
  }, 0)

  return Math.round((completedWeight / totalWeight) * 100)
}

/**
 * Get current workflow status text
 */
export function getWorkflowStatusText(
  agents: SessionAgent[],
  currentAction?: string
): string {
  const runningAgent = agents.find((a) => a.status === 'running')
  const completedCount = agents.filter((a) => a.status === 'completed').length

  if (runningAgent) {
    const agentName = AGENT_NAMES[runningAgent.type] || runningAgent.type
    const modelName = runningAgent.model === 'claude' ? 'Claude' : runningAgent.model
    const action = currentAction ?? getDefaultAction(runningAgent.type)
    return `${agentName} · ${modelName} · ${action}`
  }

  if (completedCount === agents.length) {
    return 'Tum agentler tamamlandi'
  }

  if (agents.some((a) => a.status === 'error')) {
    return 'Hata olustu, düzeltiliyor...'
  }

  return 'Workflow hazirlaniyor...'
}

/**
 * Get default action text for agent type
 */
function getDefaultAction(agentType: string): string {
  const actions: Record<string, string> = {
    orchestrator: 'Gorevleri koordine ediyor...',
    planner: 'Plan hazirliyor...',
    architect: 'Mimari tasarliyor...',
    implementer: 'Kod yaziyor...',
    reviewer: 'Kod inceliyor...',
    tester: 'Test calistiriyor...',
    security: 'Guvenlik kontrolu yapiyor...',
    debugger: 'Hata ayikliyor...',
  }
  return actions[agentType] || 'Calisiyor...'
}

export default WorkflowDiagram
