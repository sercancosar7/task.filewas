/**
 * UserMessage - User message card component (Craft Agents style)
 * @module @task-filewas/frontend/components/chat/UserMessage
 *
 * Layout:
 * ┌────────────────────────────────────────────────────────────────┐
 * │ Mesaj içeriği burada yer alır...                               │
 * │                                                    [Edit] [⋮]  │
 * │                                              14:32             │
 * └────────────────────────────────────────────────────────────────┘
 *
 * Features:
 * - Rounded card with subtle background
 * - Edit button (hover reveal)
 * - Timestamp display
 * - Multiline text support
 * - Accessibility
 */

import * as React from 'react'
import { Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { Message } from '@task-filewas/shared'

// =============================================================================
// Types
// =============================================================================

export interface UserMessageProps {
  /** Message data */
  message: Message
  /** Whether to show edit button */
  editable?: boolean | undefined
  /** Callback when edit button is clicked */
  onEdit?: ((message: Message) => void) | undefined
  /** Whether this is the latest message (more prominent edit) */
  isLatest?: boolean | undefined
  /** Additional CSS classes */
  className?: string | undefined
}

// =============================================================================
// Utilities
// =============================================================================

/**
 * Format timestamp to HH:MM format
 */
function formatTime(timestamp: string): string {
  try {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

// =============================================================================
// Component
// =============================================================================

/**
 * UserMessage - Displays a user message in the chat
 *
 * @example
 * ```tsx
 * <UserMessage
 *   message={userMessage}
 *   editable={true}
 *   onEdit={handleEdit}
 *   isLatest={true}
 * />
 * ```
 */
export function UserMessage({
  message,
  editable = false,
  onEdit,
  isLatest = false,
  className,
}: UserMessageProps) {
  // Local state for hover
  const [isHovered, setIsHovered] = React.useState(false)

  // Handle edit click
  const handleEditClick = React.useCallback(() => {
    if (onEdit) {
      onEdit(message)
    }
  }, [message, onEdit])

  // Handle keyboard interaction for edit
  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        handleEditClick()
      }
    },
    [handleEditClick]
  )

  const timestamp = formatTime(message.timestamp)
  const showEditButton = editable && (isHovered || isLatest)

  return (
    <div
      className={cn(
        // Alignment - user messages on the right
        'flex justify-end',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={cn(
          // Container
          'relative group max-w-[80%]',
          // Card styling - Craft Agents style
          'bg-foreground/5 rounded-[8px]',
          // Padding
          'px-4 py-3',
          // Text
          'text-[13px] text-foreground'
        )}
        role="article"
        aria-label={`Kullanıcı mesajı: ${message.content.slice(0, 50)}${message.content.length > 50 ? '...' : ''}`}
      >
        {/* Message Content */}
        <p className="whitespace-pre-wrap break-words leading-relaxed">
          {message.content}
        </p>

        {/* Footer: Actions + Timestamp */}
        <div className="flex items-center justify-end gap-2 mt-2">
          {/* Edit Button */}
          {editable && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleEditClick}
              onKeyDown={handleKeyDown}
              className={cn(
                // Size
                'h-6 w-6',
                // Styling
                'rounded-[4px]',
                // Visibility - hidden by default, shown on hover
                'opacity-0 transition-opacity duration-150',
                showEditButton && 'opacity-100',
                // Colors
                'text-muted-foreground hover:text-foreground',
                'hover:bg-foreground/5'
              )}
              title="Mesajı düzenle"
              aria-label="Mesajı düzenle"
              tabIndex={showEditButton ? 0 : -1}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          )}

          {/* Timestamp */}
          {timestamp && (
            <span
              className="text-[10px] text-muted-foreground whitespace-nowrap"
              title={new Date(message.timestamp).toLocaleString('tr-TR')}
            >
              {timestamp}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default UserMessage
