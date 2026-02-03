/**
 * Keyboard shortcuts hook
 * @module @task-filewas/frontend/hooks/useKeyboardShortcuts
 *
 * Global keyboard shortcuts for the application:
 * - Cmd/Ctrl + Enter: Send message (when in chat input)
 * - Cmd/Ctrl + K: Open command palette
 * - Cmd/Ctrl + N: New session
 * - Cmd/Ctrl + B: Toggle sidebar
 * - Cmd/Ctrl + /: Show keyboard shortcuts help
 * - Escape: Close modals/dialogs (handled by Radix UI)
 * - Cmd/Ctrl + .: Stop generation
 */

import * as React from 'react'

// =============================================================================
// Types
// =============================================================================

/**
 * Keyboard shortcut combination
 * Format: 'mod' for Cmd/Ctrl, 'shift', 'alt', etc.
 * @example 'mod+enter' -> Cmd+Enter on Mac, Ctrl+Enter on Windows/Linux
 */
export type ShortcutKey = string

/**
 * Keyboard shortcut handler function
 */
export type ShortcutHandler = (e: KeyboardEvent) => void

/**
 * Keyboard shortcut configuration
 */
export interface ShortcutConfig {
  /** Key combination (e.g., 'mod+enter', 'mod+k') */
  key: ShortcutKey
  /** Handler function */
  handler: ShortcutHandler
  /** Human-readable description */
  description: string
  /** Whether the shortcut is currently enabled */
  enabled?: boolean
  /** Scope(s) where this shortcut is active ('global' or specific page) */
  scope?: 'global' | string | string[]
}

/**
 * All available keyboard shortcuts in the app
 */
export interface KeyboardShortcuts {
  /** Send message in chat */
  sendMessage?: ShortcutHandler
  /** Open command palette */
  openCommandPalette?: ShortcutHandler
  /** Create new session */
  newSession?: ShortcutHandler
  /** Toggle sidebar */
  toggleSidebar?: ShortcutHandler
  /** Show keyboard shortcuts help */
  showHelp?: ShortcutHandler
  /** Stop current generation */
  stopGeneration?: ShortcutHandler
  /** Focus search input */
  focusSearch?: ShortcutHandler
}

/**
 * Options for useKeyboardShortcuts hook
 */
export interface UseKeyboardShortcutsOptions extends Partial<KeyboardShortcuts> {
  /** Additional custom shortcuts */
  customShortcuts?: ShortcutConfig[]
  /** Whether to enable all shortcuts by default */
  enabled?: boolean
}

/**
 * Return value for useKeyboardShortcuts hook
 */
export interface UseKeyboardShortcutsReturn {
  /** All registered shortcuts */
  shortcuts: ShortcutConfig[]
  /** Programmatically trigger a shortcut by key */
  triggerShortcut: (key: ShortcutKey) => void
  /** Check if a shortcut is currently enabled */
  isEnabled: (key: ShortcutKey) => boolean
}

/**
 * Options for useHotkey hook
 */
export interface UseHotkeyOptions {
  /** Enable shortcut when focus is on input/textarea */
  enableOnFormTags?: boolean
  /** Condition for enabling the shortcut */
  enabled?: boolean
  /** Key combinations that will prevent this shortcut from firing */
  preventDefault?: boolean
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Built-in shortcut definitions with descriptions
 */
export const BUILTIN_SHORTCUTS: Omit<ShortcutConfig, 'handler' | 'enabled'>[] = [
  { key: 'mod+enter', description: 'Mesajı gönder' },
  { key: 'mod+k', description: 'Komut paletini aç' },
  { key: 'mod+n', description: 'Yeni session oluştur' },
  { key: 'mod+b', description: 'Sidebarı aç/kapat' },
  { key: 'mod+/', description: 'Klavye kısayollarını göster' },
  { key: 'mod+.', description: 'Oluşturmayı durdur' },
  { key: 'escape', description: 'Modalı/dialogu kapat' },
  { key: 'mod+p', description: 'Proje değiştir' },
  { key: 'mod+shift+s', description: 'Ayarlar' },
  { key: 'mod+f', description: 'Arama' },
]

/**
 * Keyboard event key map for consistent handling
 */
const KEY_MAP: Record<string, string> = {
  ' ': 'space',
  'arrowup': 'up',
  'arrowdown': 'down',
  'arrowleft': 'left',
  'arrowright': 'right',
  'escape': 'escape',
  'enter': 'enter',
  'tab': 'tab',
  'backspace': 'backspace',
  'delete': 'delete',
}

// =============================================================================
// Utilities
// =============================================================================

/**
 * Detect if user is on Mac OS
 */
export function isMacOS(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    /Mac|iPod|iPhone|iPad/.test(navigator.platform)
  )
}

/**
 * Normalize a keyboard event key to a consistent format
 */
function normalizeKey(key: string): string {
  const normalized = key.toLowerCase()
  return KEY_MAP[normalized] || normalized
}

/**
 * Format a shortcut key for display
 * Converts 'mod+enter' to '⌘+Enter' (Mac) or 'Ctrl+Enter' (Windows/Linux)
 */
export function formatShortcutKey(key: string, isMac?: boolean): string {
  const mac = isMac ?? isMacOS()
  const modKey = mac ? '⌘' : 'Ctrl'
  const shiftKey = mac ? '⇧' : 'Shift'
  const altKey = mac ? '⌥' : 'Alt'

  return key
    .toLowerCase()
    .replace(/\bmod\b/gi, modKey)
    .replace(/\bshift\b/gi, shiftKey)
    .replace(/\balt\b/gi, altKey)
    .replace(/\benter\b/gi, 'Enter')
    .replace(/\bescape\b/gi, 'Esc')
    .replace(/\bspace\b/gi, 'Space')
    .replace(/\bup\b/gi, '↑')
    .replace(/\bdown\b/gi, '↓')
    .replace(/\bleft\b/gi, '←')
    .replace(/\bright\b/gi, '→')
    .split('+')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(mac ? '' : '+')
}

/**
 * Parse a shortcut key string into its components
 */
function parseShortcutKey(shortcut: string): {
  meta: boolean
  ctrl: boolean
  alt: boolean
  shift: boolean
  key: string
} {
  const parts = shortcut.toLowerCase().split('+')
  const result = {
    meta: false,
    ctrl: false,
    alt: false,
    shift: false,
    key: '',
  }

  for (const part of parts) {
    switch (part) {
      case 'mod':
        result.meta = isMacOS()
        result.ctrl = !isMacOS()
        break
      case 'meta':
      case 'cmd':
        result.meta = true
        break
      case 'ctrl':
        result.ctrl = true
        break
      case 'alt':
      case 'option':
        result.alt = true
        break
      case 'shift':
        result.shift = true
        break
      default:
        result.key = part
    }
  }

  return result
}

/**
 * Check if a keyboard event matches a shortcut key
 */
function matchesShortcut(event: KeyboardEvent, shortcut: string): boolean {
  const parsed = parseShortcutKey(shortcut)
  const eventKey = normalizeKey(event.key)

  return (
    event.metaKey === parsed.meta &&
    event.ctrlKey === parsed.ctrl &&
    event.altKey === parsed.alt &&
    event.shiftKey === parsed.shift &&
    eventKey === parsed.key
  )
}

// =============================================================================
// Single Shortcut Hook
// =============================================================================

/**
 * Hook for registering a single keyboard shortcut
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   useHotkey('mod+s', (e) => {
 *     e.preventDefault()
 *     saveFile()
 *   }, { enableOnFormTags: true })
 *
 *   return <div>...</div>
 * }
 * ```
 */
export function useHotkey(
  key: string,
  handler: ShortcutHandler,
  options: UseHotkeyOptions = {}
) {
  const { enableOnFormTags = false, enabled = true, preventDefault = true } = options

  React.useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if target is a form element
      const target = e.target as HTMLElement
      const isFormElement =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable

      // Skip if on form element and not explicitly enabled
      if (isFormElement && !enableOnFormTags) {
        return
      }

      // Check if the key combination matches
      if (matchesShortcut(e, key)) {
        if (preventDefault) {
          e.preventDefault()
        }
        handler(e)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [key, handler, enableOnFormTags, enabled, preventDefault])
}

// =============================================================================
// Global Shortcuts Hook
// =============================================================================

/**
 * Hook for managing global keyboard shortcuts
 *
 * @example
 * ```tsx
 * function App() {
 *   useKeyboardShortcuts({
 *     sendMessage: () => console.log('Send message'),
 *     openCommandPalette: () => console.log('Open palette'),
 *     toggleSidebar: () => setSidebarOpen(prev => !prev),
 *   })
 *
 *   return <div>...</div>
 * }
 * ```
 */
export function useKeyboardShortcuts(
  options: UseKeyboardShortcutsOptions = {}
): UseKeyboardShortcutsReturn {
  const {
    sendMessage,
    openCommandPalette,
    newSession,
    toggleSidebar,
    showHelp,
    stopGeneration,
    focusSearch,
    customShortcuts = [],
    enabled = true,
  } = options

  // Track all registered shortcuts
  const [shortcuts, setShortcuts] = React.useState<ShortcutConfig[]>([])

  // Create a ref to store handlers for programmatic triggering
  const handlersRef = React.useRef<Map<ShortcutKey, ShortcutHandler>>(new Map())

  // Register built-in shortcuts with provided handlers
  React.useEffect(() => {
    const builtInConfigs: ShortcutConfig[] = []

    // Helper to add shortcut if handler exists
    const addShortcut = (
      key: ShortcutKey,
      handler?: ShortcutHandler,
      description?: string
    ) => {
      if (handler && enabled) {
        const config: ShortcutConfig = {
          key,
          handler,
          description: description || '',
          enabled: true,
          scope: 'global',
        }
        builtInConfigs.push(config)
        handlersRef.current.set(key, handler)
      }
    }

    // Register each built-in shortcut
    addShortcut('mod+enter', sendMessage, 'Mesajı gönder')
    addShortcut('mod+k', openCommandPalette, 'Komut paletini aç')
    addShortcut('mod+n', newSession, 'Yeni session oluştur')
    addShortcut('mod+b', toggleSidebar, 'Sidebarı aç/kapat')
    addShortcut('mod+/', showHelp, 'Klavye kısayollarını göster')
    addShortcut('mod+.', stopGeneration, 'Oluşturmayı durdur')
    addShortcut('mod+f', focusSearch, 'Arama')

    // Add custom shortcuts
    const customConfigs = customShortcuts
      .filter((s) => s.handler && enabled)
      .map((config) => ({
        ...config,
        enabled: config.enabled ?? true,
      }))
    customConfigs.forEach((config) => {
      handlersRef.current.set(config.key, config.handler)
    })

    setShortcuts([...builtInConfigs, ...customConfigs])
  }, [
    sendMessage,
    openCommandPalette,
    newSession,
    toggleSidebar,
    showHelp,
    stopGeneration,
    focusSearch,
    customShortcuts,
    enabled,
  ])

  // Register keyboard event listeners
  React.useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input/textarea
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        // Allow escape to work in inputs
        if (e.key !== 'Escape') {
          return
        }
      }

      // Check each registered shortcut
      for (const [key, handler] of handlersRef.current) {
        if (matchesShortcut(e, key)) {
          e.preventDefault()
          handler(e)
          return
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enabled])

  /**
   * Programmatically trigger a shortcut by key
   */
  const triggerShortcut = React.useCallback(
    (key: ShortcutKey) => {
      const handler = handlersRef.current.get(key)
      if (handler) {
        const parsed = parseShortcutKey(key)
        const event = new KeyboardEvent('keydown', {
          key: parsed.key,
          metaKey: parsed.meta,
          ctrlKey: parsed.ctrl,
          altKey: parsed.alt,
          shiftKey: parsed.shift,
          bubbles: true,
        })
        handler(event)
      }
    },
    []
  )

  /**
   * Check if a shortcut is currently enabled
   */
  const isEnabled = React.useCallback(
    (key: ShortcutKey): boolean => {
      return shortcuts.some((s) => s.key === key && s.enabled !== false)
    },
    [shortcuts]
  )

  return {
    shortcuts,
    triggerShortcut,
    isEnabled,
  }
}

// =============================================================================
// Keyboard Shortcuts Help Dialog
// =============================================================================

/**
 * Props for KeyboardShortcutsHelp component
 */
export interface KeyboardShortcutsHelpProps {
  /** Whether the dialog is open */
  open?: boolean
  /** Called when dialog is closed */
  onOpenChange?: (open: boolean) => void
  /** Custom shortcuts to display */
  shortcuts?: ShortcutConfig[]
  /** Additional CSS classes */
  className?: string
}

/**
 * Keyboard shortcuts help dialog component
 *
 * @example
 * ```tsx
 * function App() {
 *   const [helpOpen, setHelpOpen] = useState(false)
 *
 *   useKeyboardShortcuts({
 *     showHelp: () => setHelpOpen(true)
 *   })
 *
 *   return (
 *     <>
 *       <KeyboardShortcutsHelp open={helpOpen} onOpenChange={setHelpOpen} />
 *       <div>...</div>
 *     </>
 *   )
 * }
 * ```
 */
export function KeyboardShortcutsHelp({
  open = false,
  onOpenChange,
  shortcuts,
  className,
}: KeyboardShortcutsHelpProps) {
  const displayShortcuts = shortcuts || BUILTIN_SHORTCUTS

  return (
    <div
      className={className}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
      data-state={open ? 'open' : 'closed'}
    >
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => onOpenChange?.(false)}
          />

          {/* Content */}
          <div className="relative z-50 w-full max-w-md rounded-lg border border-foreground/10 bg-background p-6 shadow-lg">
            <h2
              id="shortcuts-title"
              className="text-lg font-semibold text-foreground mb-4"
            >
              Klavye Kısayolları
            </h2>

            <div className="space-y-2">
              {displayShortcuts.map((shortcut) => (
                <div
                  key={shortcut.key}
                  className="flex items-center justify-between py-1"
                >
                  <span className="text-sm text-foreground/80">
                    {shortcut.description}
                  </span>
                  <kbd className="text-xs font-mono text-foreground/60 bg-foreground/5 px-2 py-1 rounded">
                    {formatShortcutKey(shortcut.key)}
                  </kbd>
                </div>
              ))}
            </div>

            <button
              onClick={() => onOpenChange?.(false)}
              className="mt-6 w-full py-2 text-sm text-center text-foreground/60 hover:text-foreground transition-colors"
            >
              Kapat (Esc)
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
