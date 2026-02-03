/**
 * ProjectSessionsTab - Sessions tab içeriği
 * @module @task-filewas/frontend/components/project/tabs/ProjectSessionsTab
 *
 * 3 panel layout: Sidebar + Session Inbox + Chat Area
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import { ChatDisplay } from '@/components/chat/ChatDisplay'
import { ChatInput } from '@/components/chat/ChatInput'
import { MessageSquare } from 'lucide-react'
import type { Session, Turn } from '@task-filewas/shared'

// =============================================================================
// Types
// =============================================================================

export interface ProjectSessionsTabProps {
  projectId: string
  className?: string
}

// =============================================================================
// Component
// =============================================================================

/**
 * ProjectSessionsTab - 3 panel session inbox ile chat arayüzü
 *
 * - Sol: Sidebar (mevcut LeftSidebar ile AppLayout'te gösterilir)
 * - Orta: Session Inbox (mevcut SessionInbox ile AppLayout'te gösterilir)
 * - Sağ: Chat Display + Input Area
 */
export function ProjectSessionsTab({ projectId, className }: ProjectSessionsTabProps) {
  // State
  const [session, setSession] = React.useState<Session | null>(null)
  const [turns, setTurns] = React.useState<Turn[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [isProcessing, setIsProcessing] = React.useState(false)

  // Placeholder handlers
  const handleSend = React.useCallback((message: string) => {
    console.log('Send message:', message)
    // TODO: Implement message sending
  }, [])

  const handleTitleEdit = React.useCallback((title: string) => {
    console.log('Edit title:', title)
    // TODO: Implement title editing
  }, [])

  const handleMenuAction = React.useCallback((action: string) => {
    console.log('Menu action:', action)
    // TODO: Implement menu actions
  }, [])

  return (
    <div
      className={cn(
        'flex items-center justify-center h-full bg-foreground/[0.02] rounded-[8px] border border-foreground/5',
        className
      )}
    >
      {/* Placeholder - 3 panel layout already handled by AppLayout */}
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-4">
          <div className="p-3 rounded-full bg-accent/10">
            <MessageSquare className="h-8 w-8 text-accent" />
          </div>
        </div>
        <h3 className="text-[15px] font-semibold mb-2">3 Panel Session Inbox</h3>
        <p className="text-[13px] text-foreground/60 mb-4">
          Bu tab için Sessions görünümü AppLayout tarafından sağlanmaktadır.
          Sol sidebar, session listesi ve chat alanı ana layout'te yer alır.
        </p>
        <div className="text-[11px] text-foreground/40 space-y-1">
          <p>📋 Sol Panel: Sidebar (navigasyon)</p>
          <p>💬 Orta Panel: Session Listesi</p>
          <p>📝 Sağ Panel: Chat Display + Input</p>
        </div>
      </div>
    </div>
  )
}

export default ProjectSessionsTab
