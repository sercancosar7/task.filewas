/**
 * ChatInput - Chat message input component (Craft Agents style)
 * @module @task-filewas/frontend/components/chat/ChatInput
 *
 * Layout:
 * ┌────────────────────────────────────────────────────────────────────┐
 * │ ┌──────────────────────────────────────────────────────────────┐   │
 * │ │ Mesajinizi yazin...                                    ✈️    │   │
 * │ │                                                               │   │
 * │ └──────────────────────────────────────────────────────────────┘   │
 * └────────────────────────────────────────────────────────────────────┘
 *
 * Features:
 * - Auto-resize textarea (min 44px, max 200px)
 * - Send button with accent color (disabled when empty)
 * - Cmd/Ctrl + Enter keyboard shortcut
 * - Focus ring styling
 * - Accessibility support
 */

import * as React from 'react'
import { Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

// =============================================================================
// Types
// =============================================================================

export interface ChatInputProps {
  /** Callback when message is sent */
  onSend: (message: string) => void
  /** Placeholder text */
  placeholder?: string
  /** Whether input is disabled */
  disabled?: boolean
  /** Whether a message is currently being processed */
  isProcessing?: boolean
  /** Maximum character limit */
  maxLength?: number
  /** Additional CSS classes for container */
  className?: string
}

// =============================================================================
// Constants
// =============================================================================

const MIN_HEIGHT = 44 // px
const MAX_HEIGHT = 200 // px
const DEFAULT_PLACEHOLDER = 'Mesajinizi yazin...'

// =============================================================================
// Component
// =============================================================================

/**
 * ChatInput - Message input area with auto-resize and keyboard shortcuts
 *
 * @example
 * ```tsx
 * <ChatInput
 *   onSend={(message) => handleSendMessage(message)}
 *   placeholder="Soru sorun..."
 *   disabled={isLoading}
 * />
 * ```
 */
export function ChatInput({
  onSend,
  placeholder = DEFAULT_PLACEHOLDER,
  disabled = false,
  isProcessing = false,
  maxLength = 10000,
  className,
}: ChatInputProps) {
  // State
  const [value, setValue] = React.useState('')

  // Refs
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  // Derived state
  const trimmedValue = value.trim()
  const isEmpty = trimmedValue.length === 0
  const isDisabled = disabled || isProcessing
  const canSend = !isEmpty && !isDisabled

  // ==========================================================================
  // Auto-resize logic
  // ==========================================================================

  const adjustHeight = React.useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto'

    // Calculate new height (clamped between min and max)
    const newHeight = Math.min(
      Math.max(textarea.scrollHeight, MIN_HEIGHT),
      MAX_HEIGHT
    )

    textarea.style.height = `${newHeight}px`
  }, [])

  // Adjust height when value changes
  React.useEffect(() => {
    adjustHeight()
  }, [value, adjustHeight])

  // ==========================================================================
  // Handlers
  // ==========================================================================

  /**
   * Handle sending the message
   */
  const handleSend = React.useCallback(() => {
    if (!canSend) return

    // Send the message
    onSend(trimmedValue)

    // Clear input
    setValue('')

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = `${MIN_HEIGHT}px`
    }

    // Refocus textarea
    textareaRef.current?.focus()
  }, [canSend, trimmedValue, onSend])

  /**
   * Handle textarea value change
   */
  const handleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value

      // Respect max length
      if (maxLength && newValue.length > maxLength) {
        return
      }

      setValue(newValue)
    },
    [maxLength]
  )

  /**
   * Handle keyboard events
   */
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Cmd/Ctrl + Enter to send
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        handleSend()
        return
      }

      // Plain Enter without modifiers adds new line (default behavior)
      // Shift + Enter also adds new line (default behavior)
    },
    [handleSend]
  )

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <div
      className={cn(
        // Container padding
        'p-3',
        className
      )}
    >
      <div
        className={cn(
          // Layout
          'relative flex items-end gap-2',
          // Container styling
          'rounded-[12px]',
          'bg-foreground/[0.03]',
          'border border-foreground/10',
          // Focus state (applied via focus-within)
          'focus-within:border-accent/50',
          'focus-within:ring-1 focus-within:ring-accent/20',
          // Transition
          'transition-all duration-150'
        )}
      >
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isDisabled}
          maxLength={maxLength}
          rows={1}
          className={cn(
            // Sizing
            'flex-1',
            'min-h-[44px]',
            'max-h-[200px]',
            'py-3 pl-4 pr-12',
            // Reset
            'resize-none',
            'bg-transparent',
            'border-0',
            // Typography
            'text-[15px] leading-relaxed',
            'placeholder:text-muted-foreground',
            // Focus
            'focus:outline-none',
            'focus:ring-0',
            // Disabled
            'disabled:opacity-50',
            'disabled:cursor-not-allowed',
            // Scrollbar
            'scrollbar-thin',
            'scrollbar-thumb-foreground/10',
            'scrollbar-track-transparent'
          )}
          aria-label="Mesaj girisi"
        />

        {/* Send Button */}
        <Button
          type="button"
          variant="accent"
          size="icon"
          onClick={handleSend}
          disabled={!canSend}
          className={cn(
            // Position
            'absolute right-2 bottom-2',
            // Size
            'h-8 w-8',
            // Rounded
            'rounded-[8px]',
            // Disabled styling
            'disabled:opacity-40',
            'disabled:cursor-not-allowed',
            // Transition
            'transition-all duration-150'
          )}
          title={canSend ? 'Gonder (⌘+Enter)' : 'Mesaj yazin'}
          aria-label={canSend ? 'Mesaji gonder' : 'Mesaj yazin'}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {/* Character count (optional - shown near limit) */}
      {maxLength && value.length > maxLength * 0.8 && (
        <div
          className={cn(
            'text-[10px] text-right mt-1 pr-2',
            value.length >= maxLength
              ? 'text-destructive'
              : 'text-muted-foreground'
          )}
        >
          {value.length}/{maxLength}
        </div>
      )}
    </div>
  )
}

export default ChatInput
