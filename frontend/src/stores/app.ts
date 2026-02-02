/**
 * App Store - Global application state
 * @module @task-filewas/frontend/stores/app
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

/**
 * App theme (dark mode only per spec, but keeping for future)
 */
export type AppTheme = 'dark'

/**
 * Panel size constraints (from overview spec)
 */
export const PANEL_CONSTRAINTS = {
  sidebar: {
    min: 180,
    default: 220,
    max: 320,
  },
  inbox: {
    min: 240,
    default: 300,
    max: 480,
  },
  rightSidebar: {
    default: 300,
  },
  // Window edge spacing
  windowEdge: 6,
  // Panel spacing
  panelSpacing: 5,
} as const

/**
 * App state interface
 */
export interface AppState {
  // Panel widths
  sidebarWidth: number
  inboxWidth: number

  // Sidebar collapsed state
  isSidebarCollapsed: boolean

  // Current selections
  currentProjectId: string | null

  // Theme (dark mode only)
  theme: AppTheme

  // Overlay states
  isCommandPaletteOpen: boolean
  isSettingsOpen: boolean
  isShortcutsHelpOpen: boolean

  // Navigation breadcrumb
  breadcrumb: string[]
}

/**
 * App actions interface
 */
export interface AppActions {
  // Panel width setters
  setSidebarWidth: (width: number) => void
  setInboxWidth: (width: number) => void

  // Sidebar toggle
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void

  // Project selection
  setCurrentProjectId: (projectId: string | null) => void

  // Overlay toggles
  setCommandPaletteOpen: (open: boolean) => void
  toggleCommandPalette: () => void
  setSettingsOpen: (open: boolean) => void
  toggleSettings: () => void
  setShortcutsHelpOpen: (open: boolean) => void
  toggleShortcutsHelp: () => void

  // Breadcrumb
  setBreadcrumb: (breadcrumb: string[]) => void

  // Reset
  reset: () => void
}

/**
 * Initial state values
 */
const initialState: AppState = {
  sidebarWidth: PANEL_CONSTRAINTS.sidebar.default,
  inboxWidth: PANEL_CONSTRAINTS.inbox.default,
  isSidebarCollapsed: false,
  currentProjectId: null,
  theme: 'dark',
  isCommandPaletteOpen: false,
  isSettingsOpen: false,
  isShortcutsHelpOpen: false,
  breadcrumb: [],
}

/**
 * Clamp a value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * App Store with persist middleware
 * Panel sizes are persisted to localStorage
 */
export const useAppStore = create<AppState & AppActions>()(
  persist(
    (set) => ({
      ...initialState,

      // Panel width setters with constraints
      setSidebarWidth: (width: number) => {
        const clampedWidth = clamp(
          width,
          PANEL_CONSTRAINTS.sidebar.min,
          PANEL_CONSTRAINTS.sidebar.max
        )
        set({ sidebarWidth: clampedWidth })
      },

      setInboxWidth: (width: number) => {
        const clampedWidth = clamp(
          width,
          PANEL_CONSTRAINTS.inbox.min,
          PANEL_CONSTRAINTS.inbox.max
        )
        set({ inboxWidth: clampedWidth })
      },

      // Sidebar toggle
      toggleSidebar: () => {
        set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed }))
      },

      setSidebarCollapsed: (collapsed: boolean) => {
        set({ isSidebarCollapsed: collapsed })
      },

      // Project selection
      setCurrentProjectId: (projectId: string | null) => {
        set({ currentProjectId: projectId })
      },

      // Overlay toggles
      setCommandPaletteOpen: (open: boolean) => {
        set({ isCommandPaletteOpen: open })
      },

      toggleCommandPalette: () => {
        set((state) => ({ isCommandPaletteOpen: !state.isCommandPaletteOpen }))
      },

      setSettingsOpen: (open: boolean) => {
        set({ isSettingsOpen: open })
      },

      toggleSettings: () => {
        set((state) => ({ isSettingsOpen: !state.isSettingsOpen }))
      },

      setShortcutsHelpOpen: (open: boolean) => {
        set({ isShortcutsHelpOpen: open })
      },

      toggleShortcutsHelp: () => {
        set((state) => ({ isShortcutsHelpOpen: !state.isShortcutsHelpOpen }))
      },

      // Breadcrumb
      setBreadcrumb: (breadcrumb: string[]) => {
        set({ breadcrumb })
      },

      // Reset to initial state
      reset: () => {
        set(initialState)
      },
    }),
    {
      name: 'task-filewas-app',
      storage: createJSONStorage(() => localStorage),
      // Only persist panel widths and collapsed state
      partialize: (state) => ({
        sidebarWidth: state.sidebarWidth,
        inboxWidth: state.inboxWidth,
        isSidebarCollapsed: state.isSidebarCollapsed,
        currentProjectId: state.currentProjectId,
      }),
    }
  )
)

/**
 * Selector hooks for better performance
 */
export const useSidebarWidth = () => useAppStore((state) => state.sidebarWidth)
export const useInboxWidth = () => useAppStore((state) => state.inboxWidth)
export const useIsSidebarCollapsed = () => useAppStore((state) => state.isSidebarCollapsed)
export const useCurrentProjectId = () => useAppStore((state) => state.currentProjectId)
export const useIsCommandPaletteOpen = () => useAppStore((state) => state.isCommandPaletteOpen)
export const useIsSettingsOpen = () => useAppStore((state) => state.isSettingsOpen)
export const useIsShortcutsHelpOpen = () => useAppStore((state) => state.isShortcutsHelpOpen)
export const useBreadcrumb = () => useAppStore((state) => state.breadcrumb)
