/**
 * AgentCard Component
 * Display individual agent information with actions
 * @module @task-filewas/frontend/components/agents/AgentCard
 *
 * Features:
 * - Display agent name, type, model, tools
 * - Show agent status
 * - Edit model override
 * - View agent details
 *
 * Design Reference: Craft Agents list items
 */

import {
  Bot,
  Code2,
  FileSearch,
  Bug,
  Eye,
  TestTube,
  Shield,
  Cpu,
  ChevronDown,
  ChevronUp,
  Loader2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { AgentConfig, AgentType, ModelProvider } from '@task-filewas/shared'

// =============================================================================
// Types
// =============================================================================

export interface AgentCardProps {
  /** Agent configuration */
  agent: AgentConfig
  /** Whether the card is expanded */
  expanded?: boolean
  /** Toggle expanded callback */
  onToggle?: () => void
  /** Model change callback */
  onModelChange?: (agentType: AgentType, model: ModelProvider) => void
  /** Currently updating agent type */
  updatingId?: AgentType | null
  /** Optional className */
  className?: string
}

// =============================================================================
// Helpers
// =============================================================================

function getAgentIcon(type: AgentType) {
  switch (type) {
    case 'orchestrator':
      return Cpu
    case 'planner':
      return FileSearch
    case 'architect':
      return Bot
    case 'implementer':
      return Code2
    case 'reviewer':
      return Eye
    case 'tester':
      return TestTube
    case 'security':
      return Shield
    case 'debugger':
      return Bug
  }
}

function getAgentDescription(type: AgentType): string {
  switch (type) {
    case 'orchestrator':
      return 'Diğer agent\'ları koordine eder, görev atar'
    case 'planner':
      return 'Faz planlaması ve task breakdown yapar'
    case 'architect':
      return 'Sistem tasarımı ve mimari kararlar'
    case 'implementer':
      return 'Kod yazma ve implementasyon'
    case 'reviewer':
      return 'Kod inceleme ve kalite kontrol'
    case 'tester':
      return 'Test yazma ve çalıştırma'
    case 'security':
      return 'Güvenlik analizi ve vulnerability tarama'
    case 'debugger':
      return 'Hata ayıklama ve sorun çözme'
  }
}

function getModelLabel(model: ModelProvider): string {
  switch (model) {
    case 'claude':
      return 'Claude (Opus)'
    case 'glm':
      return 'GLM (Coding)'
  }
}

function getModelColor(model: ModelProvider): string {
  switch (model) {
    case 'claude':
      return 'text-accent border-accent/30 bg-accent/5'
    case 'glm':
      return 'text-success border-success/30 bg-success/5'
  }
}

function getToolIconName(tool: string): string {
  // Simple icon name mapping for common tools
  const iconMap: Record<string, string> = {
    Read: '📖',
    Write: '✏️',
    Edit: '✏️',
    Bash: '⬡',
    Glob: '🔍',
    Grep: '🔎',
    Task: '🤖',
    WebFetch: '🌐',
    TodoWrite: '✓',
  }
  return iconMap[tool] || '⚙️'
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * AgentCard - Display agent information with expandable details
 */
export function AgentCard({
  agent,
  expanded = false,
  onToggle,
  onModelChange,
  updatingId = null,
  className,
}: AgentCardProps) {
  const Icon = getAgentIcon(agent.type)
  const isUpdating = updatingId === agent.type

  return (
    <div
      className={cn(
        'group relative rounded-[8px] border border-foreground/10 bg-foreground/[0.02] transition-all',
        'hover:bg-foreground/5 hover:border-foreground/20',
        expanded && 'bg-foreground/5 border-foreground/20',
        className
      )}
    >
      {/* Header - Always Visible */}
      <div className="flex items-center gap-3 p-3">
        {/* Icon */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10">
          <Icon className="h-4 w-4 text-accent" />
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-[13px] font-medium text-foreground">
              {agent.name}
            </h4>
            <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', getModelColor(agent.model))}>
              {getModelLabel(agent.model)}
            </Badge>
          </div>
          <p className="text-[11px] text-foreground/40 truncate mt-0.5">
            {getAgentDescription(agent.type)}
          </p>
        </div>

        {/* Model Selector */}
        {onModelChange && (
          <div className="flex items-center gap-2">
            <Select
              value={agent.model}
              onValueChange={(v: ModelProvider) => onModelChange(agent.type, v)}
              disabled={isUpdating || !agent.modelOverrideAllowed}
            >
              <SelectTrigger className="h-7 w-28 text-[11px]">
                {isUpdating ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Güncelleniyor...</span>
                  </div>
                ) : (
                  <SelectValue />
                )}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="claude" className="text-[11px]">
                  Claude (Opus)
                </SelectItem>
                <SelectItem value="glm" className="text-[11px]">
                  GLM (Coding)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Expand Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={onToggle}
        >
          {expanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t border-foreground/10 px-3 py-3 space-y-3">
          {/* Thinking Level */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-foreground/60">Thinking Level</span>
            <Badge variant="outline" className="text-[10px]">
              {agent.thinkingLevel === 'max' && '☐☐ Max (Ultrathink)'}
              {agent.thinkingLevel === 'think' && '☑ Think'}
              {agent.thinkingLevel === 'off' && '☐ Off'}
            </Badge>
          </div>

          {/* Capabilities */}
          <div className="space-y-1.5">
            <span className="text-[11px] text-foreground/60">Yetenekler</span>
            <div className="flex flex-wrap gap-1.5">
              {agent.capabilities.canSpawnAgents && (
                <Badge variant="outline" className="text-[10px] text-foreground/40">
                  Agent Spawn
                </Badge>
              )}
              {agent.capabilities.canExecuteTools && (
                <Badge variant="outline" className="text-[10px] text-foreground/40">
                  Tools
                </Badge>
              )}
              {agent.capabilities.canModifyFiles && (
                <Badge variant="outline" className="text-[10px] text-foreground/40">
                  File Edit
                </Badge>
              )}
              {agent.capabilities.canRunCommands && (
                <Badge variant="outline" className="text-[10px] text-foreground/40">
                  Commands
                </Badge>
              )}
              {agent.capabilities.canAccessNetwork && (
                <Badge variant="outline" className="text-[10px] text-foreground/40">
                  Network
                </Badge>
              )}
              {agent.capabilities.canReadFiles && (
                <Badge variant="outline" className="text-[10px] text-foreground/40">
                  Read Files
                </Badge>
              )}
            </div>
          </div>

          {/* Tools */}
          <div className="space-y-1.5">
            <span className="text-[11px] text-foreground/60">
              Kullanılabilir Araçlar ({agent.tools.length})
            </span>
            <div className="flex flex-wrap gap-1">
              {agent.tools.slice(0, 8).map((tool) => (
                <Badge
                  key={tool}
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 text-foreground/40"
                  title={tool}
                >
                  <span className="mr-1">{getToolIconName(tool)}</span>
                  {tool.length > 10 ? tool.slice(0, 10) + '...' : tool}
                </Badge>
              ))}
              {agent.tools.length > 8 && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-foreground/40">
                  +{agent.tools.length - 8} daha
                </Badge>
              )}
            </div>
          </div>

          {/* Override Allowed */}
          {!agent.modelOverrideAllowed && (
            <div className="flex items-center gap-1.5 text-[10px] text-foreground/40">
              <X className="h-3 w-3" />
              <span>Model değiştirme kapalı (admin ayarı)</span>
            </div>
          )}

          {/* File Path */}
          <div className="text-[10px] text-foreground/30 truncate">
            {agent.filePath}
          </div>
        </div>
      )}
    </div>
  )
}

export default AgentCard
