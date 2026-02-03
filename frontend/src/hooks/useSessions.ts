/**
 * useSessions Hook
 * Fetch and manage sessions with filtering, sorting, and pagination
 * @module @task-filewas/frontend/hooks/useSessions
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import type {
  SessionSummary,
  SessionFilter,
  SessionSort,
  PaginationMeta,
} from '@task-filewas/shared'

// =============================================================================
// Types
// =============================================================================

/**
 * Sessions API response structure
 */
interface SessionsResponse {
  success: boolean
  data?: SessionSummary[]
  error?: string
  meta?: PaginationMeta
}

/**
 * Hook state
 */
interface UseSessionsState {
  /** Sessions list */
  sessions: SessionSummary[]
  /** Loading state */
  isLoading: boolean
  /** Error message */
  error: string | null
  /** Pagination metadata */
  meta: PaginationMeta | null
}

/**
 * Hook options
 */
export interface UseSessionsOptions {
  /** Project ID filter (optional) */
  projectId?: string
  /** Initial filter settings */
  initialFilter?: SessionFilter
  /** Initial sort settings */
  initialSort?: SessionSort
  /** Initial page size (default: 20) */
  pageSize?: number
  /** Auto fetch on mount (default: true) */
  autoFetch?: boolean
}

/**
 * Hook return type
 */
export interface UseSessionsReturn {
  /** Sessions list */
  sessions: SessionSummary[]
  /** Loading state */
  isLoading: boolean
  /** Error message */
  error: string | null
  /** Pagination metadata */
  meta: PaginationMeta | null
  /** Current filter */
  filter: SessionFilter
  /** Current sort */
  sort: SessionSort | undefined
  /** Current page */
  page: number
  /** Refresh sessions list */
  refresh: () => Promise<void>
  /** Set filter and refetch */
  setFilter: (filter: SessionFilter) => void
  /** Set sort and refetch */
  setSort: (sort: SessionSort | undefined) => void
  /** Set search query */
  setSearch: (search: string) => void
  /** Go to page */
  goToPage: (page: number) => void
  /** Go to next page */
  nextPage: () => void
  /** Go to previous page */
  previousPage: () => void
  /** Reset to initial state */
  reset: () => void
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Get API base URL from environment
 */
function getApiUrl(): string {
  return import.meta.env.VITE_API_URL || 'http://localhost:3001'
}

/**
 * Build query string from filter, sort, and pagination params
 */
function buildQueryString(
  filter: SessionFilter,
  sort: SessionSort | undefined,
  page: number,
  limit: number
): string {
  const params = new URLSearchParams()

  // Pagination
  params.set('page', String(page))
  params.set('limit', String(limit))

  // Filter params
  if (filter.projectId) {
    params.set('projectId', filter.projectId)
  }

  if (filter.status) {
    if (Array.isArray(filter.status)) {
      params.set('status', filter.status.join(','))
    } else {
      params.set('status', filter.status)
    }
  }

  if (filter.mode) {
    if (Array.isArray(filter.mode)) {
      params.set('mode', filter.mode.join(','))
    } else {
      params.set('mode', filter.mode)
    }
  }

  if (filter.labelIds && filter.labelIds.length > 0) {
    params.set('labelIds', filter.labelIds.join(','))
  }

  if (filter.isFlagged !== undefined) {
    params.set('isFlagged', String(filter.isFlagged))
  }

  if (filter.hasUnread !== undefined) {
    params.set('hasUnread', String(filter.hasUnread))
  }

  if (filter.version) {
    params.set('version', filter.version)
  }

  if (filter.search) {
    params.set('search', filter.search)
  }

  if (filter.fromDate) {
    params.set('fromDate', filter.fromDate)
  }

  if (filter.toDate) {
    params.set('toDate', filter.toDate)
  }

  // Sort params
  if (sort) {
    params.set('sortBy', sort.field)
    params.set('sortOrder', sort.direction)
  }

  return params.toString()
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * React hook for fetching and managing sessions
 *
 * @example
 * ```tsx
 * function SessionList() {
 *   const { sessions, isLoading, error, setSearch, setFilter, refresh } = useSessions({
 *     projectId: 'project-123',
 *     pageSize: 20,
 *   })
 *
 *   if (isLoading) return <Spinner />
 *   if (error) return <Error message={error} />
 *
 *   return (
 *     <div>
 *       {sessions.map(session => (
 *         <SessionCard key={session.id} session={session} />
 *       ))}
 *     </div>
 *   )
 * }
 * ```
 */
export function useSessions(options: UseSessionsOptions = {}): UseSessionsReturn {
  const {
    projectId,
    initialFilter = {},
    initialSort,
    pageSize = 20,
    autoFetch = true,
  } = options

  // State
  const [state, setState] = useState<UseSessionsState>({
    sessions: [],
    isLoading: false,
    error: null,
    meta: null,
  })

  const [filter, setFilterState] = useState<SessionFilter>(() => {
    const baseFilter: SessionFilter = { ...initialFilter }
    if (projectId) {
      baseFilter.projectId = projectId
    }
    return baseFilter
  })

  const [sort, setSortState] = useState<SessionSort | undefined>(initialSort)
  const [page, setPage] = useState(1)

  // Refs to track mount state and avoid stale closures
  const isMountedRef = useRef(true)
  const abortControllerRef = useRef<AbortController | null>(null)

  /**
   * Fetch sessions from API
   */
  const fetchSessions = useCallback(async () => {
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController()

    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      const queryString = buildQueryString(filter, sort, page, pageSize)
      const url = `${getApiUrl()}/api/sessions?${queryString}`

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Add auth token if available
          ...(localStorage.getItem('token')
            ? { Authorization: `Bearer ${localStorage.getItem('token')}` }
            : {}),
        },
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`)
      }

      const data: SessionsResponse = await response.json()

      if (!isMountedRef.current) return

      if (data.success && data.data) {
        setState({
          sessions: data.data,
          isLoading: false,
          error: null,
          meta: data.meta || null,
        })
      } else {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: data.error || 'Failed to fetch sessions',
        }))
      }
    } catch (err) {
      // Ignore abort errors
      if (err instanceof Error && err.name === 'AbortError') {
        return
      }

      if (!isMountedRef.current) return

      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'An error occurred',
      }))
    }
  }, [filter, sort, page, pageSize])

  /**
   * Refresh sessions
   */
  const refresh = useCallback(async () => {
    await fetchSessions()
  }, [fetchSessions])

  /**
   * Set filter and reset to page 1
   */
  const setFilter = useCallback((newFilter: SessionFilter) => {
    setFilterState((prev) => ({ ...prev, ...newFilter }))
    setPage(1)
  }, [])

  /**
   * Set sort and reset to page 1
   */
  const setSort = useCallback((newSort: SessionSort | undefined) => {
    setSortState(newSort)
    setPage(1)
  }, [])

  /**
   * Set search query (convenience method)
   */
  const setSearch = useCallback((search: string) => {
    setFilterState((prev) => {
      const newFilter: SessionFilter = { ...prev }
      if (search) {
        newFilter.search = search
      } else {
        delete newFilter.search
      }
      return newFilter
    })
    setPage(1)
  }, [])

  /**
   * Go to specific page
   */
  const goToPage = useCallback((newPage: number) => {
    if (newPage >= 1) {
      setPage(newPage)
    }
  }, [])

  /**
   * Go to next page
   */
  const nextPage = useCallback(() => {
    if (state.meta && page < state.meta.totalPages) {
      setPage((prev) => prev + 1)
    }
  }, [page, state.meta])

  /**
   * Go to previous page
   */
  const previousPage = useCallback(() => {
    if (page > 1) {
      setPage((prev) => prev - 1)
    }
  }, [page])

  /**
   * Reset to initial state
   */
  const reset = useCallback(() => {
    const baseFilter: SessionFilter = { ...initialFilter }
    if (projectId) {
      baseFilter.projectId = projectId
    }
    setFilterState(baseFilter)
    setSortState(initialSort)
    setPage(1)
  }, [initialFilter, initialSort, projectId])

  // Update filter when projectId changes
  useEffect(() => {
    if (projectId) {
      setFilterState((prev) => ({ ...prev, projectId }))
    }
  }, [projectId])

  // Fetch on mount and when dependencies change
  useEffect(() => {
    if (autoFetch) {
      fetchSessions()
    }

    return () => {
      // Cleanup: abort pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [autoFetch, fetchSessions])

  // Track mount state
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  return {
    sessions: state.sessions,
    isLoading: state.isLoading,
    error: state.error,
    meta: state.meta,
    filter,
    sort,
    page,
    refresh,
    setFilter,
    setSort,
    setSearch,
    goToPage,
    nextPage,
    previousPage,
    reset,
  }
}

export default useSessions
