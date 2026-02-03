/**
 * ChangelogEntry - Tek changelog kartı component'i
 * @module @task-filewas/frontend/components/changelog/ChangelogEntry
 */

import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, FileEdit, ChevronDown, ChevronRight } from 'lucide-react'
import type { ChangelogEntry } from '@task-filewas/shared'

// =============================================================================
// Types
// =============================================================================

export interface ChangelogEntryProps {
  entry: ChangelogEntry
  isExpanded?: boolean
  onToggle?: () => void
  className?: string
}

// =============================================================================
// Helpers
// =============================================================================

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })
}

const FILE_ICONS: Record<string, string> = {
  ts: '📘',
  tsx: '⚛️',
  js: '📜',
  jsx: '⚛️',
  json: '📋',
  md: '📝',
  css: '🎨',
  scss: '🎨',
  html: '🌐',
  sh: '⚙️',
  sql: '🗄️',
  py: '🐍',
  go: '🐹',
  rs: '🦀',
}

function getFileIcon(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase()
  return FILE_ICONS[ext ?? ''] ?? '📄'
}

// =============================================================================
// Component
// =============================================================================

/**
 * ChangelogEntry - Tek changelog girişi için kart component'i
 *
 * - Sol tarafta faz numarası badge'i
 * - Başlık ve tarih
 * - Genişletilebilir değişiklik listesi
 * - Değişen dosyalar
 */
export function ChangelogEntry({ entry, isExpanded = false, onToggle, className }: ChangelogEntryProps) {
  const hasChanges = entry.changes.length > 0
  const hasFiles = entry.files.length > 0

  return (
    <Card
      className={cn(
        'p-4 hover:bg-foreground/[0.02] transition-colors',
        isExpanded && 'bg-foreground/[0.03]',
        className
      )}
    >
      {/* Header - Tıklanabilir alan */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left flex items-start gap-3 group"
        aria-expanded={isExpanded}
      >
        {/* Phase Badge */}
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-accent/10 text-accent text-[12px] font-semibold shrink-0">
          {entry.phase}
        </div>

        {/* Title and Date */}
        <div className="flex-1 min-w-0">
          <h4 className="text-[13px] font-medium group-hover:text-accent transition-colors">
            {entry.title}
          </h4>
          <div className="flex items-center gap-3 mt-1 text-[11px] text-foreground/40">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(entry.date)}
            </span>
            <span className="flex items-center gap-1">
              <FileEdit className="h-3 w-3" />
              {hasFiles ? `${entry.files.length} dosya` : 'Dosya yok'}
            </span>
          </div>
        </div>

        {/* Expand/Collapse Icon */}
        {(hasChanges || hasFiles) && (
          <div className="shrink-0">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-foreground/40" />
            ) : (
              <ChevronRight className="h-4 w-4 text-foreground/40" />
            )}
          </div>
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-4 ml-11 space-y-3">
          {/* Changes List */}
          {hasChanges && (
            <div>
              <p className="text-[11px] font-medium text-foreground/60 mb-2 uppercase tracking-wide">
                Değişiklikler
              </p>
              <ul className="space-y-1">
                {entry.changes.map((change, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-[12px] text-foreground/80">
                    <span className="text-accent mt-0.5">•</span>
                    <span>{change}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Changed Files */}
          {hasFiles && (
            <div className={cn('pt-3', hasChanges && 'border-t border-foreground/5')}>
              <p className="text-[11px] font-medium text-foreground/60 mb-2 uppercase tracking-wide">
                Değişen Dosyalar ({entry.files.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {entry.files.map((file, idx) => (
                  <Badge
                    key={idx}
                    variant="outline"
                    className="px-2 py-0.5 text-[10px] bg-foreground/5 border-foreground/10 hover:bg-foreground/10 cursor-default"
                  >
                    <span className="mr-1">{getFileIcon(file)}</span>
                    {file.split('/').pop()}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

export default ChangelogEntry
