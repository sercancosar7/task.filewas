/**
 * SkillCard Component
 * Display individual skill information with actions
 * @module @task-filewas/frontend/components/skills/SkillCard
 *
 * Features:
 * - Display skill name, category, description
 * - Show skill status (enabled/disabled)
 * - View skill details (preview)
 * - Toggle skill enabled state
 *
 * Design Reference: Craft Agents list items
 */

import {
  Code2,
  TestTube,
  Server,
  Layout,
  Shield,
  Workflow,
  FileText,
  Cpu,
  Database,
  Zap,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Terminal,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { SkillConfig, SkillCategory } from '@task-filewas/shared'

// =============================================================================
// Types
// =============================================================================

export interface SkillCardProps {
  /** Skill configuration */
  skill: SkillConfig
  /** Whether the card is expanded */
  expanded?: boolean
  /** Toggle expanded callback */
  onToggle?: () => void
  /** Toggle enabled callback */
  onEnabledToggle?: (skillId: string) => void
  /** Preview callback */
  onPreview?: (skill: SkillConfig) => void
  /** Optional className */
  className?: string
}

// =============================================================================
// Helpers
// =============================================================================

function getCategoryIcon(category: SkillCategory) {
  switch (category) {
    case 'coding':
      return Code2
    case 'testing':
      return TestTube
    case 'backend':
      return Server
    case 'frontend':
      return Layout
    case 'security':
      return Shield
    case 'workflow':
      return Workflow
    case 'documentation':
      return FileText
    case 'architecture':
      return Cpu
    case 'database':
      return Database
    case 'custom':
      return Zap
  }
}

function getCategoryLabel(category: SkillCategory): string {
  switch (category) {
    case 'coding':
      return 'Kodlama'
    case 'testing':
      return 'Test'
    case 'backend':
      return 'Backend'
    case 'frontend':
      return 'Frontend'
    case 'security':
      return 'Guvenlik'
    case 'workflow':
      return 'Workflow'
    case 'documentation':
      return 'Dokumantasyon'
    case 'architecture':
      return 'Mimari'
    case 'database':
      return 'Veritabani'
    case 'custom':
      return 'Ozel'
  }
}

function getCategoryColor(category: SkillCategory): string {
  switch (category) {
    case 'coding':
      return 'text-blue-500 border-blue-500/30 bg-blue-500/5'
    case 'testing':
      return 'text-green-500 border-green-500/30 bg-green-500/5'
    case 'backend':
      return 'text-orange-500 border-orange-500/30 bg-orange-500/5'
    case 'frontend':
      return 'text-purple-500 border-purple-500/30 bg-purple-500/5'
    case 'security':
      return 'text-red-500 border-red-500/30 bg-red-500/5'
    case 'workflow':
      return 'text-cyan-500 border-cyan-500/30 bg-cyan-500/5'
    case 'documentation':
      return 'text-yellow-500 border-yellow-500/30 bg-yellow-500/5'
    case 'architecture':
      return 'text-indigo-500 border-indigo-500/30 bg-indigo-500/5'
    case 'database':
      return 'text-pink-500 border-pink-500/30 bg-pink-500/5'
    case 'custom':
      return 'text-accent border-accent/30 bg-accent/5'
  }
}

function getSourceTypeLabel(sourceType: string): string {
  switch (sourceType) {
    case 'ecc':
      return 'ECC'
    case 'project':
      return 'Proje'
    case 'user':
      return 'Kullanici'
    case 'plugin':
      return 'Plugin'
    default:
      return sourceType
  }
}

function getModelPreferenceLabel(preference?: string): string {
  switch (preference) {
    case 'claude':
      return 'Claude'
    case 'glm':
      return 'GLM'
    case 'auto':
      return 'Otomatik'
    default:
      return '-'
  }
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * SkillCard - Display skill information with expandable details
 */
export function SkillCard({
  skill,
  expanded = false,
  onToggle,
  onEnabledToggle,
  onPreview,
  className,
}: SkillCardProps) {
  const Icon = getCategoryIcon(skill.category)

  return (
    <div
      className={cn(
        'group relative rounded-[8px] border border-foreground/10 bg-foreground/[0.02] transition-all',
        'hover:bg-foreground/5 hover:border-foreground/20',
        expanded && 'bg-foreground/5 border-foreground/20',
        !skill.enabled && 'opacity-60',
        className
      )}
    >
      {/* Header - Always Visible */}
      <div className="flex items-center gap-3 p-3">
        {/* Icon */}
        <div className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
          getCategoryColor(skill.category)
        )}>
          <Icon className="h-4 w-4" />
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-[13px] font-medium text-foreground">
              {skill.name}
            </h4>
            {skill.command && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-foreground/40">
                <Terminal className="h-2.5 w-2.5 mr-1" />
                {skill.command}
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-foreground/40 truncate mt-0.5">
            {skill.description}
          </p>
        </div>

        {/* Status Badge */}
        <Badge
          variant={skill.enabled ? 'outline' : 'secondary'}
          className={cn(
            'text-[10px] px-1.5 py-0',
            skill.enabled ? 'text-success border-success/30 bg-success/5' : 'text-foreground/40'
          )}
        >
          {skill.enabled ? 'Aktif' : 'Pasif'}
        </Badge>

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
          {/* Category and Source */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-[11px] text-foreground/60">
                <span className="mr-1">Kategori:</span>
                <Badge variant="outline" className={cn('text-[10px]', getCategoryColor(skill.category))}>
                  {getCategoryLabel(skill.category)}
                </Badge>
              </div>
              <div className="text-[11px] text-foreground/60">
                <span className="mr-1">Kaynak:</span>
                <span className="text-foreground/40">{getSourceTypeLabel(skill.sourceType)}</span>
              </div>
            </div>
            <div className="text-[11px] text-foreground/60">
              <span className="mr-1">Model:</span>
              <span className="text-foreground/40">{getModelPreferenceLabel(skill.modelPreference)}</span>
            </div>
          </div>

          {/* Tags */}
          {skill.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {skill.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="text-[10px] text-foreground/40"
                >
                  #{tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Required Tools */}
          {skill.requiredTools && skill.requiredTools.length > 0 && (
            <div className="space-y-1">
              <span className="text-[11px] text-foreground/60">
                Gerekli Araçlar ({skill.requiredTools.length})
              </span>
              <div className="flex flex-wrap gap-1">
                {skill.requiredTools.map((tool) => (
                  <Badge
                    key={tool}
                    variant="outline"
                    className="text-[10px] text-foreground/40"
                  >
                    {tool}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {skill.description && (
            <div className="text-[11px] text-foreground/60">
              {skill.description}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            {/* Preview Button */}
            {onPreview && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[11px]"
                onClick={() => onPreview(skill)}
              >
                <Eye className="h-3 w-3 mr-1" />
                Önizle
              </Button>
            )}

            {/* Toggle Enabled */}
            {onEnabledToggle && (
              <Button
                variant={skill.enabled ? 'outline' : 'default'}
                size="sm"
                className={cn(
                  'h-7 text-[11px]',
                  skill.enabled && 'text-destructive border-destructive/30 hover:bg-destructive/5'
                )}
                onClick={() => onEnabledToggle(skill.id)}
              >
                {skill.enabled ? (
                  <>
                    <EyeOff className="h-3 w-3 mr-1" />
                    Devre Dışı
                  </>
                ) : (
                  <>
                    <Eye className="h-3 w-3 mr-1" />
                    Etkinleştir
                  </>
                )}
              </Button>
            )}
          </div>

          {/* File Path */}
          <div className="text-[10px] text-foreground/30 truncate">
            {skill.filePath}
          </div>

          {/* Version */}
          {skill.version && (
            <div className="text-[10px] text-foreground/30">
              v{skill.version}
              {skill.author && ` • ${skill.author}`}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default SkillCard
