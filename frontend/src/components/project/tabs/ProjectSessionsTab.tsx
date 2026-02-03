/**
 * ProjectSessionsTab - Sessions tab içeriği
 * @module @task-filewas/frontend/components/project/tabs/ProjectSessionsTab
 *
 * 3 panel layout: Sidebar + Session Inbox + Chat Area
 *
 * Note: This tab displays a placeholder because the actual 3-panel layout
 * is managed by AppLayout. The Sessions view is available globally.
 */

import { cn } from '@/lib/utils'
import { MessageSquare } from 'lucide-react'

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
 * Note: Chat functionality is handled by AppLayout's ChatDisplay component.
 * This tab serves as an informational placeholder since the 3-panel layout
 * is managed globally in the main application.
 */
export function ProjectSessionsTab({ projectId, className }: ProjectSessionsTabProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center h-full bg-foreground/[0.02] rounded-[8px] border border-foreground/5',
        className
      )}
    >
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
        <div className="mt-4 pt-4 border-t border-foreground/10">
          <p className="text-[11px] text-foreground/30">
            Sol sidebarʼdaki Sessions ikonuna tıklayarak tüm sessionʼları görebilirsiniz.
          </p>
        </div>
      </div>
    </div>
  )
}

export default ProjectSessionsTab
