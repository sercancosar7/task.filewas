/**
 * NavItem - Navigation item component (Craft Agents style)
 * @module @task-filewas/frontend/components/sidebar/NavItem
 *
 * Structure:
 * ┌────────────────────────────────────────────────┐
 * │ [Icon] Label                           [Badge] │
 * │   ↑      ↑                               ↑     │
 * │ 14px  13px text                    count badge │
 * │ icon  shrink-0                      shrink-0   │
 * └────────────────────────────────────────────────┘
 *
 * Variants:
 * - Default: Text with hover state
 * - Ghost: Transparent, lighter hover
 * - Active: Highlighted background
 * - Nested: With left padding and vertical line
 */

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface NavItemProps {
  /** Icon component (Lucide icon recommended) */
  icon?: React.ReactNode
  /** Label text */
  label: string
  /** Count badge (optional) */
  count?: number
  /** Whether this item is currently active/selected */
  isActive?: boolean
  /** Whether this is a nested item (indented) */
  isNested?: boolean
  /** Whether sidebar is collapsed */
  isCollapsed?: boolean
  /** Click handler */
  onClick?: () => void
  /** Additional CSS classes */
  className?: string
  /** Accessible label for screen readers */
  ariaLabel?: string
}

/**
 * NavItem - Individual navigation item
 *
 * Features:
 * - Icon support (14px container)
 * - Label with 13px font size
 * - Optional count badge
 * - Hover state (bg-foreground/5)
 * - Active state (bg-foreground/7)
 * - Nested item styling (pl-5 indent)
 * - Collapsed mode (icon only, centered)
 * - Keyboard accessible (focus-visible ring)
 */
export function NavItem({
  icon,
  label,
  count,
  isActive = false,
  isNested = false,
  isCollapsed = false,
  onClick,
  className,
  ariaLabel,
}: NavItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      aria-label={ariaLabel || label}
      aria-current={isActive ? 'page' : undefined}
      data-active={isActive || undefined}
      className={cn(
        // Base nav-item styles (from globals.css)
        'nav-item',
        // Full width, text left
        'w-full text-left',
        // Rounded corners (Craft Agents: 6px)
        'rounded-[6px]',
        // Text styling
        'text-[13px]',
        // Transition
        'transition-colors duration-150',
        // Padding variations
        isNested && !isCollapsed && 'pl-5',
        // Collapsed state
        isCollapsed && 'justify-center px-0',
        // Focus visible ring
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        // Additional classes
        className
      )}
    >
      {/* Icon Container */}
      {icon && (
        <span
          className={cn(
            // Icon container size (Craft Agents: 14px)
            'h-3.5 w-3.5 shrink-0',
            // Flex centering
            'flex items-center justify-center',
            // Icon color
            isActive
              ? 'text-foreground'
              : 'text-muted-foreground'
          )}
          style={{
            // Default icon color (60% foreground)
            color: isActive
              ? undefined
              : 'color-mix(in oklch, var(--foreground) 60%, transparent)',
          }}
        >
          {icon}
        </span>
      )}

      {/* Label (hidden when collapsed) */}
      {!isCollapsed && (
        <span
          className={cn(
            // Grow to fill space
            'flex-1',
            // Truncate long labels
            'truncate',
            // Text color
            isActive
              ? 'text-foreground font-medium'
              : 'text-foreground/80'
          )}
        >
          {label}
        </span>
      )}

      {/* Count Badge (hidden when collapsed) */}
      {!isCollapsed && count !== undefined && count > 0 && (
        <span
          className={cn(
            // Badge styling
            'shrink-0',
            'text-xs',
            // Craft Agents: Label/badge text color
            'text-muted-foreground',
            // Opacity on hover reveal (group styling)
            'opacity-70 group-hover:opacity-100'
          )}
          style={{
            color: 'color-mix(in oklch, var(--foreground) 30%, transparent)',
          }}
        >
          ({count})
        </span>
      )}
    </button>
  )
}

/**
 * Status icons for session statuses
 * Based on Craft Agents status system
 */
export const STATUS_ICONS = {
  backlog: '○',
  todo: '○',
  'in-progress': '◉',
  'needs-review': '◎',
  done: '●',
  cancelled: '⊘',
  flagged: '🚩',
} as const

/**
 * Status colors for session statuses (Tailwind classes)
 */
export const STATUS_COLORS = {
  backlog: 'text-muted-foreground',
  todo: 'text-muted-foreground',
  'in-progress': 'text-accent',
  'needs-review': 'text-info',
  done: 'text-success',
  cancelled: 'text-muted-foreground',
  flagged: 'text-info',
} as const

export type SessionStatus = keyof typeof STATUS_ICONS

export default NavItem
