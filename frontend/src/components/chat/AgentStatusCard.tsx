/**
 * AgentStatusCard - Agent calisirken UI gosterimi
 * @module @task-filewas/frontend/components/chat/AgentStatusCard
 *
 * Layout Structure:
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ │  🔄 AGENT CALISIYOR: Planner                                   │ │
 * │ │  Model: claude-opus-4-5-20251101                             │ │
 * │ │  Durum: Proje yapisini analiz ediyor...                      │ │
 * │ │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 45%              │ │
 * │ └─────────────────────────────────────────────────────────────────────┘
 *
 * Features:
 * - Agent status display (pending, running, completed, error)
 * - Model information display
 * - Progress bar with percentage
 * - Current action/status text
 * - Animated spinner for running state
 * - Phase information (current/total)
 */

import { motion } from 'framer-motion'
import { Loader2, CheckCircle2, XCircle, Clock, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ProgressBar } from './ProgressBar'
import type { SessionAgent } from '@task-filewas/shared'

// =============================================================================
// Types
// =============================================================================

export interface AgentStatusCardProps {
  /** Agent information */
  agent: SessionAgent
  /** Phase information (optional) */
  phase?: {
    /** Current phase number */
    current: number
    /** Total phases */
    total: number
    /** Phase name */
    name?: string
  }
  /** Whether to show compact version */
  compact?: boolean | undefined
  /** Additional CSS classes */
  className?: string | undefined
}

// =============================================================================
// Constants
// =============================================================================

type StatusConfigKey = 'pending' | 'running' | 'completed' | 'error'

interface StatusConfig {
  icon: LucideIcon
  color: string
  bgColor: string
  label: string
  animate?: true
}

const STATUS_CONFIG: Record<StatusConfigKey, Omit<StatusConfig, 'animate'> | StatusConfig> = {
  pending: {
    icon: Clock,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    label: 'Bekliyor',
  },
  running: {
    icon: Loader2,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    label: 'Calisiyor',
    animate: true,
  },
  completed: {
    icon: CheckCircle2,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    label: 'Tamamlandi',
  },
  error: {
    icon: XCircle,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    label: 'Hata',
  },
}

// =============================================================================
// Helper Components
// =============================================================================

/**
 * Agent status icon with optional animation
 */
interface StatusIconProps {
  status: SessionAgent['status']
  className?: string | undefined
}

function StatusIcon({ status, className }: StatusIconProps) {
  const config = STATUS_CONFIG[status]
  const Icon = config.icon

  return (
    <div
      className={cn(
        'flex items-center justify-center',
        'rounded-full',
        config.bgColor,
        'p-1.5',
        className
      )}
    >
      <Icon
        className={cn(
          'h-4 w-4',
          config.color,
          'animate' in config && config.animate && 'animate-spin'
        )}
      />
    </div>
  )
}

/**
 * Model badge display
 */
interface ModelBadgeProps {
  model: string
  className?: string | undefined
}

function ModelBadge({ model, className }: ModelBadgeProps) {
  // Shorten model name for display
  const getShortModelName = (fullName: string): string => {
    if (fullName.includes('opus')) return 'Opus'
    if (fullName.includes('sonnet')) return 'Sonnet'
    if (fullName.includes('haiku')) return 'Haiku'
    if (fullName.includes('glm')) return 'GLM'
    if (fullName.includes('claude')) return 'Claude'
    return fullName
  }

  return (
    <span
      className={cn(
        'px-2 py-0.5 rounded text-[10px] font-medium',
        'bg-foreground/5 text-foreground/60',
        className
      )}
    >
      {getShortModelName(model)}
    </span>
  )
}

// =============================================================================
// Component
// =============================================================================

/**
 * AgentStatusCard - Display agent execution status
 *
 * @example
 * ```tsx
 * <AgentStatusCard
 *   agent={{
 *     id: 'agent-1',
 *     type: 'planner',
 *     model: 'claude',
 *     status: 'running',
 *     startedAt: '2024-01-15T10:00:00Z',
 *   }}
 *   phase={{ current: 3, total: 12, name: 'UI Implementation' }}
 * />
 * ```
 */
export function AgentStatusCard({
  agent,
  phase,
  compact = false,
  className,
}: AgentStatusCardProps) {
  const config = STATUS_CONFIG[agent.status]

  // Calculate progress based on phase if available
  const progress = phase
    ? Math.round((phase.current / phase.total) * 100)
    : agent.status === 'completed'
      ? 100
      : agent.status === 'running'
        ? 50 // Default progress for running without phase info
        : 0

  // Get agent display name
  const getAgentDisplayName = (type: string): string => {
    const names: Record<string, string> = {
      orchestrator: 'Orchestrator',
      planner: 'Planner',
      architect: 'Architect',
      implementer: 'Implementer',
      reviewer: 'Reviewer',
      tester: 'Tester',
      security: 'Security',
      debugger: 'Debugger',
    }
    return names[type] || type.charAt(0).toUpperCase() + type.slice(1)
  }

  // Get current action text based on agent type
  const getCurrentAction = (type: string, status: SessionAgent['status']): string => {
    if (status === 'completed') return 'Tamamlandi'
    if (status === 'error') return 'Hata olustu'
    if (status === 'pending') return 'Basliyor...'

    const actions: Record<string, string> = {
      orchestrator: 'Gorevleri koordine ediyor...',
      planner: 'Proje plani hazirliyor...',
      architect: 'Mimari kararlari aliyor...',
      implementer: 'Kod yaziyor...',
      reviewer: 'Kod inceliyor...',
      tester: 'Test calistiriyor...',
      security: 'Guvenlik kontrolu yapiyor...',
      debugger: 'Hata ayikliyor...',
    }
    return actions[type] || 'Calisiyor...'
  }

  const currentAction = getCurrentAction(agent.type, agent.status)

  // Compact version (for inline display)
  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 px-2 py-1.5 rounded-md',
          'bg-foreground/5',
          className
        )}
      >
        <StatusIcon status={agent.status} />
        <span className="text-[13px] font-medium">
          {getAgentDisplayName(agent.type)}
        </span>
        <ModelBadge model={agent.model} />
      </div>
    )
  }

  // Full card version
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-[8px] p-3',
        'bg-foreground/5 border border-foreground/10',
        'shadow-minimal',
        className
      )}
    >
      {/* Header row */}
      <div className="flex items-center gap-3 mb-2">
        {/* Status icon */}
        <StatusIcon status={agent.status} />

        {/* Agent name and model */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold">
              {getAgentDisplayName(agent.type)}
            </span>
            <ModelBadge model={agent.model} />
          </div>
        </div>

        {/* Status label */}
        <span
          className={cn(
            'text-[11px] font-medium',
            'px-2 py-0.5 rounded',
            config.bgColor,
            config.color
          )}
        >
          {config.label}
        </span>
      </div>

      {/* Current action / Phase info */}
      <div className="space-y-1.5">
        {/* Phase information if available */}
        {phase && (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span>Faz {phase.current}/{phase.total}</span>
            {phase.name && (
              <>
                <span>•</span>
                <span className="truncate">{phase.name}</span>
              </>
            )}
          </div>
        )}

        {/* Current action text */}
        <p className="text-[13px] text-foreground/70">
          {currentAction}
        </p>

        {/* Progress bar */}
        <ProgressBar
          progress={progress}
          className="h-1.5"
          showPercentage={false}
        />
      </div>

      {/* Duration display if available */}
      {agent.duration !== undefined && (
        <div className="mt-2 text-[11px] text-muted-foreground">
          Sure: {formatDuration(agent.duration)}
        </div>
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
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.round((ms % 60000) / 1000)
  return `${minutes}m ${seconds}s`
}

export default AgentStatusCard
