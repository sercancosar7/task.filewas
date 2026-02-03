/**
 * ThinkingToggle - Thinking level selector component (Craft Agents style)
 * @module @task-filewas/frontend/components/chat/ThinkingToggle
 *
 * Levels:
 * - Off: Normal response (no extended thinking)
 * - Think: Extended thinking enabled
 * - Max: Ultrathink (maximum reasoning depth)
 *
 * Features:
 * - Toggle button with checkbox visual
 * - Shift+click for Max level shortcut
 * - Visual indicator for active level
 * - Tooltip with level description
 */

import * as React from 'react'
import { Brain, Sparkles, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// =============================================================================
// Types
// =============================================================================

export type ThinkingLevel = 'off' | 'think' | 'max'

export interface ThinkingToggleProps {
  /** Current thinking level */
  value: ThinkingLevel
  /** Callback when level changes */
  onChange: (level: ThinkingLevel) => void
  /** Whether toggle is disabled */
  disabled?: boolean
  /** Additional CSS classes */
  className?: string
}

// =============================================================================
// Constants
// =============================================================================

interface LevelConfig {
  label: string
  shortLabel: string
  description: string
  icon: typeof Brain
  checkboxStyle: string
  badgeStyle: string
}

const LEVEL_CONFIG: Record<ThinkingLevel, LevelConfig> = {
  off: {
    label: 'Think',
    shortLabel: 'Think',
    description: 'Normal yanit (hizli)',
    icon: Brain,
    checkboxStyle: 'border-muted-foreground/40 bg-transparent',
    badgeStyle: 'text-muted-foreground',
  },
  think: {
    label: 'Think',
    shortLabel: 'Think',
    description: 'Extended thinking (detayli analiz)',
    icon: Sparkles,
    checkboxStyle: 'border-accent bg-accent',
    badgeStyle: 'text-accent',
  },
  max: {
    label: 'Max',
    shortLabel: 'Max',
    description: 'Ultrathink (maksimum reasoning)',
    icon: Zap,
    checkboxStyle: 'border-success bg-success',
    badgeStyle: 'text-success',
  },
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get next thinking level in cycle
 * off -> think -> max -> off
 */
function getNextLevel(current: ThinkingLevel, shiftPressed: boolean): ThinkingLevel {
  // Shift+click directly goes to max (or off if already max)
  if (shiftPressed) {
    return current === 'max' ? 'off' : 'max'
  }

  // Normal cycle: off -> think -> max -> off
  switch (current) {
    case 'off':
      return 'think'
    case 'think':
      return 'max'
    case 'max':
      return 'off'
    default:
      return 'off'
  }
}

// =============================================================================
// Checkbox Component
// =============================================================================

interface CheckboxIndicatorProps {
  level: ThinkingLevel
  className?: string
}

function CheckboxIndicator({ level, className }: CheckboxIndicatorProps) {
  const config = LEVEL_CONFIG[level]
  const isActive = level !== 'off'

  return (
    <div
      className={cn(
        // Base
        'flex items-center justify-center',
        'h-4 w-4',
        'rounded-[3px]',
        'border',
        'transition-colors duration-150',
        // Dynamic style
        config.checkboxStyle,
        className
      )}
      aria-hidden="true"
    >
      {isActive && (
        <svg
          viewBox="0 0 12 12"
          className="h-2.5 w-2.5 text-white"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="2 6 5 9 10 3" />
        </svg>
      )}
    </div>
  )
}

// =============================================================================
// Level Indicator Component
// =============================================================================

interface LevelIndicatorProps {
  level: ThinkingLevel
  className?: string
}

function LevelIndicator({ level, className }: LevelIndicatorProps) {
  const config = LEVEL_CONFIG[level]
  const Icon = config.icon

  if (level === 'off') {
    return null
  }

  return (
    <div
      className={cn(
        'flex items-center gap-0.5',
        'text-[11px] font-medium',
        config.badgeStyle,
        className
      )}
      aria-hidden="true"
    >
      <Icon className="h-3 w-3" />
      {level === 'max' && <span>Max</span>}
    </div>
  )
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * ThinkingToggle - Thinking level toggle button
 *
 * Click cycles through: Off -> Think -> Max -> Off
 * Shift+Click jumps directly to Max (or Off if already Max)
 *
 * @example
 * ```tsx
 * <ThinkingToggle
 *   value={thinkingLevel}
 *   onChange={setThinkingLevel}
 *   disabled={isProcessing}
 * />
 * ```
 */
export function ThinkingToggle({
  value,
  onChange,
  disabled = false,
  className,
}: ThinkingToggleProps) {
  const config = LEVEL_CONFIG[value]

  const handleClick = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      const nextLevel = getNextLevel(value, event.shiftKey)
      onChange(nextLevel)
    },
    [value, onChange]
  )

  // Tooltip content based on current state
  const tooltipContent = React.useMemo(() => {
    const currentDesc = config.description
    const shiftHint = value === 'max'
      ? 'Shift+tikla: Kapat'
      : 'Shift+tikla: Max'

    return (
      <div className="flex flex-col gap-1">
        <div className="font-medium">{currentDesc}</div>
        <div className="text-muted-foreground text-[11px]">{shiftHint}</div>
      </div>
    )
  }, [config.description, value])

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClick}
            disabled={disabled}
            className={cn(
              // Size
              'h-7 px-2',
              // Rounded
              'rounded-[6px]',
              // Colors
              'text-muted-foreground',
              'hover:bg-foreground/5 hover:text-foreground',
              // Gap
              'gap-1.5',
              // Active state highlight
              value !== 'off' && 'bg-foreground/5',
              className
            )}
            aria-label={`Thinking level: ${config.label}. ${config.description}`}
            aria-pressed={value !== 'off'}
          >
            {/* Checkbox indicator */}
            <CheckboxIndicator level={value} />

            {/* Label */}
            <span className={cn(
              'text-[13px]',
              value !== 'off' && config.badgeStyle
            )}>
              {config.shortLabel}
            </span>

            {/* Level indicator (icon for max) */}
            <LevelIndicator level={value} />
          </Button>
        </TooltipTrigger>

        <TooltipContent side="top" align="center">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export default ThinkingToggle
