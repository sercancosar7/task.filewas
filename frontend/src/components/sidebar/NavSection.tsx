/**
 * NavSection - Collapsible navigation section (Craft Agents style)
 * @module @task-filewas/frontend/components/sidebar/NavSection
 *
 * Structure:
 * ┌────────────────────────────────────────────────┐
 * │ ▶ Section Title                                │  ← Header (trigger)
 * ├────────────────────────────────────────────────┤
 * │ │ ├── Child Item 1                             │  ← Expanded content
 * │ │ ├── Child Item 2                             │    with vertical line
 * │ │ └── Child Item 3                             │
 * └────────────────────────────────────────────────┘
 *
 * Features:
 * - Collapsible with smooth height transition
 * - Chevron icon rotates 90° when expanded
 * - Vertical connector line for nested items
 * - Staggered animation for children (0.025s delay)
 * - Keyboard navigation support
 */

import * as React from 'react'
import * as Collapsible from '@radix-ui/react-collapsible'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface NavSectionProps {
  /** Section title/label */
  title: string
  /** Icon component (optional) */
  icon?: React.ReactNode
  /** Child navigation items */
  children?: React.ReactNode
  /** Whether section is expanded by default */
  defaultOpen?: boolean
  /** Whether sidebar is collapsed */
  isCollapsed?: boolean
  /** Additional CSS classes */
  className?: string
}

/**
 * NavSection - Collapsible navigation section
 *
 * Features:
 * - Radix Collapsible for accessibility
 * - Chevron rotation animation (0 → 90°)
 * - Vertical connector line (bg-foreground/10)
 * - Staggered child animations
 * - Smooth height transition (0.2s)
 */
export function NavSection({
  title,
  icon,
  children,
  defaultOpen = false,
  isCollapsed = false,
  className,
}: NavSectionProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)

  // Don't render in collapsed sidebar mode
  if (isCollapsed) {
    return null
  }

  return (
    <Collapsible.Root
      open={isOpen}
      onOpenChange={setIsOpen}
      className={cn('w-full', className)}
    >
      {/* Section Header / Trigger */}
      <Collapsible.Trigger asChild>
        <button
          type="button"
          className={cn(
            // Base nav-item styles
            'nav-item group/section w-full',
            // Rounded corners (Craft Agents: 6px)
            'rounded-[6px]',
            // Text styling
            'text-[13px] text-muted-foreground',
            // Hover state
            'hover:text-foreground',
            // Focus visible ring
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
          )}
          aria-expanded={isOpen}
        >
          {/* Chevron Icon - rotates when open */}
          <span
            className={cn(
              // Icon container
              'h-3.5 w-3.5 shrink-0',
              'flex items-center justify-center',
              // Transition for rotation
              'transition-transform duration-200 ease-out',
              // Rotate when open
              isOpen && 'rotate-90'
            )}
          >
            <ChevronRight className="h-3 w-3" />
          </span>

          {/* Optional custom icon */}
          {icon && (
            <span
              className={cn(
                'h-3.5 w-3.5 shrink-0',
                'flex items-center justify-center',
                'text-muted-foreground'
              )}
            >
              {icon}
            </span>
          )}

          {/* Section Title */}
          <span className="flex-1 text-left truncate">{title}</span>
        </button>
      </Collapsible.Trigger>

      {/* Collapsible Content */}
      <Collapsible.Content
        className={cn(
          // Animation classes
          'overflow-hidden',
          // Height transition
          'data-[state=open]:animate-slideDown',
          'data-[state=closed]:animate-slideUp'
        )}
      >
        {/* Content wrapper with vertical line */}
        <div className="relative pl-5">
          {/* Vertical connector line (Craft Agents style) */}
          <div
            className={cn(
              'absolute left-[13px] top-0 bottom-0',
              'w-px',
              // Craft Agents: bg-foreground/10
              'bg-foreground/10'
            )}
            aria-hidden="true"
          />

          {/* Child items container */}
          <div className="flex flex-col gap-0.5 py-0.5">
            {children}
          </div>
        </div>
      </Collapsible.Content>
    </Collapsible.Root>
  )
}

export default NavSection
