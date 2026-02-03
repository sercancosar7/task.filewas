/**
 * LeftSidebar - Left sidebar panel placeholder (Craft Agents style)
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

export interface LeftSidebarProps {
  width: number
  isCollapsed?: boolean
  className?: string
}

/**
 * LeftSidebar - Left navigation panel
 * - Dynamic width from store
 * - Collapsed state support (60px)
 * - Full height with flex column
 */
export function LeftSidebar({
  width,
  isCollapsed = false,
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
      {/* Scrollable Navigation Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <nav className="flex flex-col gap-0.5 p-2">
          {/* Placeholder content - will be implemented in Phase 27+ */}
          <div
            className={cn(
              'flex items-center justify-center h-full min-h-[200px]',
              'text-muted-foreground text-[13px]',
              isCollapsed && 'px-0',
              !isCollapsed && 'px-2'
            )}
          >
            {isCollapsed ? (
              <span className="text-xs">☰</span>
            ) : (
              <span>Sol Sidebar</span>
            )}
          </div>
        </nav>
      </div>

      {/* Fixed Bottom Section - Settings */}
      <div className="mt-auto border-t border-border p-2">
        <div
          className={cn(
            'nav-item',
            'text-muted-foreground',
            isCollapsed && 'justify-center'
          )}
        >
          {isCollapsed ? (
            <span className="text-xs">⚙️</span>
          ) : (
            <span className="text-[13px]">⚙️ Ayarlar</span>
          )}
        </div>
      </div>
    </aside>
  )
}

export default LeftSidebar
