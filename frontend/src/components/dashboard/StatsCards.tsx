/**
 * StatsCards - Dashboard statistics cards
 * @module @task-filewas/frontend/components/dashboard/StatsCards
 *
 * Features:
 * - Project count display
 * - Session count display
 * - Today's completed phases
 * - Model usage breakdown
 *
 * Design Reference: Craft Agents dashboard cards
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import {
  FolderKanban,
  MessageSquare,
  CheckCircle2,
  Bot,
  Loader2,
} from 'lucide-react'

// =============================================================================
// Types
// =============================================================================

export interface StatsData {
  /** Total number of projects */
  projectCount: number
  /** Total number of sessions */
  sessionCount: number
  /** Number of phases completed today */
  todayPhases: number
  /** Model usage breakdown */
  modelUsage: {
    claude: number
    glm: number
  }
}

export interface StatsCardsProps {
  /** Statistics data to display */
  stats?: StatsData
  /** Loading state */
  isLoading?: boolean
  /** Additional CSS classes */
  className?: string
}

// =============================================================================
// Card Component
// =============================================================================

interface StatCardProps {
  /** Icon component */
  icon: React.ReactNode
  /** Card title */
  title: string
  /** Value to display */
  value: React.ReactNode
  /** Optional subtitle */
  subtitle?: string
  /** Color variant */
  variant?: 'default' | 'accent' | 'info' | 'success'
  /** Additional CSS classes */
  className?: string
}

function StatCard({
  icon,
  title,
  value,
  subtitle,
  variant = 'default',
  className,
}: StatCardProps) {
  const variantStyles = {
    default: 'bg-foreground/5 text-foreground',
    accent: 'bg-accent/10 text-accent',
    info: 'bg-info/10 text-info',
    success: 'bg-success/10 text-success',
  }

  const valueVariantStyles = {
    default: 'text-foreground',
    accent: 'text-accent',
    info: 'text-info',
    success: 'text-success',
  }

  return (
    <div
      className={cn(
        'rounded-[8px] border border-foreground/10 bg-card p-5 transition-all duration-150',
        'hover:border-foreground/20 hover:bg-foreground/[0.02]',
        className
      )}
    >
      {/* Header with icon and title */}
      <div className="flex items-center justify-between mb-3">
        <span
          className={cn(
            'flex items-center justify-center h-9 w-9 rounded-[6px]',
            variantStyles[variant]
          )}
        >
          {icon}
        </span>
        <span className="text-[11px] text-foreground/40 uppercase tracking-wide">
          {title}
        </span>
      </div>

      {/* Value */}
      <div className={cn('text-2xl font-semibold', valueVariantStyles[variant])}>
        {value}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <p className="mt-1 text-[13px] text-foreground/50">{subtitle}</p>
      )}
    </div>
  )
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * StatsCards - Dashboard statistics cards grid
 *
 * Structure:
 * ┌─────────────┬─────────────┬─────────────┬─────────────┐
 * │ Projects    │ Sessions    │ Today       │ Agent       │
 * │     12      │     47      │   3 faz     │  Claude: 8  │
 * │   toplam    │   aktif     │ tamamlandi  │  GLM: 23    │
 * └─────────────┴─────────────┴─────────────┴─────────────┘
 *
 * @example
 * ```tsx
 * <StatsCards
 *   stats={{
 *     projectCount: 12,
 *     sessionCount: 47,
 *     todayPhases: 3,
 *     modelUsage: { claude: 8, glm: 23 }
 *   }}
 * />
 * ```
 */
export const StatsCards = React.forwardRef<HTMLDivElement, StatsCardsProps>(
  ({ stats, isLoading = false, className }, ref) => {
    // Default stats when loading or no data
    const defaultStats: StatsData = {
      projectCount: 0,
      sessionCount: 0,
      todayPhases: 0,
      modelUsage: { claude: 0, glm: 0 },
    }

    const displayStats = stats || defaultStats
    const totalAgentUsage = displayStats.modelUsage.claude + displayStats.modelUsage.glm

    return (
      <div
        ref={ref}
        className={cn(
          'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4',
          className
        )}
      >
        {/* Projects Card */}
        <StatCard
          icon={<FolderKanban className="h-5 w-5" />}
          title="Projeler"
          value={isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : displayStats.projectCount}
          subtitle="toplam"
          variant="default"
        />

        {/* Sessions Card */}
        <StatCard
          icon={<MessageSquare className="h-5 w-5" />}
          title="Sessions"
          value={isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : displayStats.sessionCount}
          subtitle="aktif"
          variant="accent"
        />

        {/* Today's Phases Card */}
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          title="Bugün"
          value={isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : displayStats.todayPhases}
          subtitle="faz tamamlandı"
          variant="success"
        />

        {/* Agent Usage Card */}
        <StatCard
          icon={<Bot className="h-5 w-5" />}
          title="Agent"
          value={
            isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-lg">C: {displayStats.modelUsage.claude}</span>
                <span className="text-foreground/30">|</span>
                <span className="text-lg">G: {displayStats.modelUsage.glm}</span>
              </div>
            )
          }
          subtitle={totalAgentUsage > 0 ? `${totalAgentUsage} toplam` : 'kullanım yok'}
          variant="info"
        />
      </div>
    )
  }
)

StatsCards.displayName = 'StatsCards'

export default StatsCards
