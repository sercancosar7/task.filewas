/**
 * MessageList - Container for message turns
 * @module @task-filewas/frontend/components/chat/MessageList
 *
 * Features:
 * - Maps Turn[] to visual components
 * - Loading state (skeleton)
 * - Empty state
 * - Error state
 * - Processing indicator for active turns
 * - TurnCard with collapsible activities
 */

import { MessageSquare, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TurnCard } from './TurnCard'
import type { Turn, Message } from '@task-filewas/shared'

// =============================================================================
// Types
// =============================================================================

export interface MessageListProps {
  /** Turns to display */
  turns: Turn[]
  /** Loading state */
  isLoading?: boolean
  /** Processing state (agent is running) */
  isProcessing?: boolean
  /** Error message */
  error?: string | null
  /** Empty state message */
  emptyMessage?: string
  /** Whether messages are editable */
  editable?: boolean
  /** Callback when a message is edited */
  onMessageEdit?: (message: Message) => void
  /** Callback when a file path is clicked */
  onFileClick?: (filePath: string) => void
  /** Callback when response content is copied */
  onCopy?: (content: string) => void
  /** Callback when feedback is given */
  onFeedback?: (turnId: string, type: 'positive' | 'negative') => void
  /** Additional CSS classes */
  className?: string
}

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * Loading skeleton for messages
 */
function MessageSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* User message skeleton */}
      <div className="flex justify-end">
        <div className="max-w-[80%] space-y-2">
          <div className="h-4 w-32 bg-foreground/5 rounded ml-auto" />
          <div className="h-16 w-64 bg-foreground/5 rounded-[8px]" />
        </div>
      </div>

      {/* Assistant message skeleton */}
      <div className="space-y-2">
        <div className="h-4 w-24 bg-foreground/5 rounded" />
        <div className="h-24 w-full bg-foreground/5 rounded-[8px]" />
        <div className="h-16 w-3/4 bg-foreground/5 rounded-[8px]" />
      </div>

      {/* Another user message */}
      <div className="flex justify-end">
        <div className="h-12 w-48 bg-foreground/5 rounded-[8px]" />
      </div>
    </div>
  )
}

/**
 * Empty state display
 */
function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center px-4">
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-foreground/5 mb-4">
        <MessageSquare className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="text-[13px] text-muted-foreground max-w-[280px]">
        {message}
      </p>
    </div>
  )
}

/**
 * Error state display
 */
function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center px-4">
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10 mb-4">
        <AlertCircle className="h-6 w-6 text-destructive" />
      </div>
      <p className="text-[13px] text-destructive max-w-[280px]">
        {message}
      </p>
    </div>
  )
}

/**
 * Processing indicator at the bottom of the list
 */
function ProcessingIndicator() {
  return (
    <div className="flex items-center gap-2 py-4 text-[13px] text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin text-accent" />
      <span>Claude calisiyor...</span>
    </div>
  )
}

// =============================================================================
// Component
// =============================================================================

/**
 * MessageList - Container for mapping and displaying message turns
 *
 * @example
 * ```tsx
 * <MessageList
 *   turns={messageTurns}
 *   isLoading={isLoadingSession}
 *   isProcessing={isAgentRunning}
 *   error={sessionError}
 *   emptyMessage="Sohbete baslamak icin bir mesaj gonderin."
 *   onFileClick={handleFileClick}
 * />
 * ```
 */
export function MessageList({
  turns,
  isLoading = false,
  isProcessing = false,
  error = null,
  emptyMessage = 'Henuz mesaj yok.',
  editable = false,
  onMessageEdit,
  onFileClick,
  onCopy,
  onFeedback,
  className,
}: MessageListProps) {
  // Error state
  if (error) {
    return (
      <div className={className}>
        <ErrorState message={error} />
      </div>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={className}>
        <MessageSkeleton />
      </div>
    )
  }

  // Empty state
  if (turns.length === 0) {
    return (
      <div className={className}>
        <EmptyState message={emptyMessage} />
      </div>
    )
  }

  // Message list
  return (
    <div
      className={cn(
        'space-y-1',
        className
      )}
      role="log"
      aria-label="Mesaj listesi"
      aria-live="polite"
    >
      {turns.map((turn, index) => (
        <TurnCard
          key={turn.id}
          turn={turn}
          editable={editable}
          onMessageEdit={onMessageEdit}
          onFileClick={onFileClick}
          onCopy={onCopy}
          onFeedback={onFeedback}
          isLast={index === turns.length - 1}
        />
      ))}

      {/* Processing indicator at the end */}
      {isProcessing && (
        <ProcessingIndicator />
      )}
    </div>
  )
}

export default MessageList
