/**
 * ImportRepoDialog - Dialog for importing existing GitHub repositories
 * @module @task-filewas/frontend/components/project/ImportRepoDialog
 *
 * Features:
 * - GitHub URL input with validation
 * - Project configuration (name, type, icon, color)
 * - Auto-detect project type from URL
 * - Clone and setup options
 *
 * Design Reference: Craft Agents dialog components
 */

import * as React from 'react'
import { useState } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  GithubIcon,
  Globe,
  Server,
  Smartphone,
  Terminal,
  Package,
  Layers,
  Folder,
  FolderGit2,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import type { ProjectType } from '@task-filewas/shared'

// =============================================================================
// Types
// =============================================================================

export interface ImportRepoDialogProps {
  /** Whether the dialog is open */
  open: boolean
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void
}

interface FormState {
  githubUrl: string
  name: string
  description: string
  type: ProjectType
  icon: string
  color: string
}

// =============================================================================
// Constants
// =============================================================================

const PROJECT_TYPES: Array<{ value: ProjectType; label: string; icon: React.ElementType }> = [
  { value: 'web', label: 'Web', icon: Globe },
  { value: 'backend', label: 'Backend', icon: Server },
  { value: 'fullstack', label: 'Fullstack', icon: Layers },
  { value: 'mobile', label: 'Mobile', icon: Smartphone },
  { value: 'cli', label: 'CLI', icon: Terminal },
  { value: 'library', label: 'Library', icon: Package },
  { value: 'monorepo', label: 'Monorepo', icon: FolderGit2 },
  { value: 'other', label: 'Diger', icon: Folder },
]

const PRESET_COLORS = [
  '#6366F1', // Indigo
  '#8B5CF6', // Violet
  '#A855F7', // Purple
  '#EC4899', // Pink
  '#EF4444', // Red
  '#F97316', // Orange
  '#EAB308', // Yellow
  '#22C55E', // Green
  '#14B8A6', // Teal
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#6B7280', // Gray
]

const PRESET_ICONS = [
  '\u{1F4BB}', // Laptop
  '\u{1F310}', // Globe
  '\u{1F680}', // Rocket
  '\u{2699}\u{FE0F}', // Gear
  '\u{1F4E6}', // Package
  '\u{1F527}', // Wrench
  '\u{1F4F1}', // Phone
  '\u{1F5A5}\u{FE0F}', // Desktop
  '\u{26A1}', // Lightning
  '\u{1F4CA}', // Chart
  '\u{1F916}', // Robot
  '\u{1F3AF}', // Target
]

const INITIAL_FORM_STATE: FormState = {
  githubUrl: '',
  name: '',
  description: '',
  type: 'other',
  icon: '',
  color: '',
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Extract repo name from GitHub URL
 */
function extractRepoName(url: string): string | null {
  try {
    const normalizedUrl = url.trim().toLowerCase()

    // Support various GitHub URL formats
    let match: RegExpMatchArray | null = null

    // https://github.com/user/repo
    match = normalizedUrl.match(/github\.com\/([^\/]+)\/([^\/\?#]+)/)
    if (match) return match[2] ?? null

    // https://www.github.com/user/repo
    match = normalizedUrl.match(/www\.github\.com\/([^\/]+)\/([^\/\?#]+)/)
    if (match) return match[2] ?? null

    // git@github.com:user/repo.git
    match = normalizedUrl.match(/github\.com:([^\/]+)\/([^\/\.]+)\.git/)
    if (match) return match[2] ?? null

    return null
  } catch {
    return null
  }
}

/**
 * Detect project type from repo name
 */
function detectProjectType(repoName: string): ProjectType {
  const name = repoName.toLowerCase()

  // Common patterns
  if (name.includes('app') || name.includes('web') || name.includes('frontend')) {
    return 'web'
  }
  if (name.includes('api') || name.includes('server') || name.includes('backend')) {
    return 'backend'
  }
  if (name.includes('mobile') || name.includes('android') || name.includes('ios')) {
    return 'mobile'
  }
  if (name.includes('cli') || name.includes('cmd') || name.includes('tool')) {
    return 'cli'
  }
  if (name.includes('lib') || name.includes('package') || name.includes('sdk')) {
    return 'library'
  }
  if (name.includes('mono') || name.includes('turbo') || name.includes('nx')) {
    return 'monorepo'
  }

  return 'other'
}

/**
 * Validate GitHub URL
 */
function validateGitHubUrl(url: string): { valid: boolean; error?: string } {
  if (!url.trim()) {
    return { valid: false, error: 'GitHub URL gereklidir' }
  }

  const repoName = extractRepoName(url)
  if (!repoName) {
    return {
      valid: false,
      error: 'Gecerli bir GitHub URL girin (ornek: https://github.com/user/repo)',
    }
  }

  return { valid: true }
}

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * Form field wrapper with label
 */
function FormField({
  label,
  required,
  children,
  description,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
  description?: string
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[13px] font-medium text-foreground/80">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
      {description && (
        <p className="text-[11px] text-foreground/40">{description}</p>
      )}
    </div>
  )
}

/**
 * Color picker grid
 */
function ColorPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (color: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {PRESET_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(value === color ? '' : color)}
          className={cn(
            'h-6 w-6 rounded-[4px] transition-all duration-150',
            'hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            value === color && 'ring-2 ring-foreground/50 ring-offset-2 ring-offset-background'
          )}
          style={{ backgroundColor: color }}
          aria-label={`Renk: ${color}`}
        />
      ))}
    </div>
  )
}

/**
 * Icon picker grid
 */
function IconPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (icon: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {PRESET_ICONS.map((icon) => (
        <button
          key={icon}
          type="button"
          onClick={() => onChange(value === icon ? '' : icon)}
          className={cn(
            'h-8 w-8 rounded-[4px] text-lg flex items-center justify-center transition-all duration-150',
            'bg-foreground/5 hover:bg-foreground/10',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            value === icon && 'ring-2 ring-accent ring-offset-2 ring-offset-background bg-accent/10'
          )}
          aria-label={`Ikon: ${icon}`}
        >
          {icon}
        </button>
      ))}
    </div>
  )
}

/**
 * URL validation status indicator
 */
function UrlStatus({ url }: { url: string }) {
  const validation = validateGitHubUrl(url)

  if (!url) {
    return null
  }

  if (validation.valid) {
    const repoName = extractRepoName(url)
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-success">
        <CheckCircle2 className="h-3.5 w-3.5" />
        <span>Repo: {repoName}</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5 text-[11px] text-destructive">
      <AlertCircle className="h-3.5 w-3.5" />
      <span>{validation.error}</span>
    </div>
  )
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * ImportRepoDialog - Modal dialog for importing GitHub repositories
 *
 * @example
 * ```tsx
 * <ImportRepoDialog
 *   open={isImportDialogOpen}
 *   onOpenChange={setIsImportDialogOpen}
 * />
 * ```
 */
export function ImportRepoDialog({ open, onOpenChange }: ImportRepoDialogProps) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM_STATE)
  const [isImporting, setIsImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset form when dialog closes
  React.useEffect(() => {
    if (!open) {
      setForm(INITIAL_FORM_STATE)
      setError(null)
      setIsImporting(false)
    }
  }, [open])

  // Auto-detect project info from GitHub URL
  React.useEffect(() => {
    const repoName = extractRepoName(form.githubUrl)
    if (repoName && !form.name) {
      // Only auto-fill if name is empty
      setForm((prev) => ({
        ...prev,
        name: repoName,
        type: detectProjectType(repoName),
      }))
    }
  }, [form.githubUrl, form.name])

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (error) setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate GitHub URL
    const validation = validateGitHubUrl(form.githubUrl)
    if (!validation.valid) {
      setError(validation.error || 'Gecerli bir GitHub URL girin')
      return
    }

    if (!form.name.trim()) {
      setError('Proje adi gereklidir')
      return
    }

    setIsImporting(true)

    try {
      // TODO: Implement actual import API call
      // For now, simulate the import process
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // On success, close dialog
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Repo import edilemedi')
    } finally {
      setIsImporting(false)
    }
  }

  const urlValidation = validateGitHubUrl(form.githubUrl)
  const isValid = urlValidation.valid && form.name.trim()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GithubIcon className="h-5 w-5 text-foreground" />
            GitHub Repo Import Et
          </DialogTitle>
          <DialogDescription>
            Mevcut bir GitHub reposunu import ederek projenize ekleyin.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Error message */}
          {error && (
            <div className="text-[13px] text-destructive bg-destructive/10 px-3 py-2 rounded-[6px]">
              {error}
            </div>
          )}

          {/* GitHub URL */}
          <FormField label="GitHub URL" required>
            <div className="relative">
              <GithubIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
              <Input
                value={form.githubUrl}
                onChange={(e) => handleChange('githubUrl', e.target.value)}
                placeholder="https://github.com/user/repo"
                disabled={isImporting}
                className={cn(
                  'h-9 pl-8',
                  urlValidation.valid ? 'border-success/50' : '',
                  form.githubUrl && !urlValidation.valid ? 'border-destructive/50' : ''
                )}
              />
            </div>
            {/* URL validation status */}
            {form.githubUrl && <UrlStatus url={form.githubUrl} />}
          </FormField>

          {/* Project name (auto-detected) */}
          <FormField label="Proje Adi" required description="Repo isminden otomatik alindi">
            <Input
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="my-project"
              disabled={isImporting}
              className="h-9"
            />
          </FormField>

          {/* Description */}
          <FormField label="Aciklama" description="Proje hakkinda kisa aciklama">
            <Input
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Proje hakkinda kisa aciklama..."
              disabled={isImporting}
              className="h-9"
            />
          </FormField>

          {/* Project type */}
          <FormField label="Proje Tipi">
            <Select
              value={form.type}
              onValueChange={(value: ProjectType) => handleChange('type', value)}
              disabled={isImporting}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_TYPES.map(({ value, label, icon: Icon }) => (
                  <SelectItem key={value} value={value}>
                    <span className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-foreground/60" />
                      {label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          {/* Icon picker */}
          <FormField label="Ikon" description="Proje icin bir emoji secin (opsiyonel)">
            <IconPicker
              value={form.icon}
              onChange={(icon) => handleChange('icon', icon)}
            />
          </FormField>

          {/* Color picker */}
          <FormField label="Renk" description="Proje rengi (opsiyonel)">
            <ColorPicker
              value={form.color}
              onChange={(color) => handleChange('color', color)}
            />
          </FormField>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isImporting}
            >
              Iptal
            </Button>
            <Button type="submit" disabled={!isValid || isImporting}>
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Import Ediliyor...
                </>
              ) : (
                <>
                  <GithubIcon className="h-4 w-4 mr-2" />
                  Import Et
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default ImportRepoDialog
