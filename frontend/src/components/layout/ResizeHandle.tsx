/**
 * ResizeHandle - Vertical resize bar for panel resizing
 * @module @task-filewas/frontend/components/layout/ResizeHandle
 *
 * A thin draggable bar between panels for resizing.
 * Shows visual feedback on hover and during drag.
 */

import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Resize direction
 */
export type ResizeDirection = 'horizontal' | 'vertical'

/**
 * ResizeHandle props
 */
export interface ResizeHandleProps {
  /** Resize direction (default: horizontal = vertical bar) */
  direction?: ResizeDirection
  /** Whether currently resizing */
  isResizing?: boolean
  /** Mouse down handler to start resize */
  onMouseDown?: (e: React.MouseEvent) => void
  /** Additional className */
  className?: string
  /** Aria label for accessibility */
  'aria-label'?: string
}

/**
 * ResizeHandle Component
 *
 * A vertical bar (for horizontal resize) or horizontal bar (for vertical resize)
 * that users can drag to resize adjacent panels.
 *
 * Visual feedback:
 * - Default: Thin transparent bar with centered line
 * - Hover: Line becomes visible (accent color)
 * - Active/Resizing: Line stays visible, cursor changes
 *
 * @example
 * ```tsx
 * const { isResizing, handleProps } = useResizable({...})
 *
 * return (
 *   <ResizeHandle
 *     direction="horizontal"
 *     isResizing={isResizing}
 *     {...handleProps}
 *   />
 * )
 * ```
 */
export function ResizeHandle({
  direction = 'horizontal',
  isResizing = false,
  onMouseDown,
  className,
  'aria-label': ariaLabel,
}: ResizeHandleProps) {
  const isHorizontal = direction === 'horizontal'

  return (
    <div
      className={cn(
        // Base positioning and sizing
        'relative shrink-0 select-none',
        // Horizontal resize = vertical bar
        isHorizontal && [
          'h-full w-2',
          'cursor-col-resize',
        ],
        // Vertical resize = horizontal bar
        !isHorizontal && [
          'w-full h-2',
          'cursor-row-resize',
        ],
        // Hover zone (slightly larger than visual)
        'group',
        className
      )}
      onMouseDown={onMouseDown}
      role="separator"
      aria-orientation={isHorizontal ? 'vertical' : 'horizontal'}
      aria-label={ariaLabel ?? (isHorizontal ? 'Resize panel' : 'Resize panel vertically')}
      tabIndex={0}
    >
      {/* Visual indicator line */}
      <div
        className={cn(
          'absolute transition-colors duration-150',
          // Horizontal: vertical centered line
          isHorizontal && [
            'top-0 bottom-0 left-1/2 -translate-x-1/2',
            'w-[2px] rounded-full',
          ],
          // Vertical: horizontal centered line
          !isHorizontal && [
            'left-0 right-0 top-1/2 -translate-y-1/2',
            'h-[2px] rounded-full',
          ],
          // Default state: subtle
          'bg-transparent',
          // Hover: visible
          'group-hover:bg-accent/50',
          // Active/resizing: more visible
          isResizing && 'bg-accent',
        )}
      />
    </div>
  )
}

export default ResizeHandle
