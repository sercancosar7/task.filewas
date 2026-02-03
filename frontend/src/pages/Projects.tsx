/**
 * Projects Page - List and manage all projects
 * @module @task-filewas/frontend/pages/Projects
 *
 * Features:
 * - Project list with search and filters
 * - Create new project button
 * - Project card click to navigate to detail
 * - Filter by status and type
 * - Sort by name, date, session count
 * - Pagination
 *
 * Design Reference: Craft Agents list views
 */

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useProjects } from '@/hooks/useProjects'
import { ProjectCard } from '@/components/project/ProjectCard'
import { NewProjectDialog } from '@/components/project/NewProjectDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Plus,
  Search,
  Loader2,
  AlertCircle,
  RefreshCw,
  FolderOpen,
  SlidersHorizontal,
  ArrowUpDown,
} from 'lucide-react'
import type { ProjectCreate, ProjectStatus, ProjectType } from '@task-filewas/shared'

// =============================================================================
// Types
// =============================================================================

type SortField = 'name' | 'createdAt' | 'updatedAt' | 'lastActivityAt' | 'sessionCount'
type SortDirection = 'asc' | 'desc'

// =============================================================================
// Constants
// =============================================================================

const STATUS_OPTIONS: Array<{ value: ProjectStatus | 'all'; label: string }> = [
  { value: 'all', label: 'Tum Durumlar' },
  { value: 'active', label: 'Aktif' },
  { value: 'archived', label: 'Arsivlenmis' },
  { value: 'deleted', label: 'Silinmis' },
]

const TYPE_OPTIONS: Array<{ value: ProjectType | 'all'; label: string }> = [
  { value: 'all', label: 'Tum Tipler' },
  { value: 'web', label: 'Web' },
  { value: 'backend', label: 'Backend' },
  { value: 'fullstack', label: 'Fullstack' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'cli', label: 'CLI' },
  { value: 'library', label: 'Library' },
  { value: 'monorepo', label: 'Monorepo' },
  { value: 'other', label: 'Diger' },
]

const SORT_OPTIONS: Array<{ value: SortField; label: string }> = [
  { value: 'lastActivityAt', label: 'Son Aktivite' },
  { value: 'name', label: 'Ad' },
  { value: 'createdAt', label: 'Olusturma' },
  { value: 'sessionCount', label: 'Session Sayisi' },
]

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * Empty state when no projects exist
 */
function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="h-16 w-16 rounded-full bg-foreground/5 flex items-center justify-center mb-4">
        <FolderOpen className="h-8 w-8 text-foreground/30" />
      </div>
      <h3 className="text-lg font-medium text-foreground/90 mb-1">
        Henuz proje yok
      </h3>
      <p className="text-[13px] text-foreground/50 mb-4 max-w-sm">
        Yeni bir proje olusturarak baslayin veya mevcut bir GitHub reposunu import edin.
      </p>
      <Button onClick={onCreateClick}>
        <Plus className="h-4 w-4 mr-2" />
        Yeni Proje Olustur
      </Button>
    </div>
  )
}

/**
 * Loading state
 */
function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <Loader2 className="h-8 w-8 text-accent animate-spin mb-4" />
      <p className="text-[13px] text-foreground/50">Projeler yukleniyor...</p>
    </div>
  )
}

/**
 * Error state
 */
function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
        <AlertCircle className="h-8 w-8 text-destructive" />
      </div>
      <h3 className="text-lg font-medium text-foreground/90 mb-1">
        Projeler yuklenemedi
      </h3>
      <p className="text-[13px] text-destructive mb-4">
        {error}
      </p>
      <Button variant="outline" onClick={onRetry}>
        <RefreshCw className="h-4 w-4 mr-2" />
        Tekrar Dene
      </Button>
    </div>
  )
}

/**
 * No results state for search/filter
 */
function NoResultsState({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="h-16 w-16 rounded-full bg-foreground/5 flex items-center justify-center mb-4">
        <Search className="h-8 w-8 text-foreground/30" />
      </div>
      <h3 className="text-lg font-medium text-foreground/90 mb-1">
        Sonuc bulunamadi
      </h3>
      <p className="text-[13px] text-foreground/50 mb-4">
        Arama kriterlerinize uyan proje bulunamadi.
      </p>
      <Button variant="outline" onClick={onClear}>
        Filtreleri Temizle
      </Button>
    </div>
  )
}

// =============================================================================
// Main Component
// =============================================================================

export default function Projects() {
  const navigate = useNavigate()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('active')
  const [typeFilter, setTypeFilter] = useState<ProjectType | 'all'>('all')
  const [sortField, setSortField] = useState<SortField>('lastActivityAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const {
    projects,
    isLoading,
    error,
    refresh,
    setFilter,
    setSort,
    setSearch,
    reset,
    createProject,
    isCreating,
  } = useProjects({
    initialFilter: { status: 'active' },
    initialSort: { field: 'lastActivityAt', direction: 'desc' },
  })

  // Handle search with debounce
  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setSearch(value)
  }

  // Handle status filter change
  const handleStatusChange = (value: string) => {
    const status = value as ProjectStatus | 'all'
    setStatusFilter(status)
    const newFilter: Record<string, ProjectStatus | ProjectType> = {}
    if (status !== 'all') newFilter['status'] = status
    if (typeFilter !== 'all') newFilter['type'] = typeFilter
    setFilter(newFilter)
  }

  // Handle type filter change
  const handleTypeChange = (value: string) => {
    const type = value as ProjectType | 'all'
    setTypeFilter(type)
    const newFilter: Record<string, ProjectStatus | ProjectType> = {}
    if (statusFilter !== 'all') newFilter['status'] = statusFilter
    if (type !== 'all') newFilter['type'] = type
    setFilter(newFilter)
  }

  // Handle sort change
  const handleSortChange = (value: string) => {
    const field = value as SortField
    setSortField(field)
    setSort({ field, direction: sortDirection })
  }

  // Toggle sort direction
  const toggleSortDirection = () => {
    const newDirection = sortDirection === 'desc' ? 'asc' : 'desc'
    setSortDirection(newDirection)
    setSort({ field: sortField, direction: newDirection })
  }

  // Clear all filters
  const handleClearFilters = () => {
    setSearchQuery('')
    setStatusFilter('active')
    setTypeFilter('all')
    setSortField('lastActivityAt')
    setSortDirection('desc')
    reset()
  }

  // Handle project creation
  const handleCreateProject = async (data: ProjectCreate) => {
    const result = await createProject(data)
    if (result) {
      // Navigate to the new project
      navigate(`/projects/${result.id}`)
    }
  }

  // Handle project card click
  const handleProjectClick = (projectId: string) => {
    navigate(`/projects/${projectId}`)
  }

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return searchQuery !== '' || statusFilter !== 'active' || typeFilter !== 'all'
  }, [searchQuery, statusFilter, typeFilter])

  // Render content based on state
  const renderContent = () => {
    if (isLoading) {
      return <LoadingState />
    }

    if (error) {
      return <ErrorState error={error} onRetry={refresh} />
    }

    if (projects.length === 0) {
      if (hasActiveFilters) {
        return <NoResultsState onClear={handleClearFilters} />
      }
      return <EmptyState onCreateClick={() => setIsDialogOpen(true)} />
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onClick={() => handleProjectClick(project.id)}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="shrink-0 border-b border-foreground/5 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Projeler</h1>
            <p className="text-[13px] text-foreground/50 mt-0.5">
              {projects.length} proje
            </p>
          </div>

          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Yeni Proje
          </Button>
        </div>

        {/* Filters row */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
            <Input
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Proje ara..."
              className="h-9 pl-9"
            />
          </div>

          {/* Status filter */}
          <Select value={statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger className="h-9 w-[140px]">
              <SlidersHorizontal className="h-4 w-4 mr-2 text-foreground/40" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Type filter */}
          <Select value={typeFilter} onValueChange={handleTypeChange}>
            <SelectTrigger className="h-9 w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sort */}
          <div className="flex items-center gap-1">
            <Select value={sortField} onValueChange={handleSortChange}>
              <SelectTrigger className="h-9 w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSortDirection}
              className="h-9 w-9"
            >
              <ArrowUpDown
                className={cn(
                  'h-4 w-4 transition-transform',
                  sortDirection === 'asc' && 'rotate-180'
                )}
              />
            </Button>
          </div>

          {/* Clear filters (only show when filters are active) */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="text-foreground/60"
            >
              Temizle
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {renderContent()}
      </div>

      {/* New Project Dialog */}
      <NewProjectDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSubmit={handleCreateProject}
        isLoading={isCreating}
      />
    </div>
  )
}
