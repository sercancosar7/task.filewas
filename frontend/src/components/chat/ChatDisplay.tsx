/**
 * ChatDisplay - Main chat container component (Craft Agents style)
 * @module @task-filewas/frontend/components/chat/ChatDisplay
 *
 * Layout Structure:
 * ┌────────────────────────────────────────────────────────────────────┐
 * │ ChatHeader (Session title, dropdown menu)                         │
 * ├────────────────────────────────────────────────────────────────────┤
 * │                                                                    │
 * │                      MESSAGE LIST                                  │
 * │                      (scrollable)                                  │
 * │                                                                    │
 * │  ┌─────────────────────────────────────────────────────────────┐  │
 * │  │ [Turn Cards - User/Assistant messages]                       │  │
 * │  └─────────────────────────────────────────────────────────────┘  │
 * │                                                                    │
 * │                                              ▼ Scroll to bottom    │
 * ├────────────────────────────────────────────────────────────────────┤
 * │                         INPUT AREA (future)                        │
 * └────────────────────────────────────────────────────────────────────┘
 *
 * Features:
 * - Auto-scroll to bottom on new messages
 * - Manual scroll detection (disables auto-scroll when scrolled up)
 * - Scroll to bottom button
 * - Loading states
 * - Empty state
 */

import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { ChatHeader } from './ChatHeader'
import { MessageList } from './MessageList'
import type { Session, Turn } from '@task-filewas/shared'

// =============================================================================
// Types
// =============================================================================

export interface ChatDisplayProps {
  /** Current session (null if no session selected) */
  session: Session | null
  /** Message turns to display */
  turns: Turn[]
  /** Whether the session is currently processing */
  isProcessing?: boolean
  /** Loading state (fetching session/messages) */
  isLoading?: boolean
  /** Error message */
  error?: string | null
  /** Callback when session title is edited */
  onTitleEdit?: (title: string) => void
  /** Callback for session menu actions */
  onMenuAction?: (action: string) => void
  /** Additional CSS classes */
  className?: string
  /** Children (for input area) */
  children?: React.ReactNode
}

// =============================================================================
// Constants
// =============================================================================

const SCROLL_THRESHOLD = 100 // px from bottom to consider "at bottom"

// =============================================================================
// Component
// =============================================================================

/**
 * ChatDisplay - Main chat area container
 *
 * @example
 * ```tsx
 * <ChatDisplay
 *   session={currentSession}
 *   turns={messageTurns}
 *   isProcessing={isAgentRunning}
 *   onTitleEdit={handleTitleEdit}
 *   onMenuAction={handleMenuAction}
 * >
 *   <ChatInput onSend={handleSend} />
 * </ChatDisplay>
 * ```
 */
export function ChatDisplay({
  session,
  turns,
  isProcessing = false,
  isLoading = false,
  error = null,
  onTitleEdit,
  onMenuAction,
  className,
  children,
}: ChatDisplayProps) {
  // Refs for scroll management
  const scrollContainerRef = React.useRef<HTMLDivElement>(null)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  // State for scroll management
  const [isAtBottom, setIsAtBottom] = React.useState(true)
  const [showScrollButton, setShowScrollButton] = React.useState(false)

  // Auto-scroll logic
  const scrollToBottom = React.useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior })
  }, [])

  // Check if scrolled to bottom
  const checkScrollPosition = React.useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const { scrollTop, scrollHeight, clientHeight } = container
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight
    const atBottom = distanceFromBottom < SCROLL_THRESHOLD

    setIsAtBottom(atBottom)
    setShowScrollButton(!atBottom && turns.length > 0)
  }, [turns.length])

  // Auto-scroll on new messages (only if at bottom)
  React.useEffect(() => {
    if (isAtBottom && turns.length > 0) {
      scrollToBottom('smooth')
    }
  }, [turns, isAtBottom, scrollToBottom])

  // Scroll to bottom on initial load
  React.useEffect(() => {
    if (!isLoading && turns.length > 0) {
      // Use instant scroll on initial load
      scrollToBottom('instant')
    }
  }, [isLoading, scrollToBottom]) // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll event handler
  const handleScroll = React.useCallback(() => {
    checkScrollPosition()
  }, [checkScrollPosition])

  // Handle scroll button click
  const handleScrollToBottom = React.useCallback(() => {
    scrollToBottom('smooth')
    setIsAtBottom(true)
    setShowScrollButton(false)
  }, [scrollToBottom])

  return (
    <div
      className={cn(
        // Container layout
        'flex flex-col h-full',
        // Background
        'bg-background',
        className
      )}
    >
      {/* Header */}
      <ChatHeader
        session={session}
        isProcessing={isProcessing}
        onTitleEdit={onTitleEdit}
        onMenuAction={onMenuAction}
      />

      {/* Message Area */}
      <div className="flex-1 relative overflow-hidden">
        <ScrollArea className="h-full">
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="h-full overflow-y-auto"
          >
            <div className="flex flex-col min-h-full">
              {/* Messages */}
              <div className="flex-1 px-4 py-4">
                <MessageList
                  turns={turns}
                  isLoading={isLoading}
                  isProcessing={isProcessing}
                  error={error}
                  emptyMessage={
                    session
                      ? 'Henuz mesaj yok. Bir mesaj gondererek baslayin.'
                      : 'Bir session secin veya yeni bir session olusturun.'
                  }
                />
              </div>

              {/* Scroll anchor */}
              <div ref={messagesEndRef} aria-hidden="true" />
            </div>
          </div>
        </ScrollArea>

        {/* Scroll to bottom button */}
        {showScrollButton && (
          <Button
            variant="outline"
            size="icon"
            onClick={handleScrollToBottom}
            className={cn(
              // Position
              'absolute bottom-4 right-4',
              // Styling
              'h-8 w-8 rounded-full',
              'bg-background/80 backdrop-blur-sm',
              'border border-foreground/10',
              'shadow-md',
              // Hover
              'hover:bg-foreground/5',
              // Animation
              'animate-in fade-in slide-in-from-bottom-2 duration-200'
            )}
            title="En alta git"
            aria-label="En alta git"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Input Area (children slot) */}
      {children && (
        <div className="shrink-0 border-t border-border">
          {children}
        </div>
      )}
    </div>
  )
}

export default ChatDisplay
