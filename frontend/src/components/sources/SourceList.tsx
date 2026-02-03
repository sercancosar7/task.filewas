/**
 * SourceList Component
 * Display list of sources with actions
 * @module @task-filewas/frontend/components/sources/SourceList
 *
 * Features:
 * - Display source cards with name, type, status
 * - Toggle enabled/disabled
 * - Test connection
 * - Delete source
 * - Connection status indicator
 *
 * Design Reference: Craft Agents list items
 */

import * as React from 'react'
import {
  Power,
  Trash2,
  Cable,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Database,
  Globe,
  Folder,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Source, SourceSummary } from '@task-filewas/shared'

// =============================================================================
// Types
// =============================================================================

export interface SourceListProps {
  /** Sources to display */
  sources: Source[] | SourceSummary[]
  /** Toggle enabled callback */
  onToggle: (id: string) => void
  /** Test connection callback */
  onTest: (id: string) => void
  /** Delete source callback */
  onDelete: (id: string) => void
  /** Currently toggling source ID */
  togglingId?: string | null
  /** Currently testing source ID */
  testingId?: string | null
  /** Currently deleting source ID */
  deletingId?: string | null
  /** Optional className */
  className?: string
}

// =============================================================================
// Helpers
// =============================================================================

function getSourceIcon(type: Source['type']) {
  switch (type) {
    case 'mcp':
      return Database
    case 'api':
      return Globe
    case 'local':
      return Folder
  }
}

function getStatusIcon(status: Source['status'], className?: string) {
  switch (status) {
    case 'connected':
      return <CheckCircle2 className={cn('h-3.5 w-3.5 text-success', className)} />
    case 'connecting':
      return <Loader2 className={cn('h-3.5 w-3.5 animate-spin text-info', className)} />
    case 'error':
      return <XCircle className={cn('h-3.5 w-3.5 text-destructive', className)} />
    case 'disconnected':
    default:
      return <AlertCircle className={cn('h-3.5 w-3.5 text-foreground/40', className)} />
  }
}

function getStatusBadge(status: Source['status']) {
  switch (status) {
    case 'connected':
      return <Badge variant="outline" className="text-[10px] text-success border-success/30 bg-success/5">Bağlı</Badge>
    case 'connecting':
      return <Badge variant="outline" className="text-[10px] text-info border-info/30 bg-info/5">Bağlanıyor</Badge>
    case 'error':
      return <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30 bg-destructive/5">Hata</Badge>
    case 'disconnected':
    default:
      return <Badge variant="outline" className="text-[10px] text-foreground/40">Bağlı değil</Badge>
  }
}

function getTypeLabel(type: Source['type']): string {
  switch (type) {
    case 'mcp':
      return 'MCP'
    case 'api':
      return 'API'
    case 'local':
      return 'Local'
  }
}

// =============================================================================
// Sub-Components
// =============================================================================

interface SourceItemProps {
  source: Source | SourceSummary
  Icon: React.ElementType
  onToggle: () => void
  onTest: () => void
  onDelete: () => void
  isToggling: boolean
  isTesting: boolean
  isDeleting: boolean
}

/**
 * Individual source item in the list
 */
function SourceItem({
  source,
  Icon,
  onToggle,
  onTest,
  onDelete,
  isToggling,
  isTesting,
  isDeleting,
}: SourceItemProps) {
  const enabled = source.enabled
  const status = 'status' in source ? source.status : 'disconnected'

  return (
    <div
      className={cn(
        'group relative flex items-center gap-3 rounded-[8px] border border-foreground/10 bg-foreground/[0.02] p-3 transition-all',
        'hover:bg-foreground/5 hover:border-foreground/20',
        !enabled && 'opacity-60'
      )}
    >
      {/* Icon */}
      <div className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
        enabled ? 'bg-accent/10 text-accent' : 'bg-foreground/5 text-foreground/40'
      )}>
        <Icon className="h-4 w-4" />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h4 className="text-[13px] font-medium text-foreground truncate">
            {source.name}
          </h4>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {getTypeLabel(source.type)}
          </Badge>
          {getStatusBadge(status)}
        </div>
        <p className="text-[11px] text-foreground/40 truncate mt-0.5">
          {'config' in source && 'baseUrl' in source.config ? source.config.baseUrl : null}
          {'config' in source && 'path' in source.config ? source.config.path : null}
          {'config' in source && 'type' in source.config ? `MCP: ${source.config.type}` : null}
        </p>
      </div>

      {/* Status Indicator */}
      <div className="flex items-center gap-1.5 text-[11px] text-foreground/40">
        {getStatusIcon(status)}
        <span className="capitalize">
          {status === 'connected' && 'Aktif'}
          {status === 'connecting' && 'Bağlanıyor'}
          {status === 'error' && 'Hata'}
          {status === 'disconnected' && 'Pasif'}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Test Connection */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onTest}
          disabled={isTesting || !enabled}
          title="Bağlantıyı test et"
        >
          {isTesting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Cable className="h-3.5 w-3.5" />
          )}
        </Button>

        {/* Toggle Power */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-7 w-7',
            enabled ? 'text-success hover:text-success/80' : 'text-foreground/40 hover:text-foreground'
          )}
          onClick={onToggle}
          disabled={isToggling || isDeleting}
          title={enabled ? 'Devre dışı bırak' : 'Etkinleştir'}
        >
          {isToggling ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Power className="h-3.5 w-3.5" />
          )}
        </Button>

        {/* Delete */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive/80"
          onClick={onDelete}
          disabled={isDeleting}
          title="Sil"
        >
          {isDeleting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
    </div>
  )
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * SourceList - Display sources with actions
 *
 * @example
 * ```tsx
 * <SourceList
 *   sources={sources}
 *   onToggle={(id) => toggleSource(id)}
 *   onTest={(id) => testSource(id)}
 *   onDelete={(id) => deleteSource(id)}
 *   togglingId={togglingId}
 *   testingId={testingId}
 *   deletingId={deletingId}
 * />
 * ```
 */
export function SourceList({
  sources,
  onToggle,
  onTest,
  onDelete,
  togglingId = null,
  testingId = null,
  deletingId = null,
  className,
}: SourceListProps) {
  if (sources.length === 0) {
    return (
      <div className={cn(
        'flex min-h-[120px] items-center justify-center rounded-lg border border-dashed border-foreground/10',
        className
      )}>
        <p className="text-[13px] text-foreground/40">
          Kaynak bulunmuyor
        </p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      {sources.map((source) => {
        const Icon = getSourceIcon(source.type)
        return (
          <SourceItem
            key={source.id}
            source={source}
            Icon={Icon}
            onToggle={() => onToggle(source.id)}
            onTest={() => onTest(source.id)}
            onDelete={() => onDelete(source.id)}
            isToggling={togglingId === source.id}
            isTesting={testingId === source.id}
            isDeleting={deletingId === source.id}
          />
        )
      })}
    </div>
  )
}

export default SourceList
