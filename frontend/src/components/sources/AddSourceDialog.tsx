/**
 * AddSourceDialog Component
 * Modal dialog for adding new sources (MCP, API, Local)
 * @module @task-filewas/frontend/components/sources/AddSourceDialog
 *
 * Features:
 * - Select source type (MCP, API, Local)
 * - Type-specific configuration forms
 * - Form validation
 * - Loading state during creation
 *
 * Design Reference: Craft Agents dialog components
 */

import * as React from 'react'
import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  Loader2,
  Database,
  Globe,
  Folder,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  SourceType,
  Source,
  SourceCreate,
  MCPServerType,
  APIAuthType,
  LocalFolderType,
} from '@task-filewas/shared'

// =============================================================================
// Types
// =============================================================================

export interface AddSourceDialogProps {
  /** Whether the dialog is open */
  open: boolean
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void
  /** Callback when source is created */
  onSourceCreated: (source: Source) => void
}

interface MCPFormState {
  type: MCPServerType
  name: string
  command: string
  args: string
  endpoint: string
  enabled: boolean
}

interface APIFormState {
  baseUrl: string
  name: string
  authType: APIAuthType
  token: string
  username: string
  password: string
  keyHeader: string
  keyValue: string
  headers: string
  rateLimit: string
  timeout: string
  enabled: boolean
}

interface LocalFormState {
  path: string
  type: LocalFolderType
  name: string
  include: string
  exclude: string
  watch: boolean
  enabled: boolean
}

// =============================================================================
// Constants
// =============================================================================

const MCP_TYPES: Array<{ value: MCPServerType; label: string; description: string }> = [
  { value: 'memory', label: 'Memory MCP', description: 'Bilgi grafiği için hafıza yönetimi' },
  { value: 'context7', label: 'Context7', description: 'Dokümantion arama' },
  { value: 'playwright', label: 'Playwright', description: 'Tarayıcı otomasyonu' },
  { value: 'puppeteer', label: 'Puppeteer', description: 'Web scraping' },
  { value: 'sequential-thinking', label: 'Sequential Thinking', description: 'Zincirleme reasoning' },
  { value: 'custom', label: 'Özel MCP', description: 'Özel MCP sunucusu' },
]

const AUTH_TYPES: Array<{ value: APIAuthType; label: string }> = [
  { value: 'none', label: 'Yok' },
  { value: 'bearer', label: 'Bearer Token' },
  { value: 'basic', label: 'Basic Auth' },
  { value: 'api-key', label: 'API Key' },
  { value: 'oauth2', label: 'OAuth 2.0' },
]

const LOCAL_TYPES: Array<{ value: LocalFolderType; label: string }> = [
  { value: 'project', label: 'Proje' },
  { value: 'docs', label: 'Dokümanlar' },
  { value: 'tests', label: 'Testler' },
  { value: 'config', label: 'Konfigürasyon' },
  { value: 'custom', label: 'Özel' },
]

const INITIAL_MCP_FORM: MCPFormState = {
  type: 'custom',
  name: '',
  command: '',
  args: '',
  endpoint: '',
  enabled: true,
}

const INITIAL_API_FORM: APIFormState = {
  baseUrl: '',
  name: '',
  authType: 'none',
  token: '',
  username: '',
  password: '',
  keyHeader: 'X-API-Key',
  keyValue: '',
  headers: '',
  rateLimit: '',
  timeout: '',
  enabled: true,
}

const INITIAL_LOCAL_FORM: LocalFormState = {
  path: '',
  type: 'custom',
  name: '',
  include: '',
  exclude: '',
  watch: false,
  enabled: true,
}

// =============================================================================
// Helpers
// =============================================================================

function getApiUrl(): string {
  return import.meta.env.VITE_API_URL || 'http://localhost:3001'
}

async function createSource(data: SourceCreate): Promise<Source> {
  const token = localStorage.getItem('token')
  const response = await fetch(`${getApiUrl()}/api/sources`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || `HTTP error: ${response.status}`)
  }

  const result = await response.json()
  return result.data
}

// =============================================================================
// Sub-Components
// =============================================================================

interface SourceTypeCardProps {
  type: SourceType
  label: string
  description: string
  icon: React.ElementType
  selected: boolean
  onClick: () => void
}

function SourceTypeCard({ type, label, description, icon: Icon, selected, onClick }: SourceTypeCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-start gap-3 rounded-lg border p-4 text-left transition-all',
        'hover:bg-foreground/5',
        selected
          ? 'border-accent bg-accent/5'
          : 'border-foreground/10'
      )}
    >
      <div className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
        selected ? 'bg-accent/20 text-accent' : 'bg-foreground/5 text-foreground/60'
      )}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <h3 className="text-[13px] font-medium text-foreground">{label}</h3>
        <p className="text-[11px] text-foreground/40 mt-0.5">{description}</p>
      </div>
      {selected && (
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white">
          <ChevronRight className="h-3 w-3" />
        </div>
      )}
    </button>
  )
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * AddSourceDialog - Modal for creating new sources
 */
export function AddSourceDialog({
  open,
  onOpenChange,
  onSourceCreated,
}: AddSourceDialogProps) {
  // Navigation state
  const [step, setStep] = useState<'type' | 'config'>('type')
  const [selectedType, setSelectedType] = useState<SourceType | null>(null)

  // Form state
  const [mcpForm, setMcpForm] = useState<MCPFormState>(INITIAL_MCP_FORM)
  const [apiForm, setApiForm] = useState<APIFormState>(INITIAL_API_FORM)
  const [localForm, setLocalForm] = useState<LocalFormState>(INITIAL_LOCAL_FORM)

  // Loading and error state
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      setStep('type')
      setSelectedType(null)
      setMcpForm(INITIAL_MCP_FORM)
      setApiForm(INITIAL_API_FORM)
      setLocalForm(INITIAL_LOCAL_FORM)
      setError(null)
    }
  }, [open])

  // Handle type selection
  const handleSelectType = (type: SourceType) => {
    setSelectedType(type)
    setStep('config')
  }

  // Handle back to type selection
  const handleBack = () => {
    setStep('type')
  }

  // Validate form
  const validateForm = (): boolean => {
    if (selectedType === 'mcp') {
      if (!mcpForm.name.trim()) {
        setError('MCP sunucu adı gereklidir')
        return false
      }
      if (!mcpForm.command && !mcpForm.endpoint) {
        setError('Komut veya endpoint gereklidir')
        return false
      }
    } else if (selectedType === 'api') {
      if (!apiForm.name.trim()) {
        setError('API adı gereklidir')
        return false
      }
      if (!apiForm.baseUrl.trim()) {
        setError('Base URL gereklidir')
        return false
      }
      try {
        new URL(apiForm.baseUrl)
      } catch {
        setError('Geçersiz URL')
        return false
      }
    } else if (selectedType === 'local') {
      if (!localForm.name.trim()) {
        setError('Kaynak adı gereklidir')
        return false
      }
      if (!localForm.path.trim()) {
        setError('Dosya yolu gereklidir')
        return false
      }
    }
    setError(null)
    return true
  }

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedType || !validateForm()) {
      return
    }

    setIsCreating(true)
    setError(null)

    try {
      let data: SourceCreate

      if (selectedType === 'mcp') {
        const config = {
          type: mcpForm.type,
          name: mcpForm.name,
          enabled: mcpForm.enabled,
          ...(mcpForm.command && { command: mcpForm.command }),
          ...(mcpForm.args && { args: mcpForm.args.split(' ').filter(Boolean) }),
          ...(mcpForm.endpoint && { endpoint: mcpForm.endpoint }),
        }
        data = {
          type: 'mcp',
          name: mcpForm.name.trim(),
          config,
        }
      } else if (selectedType === 'api') {
        const authConfig = {
          ...(apiForm.authType === 'bearer' && apiForm.token && { token: apiForm.token }),
          ...(apiForm.authType === 'basic' && {
            username: apiForm.username,
            password: apiForm.password,
          }),
          ...(apiForm.authType === 'api-key' && {
            keyHeader: apiForm.keyHeader,
            keyValue: apiForm.keyValue,
          }),
        }

        const config = {
          baseUrl: apiForm.baseUrl,
          name: apiForm.name,
          authType: apiForm.authType,
          enabled: apiForm.enabled,
          ...(Object.keys(authConfig).length > 0 && { authConfig }),
          ...(apiForm.rateLimit && { rateLimit: parseInt(apiForm.rateLimit) }),
          ...(apiForm.timeout && { timeout: parseInt(apiForm.timeout) }),
        }
        data = {
          type: 'api',
          name: apiForm.name.trim(),
          config,
        }
      } else {
        // local
        const config = {
          path: localForm.path,
          type: localForm.type,
          name: localForm.name,
          enabled: localForm.enabled,
          ...(localForm.include && { include: localForm.include.split(',').map(s => s.trim()).filter(Boolean) }),
          ...(localForm.exclude && { exclude: localForm.exclude.split(',').map(s => s.trim()).filter(Boolean) }),
          watch: localForm.watch,
        }
        data = {
          type: 'local',
          name: localForm.name.trim(),
          config,
        }
      }

      const newSource = await createSource(data)
      onSourceCreated(newSource)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create source')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-accent" />
            Yeni Kaynak Ekle
          </DialogTitle>
          <DialogDescription>
            {step === 'type'
              ? 'Eklemek istediğiniz kaynak türünü seçin'
              : 'Kaynak yapılandırmasını girin'}
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center gap-2">
          <Badge variant={step === 'type' ? 'default' : 'outline'} className="text-[10px]">
            1. Tür
          </Badge>
          <ChevronRight className="h-3 w-3 text-foreground/40" />
          <Badge variant={step === 'config' ? 'default' : 'outline'} className="text-[10px]">
            2. Yapılandırma
          </Badge>
        </div>

        {/* Error Message */}
        {error && (
          <div className="text-[13px] text-destructive bg-destructive/10 px-3 py-2 rounded-[6px]">
            {error}
          </div>
        )}

        {/* Step 1: Type Selection */}
        {step === 'type' && (
          <div className="space-y-2 py-4">
            <SourceTypeCard
              type="mcp"
              label="MCP Sunucusu"
              description="Model Context Protocol sunucuları"
              icon={Database}
              selected={selectedType === 'mcp'}
              onClick={() => handleSelectType('mcp')}
            />
            <SourceTypeCard
              type="api"
              label="API Kaynağı"
              description="Dış API entegrasyonları"
              icon={Globe}
              selected={selectedType === 'api'}
              onClick={() => handleSelectType('api')}
            />
            <SourceTypeCard
              type="local"
              label="Yerel Klasör"
              description="Yerel dosya sistemi kaynakları"
              icon={Folder}
              selected={selectedType === 'local'}
              onClick={() => handleSelectType('local')}
            />
          </div>
        )}

        {/* Step 2: Configuration */}
        {step === 'config' && selectedType && (
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            {/* MCP Configuration */}
            {selectedType === 'mcp' && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="mcp-name" className="text-[13px]">
                    Sunucu Adı <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="mcp-name"
                    value={mcpForm.name}
                    onChange={(e) => setMcpForm({ ...mcpForm, name: e.target.value })}
                    placeholder="örn: Memory MCP"
                    className="h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="mcp-type" className="text-[13px]">MCP Türü</Label>
                  <Select
                    value={mcpForm.type}
                    onValueChange={(v: MCPServerType) => setMcpForm({ ...mcpForm, type: v })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MCP_TYPES.map(({ value, label }) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="mcp-command" className="text-[13px]">Komut</Label>
                  <Input
                    id="mcp-command"
                    value={mcpForm.command}
                    onChange={(e) => setMcpForm({ ...mcpForm, command: e.target.value })}
                    placeholder="örn: npx"
                    className="h-9"
                  />
                  <p className="text-[11px] text-foreground/40">MCP sunucusunu başlatmak için komut</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="mcp-args" className="text-[13px]">Argümanlar</Label>
                  <Input
                    id="mcp-args"
                    value={mcpForm.args}
                    onChange={(e) => setMcpForm({ ...mcpForm, args: e.target.value })}
                    placeholder="örn: --port 3000"
                    className="h-9"
                  />
                  <p className="text-[11px] text-foreground/40">Boşlukla ayrılmış argümanlar</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="mcp-endpoint" className="text-[13px]">Endpoint URL</Label>
                  <Input
                    id="mcp-endpoint"
                    value={mcpForm.endpoint}
                    onChange={(e) => setMcpForm({ ...mcpForm, endpoint: e.target.value })}
                    placeholder="örn: http://localhost:3000/sse"
                    className="h-9"
                  />
                  <p className="text-[11px] text-foreground/40">HTTP transport için endpoint</p>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="mcp-enabled" className="text-[13px]">Etkin</Label>
                  <Switch
                    id="mcp-enabled"
                    checked={mcpForm.enabled}
                    onCheckedChange={(checked) => setMcpForm({ ...mcpForm, enabled: checked })}
                  />
                </div>
              </>
            )}

            {/* API Configuration */}
            {selectedType === 'api' && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="api-name" className="text-[13px]">
                    API Adı <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="api-name"
                    value={apiForm.name}
                    onChange={(e) => setApiForm({ ...apiForm, name: e.target.value })}
                    placeholder="örn: OpenAI API"
                    className="h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="api-url" className="text-[13px]">
                    Base URL <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="api-url"
                    value={apiForm.baseUrl}
                    onChange={(e) => setApiForm({ ...apiForm, baseUrl: e.target.value })}
                    placeholder="https://api.example.com"
                    className="h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="api-auth" className="text-[13px]">Kimlik Doğrulama</Label>
                  <Select
                    value={apiForm.authType}
                    onValueChange={(v: APIAuthType) => setApiForm({ ...apiForm, authType: v })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AUTH_TYPES.map(({ value, label }) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {apiForm.authType === 'bearer' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="api-token" className="text-[13px]">Bearer Token</Label>
                    <Input
                      id="api-token"
                      type="password"
                      value={apiForm.token}
                      onChange={(e) => setApiForm({ ...apiForm, token: e.target.value })}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      className="h-9"
                    />
                  </div>
                )}

                {apiForm.authType === 'basic' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="api-username" className="text-[13px]">Kullanıcı Adı</Label>
                      <Input
                        id="api-username"
                        value={apiForm.username}
                        onChange={(e) => setApiForm({ ...apiForm, username: e.target.value })}
                        placeholder="username"
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="api-password" className="text-[13px]">Şifre</Label>
                      <Input
                        id="api-password"
                        type="password"
                        value={apiForm.password}
                        onChange={(e) => setApiForm({ ...apiForm, password: e.target.value })}
                        placeholder="••••••••"
                        className="h-9"
                      />
                    </div>
                  </div>
                )}

                {apiForm.authType === 'api-key' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="api-key-header" className="text-[13px]">Header Adı</Label>
                      <Input
                        id="api-key-header"
                        value={apiForm.keyHeader}
                        onChange={(e) => setApiForm({ ...apiForm, keyHeader: e.target.value })}
                        placeholder="X-API-Key"
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="api-key-value" className="text-[13px]">Anahtar Değeri</Label>
                      <Input
                        id="api-key-value"
                        type="password"
                        value={apiForm.keyValue}
                        onChange={(e) => setApiForm({ ...apiForm, keyValue: e.target.value })}
                        placeholder="sk-..."
                        className="h-9"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="api-ratelimit" className="text-[13px]">Rate Limit</Label>
                    <Input
                      id="api-ratelimit"
                      type="number"
                      value={apiForm.rateLimit}
                      onChange={(e) => setApiForm({ ...apiForm, rateLimit: e.target.value })}
                      placeholder="60"
                      className="h-9"
                    />
                    <p className="text-[11px] text-foreground/40">istek/dakika</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="api-timeout" className="text-[13px]">Timeout</Label>
                    <Input
                      id="api-timeout"
                      type="number"
                      value={apiForm.timeout}
                      onChange={(e) => setApiForm({ ...apiForm, timeout: e.target.value })}
                      placeholder="5000"
                      className="h-9"
                    />
                    <p className="text-[11px] text-foreground/40">milisaniye</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="api-enabled" className="text-[13px]">Etkin</Label>
                  <Switch
                    id="api-enabled"
                    checked={apiForm.enabled}
                    onCheckedChange={(checked) => setApiForm({ ...apiForm, enabled: checked })}
                  />
                </div>
              </>
            )}

            {/* Local Configuration */}
            {selectedType === 'local' && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="local-name" className="text-[13px]">
                    Kaynak Adı <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="local-name"
                    value={localForm.name}
                    onChange={(e) => setLocalForm({ ...localForm, name: e.target.value })}
                    placeholder="örn: Proje Kaynakları"
                    className="h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="local-path" className="text-[13px]">
                    Dosya Yolu <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="local-path"
                    value={localForm.path}
                    onChange={(e) => setLocalForm({ ...localForm, path: e.target.value })}
                    placeholder="/var/www/project"
                    className="h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="local-type" className="text-[13px]">Klasör Türü</Label>
                  <Select
                    value={localForm.type}
                    onValueChange={(v: LocalFolderType) => setLocalForm({ ...localForm, type: v })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LOCAL_TYPES.map(({ value, label }) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="local-include" className="text-[13px]">Include Pattern</Label>
                  <Input
                    id="local-include"
                    value={localForm.include}
                    onChange={(e) => setLocalForm({ ...localForm, include: e.target.value })}
                    placeholder="*.ts,*.tsx"
                    className="h-9"
                  />
                  <p className="text-[11px] text-foreground/40">Virgülle ayrılmış glob pattern'lar</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="local-exclude" className="text-[13px]">Exclude Pattern</Label>
                  <Input
                    id="local-exclude"
                    value={localForm.exclude}
                    onChange={(e) => setLocalForm({ ...localForm, exclude: e.target.value })}
                    placeholder="node_modules,*.test.ts"
                    className="h-9"
                  />
                  <p className="text-[11px] text-foreground/40">Virgülle ayrılmış glob pattern'lar</p>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="local-watch" className="text-[13px]">Değişiklikleri İzle</Label>
                    <p className="text-[11px] text-foreground/40">Dosya değişikliklerini otomatik algıla</p>
                  </div>
                  <Switch
                    id="local-watch"
                    checked={localForm.watch}
                    onCheckedChange={(checked) => setLocalForm({ ...localForm, watch: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="local-enabled" className="text-[13px]">Etkin</Label>
                  <Switch
                    id="local-enabled"
                    checked={localForm.enabled}
                    onCheckedChange={(checked) => setLocalForm({ ...localForm, enabled: checked })}
                  />
                </div>
              </>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="ghost"
                onClick={handleBack}
                disabled={isCreating}
              >
                <ChevronRight className="h-4 w-4 mr-1 rotate-180" />
                Geri
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Oluşturuluyor...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Oluştur
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default AddSourceDialog
