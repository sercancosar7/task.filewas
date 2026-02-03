/**
 * ProjectSettingsTab - Settings tab içeriği
 * @module @task-filewas/frontend/components/project/tabs/ProjectSettingsTab
 *
 * Proje özel ayarları
 */

import * as React from 'react'
import { useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Settings, Trash2, Save, Github, FolderOpen, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react'
import type { Project } from '@task-filewas/shared'

// =============================================================================
// Types
// =============================================================================

export interface ProjectSettingsTabProps {
  projectId: string
  className?: string
}

interface ApiResponse<T> {
  success: boolean
  data: T
  error?: string
}

// =============================================================================
// Helpers
// =============================================================================

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

async function apiPatch<T>(url: string, body: unknown): Promise<{ data: T | null; error: string | null }> {
  const token = localStorage.getItem('auth_token')
  try {
    const response = await fetch(`/api${url}`, {
      method: 'PATCH',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
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

async function apiDelete(url: string): Promise<{ success: boolean; error: string | null }> {
  const token = localStorage.getItem('auth_token')
  try {
    const response = await fetch(`/api${url}`, {
      method: 'DELETE',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
    })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    const result: ApiResponse<unknown> = await response.json()
    return { success: result.success, error: result.error || null }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Fetch error' }
  }
}

// =============================================================================
// Component
// =============================================================================

/**
 * ProjectSettingsTab - Proje özel ayarları
 */
export function ProjectSettingsTab({ projectId, className }: ProjectSettingsTabProps) {
  // State
  const [project, setProject] = React.useState<Project | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = React.useState(false)

  // Local form state
  const [name, setName] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [autoCommit, setAutoCommit] = React.useState(true)
  const [autoPush, setAutoPush] = React.useState(false)
  const [githubUrl, setGithubUrl] = React.useState('')
  const [projectPath, setProjectPath] = React.useState('')

  // Load project data
  useEffect(() => {
    const loadProject = async () => {
      setIsLoading(true)
      setError(null)
      const response = await apiGet<Project>(`/projects/${projectId}`)
      if (response.data) {
        setProject(response.data)
        setName(response.data.name)
        setDescription(response.data.description || '')
        setAutoCommit(response.data.settings?.autoCommit ?? true)
        setAutoPush(response.data.settings?.autoPush ?? false)
        setGithubUrl(response.data.github?.url || '')
        setProjectPath(response.data.path || '')
      } else {
        setError(response.error || 'Proje yüklenemedi')
      }
      setIsLoading(false)
    }
    loadProject()
  }, [projectId])

  // Check if form has changes
  const hasChanges = React.useMemo(() => {
    if (!project) return false
    return (
      name !== project.name ||
      description !== (project.description || '') ||
      autoCommit !== (project.settings?.autoCommit ?? true) ||
      autoPush !== (project.settings?.autoPush ?? false) ||
      githubUrl !== (project.github?.url || '') ||
      projectPath !== (project.path || '')
    )
  }, [project, name, description, autoCommit, autoPush, githubUrl, projectPath])

  // Handle save
  const handleSave = React.useCallback(async () => {
    if (!project || !hasChanges) return

    setIsSaving(true)
    setError(null)
    setSaveSuccess(false)

    const updateData = {
      name,
      description: description || null,
      settings: {
        autoCommit,
        autoPush,
      },
      github: githubUrl ? {
        url: githubUrl,
        owner: project.github?.owner,
        repo: project.github?.repo,
        defaultBranch: project.github?.defaultBranch,
        autoPush: project.github?.autoPush,
      } : null,
      path: projectPath || undefined,
    }

    const response = await apiPatch<Project>(`/projects/${projectId}`, updateData)
    if (response.data) {
      setProject(response.data)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } else {
      setError(response.error || 'Kaydetme başarısız')
    }
    setIsSaving(false)
  }, [project, projectId, name, description, autoCommit, autoPush, githubUrl, projectPath, hasChanges])

  // Handle delete project
  const handleDelete = React.useCallback(async () => {
    if (!project) return

    const confirmed = confirm(
      `Bu projeyi silmek istediğinizden emin misiniz?\n\nProje: ${project.name}\n\nBu işlem geri alınamaz.`
    )
    if (!confirmed) return

    setIsDeleting(true)
    setError(null)

    const response = await apiDelete(`/projects/${projectId}`)
    if (response.success) {
      // Redirect to projects page
      window.location.href = '/projects'
    } else {
      setError(response.error || 'Silme başarısız')
      setIsDeleting(false)
    }
  }, [project, projectId])

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center h-full', className)}>
        <div className="text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-accent" />
          <p className="text-[13px] text-foreground/60">Ayarlar yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-accent" />
          <h3 className="text-[15px] font-semibold">Proje Ayarları</h3>
        </div>
        <div className="flex items-center gap-2">
          {saveSuccess && (
            <span className="flex items-center gap-1 text-[12px] text-success">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Kaydedildi
            </span>
          )}
          {hasChanges && (
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="h-7 text-[12px]"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  Kaydediliyor...
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5 mr-1" />
                  Kaydet
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 rounded-[6px] bg-destructive/10 border border-destructive/20 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-[13px] text-destructive">{error}</p>
        </div>
      )}

      {/* Settings Form */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {/* General Settings */}
        <Card className="p-4">
          <h4 className="text-[13px] font-semibold mb-4">Genel Bilgiler</h4>
          <div className="space-y-4">
            {/* Project Name */}
            <div className="space-y-2">
              <Label htmlFor="project-name" className="text-[12px]">Proje Adı</Label>
              <Input
                id="project-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-[13px]"
                disabled={isLoading}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="project-desc" className="text-[12px]">Açıklama</Label>
              <Input
                id="project-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="text-[13px]"
                disabled={isLoading}
              />
            </div>
          </div>
        </Card>

        {/* Automation Settings */}
        <Card className="p-4">
          <h4 className="text-[13px] font-semibold mb-4">Otomasyon</h4>
          <div className="space-y-4">
            {/* Auto Commit */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-[13px]">Otomatik Commit</Label>
                <p className="text-[11px] text-foreground/40">
                  Her faz tamamlandığında otomatik commit yap
                </p>
              </div>
              <Switch
                checked={autoCommit}
                onCheckedChange={setAutoCommit}
                disabled={isLoading}
              />
            </div>

            {/* Auto Push */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-[13px]">Otomatik Push</Label>
                <p className="text-[11px] text-foreground/40">
                  Commit sonrası GitHub'a otomatik push
                </p>
              </div>
              <Switch
                checked={autoPush}
                onCheckedChange={setAutoPush}
                disabled={isLoading}
              />
            </div>
          </div>
        </Card>

        {/* Integration Settings */}
        <Card className="p-4">
          <h4 className="text-[13px] font-semibold mb-4">Entegrasyonlar</h4>
          <div className="space-y-4">
            {/* GitHub Repo */}
            <div className="space-y-2">
              <Label htmlFor="github-repo" className="text-[12px] flex items-center gap-1.5">
                <Github className="h-3.5 w-3.5" />
                GitHub Repo URL
              </Label>
              <Input
                id="github-repo"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/username/repo"
                className="text-[13px]"
                disabled={isLoading}
              />
            </div>

            {/* Project Path */}
            <div className="space-y-2">
              <Label htmlFor="project-path" className="text-[12px] flex items-center gap-1.5">
                <FolderOpen className="h-3.5 w-3.5" />
                Proje Yolu
              </Label>
              <Input
                id="project-path"
                value={projectPath}
                onChange={(e) => setProjectPath(e.target.value)}
                placeholder="/path/to/project"
                className="text-[13px]"
                disabled={isLoading}
              />
            </div>
          </div>
        </Card>

        {/* Danger Zone */}
        <Card className="p-4 border-destructive/20">
          <h4 className="text-[13px] font-semibold text-destructive mb-4">Tehlikeli Bölge</h4>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-[13px] text-destructive">Projeyi Sil</Label>
              <p className="text-[11px] text-foreground/40">
                Bu işlem geri alınamaz
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting || isLoading}
              className="h-7 text-[12px]"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  Siliniyor...
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Sil
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default ProjectSettingsTab
