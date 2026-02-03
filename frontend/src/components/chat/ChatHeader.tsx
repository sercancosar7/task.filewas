/**
 * ChatHeader - Session header with title and actions
 * @module @task-filewas/frontend/components/chat/ChatHeader
 *
 * Layout:
 * ┌────────────────────────────────────────────────────────────────────┐
 * │ E-commerce checkout flow                              ▼  [⋮]      │
 * └────────────────────────────────────────────────────────────────────┘
 *
 * Features:
 * - Session title display
 * - Processing indicator
 * - Dropdown menu for actions
 * - Title editing (optional)
 */

import * as React from 'react'
import {
  MoreVertical,
  Edit2,
  Flag,
  Trash2,
  Archive,
  Copy,
  Share,
  Settings,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Session } from '@task-filewas/shared'

// =============================================================================
// Types
// =============================================================================

export interface ChatHeaderProps {
  /** Current session */
  session: Session | null
  /** Whether the session is processing */
  isProcessing?: boolean
  /** Callback when title is edited */
  onTitleEdit?: (title: string) => void
  /** Callback for menu actions */
  onMenuAction?: (action: ChatHeaderAction) => void
  /** Additional CSS classes */
  className?: string
}

/**
 * Available menu actions
 */
export type ChatHeaderAction =
  | 'edit'
  | 'flag'
  | 'unflag'
  | 'archive'
  | 'duplicate'
  | 'share'
  | 'delete'
  | 'settings'
  | 'refresh'

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * Menu item with icon
 */
interface MenuItemProps {
  icon: React.ReactNode
  label: string
  onClick: () => void
  variant?: 'default' | 'destructive'
}

function MenuItem({ icon, label, onClick, variant = 'default' }: MenuItemProps) {
  return (
    <DropdownMenuItem
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 cursor-pointer',
        variant === 'destructive' && 'text-destructive focus:text-destructive'
      )}
    >
      {icon}
      <span>{label}</span>
    </DropdownMenuItem>
  )
}

// =============================================================================
// Component
// =============================================================================

/**
 * ChatHeader - Session title and action menu
 *
 * @example
 * ```tsx
 * <ChatHeader
 *   session={currentSession}
 *   isProcessing={isAgentRunning}
 *   onTitleEdit={handleTitleEdit}
 *   onMenuAction={handleMenuAction}
 * />
 * ```
 */
export function ChatHeader({
  session,
  isProcessing = false,
  onTitleEdit,
  onMenuAction,
  className,
}: ChatHeaderProps) {
  const handleAction = React.useCallback(
    (action: ChatHeaderAction) => {
      onMenuAction?.(action)
    },
    [onMenuAction]
  )

  // No session state
  if (!session) {
    return (
      <div
        className={cn(
          // Layout
          'flex items-center justify-between',
          // Padding
          'px-4 py-3',
          // Border
          'border-b border-border',
          // Min height
          'min-h-[52px]',
          className
        )}
      >
        <span className="text-[13px] text-muted-foreground">
          Session secilmedi
        </span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        // Layout
        'flex items-center justify-between gap-2',
        // Padding
        'px-4 py-3',
        // Border
        'border-b border-border',
        // Min height
        'min-h-[52px]',
        className
      )}
    >
      {/* Left: Title + Processing indicator */}
      <div className="flex items-center gap-2 min-w-0">
        {/* Processing spinner */}
        {isProcessing && (
          <Spinner size="sm" className="text-accent shrink-0" />
        )}

        {/* Title */}
        <h1
          className={cn(
            'text-[15px] font-medium truncate',
            // Shimmer animation when processing
            isProcessing && 'animate-shimmer-text'
          )}
          title={session.title}
        >
          {session.title}
        </h1>

        {/* Phase indicator (if autonomous) */}
        {session.phaseProgress && (
          <span className="shrink-0 text-[11px] text-muted-foreground">
            Faz {session.phaseProgress.currentPhase}/{session.phaseProgress.totalPhases}
          </span>
        )}
      </div>

      {/* Right: Action buttons */}
      <div className="flex items-center gap-1">
        {/* Dropdown Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              title="Menu"
              aria-label="Session menu"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-48">
            {/* Edit */}
            {onTitleEdit && (
              <MenuItem
                icon={<Edit2 className="h-3.5 w-3.5" />}
                label="Basligi Duzenle"
                onClick={() => handleAction('edit')}
              />
            )}

            {/* Flag/Unflag */}
            <MenuItem
              icon={<Flag className="h-3.5 w-3.5" />}
              label={session.isFlagged ? 'Isareti Kaldir' : 'Isaretle'}
              onClick={() => handleAction(session.isFlagged ? 'unflag' : 'flag')}
            />

            {/* Refresh */}
            <MenuItem
              icon={<RefreshCw className="h-3.5 w-3.5" />}
              label="Yenile"
              onClick={() => handleAction('refresh')}
            />

            <DropdownMenuSeparator />

            {/* Duplicate */}
            <MenuItem
              icon={<Copy className="h-3.5 w-3.5" />}
              label="Kopyala"
              onClick={() => handleAction('duplicate')}
            />

            {/* Share */}
            <MenuItem
              icon={<Share className="h-3.5 w-3.5" />}
              label="Paylas"
              onClick={() => handleAction('share')}
            />

            {/* Archive */}
            <MenuItem
              icon={<Archive className="h-3.5 w-3.5" />}
              label="Arsivle"
              onClick={() => handleAction('archive')}
            />

            <DropdownMenuSeparator />

            {/* Settings */}
            <MenuItem
              icon={<Settings className="h-3.5 w-3.5" />}
              label="Session Ayarlari"
              onClick={() => handleAction('settings')}
            />

            <DropdownMenuSeparator />

            {/* Delete */}
            <MenuItem
              icon={<Trash2 className="h-3.5 w-3.5" />}
              label="Sil"
              onClick={() => handleAction('delete')}
              variant="destructive"
            />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

export default ChatHeader
