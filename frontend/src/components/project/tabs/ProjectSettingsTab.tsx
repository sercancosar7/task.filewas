/**
 * ProjectSettingsTab - Settings tab içeriği
 * @module @task-filewas/frontend/components/project/tabs/ProjectSettingsTab
 *
 * Proje özel ayarları
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Settings, Trash2, Save, Github, FolderOpen } from 'lucide-react'

// =============================================================================
// Types
// =============================================================================

export interface ProjectSettingsTabProps {
  projectId: string
  className?: string
}

interface ProjectSettings {
  name: string
  description: string
  autoCommit: boolean
  autoNextPhase: boolean
  githubRepo?: string
  localPath?: string
}

// =============================================================================
// Component
// =============================================================================

/**
 * ProjectSettingsTab - Proje özel ayarları
 */
export function ProjectSettingsTab({ projectId, className }: ProjectSettingsTabProps) {
  // State
  const [settings, setSettings] = React.useState<ProjectSettings>({
    name: 'Task.filewas',
    description: 'Otonom AI proje geliştirme platformu',
    autoCommit: true,
    autoNextPhase: true,
    githubRepo: 'https://github.com/task-filewas/task.filewas',
    localPath: '/var/www/task.filewas',
  })

  const [hasChanges, setHasChanges] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)

  // Handle setting change
  const handleSettingChange = React.useCallback(
    <K extends keyof ProjectSettings>(key: K, value: ProjectSettings[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }))
      setHasChanges(true)
    },
    []
  )

  // Handle save
  const handleSave = React.useCallback(async () => {
    setIsSaving(true)
    // TODO: Implement save API call
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setHasChanges(false)
    setIsSaving(false)
  }, [])

  // Handle delete project
  const handleDelete = React.useCallback(() => {
    if (confirm('Bu projeyi silmek istediğinizden emin misiniz?')) {
      // TODO: Implement delete API call
      console.log('Delete project:', projectId)
    }
  }, [projectId])

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-accent" />
          <h3 className="text-[15px] font-semibold">Proje Ayarları</h3>
        </div>
        {hasChanges && (
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="h-7 text-[12px]"
          >
            <Save className="h-3.5 w-3.5 mr-1" />
            {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        )}
      </div>

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
                value={settings.name}
                onChange={(e) => handleSettingChange('name', e.target.value)}
                className="text-[13px]"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="project-desc" className="text-[12px]">Açıklama</Label>
              <Input
                id="project-desc"
                value={settings.description}
                onChange={(e) => handleSettingChange('description', e.target.value)}
                className="text-[13px]"
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
                checked={settings.autoCommit}
                onCheckedChange={(checked) => handleSettingChange('autoCommit', checked)}
              />
            </div>

            {/* Auto Next Phase */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-[13px]">Otomatik Sonraki Faz</Label>
                <p className="text-[11px] text-foreground/40">
                  Commit sonrası otomatik sonraki faza geç
                </p>
              </div>
              <Switch
                checked={settings.autoNextPhase}
                onCheckedChange={(checked) => handleSettingChange('autoNextPhase', checked)}
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
                GitHub Repo
              </Label>
              <Input
                id="github-repo"
                value={settings.githubRepo || ''}
                onChange={(e) => handleSettingChange('githubRepo', e.target.value)}
                placeholder="https://github.com/username/repo"
                className="text-[13px]"
              />
            </div>

            {/* Local Path */}
            <div className="space-y-2">
              <Label htmlFor="local-path" className="text-[12px] flex items-center gap-1.5">
                <FolderOpen className="h-3.5 w-3.5" />
                Lokal Yol
              </Label>
              <Input
                id="local-path"
                value={settings.localPath || ''}
                onChange={(e) => handleSettingChange('localPath', e.target.value)}
                placeholder="/path/to/project"
                className="text-[13px]"
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
              className="h-7 text-[12px]"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Sil
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default ProjectSettingsTab
