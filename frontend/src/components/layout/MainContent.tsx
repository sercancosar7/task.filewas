/**
 * MainContent - Right panel for main content area (Craft Agents style)
 * @module @task-filewas/frontend/components/layout/MainContent
 *
 * Layout Structure:
 * ┌────────────────────────────────────────────────────────────────────┐
 * │ E-commerce checkout flow                              ▼  [⋮]      │  ← Header
 * ├────────────────────────────────────────────────────────────────────┤
 * │                                                                    │
 * │                      MESAJ ALANI                                   │
 * │                      (scrollable)                                  │
 * │                                                                    │
 * │  ┌─────────────────────────────────────────────────────────────┐  │
 * │  │ [Turn Cards - User/Assistant messages]                       │  │
 * │  └─────────────────────────────────────────────────────────────┘  │
 * │                                                                    │
 * ├────────────────────────────────────────────────────────────────────┤
 * │                         INPUT AREA                                 │
 * │ ┌──────────────────────────────────────────────────────────────┐   │
 * │ │ Mesajinizi yazin...                                    ✈️    │   │
 * │ └──────────────────────────────────────────────────────────────┘   │
 * │ 📎 Attach  💬 Quick Chat ▼  📁 my-project       Claude ▼  ☐ Think │
 * └────────────────────────────────────────────────────────────────────┘
 */

import { cn } from '@/lib/utils'

export interface MainContentProps {
  children?: React.ReactNode
  className?: string
}

/**
 * MainContent - Main content panel
 * - flex-1 to fill remaining space
 * - Scrollable content area
 * - Renders children (page content)
 */
export function MainContent({ children, className }: MainContentProps) {
  return (
    <main
      className={cn(
        // Panel base style
        'panel flex flex-col flex-1 min-w-0',
        // Overflow handling
        'overflow-hidden',
        className
      )}
      aria-label="Ana içerik"
    >
      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {children ? (
          children
        ) : (
          // Placeholder content - will be replaced with actual page content
          <div className="flex items-center justify-center h-full min-h-[400px] text-muted-foreground text-[13px]">
            <div className="text-center">
              <p className="mb-2">Ana İçerik Alanı</p>
              <p className="text-xs opacity-60">Chat arayüzü burada görünecek</p>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

export default MainContent
