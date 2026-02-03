/**
 * ModeDropdown - Chat mode selector component (Craft Agents style)
 * @module @task-filewas/frontend/components/chat/ModeDropdown
 *
 * Modes:
 * - Quick Chat: Single task, fast execution
 * - Planning: Complex project planning with roadmap
 * - TDD: Test-driven development workflow
 * - Debug: Error analysis and fixing
 * - Code Review: Code quality review
 *
 * Features:
 * - Icon + label trigger button
 * - Mode description in dropdown
 * - Radio group selection
 */

import {
  MessageSquare,
  Bot,
  TestTube2,
  Bug,
  Eye,
  Check,
  ChevronDown,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// =============================================================================
// Types
// =============================================================================

export type ChatMode = 'quick' | 'planning' | 'tdd' | 'debug' | 'review'

export interface ModeDropdownProps {
  /** Current chat mode */
  value: ChatMode
  /** Callback when mode changes */
  onChange: (mode: ChatMode) => void
  /** Whether dropdown is disabled */
  disabled?: boolean
  /** Additional CSS classes */
  className?: string
}

// =============================================================================
// Constants
// =============================================================================

interface ModeConfig {
  label: string
  icon: LucideIcon
  description: string
}

const MODE_CONFIG: Record<ChatMode, ModeConfig> = {
  quick: {
    label: 'Quick Chat',
    icon: MessageSquare,
    description: 'Tek seferlik hizli gorev',
  },
  planning: {
    label: 'Planning',
    icon: Bot,
    description: 'Karmasik proje planlama',
  },
  tdd: {
    label: 'TDD',
    icon: TestTube2,
    description: 'Test-driven development',
  },
  debug: {
    label: 'Debug',
    icon: Bug,
    description: 'Hata ayiklama odakli',
  },
  review: {
    label: 'Code Review',
    icon: Eye,
    description: 'Kod inceleme ve oneri',
  },
}

const MODES: ChatMode[] = ['quick', 'planning', 'tdd', 'debug', 'review']

// =============================================================================
// Component
// =============================================================================

/**
 * ModeDropdown - Chat mode selector
 *
 * @example
 * ```tsx
 * <ModeDropdown
 *   value={chatMode}
 *   onChange={setChatMode}
 *   disabled={isProcessing}
 * />
 * ```
 */
export function ModeDropdown({
  value,
  onChange,
  disabled = false,
  className,
}: ModeDropdownProps) {
  const currentConfig = MODE_CONFIG[value]
  const CurrentIcon = currentConfig.icon

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
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
            className
          )}
          title={currentConfig.description}
          aria-label={`Chat modu: ${currentConfig.label}`}
        >
          <CurrentIcon className="h-3.5 w-3.5" />
          <span className="text-[13px]">{currentConfig.label}</span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-56">
        {MODES.map((mode) => {
          const config = MODE_CONFIG[mode]
          const Icon = config.icon
          const isSelected = value === mode

          return (
            <DropdownMenuItem
              key={mode}
              onClick={() => onChange(mode)}
              className={cn(
                'flex items-center gap-3 cursor-pointer',
                isSelected && 'bg-foreground/5'
              )}
            >
              {/* Icon */}
              <div
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-[6px]',
                  'bg-foreground/5 text-muted-foreground',
                  isSelected && 'bg-accent/10 text-accent'
                )}
              >
                <Icon className="h-4 w-4" />
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium">{config.label}</div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {config.description}
                </div>
              </div>

              {/* Checkmark */}
              {isSelected && (
                <Check className="h-4 w-4 text-accent shrink-0" />
              )}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default ModeDropdown
