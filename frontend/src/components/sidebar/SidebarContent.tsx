/**
 * SidebarContent - Sidebar navigation content (Craft Agents style)
 * @module @task-filewas/frontend/components/sidebar/SidebarContent
 *
 * Layout Structure:
 * ┌────────────────────────┐
 * │ 📝 New Chat            │  ← Primary action button
 * ├────────────────────────┤
 * │ All Chats         (12) │  ← Main category
 * │   ○ Backlog        (3) │  ← Status filters (nested)
 * │   ○ Todo           (5) │
 * │   ◉ In Progress    (1) │
 * │   ◎ Needs Review   (2) │
 * │   ● Done          (47) │
 * │   ⊘ Cancelled      (1) │
 * │                        │
 * │ 🚩 Flagged         (2) │  ← Special filter
 * ├────────────────────────┤
 * │ ▶ Sources              │  ← Collapsible section
 * │ ▶ Skills               │
 * └────────────────────────┘
 */

import * as React from 'react'
import {
  MessageSquarePlus,
  MessagesSquare,
  Circle,
  CircleDot,
  CircleDashed,
  CheckCircle2,
  XCircle,
  Flag,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { NavItem, STATUS_COLORS } from './NavItem'
import { NavSection } from './NavSection'

export interface SessionCounts {
  all: number
  backlog: number
  todo: number
  inProgress: number
  needsReview: number
  done: number
  cancelled: number
  flagged: number
}

export interface SidebarContentProps {
  /** Session counts for each status */
  counts?: SessionCounts
  /** Currently active filter */
  activeFilter?: string
  /** Whether sidebar is collapsed */
  isCollapsed?: boolean
  /** Callback when New Chat is clicked */
  onNewChat?: () => void
  /** Callback when a filter is selected */
  onFilterSelect?: (filter: string) => void
  /** Callback when Settings is clicked */
  onSettingsClick?: () => void
  /** Additional CSS classes */
  className?: string
}

const DEFAULT_COUNTS: SessionCounts = {
  all: 0,
  backlog: 0,
  todo: 0,
  inProgress: 0,
  needsReview: 0,
  done: 0,
  cancelled: 0,
  flagged: 0,
}

/**
 * SidebarContent - Main sidebar navigation content
 *
 * Features:
 * - New Chat primary action button
 * - All Chats with nested status filters
 * - Flagged special filter
 * - Sources and Skills collapsible sections
 * - Settings button fixed at bottom
 */
export function SidebarContent({
  counts = DEFAULT_COUNTS,
  activeFilter = 'all',
  isCollapsed = false,
  onNewChat,
  onFilterSelect,
  onSettingsClick,
  className,
}: SidebarContentProps) {
  const handleFilterClick = React.useCallback(
    (filter: string) => {
      onFilterSelect?.(filter)
    },
    [onFilterSelect]
  )

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Scrollable Navigation Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <nav
          className={cn('flex flex-col gap-0.5', isCollapsed ? 'p-1' : 'p-2')}
          role="menu"
        >
          {/* New Chat Button - Primary Action */}
          <Button
            variant="default"
            className={cn(
              'w-full justify-start gap-2 mb-2',
              isCollapsed && 'justify-center px-0'
            )}
            onClick={onNewChat}
            aria-label="Yeni sohbet başlat"
          >
            <MessageSquarePlus className="h-4 w-4 shrink-0" />
            {!isCollapsed && <span>Yeni Sohbet</span>}
          </Button>

          {/* All Chats - Main Category */}
          <NavItem
            icon={<MessagesSquare className="h-3.5 w-3.5" />}
            label="Tüm Sohbetler"
            count={counts.all}
            isActive={activeFilter === 'all'}
            isCollapsed={isCollapsed}
            onClick={() => handleFilterClick('all')}
          />

          {/* Status Filters - Nested under All Chats */}
          {!isCollapsed && (
            <div className="relative pl-5 mt-0.5">
              {/* Vertical connector line */}
              <div
                className="absolute left-[13px] top-0 bottom-0 w-px bg-foreground/10"
                aria-hidden="true"
              />

              <div className="flex flex-col gap-0.5">
                {/* Backlog */}
                <NavItem
                  icon={
                    <Circle
                      className={cn('h-3 w-3', STATUS_COLORS['backlog'])}
                    />
                  }
                  label="Beklemede"
                  count={counts.backlog}
                  isActive={activeFilter === 'backlog'}
                  isNested
                  onClick={() => handleFilterClick('backlog')}
                />

                {/* Todo */}
                <NavItem
                  icon={
                    <Circle className={cn('h-3 w-3', STATUS_COLORS['todo'])} />
                  }
                  label="Yapılacak"
                  count={counts.todo}
                  isActive={activeFilter === 'todo'}
                  isNested
                  onClick={() => handleFilterClick('todo')}
                />

                {/* In Progress */}
                <NavItem
                  icon={
                    <CircleDot
                      className={cn('h-3 w-3', STATUS_COLORS['in-progress'])}
                    />
                  }
                  label="Devam Ediyor"
                  count={counts.inProgress}
                  isActive={activeFilter === 'in-progress'}
                  isNested
                  onClick={() => handleFilterClick('in-progress')}
                />

                {/* Needs Review */}
                <NavItem
                  icon={
                    <CircleDashed
                      className={cn('h-3 w-3', STATUS_COLORS['needs-review'])}
                    />
                  }
                  label="İnceleme Bekliyor"
                  count={counts.needsReview}
                  isActive={activeFilter === 'needs-review'}
                  isNested
                  onClick={() => handleFilterClick('needs-review')}
                />

                {/* Done */}
                <NavItem
                  icon={
                    <CheckCircle2
                      className={cn('h-3 w-3', STATUS_COLORS['done'])}
                    />
                  }
                  label="Tamamlandı"
                  count={counts.done}
                  isActive={activeFilter === 'done'}
                  isNested
                  onClick={() => handleFilterClick('done')}
                />

                {/* Cancelled */}
                <NavItem
                  icon={
                    <XCircle
                      className={cn('h-3 w-3', STATUS_COLORS['cancelled'])}
                    />
                  }
                  label="İptal Edildi"
                  count={counts.cancelled}
                  isActive={activeFilter === 'cancelled'}
                  isNested
                  onClick={() => handleFilterClick('cancelled')}
                />
              </div>
            </div>
          )}

          {/* Separator */}
          <div className="h-px bg-border my-2" aria-hidden="true" />

          {/* Flagged - Special Filter */}
          <NavItem
            icon={
              <Flag className={cn('h-3.5 w-3.5', STATUS_COLORS['flagged'])} />
            }
            label="İşaretli"
            count={counts.flagged}
            isActive={activeFilter === 'flagged'}
            isCollapsed={isCollapsed}
            onClick={() => handleFilterClick('flagged')}
          />

          {/* Separator */}
          <div className="h-px bg-border my-2" aria-hidden="true" />

          {/* Sources - Collapsible Section */}
          <NavSection title="Kaynaklar" isCollapsed={isCollapsed}>
            <NavItem
              label="API'ler"
              isNested
              onClick={() => handleFilterClick('sources-apis')}
            />
            <NavItem
              label="MCP'ler"
              isNested
              onClick={() => handleFilterClick('sources-mcps')}
            />
            <NavItem
              label="Yerel Klasörler"
              isNested
              onClick={() => handleFilterClick('sources-local')}
            />
          </NavSection>

          {/* Skills - Collapsible Section */}
          <NavSection title="Yetenekler" isCollapsed={isCollapsed}>
            <NavItem
              label="Tüm Yetenekler"
              isNested
              onClick={() => handleFilterClick('skills-all')}
            />
          </NavSection>
        </nav>
      </div>

      {/* Fixed Bottom Section - Settings */}
      <div className="mt-auto border-t border-border p-2">
        <button
          type="button"
          className={cn(
            'nav-item w-full',
            'text-muted-foreground hover:text-foreground',
            isCollapsed && 'justify-center'
          )}
          onClick={onSettingsClick}
          aria-label="Ayarlar"
        >
          <Settings className="h-3.5 w-3.5 shrink-0" />
          {!isCollapsed && <span className="text-[13px]">Ayarlar</span>}
        </button>
      </div>
    </div>
  )
}

export default SidebarContent
