/**
 * ChangelogList - Changelog girişleri listesi component'i
 * @module @task-filewas/frontend/components/changelog/ChangelogList
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import { ScrollText, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { ChangelogEntry } from './ChangelogEntry'
import type { ChangelogEntry as ChangelogEntryType } from '@task-filewas/shared'

// =============================================================================
// Types
// =============================================================================

export interface ChangelogListProps {
  entries: ChangelogEntryType[]
  isLoading?: boolean
  error?: string | null
  version?: string
  onRetry?: () => void
  className?: string
}

// =============================================================================
// Component
// =============================================================================

/**
 * ChangelogList - Changelog girişlerini liste olarak gösterir
 *
 * - Yükleme durumu
 * - Hata durumu
 * - Boş durum
 * - Genişletilebilir kartlar
 */
export function ChangelogList({
  entries,
  isLoading = false,
  error = null,
  version = 'v0.1.0',
  onRetry,
  className,
}: ChangelogListProps) {
  // State for expanded entries
  const [expandedEntries, setExpandedEntries] = React.useState<Set<number>>(new Set())

  // Toggle entry expansion
  const toggleEntry = React.useCallback((phase: number) => {
    setExpandedEntries((prev) => {
      const next = new Set(prev)
      if (next.has(phase)) {
        next.delete(phase)
      } else {
        next.add(phase)
      }
      return next
    })
  }, [])

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('flex flex-col items-center justify-center h-64', className)}>
        <Loader2 className="h-8 w-8 text-accent animate-spin mb-3" />
        <p className="text-[13px] text-foreground/60">Changelog yükleniyor...</p>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={cn('flex flex-col items-center justify-center h-64', className)}>
        <AlertCircle className="h-8 w-8 text-destructive mb-3" />
        <p className="text-[13px] text-foreground/60 mb-4">{error}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-accent/10 text-accent hover:bg-accent/20 transition-colors text-[13px]"
          >
            <RefreshCw className="h-4 w-4" />
            Tekrar Dene
          </button>
        )}
      </div>
    )
  }

  // Empty state
  if (entries.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center h-64', className)}>
        <div className="p-3 rounded-full bg-foreground/5 mb-3">
          <ScrollText className="h-6 w-6 text-foreground/40" />
        </div>
        <p className="text-[13px] text-foreground/60 mb-1">Henüz changelog giriş yok</p>
        <p className="text-[11px] text-foreground/30">
          Projenin ilk fazını tamamladığında burada görünecek
        </p>
      </div>
    )
  }

  // List with entries
  return (
    <div className={cn('flex flex-col', className)}>
      {/* Header with version info */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ScrollText className="h-5 w-5 text-accent" />
          <h3 className="text-[15px] font-semibold">Değişiklik Geçmişi</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-foreground/40">{version}</span>
          <span className="px-2 py-0.5 rounded-md bg-foreground/5 text-[11px] text-foreground/60">
            {entries.length} giriş
          </span>
        </div>
      </div>

      {/* Entries list */}
      <div className="space-y-3">
        {entries.map((entry) => (
          <ChangelogEntry
            key={`${entry.phase}-${entry.date}`}
            entry={entry}
            isExpanded={expandedEntries.has(entry.phase)}
            onToggle={() => toggleEntry(entry.phase)}
          />
        ))}
      </div>
    </div>
  )
}

export default ChangelogList
