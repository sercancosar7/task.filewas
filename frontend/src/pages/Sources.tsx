/**
 * Sources Page
 * MCP, API, and Local source management interface
 * @module @task-filewas/frontend/pages/Sources
 *
 * Features:
 * - List all sources (MCP, API, Local)
 * - Add new source with dialog
 * - Toggle source enabled status
 * - Test source connection
 * - Delete source
 * - Filter by source type
 *
 * Design Reference: Craft Agents settings page
 */

import * as React from 'react'
import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Database,
  Globe,
  Folder,
  Plus,
  Loader2,
  RefreshCw,
  Search,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import type { Source, SourceType, SourceSummary } from '@task-filewas/shared'
import { SourceList } from '@/components/sources/SourceList'
import { AddSourceDialog } from '@/components/sources/AddSourceDialog'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/lib/utils'

// =============================================================================
// Types
// =============================================================================

interface SourceGroup {
  type: SourceType
  label: string
  icon: React.ElementType
  description: string
  sources: SourceSummary[]
}

// =============================================================================
// Helpers
// =============================================================================

function getApiUrl(): string {
  return import.meta.env.VITE_API_URL || 'http://localhost:3001'
}

async function fetchSources(type?: SourceType): Promise<Source[]> {
  const token = localStorage.getItem('token')
  const url = type
    ? `${getApiUrl()}/api/sources/${type}`
    : `${getApiUrl()}/api/sources`

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`)
  }

  const result = await response.json()
  return result.data || []
}

async function toggleSource(id: string): Promise<Source> {
  const token = localStorage.getItem('token')
  const response = await fetch(`${getApiUrl()}/api/sources/${id}/toggle`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`)
  }

  const result = await response.json()
  return result.data
}

async function testSource(id: string): Promise<{ success: boolean; latency?: number; error?: string }> {
  const token = localStorage.getItem('token')
  const response = await fetch(`${getApiUrl()}/api/sources/${id}/test`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`)
  }

  const result = await response.json()
  return result.data
}

async function deleteSource(id: string): Promise<void> {
  const token = localStorage.getItem('token')
  const response = await fetch(`${getApiUrl()}/api/sources/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`)
  }
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Sources page - Manage MCP, API, and Local data sources
 */
export default function Sources() {
  const navigate = useNavigate()
  const { toast } = useToast()

  // State
  const [sources, setSources] = useState<Source[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeType, setActiveType] = useState<SourceType | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Fetch sources
  const loadSources = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        navigate('/login')
        return
      }

      const data = await fetchSources()
      setSources(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sources')
    } finally {
      setIsLoading(false)
    }
  }, [navigate])

  // Initial load
  useEffect(() => {
    loadSources()
  }, [loadSources])

  // Filter sources by type and search query
  const filteredSources = React.useMemo(() => {
    let filtered = sources

    // Filter by type
    if (activeType !== 'all') {
      filtered = filtered.filter((s) => s.type === activeType)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((s) =>
        s.name.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [sources, activeType, searchQuery])

  // Group sources by type
  const sourceGroups = React.useMemo((): SourceGroup[] => {
    const groups: SourceGroup[] = [
      {
        type: 'mcp',
        label: 'MCP Servers',
        icon: Database,
        description: 'Model Context Protocol servers',
        sources: sources.filter((s) => s.type === 'mcp'),
      },
      {
        type: 'api',
        label: 'API Sources',
        icon: Globe,
        description: 'External API integrations',
        sources: sources.filter((s) => s.type === 'api'),
      },
      {
        type: 'local',
        label: 'Local Folders',
        icon: Folder,
        description: 'Local file system sources',
        sources: sources.filter((s) => s.type === 'local'),
      },
    ]

    // Apply search filter to groups
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      return groups.map((group) => ({
        ...group,
        sources: group.sources.filter((s) => s.name.toLowerCase().includes(query)),
      }))
    }

    return groups
  }, [sources, searchQuery])

  // Toggle source enabled state
  const handleToggle = async (id: string) => {
    setTogglingId(id)
    setError(null)

    try {
      const updated = await toggleSource(id)
      setSources((prev) =>
        prev.map((s) => (s.id === id ? updated : s))
      )
      toast.success(`${updated.name} ${updated.enabled ? 'etkinleştirildi' : 'devre dışı bırakıldı'}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle source')
      toast.error(err instanceof Error ? err.message : 'Failed to toggle source')
    } finally {
      setTogglingId(null)
    }
  }

  // Test source connection
  const handleTest = async (id: string) => {
    setTestingId(id)
    setError(null)

    try {
      const result = await testSource(id)

      if (result.success) {
        toast.success(`Bağlantı başarılı - Gecikme: ${result.latency}ms`)
      } else {
        toast.error(result.error || 'Bağlantı başarısız')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to test source')
      toast.error(err instanceof Error ? err.message : 'Failed to test source')
    } finally {
      setTestingId(null)
    }
  }

  // Delete source
  const handleDelete = async (id: string) => {
    if (!confirm('Bu kaynağı silmek istediğinizden emin misiniz?')) {
      return
    }

    setDeletingId(id)
    setError(null)

    try {
      await deleteSource(id)
      setSources((prev) => prev.filter((s) => s.id !== id))
      toast.success('Kaynak başarıyla silindi')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete source')
      toast.error(err instanceof Error ? err.message : 'Failed to delete source')
    } finally {
      setDeletingId(null)
    }
  }

  // Handle source created
  const handleSourceCreated = (newSource: Source) => {
    setSources((prev) => [...prev, newSource])
    toast.success(`${newSource.name} başarıyla oluşturuldu`)
  }

  // Get counts for each type
  const getCount = (type: SourceType) => sources.filter((s) => s.type === type).length
  const getEnabledCount = (type: SourceType) =>
    sources.filter((s) => s.type === type && s.enabled).length

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-foreground/10 bg-foreground/[0.02]">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Kaynaklar
              </h1>
              <p className="mt-1 text-[13px] text-foreground/60">
                MCP, API ve yerel dosya kaynaklarını yönetin
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={loadSources}
                disabled={isLoading}
              >
                <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
              </Button>
              <Button
                size="sm"
                onClick={() => setIsAddDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Yeni Kaynak
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-6xl px-6 py-6">
        {/* Error Message */}
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="text-[13px]">{error}</span>
          </div>
        )}

        {/* Search Bar */}
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
          <Input
            type="search"
            placeholder="Kaynak ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-9"
          />
        </div>

        {/* Tabs for filtering */}
        <Tabs value={activeType} onValueChange={(v) => setActiveType(v as SourceType | 'all')}>
          <TabsList className="mb-6">
            <TabsTrigger value="all">
              Tümü ({sources.length})
            </TabsTrigger>
            <TabsTrigger value="mcp">
              <Database className="h-4 w-4 mr-2" />
              MCP ({getCount('mcp')})
            </TabsTrigger>
            <TabsTrigger value="api">
              <Globe className="h-4 w-4 mr-2" />
              API ({getCount('api')})
            </TabsTrigger>
            <TabsTrigger value="local">
              <Folder className="h-4 w-4 mr-2" />
              Local ({getCount('local')})
            </TabsTrigger>
          </TabsList>

          {/* Loading State */}
          {isLoading ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-foreground/40" />
            </div>
          ) : (
            <>
              {/* Filtered List View (when a type is selected) */}
              {activeType !== 'all' ? (
                <TabsContent value={activeType} className="mt-0">
                  <SourceList
                    sources={filteredSources}
                    onToggle={handleToggle}
                    onTest={handleTest}
                    onDelete={handleDelete}
                    togglingId={togglingId}
                    testingId={testingId}
                    deletingId={deletingId}
                  />
                </TabsContent>
              ) : (
                /* Grouped View (when "all" is selected) */
                <div className="space-y-8">
                  {sourceGroups.map((group) => (
                    <div key={group.type}>
                      {/* Group Header */}
                      <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                            <group.icon className="h-4 w-4 text-accent" />
                          </div>
                          <div>
                            <h3 className="text-[15px] font-medium text-foreground">
                              {group.label}
                            </h3>
                            <p className="text-[11px] text-foreground/40">
                              {group.description}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[11px]">
                          {getEnabledCount(group.type)} / {getCount(group.type)} aktif
                        </Badge>
                      </div>

                      {/* Group Sources */}
                      {group.sources.length === 0 ? (
                        <div className="flex min-h-[120px] items-center justify-center rounded-lg border border-dashed border-foreground/10">
                          <p className="text-[13px] text-foreground/40">
                            Bu kategoride kaynak yok
                          </p>
                        </div>
                      ) : (
                        <SourceList
                          sources={group.sources}
                          onToggle={handleToggle}
                          onTest={handleTest}
                          onDelete={handleDelete}
                          togglingId={togglingId}
                          testingId={testingId}
                          deletingId={deletingId}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </Tabs>
      </div>

      {/* Add Source Dialog */}
      <AddSourceDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSourceCreated={handleSourceCreated}
      />
    </div>
  )
}
