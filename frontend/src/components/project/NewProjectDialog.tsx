/**
 * NewProjectDialog - Dialog for creating new projects
 * @module @task-filewas/frontend/components/project/NewProjectDialog
 *
 * Features:
 * - Project name input (required)
 * - Description input (optional)
 * - Project type selector
 * - GitHub URL input for import (optional)
 * - Icon/emoji picker (optional)
 * - Color picker (optional)
 * - Tags input (optional)
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
  Folder,
  FolderGit2,
  Globe,
  Server,
  Smartphone,
  Terminal,
  Package,
  Layers,
  Plus,
  Loader2,
  Github,
} from 'lucide-react'
import type { ProjectType, ProjectCreate } from '@task-filewas/shared'

// =============================================================================
// Types
// =============================================================================

export interface NewProjectDialogProps {
  /** Whether the dialog is open */
  open: boolean
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void
  /** Callback when project is created */
  onSubmit: (data: ProjectCreate) => Promise<void>
  /** Whether creation is in progress */
  isLoading?: boolean
}

interface FormState {
  name: string
  description: string
  type: ProjectType
  githubUrl: string
  icon: string
  color: string
  tags: string
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
  name: '',
  description: '',
  type: 'other',
  githubUrl: '',
  icon: '',
  color: '',
  tags: '',
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

// =============================================================================
// Main Component
// =============================================================================

/**
 * NewProjectDialog - Modal dialog for creating new projects
 *
 * @example
 * ```tsx
 * <NewProjectDialog
 *   open={isDialogOpen}
 *   onOpenChange={setIsDialogOpen}
 *   onSubmit={handleCreateProject}
 *   isLoading={isCreating}
 * />
 * ```
 */
export function NewProjectDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading = false,
}: NewProjectDialogProps) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM_STATE)
  const [error, setError] = useState<string | null>(null)

  // Reset form when dialog closes
  React.useEffect(() => {
    if (!open) {
      setForm(INITIAL_FORM_STATE)
      setError(null)
    }
  }, [open])

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (error) setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate required fields
    if (!form.name.trim()) {
      setError('Proje adi gereklidir')
      return
    }

    // Build project create data
    const data: ProjectCreate = {
      name: form.name.trim(),
      type: form.type,
    }

    if (form.description.trim()) {
      data.description = form.description.trim()
    }

    if (form.githubUrl.trim()) {
      data.githubUrl = form.githubUrl.trim()
    }

    if (form.icon) {
      data.icon = form.icon
    }

    if (form.color) {
      data.color = form.color
    }

    if (form.tags.trim()) {
      data.tags = form.tags.split(',').map((t) => t.trim()).filter(Boolean)
    }

    try {
      await onSubmit(data)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Proje olusturulamadi')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-accent" />
            Yeni Proje Olustur
          </DialogTitle>
          <DialogDescription>
            Yeni bir proje olusturun veya GitHub'dan mevcut bir projeyi import edin.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Error message */}
          {error && (
            <div className="text-[13px] text-destructive bg-destructive/10 px-3 py-2 rounded-[6px]">
              {error}
            </div>
          )}

          {/* Project name */}
          <FormField label="Proje Adi" required>
            <Input
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="ornek: e-commerce-app"
              disabled={isLoading}
              className="h-9"
            />
          </FormField>

          {/* Description */}
          <FormField label="Aciklama" description="Kisa bir proje aciklamasi">
            <Input
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Proje hakkinda kisa aciklama..."
              disabled={isLoading}
              className="h-9"
            />
          </FormField>

          {/* Project type */}
          <FormField label="Proje Tipi">
            <Select
              value={form.type}
              onValueChange={(value: ProjectType) => handleChange('type', value)}
              disabled={isLoading}
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

          {/* GitHub URL */}
          <FormField
            label="GitHub URL"
            description="Mevcut bir repoyu import etmek icin (opsiyonel)"
          >
            <div className="relative">
              <Github className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
              <Input
                value={form.githubUrl}
                onChange={(e) => handleChange('githubUrl', e.target.value)}
                placeholder="https://github.com/user/repo"
                disabled={isLoading}
                className="h-9 pl-8"
              />
            </div>
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

          {/* Tags */}
          <FormField
            label="Etiketler"
            description="Virgul ile ayrilmis etiketler (opsiyonel)"
          >
            <Input
              value={form.tags}
              onChange={(e) => handleChange('tags', e.target.value)}
              placeholder="react, typescript, api"
              disabled={isLoading}
              className="h-9"
            />
          </FormField>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Iptal
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Olusturuluyor...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Olustur
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default NewProjectDialog
