/**
 * SkillPreview Component
 * Dialog to preview skill content
 * @module @task-filewas/frontend/components/skills/SkillPreview
 *
 * Features:
 * - Display skill system prompt
 * - Show skill metadata
 * - Syntax highlighted markdown rendering
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { MarkdownRenderer } from '@/components/chat/MarkdownRenderer'
import type { SkillConfig } from '@task-filewas/shared'

// =============================================================================
// Types
// =============================================================================

export interface SkillPreviewProps {
  /** Skill to preview */
  skill: SkillConfig | null
  /** Whether the dialog is open */
  open: boolean
  /** Close callback */
  onOpenChange: (open: boolean) => void
}

// =============================================================================
// Helpers
// =============================================================================

function getCategoryLabel(category: string): string {
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
    default:
      return category
  }
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * SkillPreview - Dialog to preview skill content
 */
export function SkillPreview({
  skill,
  open,
  onOpenChange,
}: SkillPreviewProps) {
  if (!skill) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DialogTitle className="text-lg">
              {skill.name}
            </DialogTitle>
            {skill.command && (
              <Badge variant="outline" className="text-[10px]">
                {skill.command}
              </Badge>
            )}
          </div>
          <DialogDescription className="flex items-center gap-3 mt-2">
            <Badge variant="outline" className="text-[10px]">
              {getCategoryLabel(skill.category)}
            </Badge>
            {skill.enabled ? (
              <Badge variant="outline" className="text-success border-success/30 bg-success/5 text-[10px]">
                Aktif
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px]">
                Pasif
              </Badge>
            )}
            {skill.modelPreference && (
              <span className="text-[10px] text-foreground/40">
                Model: {skill.modelPreference}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-2 py-3 border-b border-foreground/10">
          {skill.tags.map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="text-[10px] text-foreground/40"
            >
              #{tag}
            </Badge>
          ))}
          {skill.version && (
            <span className="text-[10px] text-foreground/30 ml-auto">
              v{skill.version}
              {skill.author && ` • ${skill.author}`}
            </span>
          )}
        </div>

        {/* System Prompt Content */}
        <ScrollArea className="max-h-[500px]">
          <div className="pr-4">
            <div className="bg-foreground/[0.02] rounded-lg p-4">
              {skill.systemPrompt ? (
                <MarkdownRenderer content={skill.systemPrompt} />
              ) : (
                <p className="text-[13px] text-foreground/40 italic">
                  Icerik bulunmuyor...
                </p>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* File Path */}
        <div className="text-[10px] text-foreground/30 truncate pt-2 border-t border-foreground/10">
          {skill.filePath}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default SkillPreview
