/**
 * BadgeRow - Scrollable badge container with fade mask
 * @module @task-filewas/frontend/components/session/BadgeRow
 *
 * Features:
 * - Horizontal scrollable badge container
 * - Fade mask on right edge for overflow indication
 * - Processing spinner
 * - Unread badge
 * - Flag indicator
 * - Plan badge
 * - Permission mode badge
 * - Custom labels with colors
 *
 * Design Reference: Craft Agents badge row pattern
 */

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Flag } from 'lucide-react'
import type { SessionSummary, SessionLabel } from '@task-filewas/shared'

// =============================================================================
// Types
// =============================================================================

export interface BadgeRowProps {
  /** Session data for extracting badges */
  session: SessionSummary
  /** Additional CSS classes */
  className?: string
}

// =============================================================================
// Badge Configuration
// =============================================================================

/**
 * Permission mode badge configuration
 */
const PERMISSION_CONFIG = {
  safe: { label: 'Safe', emoji: '\uD83D\uDD0D', variant: 'accent' as const },
  ask: { label: 'Ask', emoji: '\u2753', variant: 'info' as const },
  auto: { label: 'Auto', emoji: '\uD83D\uDD13', variant: 'success' as const },
}

/**
 * Session mode badge configuration
 */
const MODE_CONFIG: Record<string, { label: string; emoji: string }> = {
  'quick-chat': { label: 'Quick', emoji: '\uD83D\uDCAC' },
  planning: { label: 'Planning', emoji: '\uD83E\uDD16' },
  tdd: { label: 'TDD', emoji: '\uD83E\uDDEA' },
  debug: { label: 'Debug', emoji: '\uD83D\uDC1B' },
  'code-review': { label: 'Review', emoji: '\uD83D\uDC41' },
}

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * Processing badge with spinner
 */
function ProcessingBadge() {
  return (
    <Badge variant="accent" size="sm" className="gap-1">
      <Spinner size="xs" />
      <span>Calisiyor</span>
    </Badge>
  )
}

/**
 * Unread indicator badge
 */
function UnreadBadge() {
  return (
    <Badge
      variant="accent"
      size="sm"
      className="bg-accent text-white font-medium"
    >
      Yeni
    </Badge>
  )
}

/**
 * Flag indicator
 */
function FlagBadge() {
  return (
    <div
      className="h-[18px] w-[18px] flex items-center justify-center bg-foreground/5 rounded"
      title="Isaretli"
    >
      <Flag className="h-2.5 w-2.5 text-info" />
    </div>
  )
}

/**
 * Plan indicator badge
 */
function PlanBadge() {
  return (
    <Badge
      variant="success"
      size="sm"
      className="bg-success/10 text-success"
    >
      Plan
    </Badge>
  )
}

/**
 * Permission mode badge
 */
function PermissionBadge({ mode }: { mode: 'safe' | 'ask' | 'auto' }) {
  const config = PERMISSION_CONFIG[mode]
  const variantClasses = {
    accent: 'bg-accent/10 text-accent',
    info: 'bg-info/10 text-info',
    success: 'bg-success/10 text-success',
  }

  return (
    <Badge
      size="sm"
      className={cn(
        'h-[18px] px-1.5 gap-0.5',
        variantClasses[config.variant]
      )}
    >
      <span>{config.emoji}</span>
      <span>{config.label}</span>
    </Badge>
  )
}

/**
 * Session mode badge
 */
function ModeBadge({ mode }: { mode: string }) {
  const config = MODE_CONFIG[mode]
  if (!config) return null

  return (
    <Badge
      variant="secondary"
      size="sm"
      className="bg-foreground/5 text-foreground/60"
    >
      <span className="mr-0.5">{config.emoji}</span>
      {config.label}
    </Badge>
  )
}

/**
 * Phase progress badge
 */
function PhaseBadge({
  currentPhase,
  totalPhases,
}: {
  currentPhase: number
  totalPhases: number
}) {
  return (
    <Badge variant="muted" size="sm">
      Faz {currentPhase}/{totalPhases}
    </Badge>
  )
}

/**
 * Custom label badge
 */
function LabelBadge({ label }: { label: SessionLabel }) {
  return (
    <Badge
      size="sm"
      maxWidth={120}
      bgColor={`${label.color}15`}
      textColor={label.color}
    >
      {label.name}
    </Badge>
  )
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * BadgeRow - Horizontal scrollable badge container
 *
 * Badge order (following Craft Agents pattern):
 * 1. Processing spinner (if running)
 * 2. Unread badge (if has unread)
 * 3. Flag (if flagged)
 * 4. Plan (if has plan)
 * 5. Permission mode
 * 6. Session mode
 * 7. Phase progress (if autonomous)
 * 8. Custom labels
 *
 * @example
 * ```tsx
 * <BadgeRow session={session} />
 * ```
 */
export function BadgeRow({ session, className }: BadgeRowProps) {
  const isProcessing = session.processingState === 'running'

  return (
    <div
      className={cn(
        // Scrollable container
        'flex items-center gap-1.5 min-w-0 max-w-full overflow-x-auto',
        // Hide scrollbar
        'scrollbar-hide',
        // Fade mask on right edge (CSS mask)
        className
      )}
      style={{
        // Fade mask for overflow indication
        WebkitMaskImage:
          'linear-gradient(to right, black calc(100% - 16px), transparent 100%)',
        maskImage:
          'linear-gradient(to right, black calc(100% - 16px), transparent 100%)',
      }}
    >
      {/* Processing spinner */}
      {isProcessing && <ProcessingBadge />}

      {/* Unread indicator */}
      {session.hasUnread && <UnreadBadge />}

      {/* Flag indicator */}
      {session.isFlagged && <FlagBadge />}

      {/* Plan indicator */}
      {session.hasPlan && <PlanBadge />}

      {/* Permission mode */}
      <PermissionBadge mode={session.permissionMode} />

      {/* Session mode (optional, only show non-default) */}
      {session.mode !== 'quick-chat' && <ModeBadge mode={session.mode} />}

      {/* Phase progress (for autonomous mode) */}
      {session.phaseProgress && (
        <PhaseBadge
          currentPhase={session.phaseProgress.currentPhase}
          totalPhases={session.phaseProgress.totalPhases}
        />
      )}

      {/* Custom labels */}
      {session.labels.map((label) => (
        <LabelBadge key={label.id} label={label} />
      ))}
    </div>
  )
}

export default BadgeRow
