/**
 * Agents Page
 * Agent configuration and model management interface
 * @module @task-filewas/frontend/pages/Agents
 *
 * Features:
 * - List all agents with their configurations
 * - View agent details (type, tools, capabilities)
 * - Change default model for each agent
 * - Search and filter agents
 *
 * Design Reference: Craft Agents settings page
 */

import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Loader2,
  RefreshCw,
  Settings,
  Info,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AgentList } from '@/components/agents/AgentList'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/lib/utils'
import type { AgentConfig, AgentType, ModelProvider } from '@task-filewas/shared'

// =============================================================================
// Helpers
// =============================================================================

function getApiUrl(): string {
  return import.meta.env.VITE_API_URL || 'http://localhost:3001'
}

async function fetchAgents(): Promise<AgentConfig[]> {
  const token = localStorage.getItem('token')
  const response = await fetch(`${getApiUrl()}/api/agents`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`)
  }

  const result = await response.json()
  return result.data || []
}

async function updateAgentModel(agentType: AgentType, model: ModelProvider): Promise<AgentConfig> {
  const token = localStorage.getItem('token')
  const response = await fetch(`${getApiUrl()}/api/agents/${agentType}/model`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ model }),
  })

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`)
  }

  const result = await response.json()
  return result.data
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Agents page - Manage AI agents and their configurations
 */
export default function Agents() {
  const navigate = useNavigate()
  const toast = useToast()

  // State
  const [agents, setAgents] = useState<AgentConfig[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<AgentType | null>(null)

  // Mock agents for initial display (will be replaced with API call)
  const mockAgents: AgentConfig[] = [
    {
      name: 'Orchestrator',
      description: 'Coordinates all agents',
      type: 'orchestrator',
      tools: ['Task', 'Read', 'Bash'],
      model: 'claude',
      modelOverrideAllowed: true,
      thinkingLevel: 'think',
      capabilities: {
        canSpawnAgents: true,
        canExecuteTools: true,
        canModifyFiles: false,
        canRunCommands: true,
        canAccessNetwork: false,
        canReadFiles: true,
      },
      systemPrompt: 'You are the orchestrator agent...',
      filePath: '/.task/agents/orchestrator.md',
    },
    {
      name: 'Planner',
      description: 'Plans phases and tasks',
      type: 'planner',
      tools: ['Read', 'Glob', 'Grep'],
      model: 'claude',
      modelOverrideAllowed: true,
      thinkingLevel: 'think',
      capabilities: {
        canSpawnAgents: false,
        canExecuteTools: true,
        canModifyFiles: false,
        canRunCommands: false,
        canAccessNetwork: false,
        canReadFiles: true,
      },
      systemPrompt: 'You are a planning specialist...',
      filePath: '/.task/agents/planner.md',
    },
    {
      name: 'Architect',
      description: 'System design decisions',
      type: 'architect',
      tools: ['Read', 'Glob', 'Grep'],
      model: 'claude',
      modelOverrideAllowed: true,
      thinkingLevel: 'max',
      capabilities: {
        canSpawnAgents: false,
        canExecuteTools: true,
        canModifyFiles: false,
        canRunCommands: false,
        canAccessNetwork: false,
        canReadFiles: true,
      },
      systemPrompt: 'You are a system architect...',
      filePath: '/.task/agents/architect.md',
    },
    {
      name: 'Implementer',
      description: 'Writes code',
      type: 'implementer',
      tools: ['Read', 'Write', 'Edit', 'Bash'],
      model: 'glm',
      modelOverrideAllowed: true,
      thinkingLevel: 'off',
      capabilities: {
        canSpawnAgents: false,
        canExecuteTools: true,
        canModifyFiles: true,
        canRunCommands: true,
        canAccessNetwork: false,
        canReadFiles: true,
      },
      systemPrompt: 'You are a code implementer...',
      filePath: '/.task/agents/implementer.md',
    },
    {
      name: 'Reviewer',
      description: 'Code review',
      type: 'reviewer',
      tools: ['Read', 'Grep'],
      model: 'glm',
      modelOverrideAllowed: true,
      thinkingLevel: 'off',
      capabilities: {
        canSpawnAgents: false,
        canExecuteTools: true,
        canModifyFiles: false,
        canRunCommands: false,
        canAccessNetwork: false,
        canReadFiles: true,
      },
      systemPrompt: 'You are a code reviewer...',
      filePath: '/.task/agents/reviewer.md',
    },
    {
      name: 'Tester',
      description: 'Test writing and execution',
      type: 'tester',
      tools: ['Read', 'Write', 'Bash'],
      model: 'glm',
      modelOverrideAllowed: true,
      thinkingLevel: 'off',
      capabilities: {
        canSpawnAgents: false,
        canExecuteTools: true,
        canModifyFiles: true,
        canRunCommands: true,
        canAccessNetwork: false,
        canReadFiles: true,
      },
      systemPrompt: 'You are a testing specialist...',
      filePath: '/.task/agents/tester.md',
    },
    {
      name: 'Security',
      description: 'Security analysis',
      type: 'security',
      tools: ['Read', 'Grep', 'Bash'],
      model: 'claude',
      modelOverrideAllowed: false,
      thinkingLevel: 'think',
      capabilities: {
        canSpawnAgents: false,
        canExecuteTools: true,
        canModifyFiles: false,
        canRunCommands: true,
        canAccessNetwork: false,
        canReadFiles: true,
      },
      systemPrompt: 'You are a security analyst...',
      filePath: '/.task/agents/security.md',
    },
    {
      name: 'Debugger',
      description: 'Debugging',
      type: 'debugger',
      tools: ['Read', 'Bash', 'Grep'],
      model: 'glm',
      modelOverrideAllowed: true,
      thinkingLevel: 'off',
      capabilities: {
        canSpawnAgents: false,
        canExecuteTools: true,
        canModifyFiles: false,
        canRunCommands: true,
        canAccessNetwork: false,
        canReadFiles: true,
      },
      systemPrompt: 'You are a debugging specialist...',
      filePath: '/.task/agents/debugger.md',
    },
  ]

  // Fetch agents
  const loadAgents = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        navigate('/login')
        return
      }

      // Try API call first, fall back to mock data
      try {
        const data = await fetchAgents()
        setAgents(data)
      } catch {
        // Use mock data if API fails (for development)
        setAgents(mockAgents)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agents')
    } finally {
      setIsLoading(false)
    }
  }, [navigate])

  // Initial load
  useEffect(() => {
    loadAgents()
  }, [loadAgents])

  // Handle model change
  const handleModelChange = async (agentType: AgentType, model: ModelProvider) => {
    setUpdatingId(agentType)
    setError(null)

    try {
      // Try API call first
      try {
        const updated = await updateAgentModel(agentType, model)
        setAgents((prev) =>
          prev.map((a) => (a.type === agentType ? updated : a))
        )
      } catch {
        // Update local state if API fails (for development)
        setAgents((prev) =>
          prev.map((a) => (a.type === agentType ? { ...a, model } : a))
        )
      }

      const agent = agents.find((a) => a.type === agentType)
      const modelName = model === 'claude' ? 'Claude (Opus)' : 'GLM (Coding)'
      toast.success(`${agent?.name || agentType} model olarak ${modelName} ayarlandı`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update model')
      toast.error(err instanceof Error ? err.message : 'Failed to update model')
    } finally {
      setUpdatingId(null)
    }
  }

  // Get statistics
  const claudeCount = agents.filter((a) => a.model === 'claude').length
  const glmCount = agents.filter((a) => a.model === 'glm').length

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-foreground/10 bg-foreground/[0.02]">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Agent'lar
              </h1>
              <p className="mt-1 text-[13px] text-foreground/60">
                AI agent yapılandırmaları ve model atamaları
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={loadAgents}
                disabled={isLoading}
              >
                <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-6xl px-6 py-6">
        {/* Info Banner */}
        <div className="mb-6 flex items-start gap-3 rounded-lg bg-accent/5 px-4 py-3 border border-accent/10">
          <Info className="h-4 w-4 text-accent shrink-0 mt-0.5" />
          <div className="text-[11px] text-foreground/70">
            <p className="font-medium text-foreground mb-1">Agent Model Ataması</p>
            <p>
              Her agent için varsayılan modeli seçebilirsiniz. <strong>Claude (Opus)</strong> karmaşık
              reasoning için idealdir, <strong>GLM (Coding)</strong> ise kod yazma ve rutin görevler
              için daha hızlıdır.
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="text-[13px]">{error}</span>
          </div>
        )}

        {/* Statistics */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex items-center gap-2 text-[11px] text-foreground/60">
            <Settings className="h-3.5 w-3.5" />
            <span>{agents.length} agent tanımlı</span>
          </div>
          <div className="h-3 w-px bg-foreground/10" />
          <div className="flex items-center gap-2 text-[11px] text-foreground/60">
            <span className="text-accent">●</span>
            <span>{claudeCount} Claude</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-foreground/60">
            <span className="text-success">●</span>
            <span>{glmCount} GLM</span>
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-foreground/40" />
          </div>
        ) : (
          /* Agent List */
          <AgentList
            agents={agents}
            onModelChange={handleModelChange}
            updatingId={updatingId}
          />
        )}
      </div>
    </div>
  )
}
