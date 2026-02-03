/**
 * StreamingIndicator - Processing indicator with timer and stop button
 * @module @task-filewas/frontend/components/chat/StreamingIndicator
 *
 * Layout:
 * ┌────────────────────────────────────────────────────────────────────┐
 * │ ⏳ Calisiyor... 4:32                                    [■ Durdur] │
 * └────────────────────────────────────────────────────────────────────┘
 *
 * or with phase info:
 * ┌────────────────────────────────────────────────────────────────────┐
 * │ ⏳ Phase 3/12: Checkout UI · glm · 4:32                [■ Durdur] │
 * └────────────────────────────────────────────────────────────────────┘
 *
 * Features:
 * - Animated spinner icon
 * - Elapsed time counter (MM:SS or HH:MM:SS)
 * - Optional phase information display
 * - Stop button to cancel generation
 * - Shimmer animation for text
 */

import * as React from 'react'
import { motion } from 'framer-motion'
import { Loader2, Square, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

// =============================================================================
// Types
// =============================================================================

export interface PhaseInfo {
  /** Current phase number */
  current: number
  /** Total phases */
  total: number
  /** Phase name */
  name?: string
  /** Model being used */
  model?: string
}

export interface StreamingIndicatorProps {
  /** Whether the indicator is active */
  isActive: boolean
  /** Start time (used for elapsed time calculation) */
  startTime?: Date | number
  /** Optional phase information */
  phaseInfo?: PhaseInfo
  /** Callback when stop button is clicked */
  onStop?: () => void
  /** Whether stop is in progress */
  isStopping?: boolean
  /** Custom status text (overrides default) */
  statusText?: string
  /** Whether to show the stop button */
  showStopButton?: boolean
  /** Additional CSS classes */
  className?: string
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Format elapsed time as MM:SS or HH:MM:SS
 */
function formatElapsedTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

// =============================================================================
// Custom Hooks
// =============================================================================

/**
 * Hook for elapsed time counter
 */
function useElapsedTime(startTime: Date | number | undefined, isActive: boolean) {
  const [elapsedSeconds, setElapsedSeconds] = React.useState(0)

  React.useEffect(() => {
    if (!isActive || !startTime) {
      setElapsedSeconds(0)
      return
    }

    // Calculate initial elapsed time
    const start = typeof startTime === 'number' ? startTime : startTime.getTime()
    const calculateElapsed = () => Math.floor((Date.now() - start) / 1000)

    setElapsedSeconds(calculateElapsed())

    // Update every second
    const interval = setInterval(() => {
      setElapsedSeconds(calculateElapsed())
    }, 1000)

    return () => clearInterval(interval)
  }, [startTime, isActive])

  return elapsedSeconds
}

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * Animated dots for loading effect
 */
function LoadingDots() {
  return (
    <span className="inline-flex">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0.3 }}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.2,
          }}
          className="inline-block"
        >
          .
        </motion.span>
      ))}
    </span>
  )
}

/**
 * Phase info badge
 */
function PhaseBadge({ info }: { info: PhaseInfo }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <span className="text-accent font-medium">
        Phase {info.current}/{info.total}
      </span>
      {info.name && (
        <>
          <span className="text-foreground/20">·</span>
          <span className="truncate max-w-[150px]">{info.name}</span>
        </>
      )}
      {info.model && (
        <>
          <span className="text-foreground/20">·</span>
          <span className="inline-flex items-center gap-1">
            <Bot className="h-3 w-3" />
            {info.model}
          </span>
        </>
      )}
    </span>
  )
}

// =============================================================================
// Component
// =============================================================================

/**
 * StreamingIndicator - Shows processing status with timer and stop button
 *
 * @example
 * ```tsx
 * // Basic usage
 * <StreamingIndicator
 *   isActive={isProcessing}
 *   startTime={processingStartTime}
 *   onStop={handleStop}
 * />
 *
 * // With phase info
 * <StreamingIndicator
 *   isActive={isProcessing}
 *   startTime={processingStartTime}
 *   phaseInfo={{
 *     current: 3,
 *     total: 12,
 *     name: 'Checkout UI',
 *     model: 'glm'
 *   }}
 *   onStop={handleStop}
 * />
 * ```
 */
export function StreamingIndicator({
  isActive,
  startTime,
  phaseInfo,
  onStop,
  isStopping = false,
  statusText,
  showStopButton = true,
  className,
}: StreamingIndicatorProps) {
  // Elapsed time tracking
  const elapsedSeconds = useElapsedTime(startTime, isActive)

  // Don't render if not active
  if (!isActive) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className={cn(
        // Container
        'flex items-center justify-between gap-4',
        // Padding
        'px-4 py-3',
        // Background
        'bg-foreground/[0.03]',
        // Border
        'rounded-[8px]',
        'border border-foreground/5',
        className
      )}
      role="status"
      aria-live="polite"
      aria-label="Islem devam ediyor"
    >
      {/* Left side: Status info */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Spinner */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="shrink-0"
        >
          <Loader2 className="h-4 w-4 text-accent" />
        </motion.div>

        {/* Status text */}
        <div className="flex flex-col gap-0.5 min-w-0">
          {/* Main status line */}
          <div className="flex items-center gap-2 text-[13px]">
            <span className="text-foreground/90">
              {statusText || (
                <>
                  {isStopping ? 'Durduruluyor' : 'Calisiyor'}
                  <LoadingDots />
                </>
              )}
            </span>

            {/* Timer */}
            {startTime && (
              <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                {formatElapsedTime(elapsedSeconds)}
              </span>
            )}
          </div>

          {/* Phase info (if available) */}
          {phaseInfo && <PhaseBadge info={phaseInfo} />}
        </div>
      </div>

      {/* Right side: Stop button */}
      {showStopButton && onStop && (
        <Button
          variant="outline"
          size="sm"
          onClick={onStop}
          disabled={isStopping}
          className={cn(
            // Size
            'h-7 px-2.5',
            // Colors
            'border-foreground/10',
            'text-muted-foreground',
            // Hover
            'hover:text-destructive',
            'hover:border-destructive/30',
            'hover:bg-destructive/5',
            // Transition
            'transition-colors duration-150',
            // Disabled
            'disabled:opacity-50'
          )}
          title="Islemi durdur"
          aria-label="Islemi durdur"
        >
          <Square className="h-3 w-3 fill-current" />
          <span className="text-[11px]">Durdur</span>
        </Button>
      )}
    </motion.div>
  )
}

export default StreamingIndicator
