/**
 * LeftSidebar - Left sidebar panel (Craft Agents style)
 * @module @task-filewas/frontend/components/layout/LeftSidebar
 *
 * Layout Structure:
 * ┌────────────────────────┐
 * │ 📝 New Chat            │  ← Primary action button
 * ├────────────────────────┤
 * │ All Chats         (12) │  ← Main category
 * │   ○ Backlog        (3) │  ← Status filters
 * │   ○ Todo           (5) │
 * │   ◉ In Progress    (1) │
 * │   ◎ Needs Review   (2) │
 * │   ● Done          (47) │
 * │   ⊘ Cancelled      (1) │
 * │                        │
 * │ 🚩 Flagged         (2) │  ← Special filter
 * ├────────────────────────┤
 * │ ▶ Sources              │  ← Collapsible
 * │ ▶ Skills               │
 * └────────────────────────┘
 * │ ⚙️ Settings            │  ← Fixed at bottom
 * └────────────────────────┘
 */

import { cn } from '@/lib/utils'
import { SidebarContent, type SessionCounts } from '@/components/sidebar'

export interface LeftSidebarProps {
  /** Width of the sidebar in pixels */
  width: number
  /** Whether sidebar is collapsed (60px mode) */
  isCollapsed?: boolean
  /** Session counts for each status */
  sessionCounts?: SessionCounts
  /** Currently active filter */
  activeFilter?: string
  /** Callback when New Chat is clicked */
  onNewChat?: () => void
  /** Callback when a filter is selected */
  onFilterSelect?: (filter: string) => void
  /** Callback when Settings is clicked */
  onSettingsClick?: () => void
  /** Additional CSS classes */
  className?: string
}

/**
 * LeftSidebar - Left navigation panel
 * - Dynamic width from store
 * - Collapsed state support (60px)
 * - Full height with flex column
 * - SidebarContent with nav items
 */
export function LeftSidebar({
  width,
  isCollapsed = false,
  sessionCounts,
  activeFilter,
  onNewChat,
  onFilterSelect,
  onSettingsClick,
  className,
}: LeftSidebarProps) {
  return (
    <aside
      className={cn(
        // Panel base style
        'panel flex flex-col shrink-0',
        // Transition for smooth resize
        'transition-[width] duration-200 ease-out',
        // Overflow handling
        'overflow-hidden',
        className
      )}
      style={{
        width: `${width}px`,
        minWidth: `${width}px`,
      }}
      aria-label="Sol menü"
    >
      <SidebarContent
        {...(sessionCounts !== undefined && { counts: sessionCounts })}
        {...(activeFilter !== undefined && { activeFilter })}
        isCollapsed={isCollapsed}
        {...(onNewChat !== undefined && { onNewChat })}
        {...(onFilterSelect !== undefined && { onFilterSelect })}
        {...(onSettingsClick !== undefined && { onSettingsClick })}
      />
    </aside>
  )
}

export default LeftSidebar
export type { SessionCounts }
