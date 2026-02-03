/**
 * ProjectSelect Page - Project selection screen after login
 * @module @task-filewas/frontend/pages/ProjectSelect
 *
 * Features:
 * - Project selection with cards
 * - Create new repository button
 * - Import existing repository button
 * - Recent projects highlighting
 * - Quick search
 *
 * Design Reference: Craft Agents project selection UI
 */

import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useProjects } from '@/hooks/useProjects'
import { ProjectCard } from '@/components/project/ProjectCard'
import { NewProjectDialog } from '@/components/project/NewProjectDialog'
import { NewRepoDialog } from '@/components/project/NewRepoDialog'
import { ImportRepoDialog } from '@/components/project/ImportRepoDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Plus,
  Search,
  Loader2,
  AlertCircle,
  RefreshCw,
  FolderOpen,
  Github,
  ArrowRight,
  X,
} from 'lucide-react'
import { getProjectRoute } from '@/router'
import type { ProjectCreate } from '@task-filewas/shared'

// =============================================================================
// Types
// =============================================================================

interface QuickAction {
  id: string
  title: string
  description: string
  icon: React.ElementType
  action: () => void
  variant: 'primary' | 'secondary'
}

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * Empty state when no projects exist
 */
function EmptyState({
  onCreateClick,
  onNewRepoClick,
  onImportClick,
}: {
  onCreateClick: () => void
  onNewRepoClick: () => void
  onImportClick: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="h-20 w-20 rounded-full bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center mb-6">
        <FolderOpen className="h-10 w-10 text-accent" />
      </div>
      <h2 className="text-2xl font-semibold text-foreground mb-2">
        Hosgeldiniz!
      </h2>
      <p className="text-[15px] text-foreground/60 mb-8 max-w-md">
        Henuz projeniz yok. Yeni bir proje olusturarak baslayin veya mevcut bir GitHub reposunu import edin.
      </p>

      {/* Quick actions for empty state */}
      <div className="flex items-center gap-4">
        <Button size="lg" onClick={onNewRepoClick}>
          <Github className="h-5 w-5 mr-2" />
          GitHub Repo Olustur
        </Button>
        <Button size="lg" variant="outline" onClick={onCreateClick}>
          <Plus className="h-5 w-5 mr-2" />
          Yerel Proje
        </Button>
        <Button size="lg" variant="outline" onClick={onImportClick}>
          <Github className="h-5 w-5 mr-2" />
          Import Et
        </Button>
      </div>
    </div>
  )
}

/**
 * Loading state
 */
function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <Loader2 className="h-10 w-10 text-accent animate-spin mb-4" />
      <p className="text-[15px] text-foreground/50">Projeler yukleniyor...</p>
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
      <p className="text-[13px] text-destructive mb-4 max-w-sm">
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
 * Quick action card for project creation/import
 */
function QuickActionCard({
  title,
  description,
  icon: Icon,
  onClick,
  variant,
}: {
  title: string
  description: string
  icon: React.ElementType
  onClick: () => void
  variant: 'primary' | 'secondary'
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative flex flex-col items-start gap-3 p-5 rounded-[12px]',
        'border border-foreground/10',
        'hover:border-accent/30 hover:bg-accent/5',
        'transition-all duration-200',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        variant === 'primary' && 'bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20'
      )}
    >
      <div
        className={cn(
          'h-10 w-10 rounded-[8px] flex items-center justify-center',
          variant === 'primary'
            ? 'bg-accent text-white'
            : 'bg-foreground/5 text-foreground group-hover:bg-foreground/10'
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <h3 className="text-[15px] font-semibold text-foreground mb-1">
          {title}
        </h3>
        <p className="text-[13px] text-foreground/60">
          {description}
        </p>
      </div>
      <ArrowRight
        className={cn(
          'h-4 w-4 transition-transform duration-200',
          'group-hover:translate-x-1',
          variant === 'primary' ? 'text-accent' : 'text-foreground/40'
        )}
      />
    </button>
  )
}

// =============================================================================
// Main Component
// =============================================================================

export default function ProjectSelect() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false)
  const [isNewRepoDialogOpen, setIsNewRepoDialogOpen] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)

  const {
    projects,
    isLoading,
    error,
    refresh,
    setSearch,
    createProject,
    isCreating,
  } = useProjects({
    initialFilter: { status: 'active' },
    initialSort: { field: 'lastActivityAt', direction: 'desc' },
    pageSize: 50,
  })

  // Update search query
  useEffect(() => {
    setSearch(searchQuery)
  }, [searchQuery, setSearch])

  // Filter projects based on search
  const filteredProjects = useMemo(() => {
    if (!searchQuery) return projects
    const query = searchQuery.toLowerCase()
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query) ||
        p.tags?.some((t) => t.toLowerCase().includes(query))
    )
  }, [projects, searchQuery])

  // Recent projects (first 3)
  const recentProjects = useMemo(() => {
    return filteredProjects.slice(0, 3)
  }, [filteredProjects])

  // Other projects
  const otherProjects = useMemo(() => {
    return filteredProjects.slice(3)
  }, [filteredProjects])

  // Handle project card click
  const handleProjectClick = (projectId: string) => {
    navigate(getProjectRoute(projectId))
  }

  // Handle new project creation
  const handleCreateProject = async (data: ProjectCreate) => {
    const result = await createProject(data)
    if (result) {
      navigate(getProjectRoute(result.id))
    }
  }

  // Quick actions
  const quickActions: QuickAction[] = [
    {
      id: 'new-repo',
      title: 'Yeni GitHub Repo',
      description: 'GitHub\'da yeni bir repository olusturun',
      icon: Github,
      action: () => setIsNewRepoDialogOpen(true),
      variant: 'primary',
    },
    {
      id: 'new-project',
      title: 'Yeni Yerel Proje',
      description: 'Yerel bir proje olusturun',
      icon: Plus,
      action: () => setIsNewDialogOpen(true),
      variant: 'secondary',
    },
    {
      id: 'import',
      title: 'Repo Import Et',
      description: 'Mevcut GitHub reposunu import edin',
      icon: Github,
      action: () => setIsImportDialogOpen(true),
      variant: 'secondary',
    },
  ]

  // Render content based on state
  const renderContent = () => {
    if (isLoading) {
      return <LoadingState />
    }

    if (error) {
      return <ErrorState error={error} onRetry={refresh} />
    }

    // No projects at all
    if (projects.length === 0) {
      return (
        <EmptyState
          onCreateClick={() => setIsNewDialogOpen(true)}
          onNewRepoClick={() => setIsNewRepoDialogOpen(true)}
          onImportClick={() => setIsImportDialogOpen(true)}
        />
      )
    }

    return (
      <div className="space-y-8">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {quickActions.map((action) => (
            <QuickActionCard
              key={action.id}
              title={action.title}
              description={action.description}
              icon={action.icon}
              variant={action.variant}
              onClick={action.action}
            />
          ))}
        </div>

        {/* Search */}
        {(recentProjects.length > 0 || otherProjects.length > 0) && (
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Proje ara..."
                className="h-10 pl-9"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="text-[13px] text-foreground/50">
              {filteredProjects.length} proje
            </div>
          </div>
        )}

        {/* No search results */}
        {searchQuery && filteredProjects.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-16 w-16 rounded-full bg-foreground/5 flex items-center justify-center mb-4">
              <Search className="h-8 w-8 text-foreground/30" />
            </div>
            <h3 className="text-lg font-medium text-foreground/90 mb-1">
              Sonuc bulunamadi
            </h3>
            <p className="text-[13px] text-foreground/50 mb-4">
              &quot;{searchQuery}&quot; ile ilgili proje bulunamadi.
            </p>
            <Button variant="outline" onClick={() => setSearchQuery('')}>
              Temizle
            </Button>
          </div>
        )}

        {/* Recent Projects */}
        {recentProjects.length > 0 && (
          <div>
            <h2 className="text-[15px] font-semibold text-foreground/80 mb-3 flex items-center gap-2">
              Son Kullanilan Projeler
              <span className="px-1.5 h-[18px] text-[10px] font-medium rounded bg-foreground/5 text-foreground/60 flex items-center">
                {recentProjects.length}
              </span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {recentProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onClick={() => handleProjectClick(project.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Other Projects */}
        {otherProjects.length > 0 && (
          <div>
            <h2 className="text-[15px] font-semibold text-foreground/80 mb-3 flex items-center gap-2">
              Diger Projeler
              <span className="px-1.5 h-[18px] text-[10px] font-medium rounded bg-foreground/5 text-foreground/60 flex items-center">
                {otherProjects.length}
              </span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {otherProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onClick={() => handleProjectClick(project.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-foreground/5 px-6 py-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-semibold text-foreground mb-1">
            Proje Secin
          </h1>
          <p className="text-[15px] text-foreground/60">
            Calismak istediginiz projeyi secin veya yeni bir proje olusturun
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-8">
        <div className="max-w-6xl mx-auto">{renderContent()}</div>
      </div>

      {/* New Project Dialog */}
      <NewProjectDialog
        open={isNewDialogOpen}
        onOpenChange={setIsNewDialogOpen}
        onSubmit={handleCreateProject}
        isLoading={isCreating}
      />

      {/* New GitHub Repo Dialog */}
      <NewRepoDialog
        open={isNewRepoDialogOpen}
        onOpenChange={setIsNewRepoDialogOpen}
      />

      {/* Import Repo Dialog */}
      <ImportRepoDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
      />
    </div>
  )
}
