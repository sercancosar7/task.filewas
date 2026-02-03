/**
 * PermissionDropdown - Permission mode selector component (Craft Agents style)
 * @module @task-filewas/frontend/components/chat/PermissionDropdown
 *
 * Modes:
 * - Safe (Explore): Read-only, plan submission required
 * - Ask: Confirmation before each operation
 * - Auto (Allow-all): Fully autonomous execution
 *
 * Features:
 * - Badge-style trigger with icon
 * - Colored variants for each mode
 * - Radio group selection
 */

import {
  Search,
  HelpCircle,
  Unlock,
  Check,
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

export type PermissionMode = 'safe' | 'ask' | 'auto'

export interface PermissionDropdownProps {
  /** Current permission mode */
  value: PermissionMode
  /** Callback when mode changes */
  onChange: (mode: PermissionMode) => void
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
  badgeClass: string
}

const MODE_CONFIG: Record<PermissionMode, ModeConfig> = {
  safe: {
    label: 'Safe',
    icon: Search,
    description: 'Salt okunur, plan onay gerektirir',
    badgeClass: 'bg-accent/10 text-accent',
  },
  ask: {
    label: 'Ask',
    icon: HelpCircle,
    description: 'Her islemde onay sorar',
    badgeClass: 'bg-info/10 text-info',
  },
  auto: {
    label: 'Auto',
    icon: Unlock,
    description: 'Tam otonom yurutme',
    badgeClass: 'bg-success/10 text-success',
  },
}

const MODES: PermissionMode[] = ['safe', 'ask', 'auto']

// =============================================================================
// Component
// =============================================================================

/**
 * PermissionDropdown - Permission mode selector
 *
 * @example
 * ```tsx
 * <PermissionDropdown
 *   value={permissionMode}
 *   onChange={setPermissionMode}
 *   disabled={isProcessing}
 * />
 * ```
 */
export function PermissionDropdown({
  value,
  onChange,
  disabled = false,
  className,
}: PermissionDropdownProps) {
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
            // Badge style based on mode
            currentConfig.badgeClass,
            // Hover
            'hover:opacity-80',
            // Gap
            'gap-1.5',
            className
          )}
          title={currentConfig.description}
          aria-label={`Izin modu: ${currentConfig.label}`}
        >
          <CurrentIcon className="h-3.5 w-3.5" />
          <span className="text-[13px] font-medium">{currentConfig.label}</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
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
                  config.badgeClass
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

export default PermissionDropdown
