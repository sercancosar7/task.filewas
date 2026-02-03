/**
 * SessionInbox - Middle panel for session list (Craft Agents style)
 * @module @task-filewas/frontend/components/layout/SessionInbox
 *
 * Layout Structure:
 * ┌──────────────────────────────────┐
 * │ All Chats                    ≡   │  ← PanelHeader + filter
 * ├──────────────────────────────────┤
 * │ ┌──────────────────────────────┐ │
 * │ │ 🔍 Search sessions...        │ │  ← Search input
 * │ └──────────────────────────────┘ │
 * ├──────────────────────────────────┤
 * │ TODAY                            │  ← Date group header
 * │ ┌──────────────────────────────┐ │
 * │ │ ◉ Session title              │ │  ← SessionItem
 * │ │   ⏳ Processing · 4m ago     │ │
 * │ │   [🔓Auto] [Planning] [glm]  │ │  ← Badges
 * │ └──────────────────────────────┘ │
 * └──────────────────────────────────┘
 */

import { cn } from '@/lib/utils'

export interface SessionInboxProps {
  width: number
  className?: string
}

/**
 * SessionInbox - Session list panel (Navigator)
 * - Dynamic width from store
 * - Scrollable session list
 * - Search and filter header
 */
export function SessionInbox({ width, className }: SessionInboxProps) {
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
      aria-label="Session listesi"
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-[13px] font-medium text-foreground">All Chats</h2>
        <button
          type="button"
          className="p-1 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Filtrele"
        >
          <span className="text-xs">≡</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="border-b border-border px-3 py-2">
        <div className="flex items-center gap-2 rounded-md bg-foreground/5 px-3 py-1.5">
          <span className="text-muted-foreground text-xs">🔍</span>
          <input
            type="text"
            placeholder="Session ara..."
            className="flex-1 bg-transparent text-[13px] placeholder:text-muted-foreground focus:outline-none"
            disabled
          />
        </div>
      </div>

      {/* Scrollable Session List */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {/* Placeholder content - will be implemented in Phase 28+ */}
        <div className="flex items-center justify-center h-full min-h-[200px] text-muted-foreground text-[13px]">
          <span>Session Listesi</span>
        </div>
      </div>
    </aside>
  )
}

export default SessionInbox
