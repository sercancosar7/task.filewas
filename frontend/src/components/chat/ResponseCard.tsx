/**
 * ResponseCard - Assistant response card component (Craft Agents style)
 * @module @task-filewas/frontend/components/chat/ResponseCard
 *
 * Layout:
 * ┌────────────────────────────────────────────────────────────────┐
 * │ Markdown rendered response content...                          │
 * │                                                                 │
 * │ ```typescript                                                   │
 * │ const example = "code block with syntax highlight"             │
 * │ ```                                                             │
 * │                                                                 │
 * │ ─────────────────────────────────────────────────────────────   │
 * │ [Copy] [👍] [👎]                                      14:32    │
 * └────────────────────────────────────────────────────────────────┘
 *
 * Features:
 * - Markdown content rendering (via MarkdownRenderer)
 * - Copy button with success feedback
 * - Thumbs up/down feedback buttons
 * - Timestamp display
 * - Streaming state animation
 * - Accessibility support
 */

import * as React from 'react'
import { motion } from 'framer-motion'
import { Copy, Check, ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { MarkdownRenderer } from './MarkdownRenderer'
import type { Message } from '@task-filewas/shared'

// =============================================================================
// Types
// =============================================================================

/**
 * Feedback type for response
 */
export type FeedbackType = 'positive' | 'negative'

/**
 * ResponseCard props
 */
export interface ResponseCardProps {
  /** Message data containing response content */
  message: Message
  /** Unique turn ID for feedback tracking */
  turnId: string
  /** Whether response is currently streaming */
  isStreaming?: boolean | undefined
  /** Callback when copy button is clicked */
  onCopy?: ((content: string) => void) | undefined
  /** Callback when feedback is given */
  onFeedback?: ((turnId: string, type: FeedbackType) => void) | undefined
  /** Additional CSS classes */
  className?: string | undefined
}

/**
 * ResponseFooter props
 */
export interface ResponseFooterProps {
  /** Content to copy */
  content: string
  /** Turn ID for feedback */
  turnId: string
  /** Optional timestamp to display */
  timestamp?: string | undefined
  /** Callback when copy button is clicked */
  onCopy?: ((content: string) => void) | undefined
  /** Callback when feedback is given */
  onFeedback?: ((turnId: string, type: FeedbackType) => void) | undefined
}

// =============================================================================
// Constants
// =============================================================================

const SIZE_CONFIG = {
  typography: 'text-[13px]',
  iconSize: 'h-3 w-3',
  buttonSize: 'h-6 w-6',
}

// Copy success display duration (ms)
const COPY_FEEDBACK_DURATION = 2000

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * ResponseFooter - Footer with copy button, feedback, and timestamp
 */
export function ResponseFooter({
  content,
  turnId,
  timestamp,
  onCopy,
  onFeedback,
}: ResponseFooterProps) {
  // State
  const [copied, setCopied] = React.useState(false)
  const [feedback, setFeedback] = React.useState<FeedbackType | null>(null)

  // Handle copy to clipboard
  const handleCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      onCopy?.(content)

      // Reset copied state after delay
      setTimeout(() => setCopied(false), COPY_FEEDBACK_DURATION)
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
    }
  }, [content, onCopy])

  // Handle feedback click
  const handleFeedback = React.useCallback(
    (type: FeedbackType) => {
      // Toggle feedback if clicking same type
      const newFeedback = feedback === type ? null : type
      setFeedback(newFeedback)

      // Only notify parent if giving feedback (not removing)
      if (newFeedback) {
        onFeedback?.(turnId, newFeedback)
      }
    },
    [turnId, feedback, onFeedback]
  )

  // Format timestamp for display
  const formattedTime = React.useMemo(() => {
    if (!timestamp) return null
    try {
      const date = new Date(timestamp)
      return date.toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return null
    }
  }, [timestamp])

  return (
    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-foreground/10">
      {/* Copy Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleCopy}
        className={cn(
          SIZE_CONFIG.buttonSize,
          'rounded-[4px]',
          'text-muted-foreground hover:text-foreground',
          'hover:bg-foreground/5',
          'transition-colors duration-150'
        )}
        title={copied ? 'Kopyalandi!' : 'Yaniti kopyala'}
        aria-label={copied ? 'Kopyalandi' : 'Yaniti kopyala'}
      >
        {copied ? (
          <Check className={cn(SIZE_CONFIG.iconSize, 'text-success')} />
        ) : (
          <Copy className={SIZE_CONFIG.iconSize} />
        )}
      </Button>

      {/* Feedback Buttons */}
      <div className="flex items-center gap-1">
        {/* Thumbs Up */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleFeedback('positive')}
          className={cn(
            SIZE_CONFIG.buttonSize,
            'rounded-[4px]',
            'text-muted-foreground hover:text-foreground',
            'hover:bg-foreground/5',
            'transition-all duration-150',
            feedback === 'positive' && 'text-success bg-success/10 hover:bg-success/15'
          )}
          title="Faydali"
          aria-label="Faydali"
          aria-pressed={feedback === 'positive'}
        >
          <ThumbsUp className={SIZE_CONFIG.iconSize} />
        </Button>

        {/* Thumbs Down */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleFeedback('negative')}
          className={cn(
            SIZE_CONFIG.buttonSize,
            'rounded-[4px]',
            'text-muted-foreground hover:text-foreground',
            'hover:bg-foreground/5',
            'transition-all duration-150',
            feedback === 'negative' &&
              'text-destructive bg-destructive/10 hover:bg-destructive/15'
          )}
          title="Faydali degil"
          aria-label="Faydali degil"
          aria-pressed={feedback === 'negative'}
        >
          <ThumbsDown className={SIZE_CONFIG.iconSize} />
        </Button>
      </div>

      {/* Timestamp (right aligned) */}
      {formattedTime && (
        <span
          className="ml-auto text-[10px] text-muted-foreground whitespace-nowrap"
          title={timestamp ? new Date(timestamp).toLocaleString('tr-TR') : undefined}
        >
          {formattedTime}
        </span>
      )}
    </div>
  )
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * ResponseCard - Displays assistant response with markdown and actions
 *
 * @example
 * ```tsx
 * <ResponseCard
 *   message={assistantMessage}
 *   turnId="turn-123"
 *   isStreaming={false}
 *   onCopy={(content) => console.log('Copied:', content)}
 *   onFeedback={(turnId, type) => console.log('Feedback:', turnId, type)}
 * />
 * ```
 */
export function ResponseCard({
  message,
  turnId,
  isStreaming = false,
  onCopy,
  onFeedback,
  className,
}: ResponseCardProps) {
  // Check if there is content to display
  const hasContent = message.content && message.content.trim().length > 0

  // Don't render if no content and not streaming
  if (!hasContent && !isStreaming) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={cn(
        // Card styling - Craft Agents style
        'bg-foreground/[0.02] rounded-[8px]',
        'px-4 py-3',
        'shadow-minimal',
        className
      )}
      role="article"
      aria-label="Asistan yaniti"
    >
      {/* Response Content */}
      <div
        className={cn(
          SIZE_CONFIG.typography,
          // Streaming animation
          isStreaming && 'animate-pulse'
        )}
      >
        {hasContent ? (
          <MarkdownRenderer content={message.content} />
        ) : (
          // Loading placeholder when streaming but no content yet
          <span className="text-muted-foreground italic flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            Yanit bekleniyor...
          </span>
        )}
      </div>

      {/* Footer with actions - only show when content is complete */}
      {hasContent && !isStreaming && (
        <ResponseFooter
          content={message.content}
          turnId={turnId}
          timestamp={message.timestamp}
          onCopy={onCopy}
          onFeedback={onFeedback}
        />
      )}
    </motion.div>
  )
}

export default ResponseCard
