/**
 * Dashboard - Main dashboard page
 * @module @task-filewas/frontend/pages/Dashboard
 *
 * Features:
 * - Statistics cards (projects, sessions, today's phases, agent usage)
 * - Recent projects list
 * - Activity feed
 * - Quick actions
 *
 * Design Reference: Craft Agents dashboard layout
 */

import { useEffect, useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { StatsCards, type StatsData } from '@/components/dashboard/StatsCards'
import { RecentProjects } from '@/components/dashboard/RecentProjects'
import { ActivityFeed, type ActivityItem } from '@/components/dashboard/ActivityFeed'
import type { ProjectSummary } from '@task-filewas/shared'
import {
  Plus,
  AlertCircle,
  FolderKanban,
  Rocket,
  GitBranch,
  RefreshCw,
} from 'lucide-react'

// =============================================================================
// API Service
// =============================================================================

const API_BASE = (import.meta.env as Record<string, string>)['VITE_API_BASE'] || ''

async function fetchDashboard(): Promise<{
  stats: StatsData
  projects: ProjectSummary[]
  activities: ActivityItem[]
}> {
  const response = await fetch(`${API_BASE}/api/dashboard`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
    },
  })

  if (!response.ok) {
    throw new Error('Dashboard verileri alınamadı')
  }

  return response.json()
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Dashboard - Main dashboard page with stats, projects, and activity feed
 *
 * Structure:
 * ┌────────────────────────────────────────────────────────────────┐
 * │ Dashboard                                                       │
 * ├────────────────────────────────────────────────────────────────┤
 * │                                                                  │
 * │ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│
 * │ │ Projeler    │ │ Sessions    │ │ Bugün       │ │ Agent       ││
 * │ │     12      │ │     47      │ │   3 faz     │ │  Claude: 8  ││
 * │ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘│
 * │                                                                  │
 * │ ┌──────────────────────────────┐ ┌─────────────────────────────┐│
 * │ │ Son Projeler                 │ │ Activity Feed               ││
 * │ │                              │ │                             ││
 * │ │ • task.filewas (aktif)       │ │ • 10:23 - Faz 3 tamamlandı  ││
 * │ │ • e-commerce-app             │ │ • 10:15 - Test passed       ││
 * │ │ • mobile-dashboard           │ │ • 10:02 - Kod yazıldı       ││
 * │ │                              │ │ • 09:45 - Session başladi   ││
 * │ └──────────────────────────────┘ └─────────────────────────────┘│
 * │                                                                  │
 * │ ┌──────────────────────────────────────────────────────────────┐│
 * │ │ Quick Actions                                                 ││
 * │ │ [+ Yeni Proje] [+ Yeni Session] [Refresh]                    ││
 * │ └──────────────────────────────────────────────────────────────┘│
 * │                                                                  │
 * └────────────────────────────────────────────────────────────────┘
 */
export default function Dashboard() {
  const navigate = useNavigate()

  // State
  const [stats, setStats] = useState<StatsData | null>(null)
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Load dashboard data
  const loadDashboard = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const data = await fetchDashboard()

      setStats(data.stats)
      setProjects(data.projects)
      setActivities(data.activities)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu')
      console.error('Dashboard load error:', err)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  // Refresh dashboard
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    await loadDashboard()
  }, [loadDashboard])

  // Navigate to projects
  const handleViewAllProjects = useCallback(() => {
    navigate('/projects')
  }, [navigate])

  // Navigate to activity
  const handleViewAllActivity = useCallback(() => {
    navigate('/logs')
  }, [navigate])

  // Create new project
  const handleCreateProject = useCallback(() => {
    navigate('/projects/new')
  }, [navigate])

  // Create new session
  const handleCreateSession = useCallback(() => {
    navigate('/sessions')
  }, [navigate])

  // Initial load
  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  // Set page title
  useEffect(() => {
    document.title = 'Dashboard | Task.filewas'
  }, [])

  return (
    <div className="min-h-screen bg-background">
      {/* Page Header */}
      <div className="border-b border-foreground/5 bg-card">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
              <p className="text-[13px] text-foreground/60 mt-1">
                Projeleriniz ve aktiviteleriniz için genel bakış
              </p>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isLoading || isRefreshing}
              className={cn(
                'inline-flex items-center gap-2 px-3 py-2 rounded-[6px]',
                'bg-foreground/5 hover:bg-foreground/10',
                'text-[13px] font-medium transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
              title="Yenile"
            >
              <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
              <span className="hidden sm:inline">Yenile</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {error && (
          <div
            className={cn(
              'mb-6 p-4 rounded-[8px] border border-destructive/20',
              'bg-destructive/10 text-destructive text-[13px]',
              'flex items-center gap-3'
            )}
          >
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-medium">Yükleme hatası</p>
              <p className="text-destructive/80 mt-1">{error}</p>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              className="ml-auto px-3 py-1.5 rounded-[6px] bg-destructive/20 hover:bg-destructive/30 text-[13px] font-medium transition-colors"
            >
              Tekrar Dene
            </button>
          </div>
        )}

        {/* Stats Cards */}
        <section className="mb-6">
          {stats ? (
            <StatsCards stats={stats} isLoading={isLoading} />
          ) : (
            <StatsCards isLoading={isLoading} />
          )}
        </section>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Recent Projects */}
          <section>
            <RecentProjects
              projects={projects}
              isLoading={isLoading}
              onViewAll={handleViewAllProjects}
              onCreateProject={handleCreateProject}
            />
          </section>

          {/* Activity Feed */}
          <section>
            <ActivityFeed
              activities={activities}
              maxItems={8}
              isLoading={isLoading}
              onViewAll={handleViewAllActivity}
            />
          </section>
        </div>

        {/* Quick Actions */}
        <section>
          <div
            className={cn(
              'rounded-[8px] border border-foreground/10 bg-card p-5'
            )}
          >
            <h3 className="text-[15px] font-semibold mb-4">Hızlı İşlemler</h3>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleCreateProject}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2.5 rounded-[6px]',
                  'bg-accent text-white text-[13px] font-medium',
                  'hover:bg-accent/90 transition-colors'
                )}
              >
                <Plus className="h-4 w-4" />
                Yeni Proje
              </button>

              <button
                type="button"
                onClick={handleCreateSession}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2.5 rounded-[6px]',
                  'bg-foreground/5 hover:bg-foreground/10',
                  'text-[13px] font-medium transition-colors'
                )}
              >
                <Rocket className="h-4 w-4" />
                Yeni Session
              </button>

              <button
                type="button"
                onClick={handleViewAllProjects}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2.5 rounded-[6px]',
                  'bg-foreground/5 hover:bg-foreground/10',
                  'text-[13px] font-medium transition-colors'
                )}
              >
                <FolderKanban className="h-4 w-4" />
                Projeler
              </button>

              <button
                type="button"
                onClick={() => window.open('https://github.com', '_blank')}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2.5 rounded-[6px]',
                  'bg-foreground/5 hover:bg-foreground/10',
                  'text-[13px] font-medium transition-colors'
                )}
              >
                <GitBranch className="h-4 w-4" />
                GitHub
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
