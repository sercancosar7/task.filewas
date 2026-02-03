/**
 * SessionHeader - Panel header for session inbox
 * @module @task-filewas/frontend/components/session/SessionHeader
 *
 * Layout:
 * ┌──────────────────────────────────┐
 * │ All Chats                    ≡   │
 * └──────────────────────────────────┘
 *
 * Features:
 * - Title display
 * - Filter/menu toggle button
 * - Optional count badge
 */

import { Filter, MoreHorizontal, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// =============================================================================
// Types
// =============================================================================

export interface SessionHeaderProps {
  /** Header title */
  title?: string
  /** Total session count */
  count?: number
  /** Show filter button */
  showFilter?: boolean
  /** Show menu button */
  showMenu?: boolean
  /** Show new session button */
  showNewButton?: boolean
  /** Filter button click handler */
  onFilterClick?: () => void
  /** Menu button click handler */
  onMenuClick?: () => void
  /** New session button click handler */
  onNewClick?: () => void
  /** Additional CSS classes */
  className?: string
}

// =============================================================================
// Component
// =============================================================================

/**
 * SessionHeader - Panel header component
 *
 * @example
 * ```tsx
 * <SessionHeader
 *   title="All Chats"
 *   count={12}
 *   showFilter
 *   onFilterClick={() => setShowFilters(true)}
 * />
 * ```
 */
export function SessionHeader({
  title = 'All Chats',
  count,
  showFilter = true,
  showMenu = false,
  showNewButton = false,
  onFilterClick,
  onMenuClick,
  onNewClick,
  className,
}: SessionHeaderProps) {
  return (
    <div
      className={cn(
        // Layout
        'flex items-center justify-between',
        // Border
        'border-b border-border',
        // Padding (Craft Agents: px-4 py-3)
        'px-4 py-3',
        // Additional classes
        className
      )}
    >
      {/* Left: Title + Count */}
      <div className="flex items-center gap-2">
        <h2 className="text-[13px] font-medium text-foreground">
          {title}
        </h2>
        {count !== undefined && count > 0 && (
          <span
            className="text-[11px] text-muted-foreground"
            style={{
              color: 'color-mix(in oklch, var(--foreground) 40%, transparent)',
            }}
          >
            ({count})
          </span>
        )}
      </div>

      {/* Right: Action Buttons */}
      <div className="flex items-center gap-1">
        {/* New Session Button */}
        {showNewButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onNewClick}
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            title="Yeni Session"
            aria-label="Yeni session olustur"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        )}

        {/* Filter Button */}
        {showFilter && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onFilterClick}
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            title="Filtrele"
            aria-label="Filtreleri goster"
          >
            <Filter className="h-3.5 w-3.5" />
          </Button>
        )}

        {/* Menu Button */}
        {showMenu && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            title="Menu"
            aria-label="Menu'yu ac"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
}

export default SessionHeader
