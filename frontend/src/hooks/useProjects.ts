/**
 * useProjects Hook
 * Fetch and manage projects with filtering, sorting, and pagination
 * @module @task-filewas/frontend/hooks/useProjects
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import type {
  ProjectSummary,
  ProjectStatus,
  ProjectType,
  PaginationMeta,
  ProjectCreate,
} from '@task-filewas/shared'

// =============================================================================
// Types
// =============================================================================

/**
 * Projects API response structure
 */
interface ProjectsResponse {
  success: boolean
  data?: ProjectSummary[]
  error?: string
  meta?: PaginationMeta
}

/**
 * Create project API response
 */
interface CreateProjectResponse {
  success: boolean
  data?: ProjectSummary
  error?: string
}

/**
 * Project filter options
 */
export interface ProjectFilter {
  /** Filter by status */
  status?: ProjectStatus | ProjectStatus[]
  /** Filter by type */
  type?: ProjectType | ProjectType[]
  /** Filter by tags (any match) */
  tags?: string[]
  /** Search in name and description */
  search?: string
}

/**
 * Project sort options
 */
export interface ProjectSort {
  /** Sort field */
  field: 'createdAt' | 'updatedAt' | 'name' | 'lastActivityAt' | 'sessionCount'
  /** Sort direction */
  direction: 'asc' | 'desc'
}

/**
 * Hook state
 */
interface UseProjectsState {
  /** Projects list */
  projects: ProjectSummary[]
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
export interface UseProjectsOptions {
  /** Initial filter settings */
  initialFilter?: ProjectFilter
  /** Initial sort settings */
  initialSort?: ProjectSort
  /** Initial page size (default: 20) */
  pageSize?: number
  /** Auto fetch on mount (default: true) */
  autoFetch?: boolean
}

/**
 * Hook return type
 */
export interface UseProjectsReturn {
  /** Projects list */
  projects: ProjectSummary[]
  /** Loading state */
  isLoading: boolean
  /** Error message */
  error: string | null
  /** Pagination metadata */
  meta: PaginationMeta | null
  /** Current filter */
  filter: ProjectFilter
  /** Current sort */
  sort: ProjectSort | undefined
  /** Current page */
  page: number
  /** Refresh projects list */
  refresh: () => Promise<void>
  /** Set filter and refetch */
  setFilter: (filter: ProjectFilter) => void
  /** Set sort and refetch */
  setSort: (sort: ProjectSort | undefined) => void
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
  /** Create a new project */
  createProject: (data: ProjectCreate) => Promise<ProjectSummary | null>
  /** Creating state */
  isCreating: boolean
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
  filter: ProjectFilter,
  sort: ProjectSort | undefined,
  page: number,
  limit: number
): string {
  const params = new URLSearchParams()

  // Pagination
  params.set('page', String(page))
  params.set('limit', String(limit))

  // Filter params
  if (filter.status) {
    if (Array.isArray(filter.status)) {
      params.set('status', filter.status.join(','))
    } else {
      params.set('status', filter.status)
    }
  }

  if (filter.type) {
    if (Array.isArray(filter.type)) {
      params.set('type', filter.type.join(','))
    } else {
      params.set('type', filter.type)
    }
  }

  if (filter.tags && filter.tags.length > 0) {
    params.set('tags', filter.tags.join(','))
  }

  if (filter.search) {
    params.set('search', filter.search)
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
 * React hook for fetching and managing projects
 *
 * @example
 * ```tsx
 * function ProjectList() {
 *   const { projects, isLoading, error, setSearch, refresh, createProject } = useProjects({
 *     pageSize: 20,
 *   })
 *
 *   if (isLoading) return <Spinner />
 *   if (error) return <Error message={error} />
 *
 *   return (
 *     <div>
 *       {projects.map(project => (
 *         <ProjectCard key={project.id} project={project} />
 *       ))}
 *     </div>
 *   )
 * }
 * ```
 */
export function useProjects(options: UseProjectsOptions = {}): UseProjectsReturn {
  const {
    initialFilter = {},
    initialSort,
    pageSize = 20,
    autoFetch = true,
  } = options

  // State
  const [state, setState] = useState<UseProjectsState>({
    projects: [],
    isLoading: false,
    error: null,
    meta: null,
  })

  const [filter, setFilterState] = useState<ProjectFilter>({ ...initialFilter })
  const [sort, setSortState] = useState<ProjectSort | undefined>(initialSort)
  const [page, setPage] = useState(1)
  const [isCreating, setIsCreating] = useState(false)

  // Refs to track mount state and avoid stale closures
  const isMountedRef = useRef(true)
  const abortControllerRef = useRef<AbortController | null>(null)

  /**
   * Fetch projects from API
   */
  const fetchProjects = useCallback(async () => {
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController()

    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      const queryString = buildQueryString(filter, sort, page, pageSize)
      const url = `${getApiUrl()}/api/projects?${queryString}`

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

      const data: ProjectsResponse = await response.json()

      if (!isMountedRef.current) return

      if (data.success && data.data) {
        setState({
          projects: data.data,
          isLoading: false,
          error: null,
          meta: data.meta || null,
        })
      } else {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: data.error || 'Failed to fetch projects',
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
   * Refresh projects
   */
  const refresh = useCallback(async () => {
    await fetchProjects()
  }, [fetchProjects])

  /**
   * Set filter and reset to page 1
   */
  const setFilter = useCallback((newFilter: ProjectFilter) => {
    setFilterState((prev) => ({ ...prev, ...newFilter }))
    setPage(1)
  }, [])

  /**
   * Set sort and reset to page 1
   */
  const setSort = useCallback((newSort: ProjectSort | undefined) => {
    setSortState(newSort)
    setPage(1)
  }, [])

  /**
   * Set search query (convenience method)
   */
  const setSearch = useCallback((search: string) => {
    setFilterState((prev) => {
      const newFilter: ProjectFilter = { ...prev }
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
    setFilterState({ ...initialFilter })
    setSortState(initialSort)
    setPage(1)
  }, [initialFilter, initialSort])

  /**
   * Create a new project
   */
  const createProject = useCallback(
    async (data: ProjectCreate): Promise<ProjectSummary | null> => {
      setIsCreating(true)

      try {
        const url = `${getApiUrl()}/api/projects`

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(localStorage.getItem('token')
              ? { Authorization: `Bearer ${localStorage.getItem('token')}` }
              : {}),
          },
          body: JSON.stringify(data),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `HTTP error: ${response.status}`)
        }

        const result: CreateProjectResponse = await response.json()

        if (result.success && result.data) {
          // Refresh the list to include the new project
          await fetchProjects()
          return result.data
        } else {
          throw new Error(result.error || 'Failed to create project')
        }
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : 'Failed to create project',
        }))
        return null
      } finally {
        setIsCreating(false)
      }
    },
    [fetchProjects]
  )

  // Fetch on mount and when dependencies change
  useEffect(() => {
    if (autoFetch) {
      fetchProjects()
    }

    return () => {
      // Cleanup: abort pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [autoFetch, fetchProjects])

  // Track mount state
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  return {
    projects: state.projects,
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
    createProject,
    isCreating,
  }
}

export default useProjects
