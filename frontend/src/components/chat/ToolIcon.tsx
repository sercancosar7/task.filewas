/**
 * ToolIcon - Tool icon component with color mapping
 * @module @task-filewas/frontend/components/chat/ToolIcon
 *
 * Provides icon and color mapping for Claude CLI tools.
 * Used in ActivityRow and other components to display tool visuals.
 *
 * Tool Color Scheme:
 * - Read: accent (purple) - File reading operations
 * - Write: success (green) - File creation
 * - Edit: info (blue) - File modification
 * - Bash: accent (purple) - Terminal commands
 * - TodoWrite: success (green) - Task completion
 * - Others: muted-foreground or accent
 */

import {
  FileText,
  FilePlus,
  Pencil,
  Terminal,
  Search,
  FileSearch,
  Bot,
  Globe,
  CheckSquare,
  HelpCircle,
  ListTodo,
  LogOut,
  Zap,
  Sparkles,
  BookOpen,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ToolName } from '@task-filewas/shared'

// =============================================================================
// Types
// =============================================================================

export interface ToolIconProps {
  /** Tool name */
  name: ToolName
  /** Icon size class (default: 'w-3 h-3') */
  size?: string | undefined
  /** Additional CSS classes */
  className?: string | undefined
  /** Whether to apply tool-specific color */
  colored?: boolean | undefined
}

export interface ToolConfig {
  /** Lucide icon component */
  icon: LucideIcon
  /** Tailwind color class */
  colorClass: string
  /** Human-readable label */
  label: string
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Tool icons mapping
 * Maps tool names to their respective Lucide icons
 */
export const TOOL_ICONS: Record<ToolName, LucideIcon> = {
  Read: FileText,
  Write: FilePlus,
  Edit: Pencil,
  Bash: Terminal,
  Glob: Search,
  Grep: FileSearch,
  Task: Bot,
  WebFetch: Globe,
  TodoWrite: CheckSquare,
  AskUserQuestion: HelpCircle,
  EnterPlanMode: ListTodo,
  ExitPlanMode: LogOut,
  Skill: Zap,
  WebSearch: Sparkles,
  NotebookEdit: BookOpen,
}

/**
 * Tool color classes
 * Color scheme based on Craft Agents design:
 * - accent (purple): Read operations, terminal, task spawning
 * - success (green): Write/create operations, completions
 * - info (blue): Edit/modify operations, questions
 * - muted-foreground: Search/query operations
 */
export const TOOL_COLORS: Record<ToolName, string> = {
  Read: 'text-accent',
  Write: 'text-success',
  Edit: 'text-info',
  Bash: 'text-accent',
  Glob: 'text-muted-foreground',
  Grep: 'text-muted-foreground',
  Task: 'text-accent',
  WebFetch: 'text-accent',
  TodoWrite: 'text-success',
  AskUserQuestion: 'text-info',
  EnterPlanMode: 'text-accent',
  ExitPlanMode: 'text-success',
  Skill: 'text-accent',
  WebSearch: 'text-accent',
  NotebookEdit: 'text-accent',
}

/**
 * Tool labels for accessibility and display
 */
export const TOOL_LABELS: Record<ToolName, string> = {
  Read: 'Dosya Oku',
  Write: 'Dosya Yaz',
  Edit: 'Dosya Düzenle',
  Bash: 'Terminal Komutu',
  Glob: 'Dosya Ara',
  Grep: 'İçerik Ara',
  Task: 'Alt Görev',
  WebFetch: 'Web İstek',
  TodoWrite: 'Görev Listesi',
  AskUserQuestion: 'Soru Sor',
  EnterPlanMode: 'Plan Moduna Gir',
  ExitPlanMode: 'Plan Modundan Çık',
  Skill: 'Beceri Çalıştır',
  WebSearch: 'Web Ara',
  NotebookEdit: 'Notebook Düzenle',
}

/**
 * Default icon size
 */
export const DEFAULT_ICON_SIZE = 'w-3 h-3'

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get tool configuration (icon, color, label)
 * @param name - Tool name
 * @returns Tool configuration object
 */
export function getToolConfig(name: ToolName): ToolConfig {
  return {
    icon: TOOL_ICONS[name] || FileText,
    colorClass: TOOL_COLORS[name] || 'text-muted-foreground',
    label: TOOL_LABELS[name] || name,
  }
}

/**
 * Get icon component for a tool
 * @param name - Tool name
 * @returns Lucide icon component
 */
export function getToolIcon(name: ToolName): LucideIcon {
  return TOOL_ICONS[name] || FileText
}

/**
 * Get color class for a tool
 * @param name - Tool name
 * @returns Tailwind color class
 */
export function getToolColor(name: ToolName): string {
  return TOOL_COLORS[name] || 'text-muted-foreground'
}

// =============================================================================
// Component
// =============================================================================

/**
 * ToolIcon - Renders an icon for a Claude CLI tool
 *
 * @example
 * ```tsx
 * // Basic usage
 * <ToolIcon name="Read" />
 *
 * // With custom size
 * <ToolIcon name="Edit" size="w-4 h-4" />
 *
 * // Without color (inherit)
 * <ToolIcon name="Bash" colored={false} />
 *
 * // With additional classes
 * <ToolIcon name="Write" className="mr-2" />
 * ```
 */
export function ToolIcon({
  name,
  size = DEFAULT_ICON_SIZE,
  className,
  colored = true,
}: ToolIconProps) {
  const Icon = TOOL_ICONS[name] || FileText
  const colorClass = colored ? TOOL_COLORS[name] || 'text-muted-foreground' : ''

  return (
    <Icon
      className={cn(size, 'shrink-0', colorClass, className)}
      aria-label={TOOL_LABELS[name] || name}
    />
  )
}

export default ToolIcon
