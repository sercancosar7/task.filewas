/**
 * TurnCard - Assistant turn card component (Craft Agents style)
 * @module @task-filewas/frontend/components/chat/TurnCard
 *
 * Layout Structure:
 * ┌─ TurnCard ──────────────────────────────────────────────────────────┐
 * │                                                                      │
 * │  ┌─ Activity Section (Collapsible) ───────────────────────────────┐ │
 * │  │ ▼ [Badge: 12 steps] Preview text...              (Header)      │ │
 * │  ├────────────────────────────────────────────────────────────────┤ │
 * │  │ │  ✓ Todo List Updated                           (Expanded)    │ │
 * │  │ │  📖 Read src/components/Checkout.tsx                         │ │
 * │  │ │  ✏️ Edit src/services/payment.ts                             │ │
 * │  │ │  ⬡ Bash npm install stripe                                   │ │
 * │  └────────────────────────────────────────────────────────────────┘ │
 * │                                                                      │
 * │  ┌─ Response Section (Always visible when complete) ──────────────┐ │
 * │  │ Markdown rendered response                                      │ │
 * │  │ Code blocks with syntax highlighting                            │ │
 * │  │ ┌────────────────────────────────────────────────────────────┐ │ │
 * │  │ │ Footer actions (Copy, Feedback)                            │ │ │
 * │  │ └────────────────────────────────────────────────────────────┘ │ │
 * │  └────────────────────────────────────────────────────────────────┘ │
 * │                                                                      │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * Features:
 * - Activity section with collapse animation
 * - Response card with markdown rendering
 * - Copy button for response
 * - Streaming state animation
 * - Timestamp display
 */

import * as React from 'react'
import { motion } from 'framer-motion'
import { Copy, Check, ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { UserMessage } from './UserMessage'
import { ActivitySection } from './ActivitySection'
import type { Turn, Message } from '@task-filewas/shared'

// =============================================================================
// Types
// =============================================================================

export interface TurnCardProps {
  /** Turn data */
  turn: Turn
  /** Whether user message is editable */
  editable?: boolean | undefined
  /** Callback when user message is edited */
  onMessageEdit?: ((message: Message) => void) | undefined
  /** Whether this is the last turn (most recent) */
  isLast?: boolean | undefined
  /** Callback when a file path is clicked */
  onFileClick?: ((filePath: string) => void) | undefined
  /** Callback when copy is clicked */
  onCopy?: ((content: string) => void) | undefined
  /** Callback when feedback is given */
  onFeedback?: ((turnId: string, type: 'positive' | 'negative') => void) | undefined
  /** Additional CSS classes */
  className?: string | undefined
}

// =============================================================================
// Constants
// =============================================================================

const SIZE_CONFIG = {
  typography: 'text-[13px]',
}

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * Response footer with actions
 */
interface ResponseFooterProps {
  content: string
  turnId: string
  timestamp?: string | undefined
  onCopy?: ((content: string) => void) | undefined
  onFeedback?: ((turnId: string, type: 'positive' | 'negative') => void) | undefined
}

function ResponseFooter({
  content,
  turnId,
  timestamp,
  onCopy,
  onFeedback,
}: ResponseFooterProps) {
  const [copied, setCopied] = React.useState(false)
  const [feedback, setFeedback] = React.useState<'positive' | 'negative' | null>(null)

  // Handle copy
  const handleCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      onCopy?.(content)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }, [content, onCopy])

  // Handle feedback
  const handleFeedback = React.useCallback(
    (type: 'positive' | 'negative') => {
      setFeedback(type)
      onFeedback?.(turnId, type)
    },
    [turnId, onFeedback]
  )

  // Format timestamp
  const formattedTime = React.useMemo(() => {
    if (!timestamp) return null
    try {
      return new Date(timestamp).toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return null
    }
  }, [timestamp])

  return (
    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-foreground/10">
      {/* Copy button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleCopy}
        className={cn(
          'h-6 w-6 rounded-[4px]',
          'text-muted-foreground hover:text-foreground',
          'hover:bg-foreground/5'
        )}
        title={copied ? 'Kopyalandi!' : 'Kopyala'}
        aria-label={copied ? 'Kopyalandi' : 'Kopyala'}
      >
        {copied ? (
          <Check className="h-3 w-3 text-success" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </Button>

      {/* Feedback buttons */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleFeedback('positive')}
          className={cn(
            'h-6 w-6 rounded-[4px]',
            'text-muted-foreground hover:text-foreground',
            'hover:bg-foreground/5',
            feedback === 'positive' && 'text-success bg-success/10'
          )}
          title="Faydali"
          aria-label="Faydali"
          aria-pressed={feedback === 'positive'}
        >
          <ThumbsUp className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleFeedback('negative')}
          className={cn(
            'h-6 w-6 rounded-[4px]',
            'text-muted-foreground hover:text-foreground',
            'hover:bg-foreground/5',
            feedback === 'negative' && 'text-destructive bg-destructive/10'
          )}
          title="Faydali degil"
          aria-label="Faydali degil"
          aria-pressed={feedback === 'negative'}
        >
          <ThumbsDown className="h-3 w-3" />
        </Button>
      </div>

      {/* Timestamp (right aligned) */}
      {formattedTime && (
        <span
          className="ml-auto text-[10px] text-muted-foreground"
          title={timestamp}
        >
          {formattedTime}
        </span>
      )}
    </div>
  )
}

/**
 * Response card - displays assistant's text response
 */
interface ResponseCardProps {
  message: Message
  turnId: string
  isStreaming?: boolean | undefined
  onCopy?: ((content: string) => void) | undefined
  onFeedback?: ((turnId: string, type: 'positive' | 'negative') => void) | undefined
}

function ResponseCard({
  message,
  turnId,
  isStreaming = false,
  onCopy,
  onFeedback,
}: ResponseCardProps) {
  const hasContent = message.content && message.content.trim().length > 0

  if (!hasContent && !isStreaming) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        // Card styling
        'bg-foreground/[0.02] rounded-[8px]',
        'px-4 py-3',
        'shadow-minimal'
      )}
    >
      {/* Response content */}
      <div
        className={cn(
          SIZE_CONFIG.typography,
          'prose prose-sm prose-invert max-w-none',
          'prose-headings:text-foreground',
          'prose-p:text-foreground/90',
          'prose-code:bg-foreground/10 prose-code:rounded prose-code:px-1',
          'prose-pre:bg-background prose-pre:border prose-pre:border-foreground/10',
          isStreaming && 'animate-pulse'
        )}
      >
        {hasContent ? (
          <p className="whitespace-pre-wrap break-words leading-relaxed m-0">
            {message.content}
          </p>
        ) : (
          <span className="text-muted-foreground italic flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            Yanit bekleniyor...
          </span>
        )}
      </div>

      {/* Footer with actions */}
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

/**
 * Processing indicator
 */
function ProcessingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-2 py-2 text-[13px] text-muted-foreground"
    >
      <Loader2 className="h-4 w-4 animate-spin text-accent" />
      <span>Claude calisiyor...</span>
    </motion.div>
  )
}

// =============================================================================
// Component
// =============================================================================

/**
 * TurnCard - Displays a complete turn (user message + assistant response)
 *
 * @example
 * ```tsx
 * <TurnCard
 *   turn={messageTurn}
 *   editable={true}
 *   onMessageEdit={handleEdit}
 *   onFileClick={handleFileClick}
 *   isLast={true}
 * />
 * ```
 */
export function TurnCard({
  turn,
  editable = false,
  onMessageEdit,
  isLast = false,
  onFileClick,
  onCopy,
  onFeedback,
  className,
}: TurnCardProps) {
  const isProcessing = turn.status === 'processing'
  const hasActivities = turn.activities.length > 0
  const hasResponse = !!turn.assistantMessage

  return (
    <div
      className={cn(
        // Container
        'space-y-3 py-4',
        // Border between turns
        'border-b border-foreground/5 last:border-0',
        className
      )}
      data-turn-id={turn.id}
      data-turn-status={turn.status}
    >
      {/* User message */}
      <UserMessage
        message={turn.userMessage}
        editable={editable}
        onEdit={onMessageEdit}
        isLatest={isLast}
      />

      {/* Activity section (if there are activities) */}
      {hasActivities && (
        <ActivitySection
          activities={turn.activities}
          defaultExpanded={isLast && isProcessing}
          onFileClick={onFileClick}
        />
      )}

      {/* Assistant response */}
      {hasResponse && (
        <ResponseCard
          message={turn.assistantMessage!}
          turnId={turn.id}
          isStreaming={isProcessing}
          onCopy={onCopy}
          onFeedback={onFeedback}
        />
      )}

      {/* Processing indicator (if processing but no response yet) */}
      {isProcessing && !hasResponse && !hasActivities && <ProcessingIndicator />}
    </div>
  )
}

export default TurnCard
