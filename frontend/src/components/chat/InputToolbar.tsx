/**
 * InputToolbar - Chat input toolbar component (Craft Agents style)
 * @module @task-filewas/frontend/components/chat/InputToolbar
 *
 * Layout:
 * ┌────────────────────────────────────────────────────────────────────────────────┐
 * │ 📎  💬 Quick Chat ▼  📁 my-project    Auto ▼  🔒 Safe ▼  ☐ Think               │
 * └────────────────────────────────────────────────────────────────────────────────┘
 *
 * Features:
 * - Attach button (file upload placeholder)
 * - Chat mode dropdown (Quick Chat, Planning, TDD, Debug, Code Review)
 * - Project selector (placeholder)
 * - Model selector (Auto, Claude, GLM) with force toggle
 * - Permission mode dropdown (Safe, Ask, Auto)
 * - Thinking toggle (Off, Think, Max - Shift+click for Max)
 */

import { Paperclip, FolderOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { PermissionDropdown, type PermissionMode } from './PermissionDropdown'
import { ModeDropdown, type ChatMode } from './ModeDropdown'
import { ThinkingToggle, type ThinkingLevel } from './ThinkingToggle'
import { ModelDropdown, type ModelType } from './ModelDropdown'

// =============================================================================
// Types
// =============================================================================

export interface InputToolbarProps {
  /** Current permission mode */
  permissionMode: PermissionMode
  /** Callback when permission mode changes */
  onPermissionModeChange: (mode: PermissionMode) => void
  /** Current chat mode */
  chatMode: ChatMode
  /** Callback when chat mode changes */
  onChatModeChange: (mode: ChatMode) => void
  /** Current thinking level */
  thinkingLevel: ThinkingLevel
  /** Callback when thinking level changes */
  onThinkingLevelChange: (level: ThinkingLevel) => void
  /** Current selected model */
  selectedModel: ModelType
  /** Callback when model changes */
  onSelectedModelChange: (model: ModelType) => void
  /** Force mode - all agents use selected model */
  forceModel?: boolean
  /** Callback when force mode toggles */
  onForceModelChange?: (force: boolean) => void
  /** Current project name */
  projectName?: string
  /** Callback when attach button is clicked */
  onAttach?: () => void
  /** Whether toolbar is disabled */
  disabled?: boolean
  /** Additional CSS classes */
  className?: string
}

// =============================================================================
// Component
// =============================================================================

/**
 * InputToolbar - Toolbar below chat input with mode selectors and actions
 *
 * @example
 * ```tsx
 * <InputToolbar
 *   permissionMode="ask"
 *   onPermissionModeChange={setPermissionMode}
 *   chatMode="quick"
 *   onChatModeChange={setChatMode}
 *   thinkingLevel="off"
 *   onThinkingLevelChange={setThinkingLevel}
 *   projectName="task.filewas"
 *   onAttach={() => fileInputRef.current?.click()}
 * />
 * ```
 */
export function InputToolbar({
  permissionMode,
  onPermissionModeChange,
  chatMode,
  onChatModeChange,
  thinkingLevel,
  onThinkingLevelChange,
  selectedModel,
  onSelectedModelChange,
  forceModel = false,
  onForceModelChange,
  projectName = 'Proje sec...',
  onAttach,
  disabled = false,
  className,
}: InputToolbarProps) {
  return (
    <div
      className={cn(
        // Layout
        'flex items-center gap-3 px-3 py-2',
        // Typography
        'text-[13px]',
        // Disabled state
        disabled && 'opacity-50 pointer-events-none',
        className
      )}
    >
      {/* Left Section - Attach & Mode */}
      <div className="flex items-center gap-2">
        {/* Attach Button */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onAttach}
          disabled={disabled}
          className={cn(
            'h-7 px-2',
            'rounded-[6px]',
            'text-muted-foreground',
            'hover:bg-foreground/5 hover:text-foreground'
          )}
          title="Dosya ekle"
          aria-label="Dosya ekle"
        >
          <Paperclip className="h-4 w-4" />
        </Button>

        {/* Chat Mode Dropdown */}
        <ModeDropdown
          value={chatMode}
          onChange={onChatModeChange}
          disabled={disabled}
        />
      </div>

      {/* Center Section - Project */}
      <div className="flex items-center gap-2 ml-auto mr-auto">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          className={cn(
            'h-7 px-2',
            'rounded-[6px]',
            'text-muted-foreground',
            'hover:bg-foreground/5 hover:text-foreground',
            'gap-1.5'
          )}
          title="Proje sec"
          aria-label="Proje sec"
        >
          <FolderOpen className="h-3.5 w-3.5" />
          <span className="truncate max-w-[150px]">{projectName}</span>
        </Button>
      </div>

      {/* Right Section - Model, Permission Mode & Thinking Toggle */}
      <div className="flex items-center gap-2">
        {/* AI Model Dropdown */}
        <ModelDropdown
          value={selectedModel}
          onChange={onSelectedModelChange}
          forceModel={forceModel}
          onForceChange={onForceModelChange ?? undefined}
          disabled={disabled}
        />

        <PermissionDropdown
          value={permissionMode}
          onChange={onPermissionModeChange}
          disabled={disabled}
        />

        {/* Thinking Toggle */}
        <ThinkingToggle
          value={thinkingLevel}
          onChange={onThinkingLevelChange}
          disabled={disabled}
        />
      </div>
    </div>
  )
}

export default InputToolbar
