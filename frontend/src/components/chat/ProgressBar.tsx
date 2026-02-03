/**
 * ProgressBar - Progress bar component for agent status
 * @module @task-filewas/frontend/components/chat/ProgressBar
 *
 * Layout Structure:
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 45%
 *
 * Features:
 * - Animated progress bar
 * - Percentage display (optional)
 * - Color based on progress level
 * - Smooth transitions
 */

// No React import needed - using modern JSX transform
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

// =============================================================================
// Types
// =============================================================================

export interface ProgressBarProps {
  /** Progress percentage (0-100) */
  progress: number
  /** Whether to show percentage text */
  showPercentage?: boolean | undefined
  /** Custom size (height) class */
  size?: 'sm' | 'md' | 'lg' | undefined
  /** Custom color variant */
  variant?: 'default' | 'success' | 'warning' | 'error' | undefined
  /** Whether to animate the progress */
  animate?: boolean | undefined
  /** Additional CSS classes */
  className?: string | undefined
}

// =============================================================================
// Constants
// =============================================================================

const SIZE_CONFIG = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
} as const

const VARIANT_CONFIG = {
  default: 'bg-accent',
  success: 'bg-green-500',
  warning: 'bg-yellow-500',
  error: 'bg-red-500',
} as const

// =============================================================================
// Component
// =============================================================================

/**
 * ProgressBar - Animated progress bar component
 *
 * @example
 * ```tsx
 * <ProgressBar progress={45} showPercentage />
 *
 * <ProgressBar
 *   progress={75}
 *   size="lg"
 *   variant="success"
 *   className="w-full"
 * />
 * ```
 */
export function ProgressBar({
  progress,
  showPercentage = true,
  size = 'md',
  variant = 'default',
  animate = true,
  className,
}: ProgressBarProps) {
  // Clamp progress between 0 and 100
  const clampedProgress = Math.max(0, Math.min(100, progress))

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Progress bar track */}
      <div
        className={cn(
          'flex-1 bg-foreground/10 rounded-full overflow-hidden',
          SIZE_CONFIG[size]
        )}
      >
        {/* Progress bar fill */}
        <motion.div
          initial={animate ? { width: 0 } : false}
          animate={{ width: `${clampedProgress}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className={cn(
            'h-full rounded-full',
            VARIANT_CONFIG[variant]
          )}
        />
      </div>

      {/* Percentage text */}
      {showPercentage && (
        <span className="text-[11px] text-muted-foreground font-mono min-w-[3rem] text-right">
          {Math.round(clampedProgress)}%
        </span>
      )}
    </div>
  )
}

/**
 * Spinner - Circular loading indicator
 *
 * @example
 * ```tsx
 * <Spinner size="sm" />
 * ```
 */
export interface SpinnerProps {
  /** Size variant */
  size?: 'xs' | 'sm' | 'md' | 'lg' | undefined
  /** Custom color class */
  color?: string | undefined
  /** Additional CSS classes */
  className?: string | undefined
}

const SPINNER_SIZE = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
} as const

export function Spinner({
  size = 'md',
  color = 'text-accent',
  className,
}: SpinnerProps) {
  return (
    <div
      className={cn(
        'animate-spin rounded-full border-2 border-current border-t-transparent',
        SPINNER_SIZE[size],
        color,
        className
      )}
    />
  )
}

export default ProgressBar
