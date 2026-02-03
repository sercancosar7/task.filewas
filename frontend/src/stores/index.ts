/**
 * Store exports
 * @module @task-filewas/frontend/stores
 */

// App store
export {
  useAppStore,
  useSidebarWidth,
  useInboxWidth,
  useIsSidebarCollapsed,
  useCurrentProjectId,
  useIsCommandPaletteOpen,
  useIsSettingsOpen,
  useIsShortcutsHelpOpen,
  useBreadcrumb,
  PANEL_CONSTRAINTS,
  type AppState,
  type AppActions,
  type AppTheme,
} from './app'

// Session store
export {
  useSessionStore,
  useCurrentSessionId,
  useCurrentSession,
  useMessages,
  useTurns,
  useIsStreaming,
  useStreamingMessage,
  useProcessingState,
  useTokenUsage,
  useTodoItems,
  useActivePlan,
  useSessions,
  useSessionsLoading,
  useSessionsError,
  useFilteredSessions,
  useSessionCounts,
  type SessionState,
  type SessionActions,
  type StreamingMessage,
} from './session'

// Task store
export {
  useTaskStore,
  useTasks,
  useActiveTasks,
  useCompletedTasks,
  useTaskCount,
  useTask,
  type TaskStoreState,
  type TaskStoreActions,
  type BackgroundTask,
  type TaskStatus,
  type TaskType,
} from './tasks'
