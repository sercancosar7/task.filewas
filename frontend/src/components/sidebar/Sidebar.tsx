/**
 * Sidebar - Left sidebar navigation container (Craft Agents style)
 * @module @task-filewas/frontend/components/sidebar/Sidebar
 *
 * Layout Structure:
 * ┌────────────────────────┐
 * │ pt-[50px] title bar    │  ← macOS title bar offset
 * ├────────────────────────┤
 * │ 📝 New Chat            │  ← Primary action button
 * ├────────────────────────┤
 * │ All Chats         (12) │  ← Main category (NavItem)
 * │   ○ Backlog        (3) │  ← Status filters (nested NavItem)
 * │   ○ Todo           (5) │
 * │   ◉ In Progress    (1) │
 * │   ◎ Needs Review   (2) │
 * │   ● Done          (47) │
 * │   ⊘ Cancelled      (1) │
 * │                        │
 * │ 🚩 Flagged         (2) │  ← Special filter
 * ├────────────────────────┤
 * │ ▶ Sources              │  ← Collapsible (NavSection)
 * │ ▶ Skills               │
 * └────────────────────────┘
 * │ ⚙️ Settings            │  ← Fixed at bottom (mt-auto)
 * └────────────────────────┘
 */

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface SidebarProps {
  /** Width of the sidebar in pixels */
  width: number
  /** Whether sidebar is collapsed (60px mode) */
  isCollapsed?: boolean
  /** Additional CSS classes */
  className?: string
  /** Child components (navigation items) */
  children?: React.ReactNode
}

/**
 * Sidebar - Main sidebar container component
 *
 * Features:
 * - Flexible width (controlled by parent)
 * - Collapsed state support (60px)
 * - pt-[50px] for macOS title bar offset
 * - flex-col layout with scrollable nav area
 * - Fixed bottom section for settings
 * - Smooth width transition
 */
export function Sidebar({
  width,
  isCollapsed = false,
  className,
  children,
}: SidebarProps) {
  return (
    <aside
      className={cn(
        // Base layout
        'flex flex-col shrink-0',
        // Title bar offset (macOS style)
        'pt-[50px]',
        // Width transition for smooth resize
        'transition-[width] duration-200 ease-out',
        // Overflow handling
        'overflow-hidden',
        className
      )}
      style={{
        width: `${width}px`,
        minWidth: `${width}px`,
      }}
      aria-label="Sol navigasyon menüsü"
      role="navigation"
    >
      {/* Scrollable Navigation Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <nav
          className={cn(
            'flex flex-col',
            // Craft Agents: gap-0.5 between items
            'gap-0.5',
            // Padding
            isCollapsed ? 'p-1' : 'p-2'
          )}
          role="menu"
        >
          {children}
        </nav>
      </div>
    </aside>
  )
}

export default Sidebar
