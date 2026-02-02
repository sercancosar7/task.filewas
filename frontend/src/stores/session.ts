/**
 * Session Store - Session and message state management
 * @module @task-filewas/frontend/stores/session
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type {
  Session,
  SessionSummary,
  SessionStatus,
  SessionMode,
  SessionProcessingState,
  TokenUsage,
} from '@task-filewas/shared'
import type {
  Message,
  Turn,
  Activity,
  TodoItem,
  Plan,
} from '@task-filewas/shared'

/**
 * Message being streamed
 */
export interface StreamingMessage {
  id: string
  content: string
  isComplete: boolean
  activities: Activity[]
}

/**
 * Session store state
 */
export interface SessionState {
  // Current session
  currentSessionId: string | null
  currentSession: Session | null

  // Messages for current session
  messages: Message[]
  turns: Turn[]

  // Streaming state
  isStreaming: boolean
  streamingMessage: StreamingMessage | null

  // Processing state
  processingState: SessionProcessingState

  // Token usage
  tokenUsage: TokenUsage | null

  // Todo list
  todoItems: TodoItem[]

  // Active plan
  activePlan: Plan | null

  // Session list (for inbox)
  sessions: SessionSummary[]
  sessionsLoading: boolean
  sessionsError: string | null

  // Filters
  statusFilter: SessionStatus | 'all'
  modeFilter: SessionMode | 'all'
  searchQuery: string
  showFlaggedOnly: boolean
  showUnreadOnly: boolean

  // Sort
  sortField: 'createdAt' | 'updatedAt' | 'title' | 'status'
  sortDirection: 'asc' | 'desc'
}

/**
 * Session store actions
 */
export interface SessionActions {
  // Current session
  setCurrentSessionId: (sessionId: string | null) => void
  setCurrentSession: (session: Session | null) => void
  updateCurrentSession: (updates: Partial<Session>) => void

  // Messages
  setMessages: (messages: Message[]) => void
  addMessage: (message: Message) => void
  updateMessage: (messageId: string, updates: Partial<Message>) => void

  // Turns
  setTurns: (turns: Turn[]) => void
  addTurn: (turn: Turn) => void
  updateTurn: (turnId: string, updates: Partial<Turn>) => void

  // Streaming
  setIsStreaming: (isStreaming: boolean) => void
  setStreamingMessage: (message: StreamingMessage | null) => void
  appendToStreamingContent: (content: string) => void
  addStreamingActivity: (activity: Activity) => void
  finalizeStreamingMessage: () => void

  // Processing state
  setProcessingState: (state: SessionProcessingState) => void

  // Token usage
  setTokenUsage: (usage: TokenUsage | null) => void
  updateTokenUsage: (updates: Partial<TokenUsage>) => void

  // Todo list
  setTodoItems: (items: TodoItem[]) => void
  updateTodoItem: (index: number, updates: Partial<TodoItem>) => void

  // Plan
  setActivePlan: (plan: Plan | null) => void
  updatePlan: (updates: Partial<Plan>) => void

  // Session list
  setSessions: (sessions: SessionSummary[]) => void
  addSession: (session: SessionSummary) => void
  updateSessionInList: (sessionId: string, updates: Partial<SessionSummary>) => void
  removeSessionFromList: (sessionId: string) => void
  setSessionsLoading: (loading: boolean) => void
  setSessionsError: (error: string | null) => void

  // Filters
  setStatusFilter: (status: SessionStatus | 'all') => void
  setModeFilter: (mode: SessionMode | 'all') => void
  setSearchQuery: (query: string) => void
  setShowFlaggedOnly: (flaggedOnly: boolean) => void
  setShowUnreadOnly: (unreadOnly: boolean) => void
  clearFilters: () => void

  // Sort
  setSortField: (field: 'createdAt' | 'updatedAt' | 'title' | 'status') => void
  setSortDirection: (direction: 'asc' | 'desc') => void
  toggleSortDirection: () => void

  // Reset
  resetCurrentSession: () => void
  resetAll: () => void
}

/**
 * Default token usage
 */
const defaultTokenUsage: TokenUsage = {
  inputTokens: 0,
  outputTokens: 0,
  cacheCreationTokens: 0,
  cacheReadTokens: 0,
  totalContext: 0,
  percentUsed: 0,
}

/**
 * Initial state
 */
const initialState: SessionState = {
  currentSessionId: null,
  currentSession: null,
  messages: [],
  turns: [],
  isStreaming: false,
  streamingMessage: null,
  processingState: 'idle',
  tokenUsage: null,
  todoItems: [],
  activePlan: null,
  sessions: [],
  sessionsLoading: false,
  sessionsError: null,
  statusFilter: 'all',
  modeFilter: 'all',
  searchQuery: '',
  showFlaggedOnly: false,
  showUnreadOnly: false,
  sortField: 'updatedAt',
  sortDirection: 'desc',
}

/**
 * Session Store
 */
export const useSessionStore = create<SessionState & SessionActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Current session
      setCurrentSessionId: (sessionId: string | null) => {
        set({ currentSessionId: sessionId })
      },

      setCurrentSession: (session: Session | null) => {
        set({
          currentSession: session,
          currentSessionId: session?.id ?? null,
        })
      },

      updateCurrentSession: (updates: Partial<Session>) => {
        set((state) => ({
          currentSession: state.currentSession
            ? { ...state.currentSession, ...updates }
            : null,
        }))
      },

      // Messages
      setMessages: (messages: Message[]) => {
        set({ messages })
      },

      addMessage: (message: Message) => {
        set((state) => ({
          messages: [...state.messages, message],
        }))
      },

      updateMessage: (messageId: string, updates: Partial<Message>) => {
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg.id === messageId ? { ...msg, ...updates } : msg
          ),
        }))
      },

      // Turns
      setTurns: (turns: Turn[]) => {
        set({ turns })
      },

      addTurn: (turn: Turn) => {
        set((state) => ({
          turns: [...state.turns, turn],
        }))
      },

      updateTurn: (turnId: string, updates: Partial<Turn>) => {
        set((state) => ({
          turns: state.turns.map((turn) =>
            turn.id === turnId ? { ...turn, ...updates } : turn
          ),
        }))
      },

      // Streaming
      setIsStreaming: (isStreaming: boolean) => {
        set({ isStreaming })
      },

      setStreamingMessage: (message: StreamingMessage | null) => {
        set({ streamingMessage: message })
      },

      appendToStreamingContent: (content: string) => {
        set((state) => ({
          streamingMessage: state.streamingMessage
            ? {
                ...state.streamingMessage,
                content: state.streamingMessage.content + content,
              }
            : null,
        }))
      },

      addStreamingActivity: (activity: Activity) => {
        set((state) => ({
          streamingMessage: state.streamingMessage
            ? {
                ...state.streamingMessage,
                activities: [...state.streamingMessage.activities, activity],
              }
            : null,
        }))
      },

      finalizeStreamingMessage: () => {
        const { streamingMessage, messages } = get()
        if (streamingMessage) {
          const finalMessage: Message = {
            id: streamingMessage.id,
            sessionId: get().currentSessionId ?? '',
            role: 'assistant',
            content: streamingMessage.content,
            contentType: 'text',
            timestamp: new Date().toISOString(),
          }
          set({
            messages: [...messages, finalMessage],
            streamingMessage: null,
            isStreaming: false,
          })
        }
      },

      // Processing state
      setProcessingState: (processingState: SessionProcessingState) => {
        set({ processingState })
      },

      // Token usage
      setTokenUsage: (tokenUsage: TokenUsage | null) => {
        set({ tokenUsage })
      },

      updateTokenUsage: (updates: Partial<TokenUsage>) => {
        set((state) => ({
          tokenUsage: state.tokenUsage
            ? { ...state.tokenUsage, ...updates }
            : { ...defaultTokenUsage, ...updates },
        }))
      },

      // Todo list
      setTodoItems: (todoItems: TodoItem[]) => {
        set({ todoItems })
      },

      updateTodoItem: (index: number, updates: Partial<TodoItem>) => {
        set((state) => ({
          todoItems: state.todoItems.map((item, i) =>
            i === index ? { ...item, ...updates } : item
          ),
        }))
      },

      // Plan
      setActivePlan: (activePlan: Plan | null) => {
        set({ activePlan })
      },

      updatePlan: (updates: Partial<Plan>) => {
        set((state) => ({
          activePlan: state.activePlan
            ? { ...state.activePlan, ...updates }
            : null,
        }))
      },

      // Session list
      setSessions: (sessions: SessionSummary[]) => {
        set({ sessions })
      },

      addSession: (session: SessionSummary) => {
        set((state) => ({
          sessions: [session, ...state.sessions],
        }))
      },

      updateSessionInList: (sessionId: string, updates: Partial<SessionSummary>) => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId ? { ...s, ...updates } : s
          ),
        }))
      },

      removeSessionFromList: (sessionId: string) => {
        set((state) => ({
          sessions: state.sessions.filter((s) => s.id !== sessionId),
        }))
      },

      setSessionsLoading: (sessionsLoading: boolean) => {
        set({ sessionsLoading })
      },

      setSessionsError: (sessionsError: string | null) => {
        set({ sessionsError })
      },

      // Filters
      setStatusFilter: (statusFilter: SessionStatus | 'all') => {
        set({ statusFilter })
      },

      setModeFilter: (modeFilter: SessionMode | 'all') => {
        set({ modeFilter })
      },

      setSearchQuery: (searchQuery: string) => {
        set({ searchQuery })
      },

      setShowFlaggedOnly: (showFlaggedOnly: boolean) => {
        set({ showFlaggedOnly })
      },

      setShowUnreadOnly: (showUnreadOnly: boolean) => {
        set({ showUnreadOnly })
      },

      clearFilters: () => {
        set({
          statusFilter: 'all',
          modeFilter: 'all',
          searchQuery: '',
          showFlaggedOnly: false,
          showUnreadOnly: false,
        })
      },

      // Sort
      setSortField: (sortField: 'createdAt' | 'updatedAt' | 'title' | 'status') => {
        set({ sortField })
      },

      setSortDirection: (sortDirection: 'asc' | 'desc') => {
        set({ sortDirection })
      },

      toggleSortDirection: () => {
        set((state) => ({
          sortDirection: state.sortDirection === 'asc' ? 'desc' : 'asc',
        }))
      },

      // Reset
      resetCurrentSession: () => {
        set({
          currentSessionId: null,
          currentSession: null,
          messages: [],
          turns: [],
          isStreaming: false,
          streamingMessage: null,
          processingState: 'idle',
          tokenUsage: null,
          todoItems: [],
          activePlan: null,
        })
      },

      resetAll: () => {
        set(initialState)
      },
    }),
    {
      name: 'task-filewas-session',
      storage: createJSONStorage(() => localStorage),
      // Only persist filters and sort preferences
      partialize: (state) => ({
        statusFilter: state.statusFilter,
        modeFilter: state.modeFilter,
        sortField: state.sortField,
        sortDirection: state.sortDirection,
        showFlaggedOnly: state.showFlaggedOnly,
        showUnreadOnly: state.showUnreadOnly,
      }),
    }
  )
)

/**
 * Selector hooks for better performance
 */
export const useCurrentSessionId = () => useSessionStore((state) => state.currentSessionId)
export const useCurrentSession = () => useSessionStore((state) => state.currentSession)
export const useMessages = () => useSessionStore((state) => state.messages)
export const useTurns = () => useSessionStore((state) => state.turns)
export const useIsStreaming = () => useSessionStore((state) => state.isStreaming)
export const useStreamingMessage = () => useSessionStore((state) => state.streamingMessage)
export const useProcessingState = () => useSessionStore((state) => state.processingState)
export const useTokenUsage = () => useSessionStore((state) => state.tokenUsage)
export const useTodoItems = () => useSessionStore((state) => state.todoItems)
export const useActivePlan = () => useSessionStore((state) => state.activePlan)
export const useSessions = () => useSessionStore((state) => state.sessions)
export const useSessionsLoading = () => useSessionStore((state) => state.sessionsLoading)
export const useSessionsError = () => useSessionStore((state) => state.sessionsError)

/**
 * Computed selectors
 */
export const useFilteredSessions = () => {
  return useSessionStore((state) => {
    let filtered = state.sessions

    // Status filter
    if (state.statusFilter !== 'all') {
      filtered = filtered.filter((s) => s.status === state.statusFilter)
    }

    // Mode filter
    if (state.modeFilter !== 'all') {
      filtered = filtered.filter((s) => s.mode === state.modeFilter)
    }

    // Search query
    if (state.searchQuery) {
      const query = state.searchQuery.toLowerCase()
      filtered = filtered.filter(
        (s) =>
          s.title.toLowerCase().includes(query) ||
          s.labels.some((l) => l.name.toLowerCase().includes(query))
      )
    }

    // Flagged only
    if (state.showFlaggedOnly) {
      filtered = filtered.filter((s) => s.isFlagged)
    }

    // Unread only
    if (state.showUnreadOnly) {
      filtered = filtered.filter((s) => s.hasUnread)
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      let comparison = 0
      switch (state.sortField) {
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
        case 'updatedAt':
          comparison =
            new Date(a.updatedAt ?? a.createdAt).getTime() -
            new Date(b.updatedAt ?? b.createdAt).getTime()
          break
        case 'title':
          comparison = a.title.localeCompare(b.title)
          break
        case 'status':
          comparison = a.status.localeCompare(b.status)
          break
      }
      return state.sortDirection === 'asc' ? comparison : -comparison
    })

    return filtered
  })
}

/**
 * Session counts by status
 */
export const useSessionCounts = () => {
  return useSessionStore((state) => {
    const counts = {
      all: state.sessions.length,
      todo: 0,
      'in-progress': 0,
      'needs-review': 0,
      done: 0,
      cancelled: 0,
      flagged: 0,
      unread: 0,
    }

    for (const session of state.sessions) {
      if (session.status in counts) {
        counts[session.status as keyof typeof counts]++
      }
      if (session.isFlagged) counts.flagged++
      if (session.hasUnread) counts.unread++
    }

    return counts
  })
}
