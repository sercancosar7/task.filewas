/**
 * ModelDropdown - AI model selector component (Craft Agents style)
 * @module @task-filewas/frontend/components/chat/ModelDropdown
 *
 * Models:
 * - Auto: Agent-specific default models
 * - Claude: Anthropic Opus 4.5 (Max Plan)
 * - GLM: Z.AI Coding Plan (4.7)
 *
 * Features:
 * - Model-specific icons and colors
 * - Model descriptions
 * - Force toggle for session-wide override
 * - Radio group selection
 */

import {
  Bot,
  Brain,
  Sparkles,
  Check,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'

// =============================================================================
// Types
// =============================================================================

export type ModelType = 'auto' | 'claude' | 'glm'

export interface ModelDropdownProps {
  /** Current selected model */
  value: ModelType
  /** Callback when model changes */
  onChange: (model: ModelType) => void
  /** Force mode - all agents use selected model */
  forceModel?: boolean
  /** Callback when force mode toggles */
  onForceChange?: (force: boolean) => void
  /** Whether dropdown is disabled */
  disabled?: boolean
  /** Additional CSS classes */
  className?: string
}

// =============================================================================
// Constants
// =============================================================================

interface ModelConfig {
  label: string
  shortLabel: string
  icon: LucideIcon
  description: string
  detail: string
  badgeClass: string
}

const MODEL_CONFIG: Record<ModelType, ModelConfig> = {
  auto: {
    label: 'Auto (Agent)',
    shortLabel: 'Auto',
    icon: Bot,
    description: 'Her agent kendi default modelini kullanir',
    detail: 'Orchestrator → Claude, Implementer → GLM',
    badgeClass: 'bg-muted-foreground/10 text-muted-foreground',
  },
  claude: {
    label: 'Claude (Opus)',
    shortLabel: 'Claude',
    icon: Brain,
    description: 'Anthropic Opus 4.5 - Max Plan',
    detail: 'Complex reasoning, ultrathink, orchestration',
    badgeClass: 'bg-orange-500/10 text-orange-400',
  },
  glm: {
    label: 'GLM (Coding)',
    shortLabel: 'GLM',
    icon: Sparkles,
    description: 'Z.AI Coding Plan - 4.7',
    detail: 'Fast code generation, testing, review',
    badgeClass: 'bg-blue-500/10 text-blue-400',
  },
}

const MODELS: ModelType[] = ['auto', 'claude', 'glm']

// =============================================================================
// Component
// =============================================================================

/**
 * ModelDropdown - AI model selector
 *
 * @example
 * ```tsx
 * <ModelDropdown
 *   value={selectedModel}
 *   onChange={setSelectedModel}
 *   forceModel={forceMode}
 *   onForceChange={setForceMode}
 *   disabled={isProcessing}
 * />
 * ```
 */
export function ModelDropdown({
  value,
  onChange,
  forceModel = false,
  onForceChange,
  disabled = false,
  className,
}: ModelDropdownProps) {
  const currentConfig = MODEL_CONFIG[value]
  const CurrentIcon = currentConfig.icon

  const handleModelSelect = (model: ModelType) => {
    onChange(model)
  }

  const handleForceToggle = (checked: boolean) => {
    onForceChange?.(checked)
  }

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
            // Badge style based on model
            currentConfig.badgeClass,
            // Hover
            'hover:opacity-80',
            // Gap
            'gap-1.5',
            className
          )}
          title={currentConfig.description}
          aria-label={`AI Model: ${currentConfig.label}`}
        >
          <CurrentIcon className="h-3.5 w-3.5" />
          <span className="text-[13px] font-medium">{currentConfig.shortLabel}</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        {/* Model Selection Section */}
        <DropdownMenuLabel className="text-[11px] text-muted-foreground font-normal">
          AI Model
        </DropdownMenuLabel>

        {MODELS.map((model) => {
          const config = MODEL_CONFIG[model]
          const Icon = config.icon
          const isSelected = value === model

          return (
            <DropdownMenuItem
              key={model}
              onClick={() => handleModelSelect(model)}
              className={cn(
                'flex items-center gap-3 cursor-pointer py-2',
                isSelected && 'bg-foreground/5'
              )}
            >
              {/* Icon */}
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-[6px]',
                  config.badgeClass
                )}
              >
                <Icon className="h-4 w-4" />
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium">{config.label}</span>
                </div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {config.detail}
                </div>
              </div>

              {/* Checkmark */}
              {isSelected && (
                <Check className="h-4 w-4 text-accent shrink-0" />
              )}
            </DropdownMenuItem>
          )
        })}

        {/* Force Mode Toggle Section */}
        <DropdownMenuSeparator />

        <div
          className={cn(
            'flex items-center gap-3 px-2 py-2',
            disabled && 'opacity-50 pointer-events-none'
          )}
        >
          {/* Info Icon */}
          <div className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-foreground/5 text-muted-foreground">
            <Bot className="h-4 w-4" />
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium">Force Model</div>
            <div className="text-[11px] text-muted-foreground">
              Tüm agent'lar bu modeli kullanır
            </div>
          </div>

          {/* Switch */}
          <Switch
            checked={forceModel}
            onCheckedChange={handleForceToggle}
            disabled={disabled}
            className="shrink-0"
          />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default ModelDropdown
