/**
 * useResizable - Hook for resizable panel functionality
 * @module @task-filewas/frontend/hooks/useResizable
 *
 * Provides mouse event handlers and constraints for resizable panels.
 * Used with ResizeHandle component for Craft Agents style layout.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Resize direction
 */
export type ResizeDirection = 'horizontal' | 'vertical'

/**
 * Resize constraints
 */
export interface ResizeConstraints {
  /** Minimum size in pixels */
  min: number
  /** Maximum size in pixels */
  max: number
}

/**
 * useResizable options
 */
export interface UseResizableOptions {
  /** Initial size in pixels */
  initialSize: number
  /** Size constraints (min/max) */
  constraints: ResizeConstraints
  /** Resize direction (default: horizontal) */
  direction?: ResizeDirection
  /** Callback when size changes */
  onSizeChange?: (size: number) => void
  /** Callback when resize starts */
  onResizeStart?: () => void
  /** Callback when resize ends */
  onResizeEnd?: (finalSize: number) => void
}

/**
 * useResizable return type
 */
export interface UseResizableReturn {
  /** Current size in pixels */
  size: number
  /** Whether currently resizing */
  isResizing: boolean
  /** Set size programmatically (clamped to constraints) */
  setSize: (size: number) => void
  /** Start resize on mouse down */
  startResize: (e: React.MouseEvent) => void
  /** Resize handle props to spread on handle element */
  handleProps: {
    onMouseDown: (e: React.MouseEvent) => void
    style: React.CSSProperties
  }
}

/**
 * Clamp value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * useResizable Hook
 *
 * @example
 * ```tsx
 * const { size, isResizing, handleProps } = useResizable({
 *   initialSize: 220,
 *   constraints: { min: 180, max: 320 },
 *   onSizeChange: (size) => store.setSidebarWidth(size)
 * })
 *
 * return (
 *   <>
 *     <Panel style={{ width: size }} />
 *     <ResizeHandle {...handleProps} />
 *   </>
 * )
 * ```
 */
export function useResizable({
  initialSize,
  constraints,
  direction = 'horizontal',
  onSizeChange,
  onResizeStart,
  onResizeEnd,
}: UseResizableOptions): UseResizableReturn {
  const [size, setSizeState] = useState(() =>
    clamp(initialSize, constraints.min, constraints.max)
  )
  const [isResizing, setIsResizing] = useState(false)

  // Refs for tracking resize state
  const startPosRef = useRef(0)
  const startSizeRef = useRef(0)

  /**
   * Set size with constraints
   */
  const setSize = useCallback(
    (newSize: number) => {
      const clampedSize = clamp(newSize, constraints.min, constraints.max)
      setSizeState(clampedSize)
      onSizeChange?.(clampedSize)
    },
    [constraints.min, constraints.max, onSizeChange]
  )

  /**
   * Handle mouse move during resize
   */
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return

      const delta =
        direction === 'horizontal'
          ? e.clientX - startPosRef.current
          : e.clientY - startPosRef.current

      const newSize = startSizeRef.current + delta
      setSize(newSize)
    },
    [isResizing, direction, setSize]
  )

  /**
   * Handle mouse up - end resize
   */
  const handleMouseUp = useCallback(() => {
    if (!isResizing) return

    setIsResizing(false)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    onResizeEnd?.(size)
  }, [isResizing, size, onResizeEnd])

  /**
   * Start resize on mouse down
   */
  const startResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      startPosRef.current = direction === 'horizontal' ? e.clientX : e.clientY
      startSizeRef.current = size

      setIsResizing(true)
      document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize'
      document.body.style.userSelect = 'none'

      onResizeStart?.()
    },
    [direction, size, onResizeStart]
  )

  // Add/remove global mouse listeners
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)

      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
    return undefined
  }, [isResizing, handleMouseMove, handleMouseUp])

  // Sync with external size changes
  useEffect(() => {
    const clampedInitial = clamp(initialSize, constraints.min, constraints.max)
    if (clampedInitial !== size && !isResizing) {
      setSizeState(clampedInitial)
    }
    // Only run when initialSize or constraints change, not size
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSize, constraints.min, constraints.max])

  /**
   * Handle props to spread on resize handle element
   */
  const handleProps = {
    onMouseDown: startResize,
    style: {
      cursor: direction === 'horizontal' ? 'col-resize' : 'row-resize',
    } as React.CSSProperties,
  }

  return {
    size,
    isResizing,
    setSize,
    startResize,
    handleProps,
  }
}

export default useResizable
