/**
 * ProjectChangelogTab - Changelog tab içeriği
 * @module @task-filewas/frontend/components/project/tabs/ProjectChangelogTab
 *
 * Değişiklik geçmişi görüntüleme
 */

import * as React from 'react'
import { useEffect } from 'react'
import { cn } from '@/lib/utils'
import { ChangelogList } from '@/components/changelog/ChangelogList'
import type { ChangelogEntry as ChangelogEntryType } from '@task-filewas/shared'

// =============================================================================
// Types
// =============================================================================

export interface ProjectChangelogTabProps {
  projectId: string
  className?: string
}

interface ChangelogResponse {
  entries: ChangelogEntryType[]
  meta: {
    total: number
    filtered: number
    version: string
    projectPath: string
  }
}

interface ApiResponse<T> {
  success: boolean
  data: T
  error?: string
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Simple API fetch helper
 * Uses localStorage token for auth
 */
async function apiGet<T>(url: string): Promise<{ data: T | null; error: string | null }> {
  const token = localStorage.getItem('auth_token')

  try {
    const response = await fetch(`/api${url}`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const result: ApiResponse<T> = await response.json()

    if (result.success && result.data) {
      return { data: result.data, error: null }
    }

    return { data: null, error: result.error || 'Unknown error' }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Fetch error' }
  }
}

// =============================================================================
// Component
// =============================================================================

/**
 * ProjectChangelogTab - Değişiklik geçmişi görüntüleme
 *
 * API'den changelog verilerini çeker ve ChangelogList ile gösterir
 */
export function ProjectChangelogTab({ projectId, className }: ProjectChangelogTabProps) {
  const [entries, setEntries] = React.useState<ChangelogEntryType[]>([])
  const [version, setVersion] = React.useState<string>('v0.1.0')
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  // Fetch changelog data
  const fetchChangelog = React.useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await apiGet<ChangelogResponse>(`/projects/${projectId}/changelog`)
      if (response.data) {
        setEntries(response.data.entries || [])
        setVersion(response.data.meta?.version || 'v0.1.0')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Changelog yüklenemedi'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  // Initial fetch
  useEffect(() => {
    if (projectId) {
      fetchChangelog()
    }
  }, [projectId, fetchChangelog])

  return (
    <div className={cn('flex flex-col h-full', className)}>
      <ChangelogList
        entries={entries}
        isLoading={isLoading}
        error={error}
        version={version}
        onRetry={fetchChangelog}
      />
    </div>
  )
}

export default ProjectChangelogTab
