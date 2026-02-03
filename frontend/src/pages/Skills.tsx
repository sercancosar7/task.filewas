/**
 * Skills Page
 * Skill management and configuration interface
 * @module @task-filewas/frontend/pages/Skills
 *
 * Features:
 * - List all available skills
 * - View skill details and system prompts
 * - Enable/disable skills
 * - Filter by category and status
 *
 * Design Reference: Craft Agents settings page
 */

import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Loader2,
  RefreshCw,
  Settings,
  AlertCircle,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SkillList } from '@/components/skills/SkillList'
import { SkillPreview } from '@/components/skills/SkillPreview'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/lib/utils'
import type { SkillConfig } from '@task-filewas/shared'
import { BUILT_IN_SKILLS } from '@task-filewas/shared'

// =============================================================================
// Helpers
// =============================================================================

function getApiUrl(): string {
  return import.meta.env.VITE_API_URL || 'http://localhost:3001'
}

async function fetchSkills(): Promise<SkillConfig[]> {
  const token = localStorage.getItem('token')
  const response = await fetch(`${getApiUrl()}/api/skills`, {
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

// =============================================================================
// Main Component
// =============================================================================

/**
 * Skills page - Manage AI skills and their configurations
 */
export default function Skills() {
  const navigate = useNavigate()
  const toast = useToast()

  // State
  const [skills, setSkills] = useState<SkillConfig[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [previewSkill, setPreviewSkill] = useState<SkillConfig | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  // Mock skills for initial display (will be replaced with API call)
  const mockSkills: SkillConfig[] = BUILT_IN_SKILLS.map((skill) => ({
    id: skill.id,
    name: skill.name,
    description: skill.description,
    category: skill.category,
    sourceType: 'ecc' as const,
    command: skill.command,
    systemPrompt: `# ${skill.name}\n\n${skill.description}\n\nThis is a built-in skill from Everything Claude Code system.`,
    filePath: `/.task/skills/${skill.id}.md`,
    enabled: true,
    modelPreference: 'auto' as const,
    requiredTools: [],
    tags: [skill.category],
    version: '1.0.0',
    author: 'ECC',
  }))

  // Fetch skills
  const loadSkills = useCallback(async () => {
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
        const data = await fetchSkills()
        setSkills(data)
      } catch {
        // Use mock data if API fails (for development)
        setSkills(mockSkills)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load skills')
    } finally {
      setIsLoading(false)
    }
  }, [navigate])

  // Initial load
  useEffect(() => {
    loadSkills()
  }, [loadSkills])

  // Handle preview
  const handlePreview = (skill: SkillConfig) => {
    setPreviewSkill(skill)
    setPreviewOpen(true)
  }

  // Handle toggle enabled
  const handleToggleEnabled = (skillId: string) => {
    setSkills((prev) =>
      prev.map((s) =>
        s.id === skillId ? { ...s, enabled: !s.enabled } : s
      )
    )
    const skill = skills.find((s) => s.id === skillId)
    const newState = !skill?.enabled
    toast.success(
      `${skill?.name || skillId} ${newState ? 'etkinlestirildi' : 'devre disi birakildi'}`
    )
  }

  // Get statistics
  const enabledCount = skills.filter((s) => s.enabled).length
  const eccCount = skills.filter((s) => s.sourceType === 'ecc').length
  const projectCount = skills.filter((s) => s.sourceType === 'project').length
  const userCount = skills.filter((s) => s.sourceType === 'user').length

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-foreground/10 bg-foreground/[0.02]">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Skills
              </h1>
              <p className="mt-1 text-[13px] text-foreground/60">
                Yeniden kullanilabilir yetenekler ve pattern'lar
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={loadSkills}
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
          <Zap className="h-4 w-4 text-accent shrink-0 mt-0.5" />
          <div className="text-[11px] text-foreground/70">
            <p className="font-medium text-foreground mb-1">Skills (Yetenekler)</p>
            <p>
              Skills, AI agent'lari tarafindan kullanilabilen yeniden kullanilabilir pattern'lardir.
              Kodlama standartlari, test metodolojileri, ve sekiller gibi farkli kategorilerde skills bulunur.
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
        <div className="mb-6 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-[11px] text-foreground/60">
            <Settings className="h-3.5 w-3.5" />
            <span>{skills.length} skill tanimli</span>
          </div>
          <div className="h-3 w-px bg-foreground/10" />
          <div className="flex items-center gap-2 text-[11px] text-foreground/60">
            <Zap className="h-3.5 w-3.5 text-success" />
            <span>{enabledCount} aktif</span>
          </div>
          <div className="h-3 w-px bg-foreground/10" />
          <div className="flex items-center gap-2 text-[11px] text-foreground/60">
            <span className="text-accent">●</span>
            <span>{eccCount} ECC</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-foreground/60">
            <span className="text-info">●</span>
            <span>{projectCount} Proje</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-foreground/60">
            <span className="text-purple-500">●</span>
            <span>{userCount} Kullanici</span>
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-foreground/40" />
          </div>
        ) : (
          /* Skill List */
          <SkillList
            skills={skills}
            onEnabledToggle={handleToggleEnabled}
            onPreview={handlePreview}
          />
        )}
      </div>

      {/* Skill Preview Dialog */}
      <SkillPreview
        skill={previewSkill}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
    </div>
  )
}
