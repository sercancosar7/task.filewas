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

import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { UserMessage } from './UserMessage'
import { ActivitySection } from './ActivitySection'
import { ResponseCard } from './ResponseCard'
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
// Sub-Components
// =============================================================================

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
