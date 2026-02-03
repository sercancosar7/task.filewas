/**
 * SessionSearch - Search input for session list
 * @module @task-filewas/frontend/components/session/SessionSearch
 *
 * Layout:
 * ┌──────────────────────────────┐
 * │ 🔍 Search sessions...        │
 * └──────────────────────────────┘
 *
 * Features:
 * - Search icon
 * - Placeholder text
 * - Clear button when has value
 * - Debounced onChange
 */

import { useState, useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

// =============================================================================
// Types
// =============================================================================

export interface SessionSearchProps {
  /** Current search value */
  value?: string
  /** Placeholder text */
  placeholder?: string
  /** Change handler (debounced) */
  onChange?: (value: string) => void
  /** Debounce delay in ms (default: 300) */
  debounceMs?: number
  /** Whether the input is disabled */
  disabled?: boolean
  /** Additional CSS classes */
  className?: string
}

// =============================================================================
// Component
// =============================================================================

/**
 * SessionSearch - Search input with icon and clear button
 *
 * @example
 * ```tsx
 * <SessionSearch
 *   value={searchQuery}
 *   onChange={(value) => setSearchQuery(value)}
 *   placeholder="Session ara..."
 * />
 * ```
 */
export function SessionSearch({
  value = '',
  placeholder = 'Session ara...',
  onChange,
  debounceMs = 300,
  disabled = false,
  className,
}: SessionSearchProps) {
  // Local state for immediate UI updates
  const [localValue, setLocalValue] = useState(value)

  // Debounce timer ref
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync local value with prop value
  useEffect(() => {
    setLocalValue(value)
  }, [value])

  // Handle input change with debounce
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setLocalValue(newValue)

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Set new debounce timer
    debounceTimerRef.current = setTimeout(() => {
      onChange?.(newValue)
    }, debounceMs)
  }

  // Handle clear button click
  const handleClear = () => {
    setLocalValue('')

    // Clear any pending debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Immediately call onChange
    onChange?.('')
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  return (
    <div
      className={cn(
        // Container border
        'border-b border-border',
        // Padding (Craft Agents: px-3 py-2)
        'px-3 py-2',
        className
      )}
    >
      <div
        className={cn(
          // Layout
          'flex items-center gap-2',
          // Background (Craft Agents: bg-foreground/5)
          'rounded-md bg-foreground/5',
          // Padding
          'px-3 py-1.5',
          // Disabled state
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        {/* Search Icon */}
        <Search
          className={cn(
            'h-3.5 w-3.5 shrink-0',
            'text-muted-foreground'
          )}
          aria-hidden="true"
        />

        {/* Input */}
        <input
          type="text"
          value={localValue}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            // Layout
            'flex-1',
            // Background
            'bg-transparent',
            // Text
            'text-[13px] text-foreground',
            // Placeholder
            'placeholder:text-muted-foreground',
            // Focus
            'focus:outline-none',
            // Disabled
            'disabled:cursor-not-allowed'
          )}
          aria-label="Session ara"
        />

        {/* Clear Button (visible when has value) */}
        {localValue && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className={cn(
              'p-0.5 rounded',
              'text-muted-foreground hover:text-foreground',
              'focus:outline-none focus-visible:ring-1 focus-visible:ring-ring'
            )}
            aria-label="Aramayı temizle"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  )
}

export default SessionSearch
