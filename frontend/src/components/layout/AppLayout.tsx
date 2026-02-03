/**
 * AppLayout - Main 3-panel layout container (Craft Agents style)
 * @module @task-filewas/frontend/components/layout/AppLayout
 *
 * Layout Structure:
 * ┌──────────────┬─┬───────────────┬─┬────────────────────────┐
 * │   SIDEBAR    │R│    INBOX      │R│        MAIN            │
 * │ (180-320px)  │ │  (240-480px)  │ │       (flex-1)         │
 * └──────────────┴─┴───────────────┴─┴────────────────────────┘
 *                 ↑                 ↑
 *            ResizeHandle     ResizeHandle
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import { useAppStore, PANEL_CONSTRAINTS } from '@/stores'
import { useResizable } from '@/hooks'
import { LeftSidebar } from './LeftSidebar'
import { SessionInbox } from './SessionInbox'
import { MainContent } from './MainContent'
import { ResizeHandle } from './ResizeHandle'

export interface AppLayoutProps {
  children?: React.ReactNode
  className?: string
}

/**
 * AppLayout - 3-panel flex container with resizable panels
 * - Full viewport height (h-screen)
 * - Horizontal flex layout
 * - Panel spacing from CSS variables
 * - Sidebar: min 180px, default 220px, max 320px
 * - Inbox: min 240px, default 300px, max 480px
 */
export function AppLayout({ children, className }: AppLayoutProps) {
  const sidebarWidth = useAppStore((state) => state.sidebarWidth)
  const inboxWidth = useAppStore((state) => state.inboxWidth)
  const isSidebarCollapsed = useAppStore((state) => state.isSidebarCollapsed)
  const setSidebarWidth = useAppStore((state) => state.setSidebarWidth)
  const setInboxWidth = useAppStore((state) => state.setInboxWidth)

  // Sidebar resize hook (only when not collapsed)
  const sidebarResize = useResizable({
    initialSize: sidebarWidth,
    constraints: {
      min: PANEL_CONSTRAINTS.sidebar.min,
      max: PANEL_CONSTRAINTS.sidebar.max,
    },
    onSizeChange: setSidebarWidth,
  })

  // Inbox resize hook
  const inboxResize = useResizable({
    initialSize: inboxWidth,
    constraints: {
      min: PANEL_CONSTRAINTS.inbox.min,
      max: PANEL_CONSTRAINTS.inbox.max,
    },
    onSizeChange: setInboxWidth,
  })

  // Calculate actual sidebar width (collapsed = 60px, otherwise use resize value)
  const actualSidebarWidth = isSidebarCollapsed ? 60 : sidebarResize.size

  // Use inbox resize value
  const actualInboxWidth = inboxResize.size

  return (
    <div
      className={cn(
        // Full viewport container
        'flex h-screen w-screen overflow-hidden',
        // Background color from theme
        'bg-background',
        // Panel edge spacing
        'p-[var(--panel-window-edge-spacing)]',
        className
      )}
      style={{
        gap: `${PANEL_CONSTRAINTS.panelSpacing}px`,
      }}
    >
      {/* Left Sidebar Panel */}
      <LeftSidebar
        width={actualSidebarWidth}
        isCollapsed={isSidebarCollapsed}
      />

      {/* Sidebar Resize Handle (hidden when collapsed) */}
      {!isSidebarCollapsed && (
        <ResizeHandle
          direction="horizontal"
          isResizing={sidebarResize.isResizing}
          onMouseDown={sidebarResize.startResize}
          aria-label="Sidebar genisligini ayarla"
        />
      )}

      {/* Session Inbox Panel (Middle) */}
      <SessionInbox width={actualInboxWidth} />

      {/* Inbox Resize Handle */}
      <ResizeHandle
        direction="horizontal"
        isResizing={inboxResize.isResizing}
        onMouseDown={inboxResize.startResize}
        aria-label="Inbox genisligini ayarla"
      />

      {/* Main Content Panel (Right - flex-1) */}
      <MainContent>{children}</MainContent>
    </div>
  )
}

export default AppLayout
