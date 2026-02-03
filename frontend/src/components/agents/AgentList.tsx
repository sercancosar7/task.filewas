/**
 * AgentList Component
 * Display list of agents with filtering and search
 * @module @task-filewas/frontend/components/agents/AgentList
 *
 * Features:
 * - Display agent cards
 * - Filter by agent type
 * - Search by name
 * - Expand/collapse all
 *
 * Design Reference: Craft Agents list view
 */

import { useState, useMemo } from 'react'
import {
  Search,
  Maximize2,
  Minimize2,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AgentCard } from './AgentCard'
import { cn } from '@/lib/utils'
import type { AgentConfig, AgentType, ModelProvider } from '@task-filewas/shared'

// =============================================================================
// Types
// =============================================================================

export interface AgentListProps {
  /** Agents to display */
  agents: AgentConfig[]
  /** Model change callback */
  onModelChange?: (agentType: AgentType, model: ModelProvider) => void
  /** Currently updating agent type */
  updatingId?: AgentType | null
  /** Optional className */
  className?: string
}

// =============================================================================
// Constants
// =============================================================================

const AGENT_TYPE_LABELS: Record<AgentType, string> = {
  orchestrator: 'Orchestrator',
  planner: 'Planner',
  architect: 'Architect',
  implementer: 'Implementer',
  reviewer: 'Reviewer',
  tester: 'Tester',
  security: 'Security',
  debugger: 'Debugger',
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * AgentList - Display agents with filtering and actions
 */
export function AgentList({
  agents,
  onModelChange,
  updatingId = null,
  className,
}: AgentListProps) {
  // State
  const [searchQuery, setSearchQuery] = useState('')
  const [activeType, setActiveType] = useState<AgentType | 'all'>('all')
  const [expandedIds, setExpandedIds] = useState<Set<AgentType>>(new Set())

  // Filter agents by type and search
  const filteredAgents = useMemo(() => {
    let filtered = agents

    if (activeType !== 'all') {
      filtered = filtered.filter((a) => a.type === activeType)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((a) =>
        a.name.toLowerCase().includes(query) ||
        a.type.toLowerCase().includes(query) ||
        a.description.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [agents, activeType, searchQuery])

  // Toggle expanded state
  const toggleExpanded = (type: AgentType) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(type)) {
        next.delete(type)
      } else {
        next.add(type)
      }
      return next
    })
  }

  // Expand all
  const expandAll = () => {
    setExpandedIds(new Set(agents.map((a) => a.type)))
  }

  // Collapse all
  const collapseAll = () => {
    setExpandedIds(new Set())
  }

  // Get count for each type
  const getCount = (type: AgentType) => agents.filter((a) => a.type === type).length

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search and Filter Bar */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
          <Input
            type="search"
            placeholder="Agent ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-9"
          />
        </div>

        {/* Expand/Collapse All */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-[11px]"
            onClick={expandAll}
          >
            <Maximize2 className="h-3.5 w-3.5 mr-1" />
            Hepsini Aç
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-[11px]"
            onClick={collapseAll}
          >
            <Minimize2 className="h-3.5 w-3.5 mr-1" />
            Hepsini Kapat
          </Button>
        </div>
      </div>

      {/* Type Filters */}
      <div className="flex flex-wrap gap-1.5">
        <Badge
          variant={activeType === 'all' ? 'default' : 'outline'}
          className="cursor-pointer text-[10px] px-2 py-1"
          onClick={() => setActiveType('all')}
        >
          Tümü ({agents.length})
        </Badge>
        {Object.entries(AGENT_TYPE_LABELS).map(([type, label]) => {
          const count = getCount(type as AgentType)
          return (
            <Badge
              key={type}
              variant={activeType === type ? 'default' : 'outline'}
              className="cursor-pointer text-[10px] px-2 py-1"
              onClick={() => setActiveType(type as AgentType)}
            >
              {label} ({count})
            </Badge>
          )
        })}
      </div>

      {/* Agent List */}
      <div className="space-y-1.5">
        {filteredAgents.length === 0 ? (
          <div className="flex min-h-[120px] items-center justify-center rounded-lg border border-dashed border-foreground/10">
            <p className="text-[13px] text-foreground/40">
              {searchQuery ? 'Agent bulunamadı' : 'Agent tanımlı değil'}
            </p>
          </div>
        ) : (
          filteredAgents.map((agent) => (
            <AgentCard
              key={agent.type}
              agent={agent}
              expanded={expandedIds.has(agent.type)}
              onToggle={() => toggleExpanded(agent.type)}
              onModelChange={onModelChange}
              updatingId={updatingId}
            />
          ))
        )}
      </div>
    </div>
  )
}

export default AgentList
