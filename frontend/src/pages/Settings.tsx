/**
 * Settings Page
 * Platform-wide settings management
 * @module @task-filewas/frontend/pages/Settings
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Settings as SettingsIcon,
  Bot,
  Shield,
  Brain,
  ChevronRight,
  Save,
  RotateCcw,
  Check,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'

// =============================================================================
// Types
// =============================================================================

type DefaultModel = 'auto' | 'claude' | 'glm'
type DefaultPermission = 'safe' | 'ask' | 'auto'
type DefaultThinking = 'off' | 'think' | 'max'

interface PlatformSettings {
  defaultModel: DefaultModel
  defaultPermission: DefaultPermission
  defaultThinking: DefaultThinking
  fallbackEnabled: boolean
  fallbackOrder: Array<'claude' | 'glm'>
  autoCommit: boolean
  autoPush: boolean
  autoNextPhase: boolean
}

interface SettingsResponse {
  success: boolean
  data?: PlatformSettings
  error?: string
}

// =============================================================================
// Constants
// =============================================================================

const API_URL = import.meta.env.VITE_API_URL || '/api'

const DEFAULT_SETTINGS: PlatformSettings = {
  defaultModel: 'auto',
  defaultPermission: 'ask',
  defaultThinking: 'off',
  fallbackEnabled: true,
  fallbackOrder: ['claude', 'glm'],
  autoCommit: true,
  autoPush: false,
  autoNextPhase: true,
}

// =============================================================================
// Helper Functions
// =============================================================================

async function fetchSettings(): Promise<PlatformSettings> {
  const token = localStorage.getItem('token')
  const response = await fetch(`${API_URL}/settings`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Ayarlar yüklenirken hata oluştu')
  }

  const result: SettingsResponse = await response.json()
  return result.data || DEFAULT_SETTINGS
}

async function updateSettings(updates: Partial<PlatformSettings>): Promise<PlatformSettings> {
  const token = localStorage.getItem('token')
  const response = await fetch(`${API_URL}/settings`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(updates),
  })

  if (!response.ok) {
    throw new Error('Ayarlar güncellenirken hata oluştu')
  }

  const result: SettingsResponse = await response.json()
  return result.data || DEFAULT_SETTINGS
}

async function resetSettings(): Promise<PlatformSettings> {
  const token = localStorage.getItem('token')
  const response = await fetch(`${API_URL}/settings/reset`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Ayarlar sıfırlanırken hata oluştu')
  }

  const result: SettingsResponse = await response.json()
  return result.data || DEFAULT_SETTINGS
}

// =============================================================================
// Component
// =============================================================================

export default function Settings() {
  const navigate = useNavigate()

  const [settings, setSettings] = useState<PlatformSettings>(DEFAULT_SETTINGS)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showSaved, setShowSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const data = await fetchSettings()
        setSettings(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Bilinmeyen hata')
      } finally {
        setIsLoading(false)
      }
    }

    loadSettings()
  }, [])

  // Update document title
  useEffect(() => {
    document.title = 'Ayarlar | Task.filewas'
  }, [])

  // Handle logout
  const handleLogout = useCallback(() => {
    localStorage.removeItem('token')
    navigate('/login')
  }, [navigate])

  // Handle setting change
  const handleSettingChange = useCallback(<K extends keyof PlatformSettings>(
    key: K,
    value: PlatformSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
    setShowSaved(false)
  }, [])

  // Save settings
  const handleSave = useCallback(async () => {
    try {
      setIsSaving(true)
      setError(null)
      await updateSettings(settings)
      setShowSaved(true)
      setTimeout(() => setShowSaved(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bilinmeyen hata')
    } finally {
      setIsSaving(false)
    }
  }, [settings])

  // Reset settings
  const handleReset = useCallback(async () => {
    if (!confirm('Tüm ayarları varsayılan değerlere sıfırlamak istediğinize emin misiniz?')) {
      return
    }

    try {
      setIsSaving(true)
      setError(null)
      const data = await resetSettings()
      setSettings(data)
      setShowSaved(true)
      setTimeout(() => setShowSaved(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bilinmeyen hata')
    } finally {
      setIsSaving(false)
    }
  }, [])

  // Model options
  const modelOptions = [
    { value: 'auto' as const, label: 'Otomatik (Agent karar verir)', description: 'Her agent kendi modelini kullanır' },
    { value: 'claude' as const, label: 'Claude (Opus 4.5)', description: 'Karmaşık görevler için' },
    { value: 'glm' as const, label: 'GLM (4.7)', description: 'Hızlı kod yazma için' },
  ]

  // Permission options
  const permissionOptions = [
    { value: 'safe' as const, label: 'Güvenli (Safe)', description: 'Salt okunur, plan sunar', icon: '🔍' },
    { value: 'ask' as const, label: 'Sor (Ask)', description: 'Her işlemde onay ister', icon: '❓' },
    { value: 'auto' as const, label: 'Otomatik (Auto)', description: 'Tam otonom yürütme', icon: '🔓' },
  ]

  // Thinking options
  const thinkingOptions = [
    { value: 'off' as const, label: 'Kapalı', description: 'Normal yanıt' },
    { value: 'think' as const, label: 'Düşün (Think)', description: 'Genişletilmiş muhakeme' },
    { value: 'max' as const, label: 'Maksimum (Max)', description: 'Ultra-think (maksimum)' },
  ]

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-foreground/10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-6">
          <div className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-[17px] font-semibold">Ayarlar</h1>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {showSaved && (
              <span className="flex items-center gap-1 text-sm text-success">
                <Check className="h-4 w-4" />
                Kaydedildi
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              disabled={isSaving}
              className="gap-1"
            >
              <RotateCcw className="h-4 w-4" />
              Sıfırla
            </Button>
            <Button
              variant="accent"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="gap-1"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Kaydet
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container max-w-3xl py-8">
        {error && (
          <div className="mb-6 rounded-[8px] border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Model Settings */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-accent" />
              <CardTitle>Model Ayarları</CardTitle>
            </div>
            <CardDescription>
              Varsayılan AI modeli ve düşünme seviyesi
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Default Model */}
            <div className="space-y-2">
              <Label htmlFor="defaultModel">Varsayılan Model</Label>
              <Select
                value={settings.defaultModel}
                onValueChange={(value) => handleSettingChange('defaultModel', value as DefaultModel)}
              >
                <SelectTrigger id="defaultModel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {modelOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex flex-col">
                        <span>{option.label}</span>
                        <span className="text-[11px] text-foreground/60">{option.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Thinking Level */}
            <div className="space-y-2">
              <Label htmlFor="defaultThinking">Düşünme Seviyesi</Label>
              <Select
                value={settings.defaultThinking}
                onValueChange={(value) => handleSettingChange('defaultThinking', value as DefaultThinking)}
              >
                <SelectTrigger id="defaultThinking">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {thinkingOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex flex-col">
                        <span>{option.label}</span>
                        <span className="text-[11px] text-foreground/60">{option.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Fallback Enabled */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="fallbackEnabled">Otomatik Fallback</Label>
                <p className="text-[13px] text-foreground/60">
                  Model başarısız olduğunda diğerine geç
                </p>
              </div>
              <Switch
                id="fallbackEnabled"
                checked={settings.fallbackEnabled}
                onCheckedChange={(checked) => handleSettingChange('fallbackEnabled', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Permission Settings */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-info" />
              <CardTitle>İzin Ayarları</CardTitle>
            </div>
            <CardDescription>
              Varsayılan izin modu ve güvenlik
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Default Permission */}
            <div className="space-y-2">
              <Label htmlFor="defaultPermission">Varsayılan İzin Modu</Label>
              <Select
                value={settings.defaultPermission}
                onValueChange={(value) => handleSettingChange('defaultPermission', value as DefaultPermission)}
              >
                <SelectTrigger id="defaultPermission">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {permissionOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <span>{option.icon}</span>
                        <div className="flex flex-col">
                          <span>{option.label}</span>
                          <span className="text-[11px] text-foreground/60">{option.description}</span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Automation Settings */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-success" />
              <CardTitle>Otomasyon Ayarları</CardTitle>
            </div>
            <CardDescription>
              Faz tamamlama ve Git işlemleri
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Auto Commit */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="autoCommit">Otomatik Commit</Label>
                <p className="text-[13px] text-foreground/60">
                  Faz tamamlandığında otomatik commit yap
                </p>
              </div>
              <Switch
                id="autoCommit"
                checked={settings.autoCommit}
                onCheckedChange={(checked) => handleSettingChange('autoCommit', checked)}
              />
            </div>

            {/* Auto Push */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="autoPush">Otomatik Push</Label>
                <p className="text-[13px] text-foreground/60">
                  Commit sonrası GitHub'a push yap
                </p>
              </div>
              <Switch
                id="autoPush"
                checked={settings.autoPush}
                onCheckedChange={(checked) => handleSettingChange('autoPush', checked)}
              />
            </div>

            {/* Auto Next Phase */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="autoNextPhase">Otomatik Sonraki Faz</Label>
                <p className="text-[13px] text-foreground/60">
                  Faz tamamlandığında sonraki faza geç
                </p>
              </div>
              <Switch
                id="autoNextPhase"
                checked={settings.autoNextPhase}
                onCheckedChange={(checked) => handleSettingChange('autoNextPhase', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Account Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Hesap</CardTitle>
            <CardDescription>
              Oturum yönetimi
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              onClick={handleLogout}
              className="w-full sm:w-auto"
            >
              Çıkış Yap
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
