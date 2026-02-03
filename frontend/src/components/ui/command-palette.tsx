/**
 * Command Palette - Hizli komut arama (Cmd+K)
 * @module @task-filewas/frontend/components/ui/command-palette
 *
 * Craft Agents style command palette with:
 * - Keyboard shortcut (Cmd/Ctrl + K)
 * - Fuzzy search
 * - Command categories
 * - Action execution
 */

import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  LayoutDashboard,
  FolderOpen,
  MessageSquare,
  Bot,
  Zap,
  Plug,
  FileText,
  Settings,
  LogOut,
  Plus,
  GitBranch,
  Loader2,
  ChevronRight,
  type LucideProps,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cva } from 'class-variance-authority'

import { cn } from '@/lib/utils'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/useToast'
import { ROUTES } from '@/router/routes'

// Simple logout function (token removal)
const handleLogout = () => {
  localStorage.removeItem('token')
  window.location.href = ROUTES.LOGIN
}

// ============================================================================
// Types & Interfaces
// ============================================================================

export type CommandAction =
  | 'navigate'
  | 'function'
  | 'external'
  | 'settings-toggle'

export interface Command {
  id: string
  label: string
  description?: string
  icon: React.ComponentType<LucideProps>
  category: CommandCategory
  keywords?: string[]
  action: CommandAction
  value?: string
  shortcut?: string
  disabled?: boolean
}

export type CommandCategory =
  | 'navigation'
  | 'projects'
  | 'sessions'
  | 'ecc'
  | 'settings'
  | 'system'

export interface CommandCategoryConfig {
  id: CommandCategory
  label: string
  icon: React.ComponentType<LucideProps>
  order: number
}

// ============================================================================
// Command Categories
// ============================================================================

const COMMAND_CATEGORIES: Record<CommandCategory, CommandCategoryConfig> = {
  navigation: {
    id: 'navigation',
    label: 'Navigasyon',
    icon: LayoutDashboard,
    order: 1,
  },
  projects: {
    id: 'projects',
    label: 'Projeler',
    icon: FolderOpen,
    order: 2,
  },
  sessions: {
    id: 'sessions',
    label: 'Oturumlar',
    icon: MessageSquare,
    order: 3,
  },
  ecc: {
    id: 'ecc',
    label: 'ECC',
    icon: Zap,
    order: 4,
  },
  settings: {
    id: 'settings',
    label: 'Ayarlar',
    icon: Settings,
    order: 5,
  },
  system: {
    id: 'system',
    label: 'Sistem',
    icon: LogOut,
    order: 6,
  },
}

// ============================================================================
// Command Palette Props
// ============================================================================

export interface CommandPaletteProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  commands?: Command[]
  onCommandExecute?: (command: Command) => void
  placeholder?: string
  className?: string
}

// ============================================================================
// Variants
// ============================================================================

const commandItemVariants = cva(
  'flex items-center gap-3 rounded-[6px] px-3 py-2.5 text-left text-[13px] transition-colors',
  {
    variants: {
      selected: {
        true: 'bg-accent/15 text-accent',
        false: 'hover:bg-foreground/5 text-foreground',
      },
      disabled: {
        true: 'opacity-50 cursor-not-allowed',
        false: '',
      },
    },
    defaultVariants: {
      selected: false,
      disabled: false,
    },
  }
)

// ============================================================================
// Command Palette Component
// ============================================================================

/**
 * CommandPalette - Modal command palette with fuzzy search
 *
 * Features:
 * - Keyboard navigation (arrow keys, enter, escape)
 * - Fuzzy search with scoring
 * - Category grouping
 * - Command execution callback
 */
export function CommandPalette({
  open: controlledOpen,
  onOpenChange,
  commands: customCommands = [],
  onCommandExecute,
  placeholder = 'Komut ara veya yaz...',
  className,
}: CommandPaletteProps) {
  const navigate = useNavigate()
  const toast = useToast()

  // Internal open state (uncontrolled mode)
  const [internalOpen, setInternalOpen] = React.useState(false)
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = onOpenChange || setInternalOpen

  // Search state
  const [searchQuery, setSearchQuery] = React.useState('')
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const [isExecuting, setIsExecuting] = React.useState(false)

  // Refs
  const inputRef = React.useRef<HTMLInputElement>(null)
  const listRef = React.useRef<HTMLDivElement>(null)

  // Default commands
  const defaultCommands: Command[] = React.useMemo(
    () => [
      // Navigation
      {
        id: 'nav-dashboard',
        label: 'Dashboard',
        description: 'Ana sayfaya git',
        icon: LayoutDashboard,
        category: 'navigation',
        keywords: ['home', 'anasayfa', 'panel'],
        action: 'navigate',
        value: ROUTES.DASHBOARD,
        shortcut: 'G then D',
      },
      {
        id: 'nav-projects',
        label: 'Projeler',
        description: 'Tum projeleri gor',
        icon: FolderOpen,
        category: 'navigation',
        keywords: ['project', 'proje'],
        action: 'navigate',
        value: ROUTES.PROJECTS,
        shortcut: 'G then P',
      },
      {
        id: 'nav-sessions',
        label: 'Oturumlar',
        description: 'Tum oturumlari gor',
        icon: MessageSquare,
        category: 'navigation',
        keywords: ['session', 'oturum', 'chat'],
        action: 'navigate',
        value: ROUTES.SESSIONS,
        shortcut: 'G then S',
      },
      {
        id: 'nav-agents',
        label: 'Agentler',
        description: 'AI agentlerini yonet',
        icon: Bot,
        category: 'navigation',
        keywords: ['agent', 'bot', 'ai'],
        action: 'navigate',
        value: ROUTES.AGENTS,
      },
      {
        id: 'nav-skills',
        label: 'Skills',
        description: 'Skill yonetimi',
        icon: Zap,
        category: 'navigation',
        keywords: ['skill', 'yetenek'],
        action: 'navigate',
        value: ROUTES.SKILLS,
      },
      {
        id: 'nav-sources',
        label: 'Kaynaklar',
        description: 'MCP ve API kaynaklari',
        icon: Plug,
        category: 'navigation',
        keywords: ['source', 'kaynak', 'mcp', 'api'],
        action: 'navigate',
        value: ROUTES.SOURCES,
      },
      {
        id: 'nav-logs',
        label: 'Loglar',
        description: 'Sistem loglari',
        icon: FileText,
        category: 'navigation',
        keywords: ['log', 'logs', 'loglama'],
        action: 'navigate',
        value: ROUTES.LOGS,
      },
      {
        id: 'nav-settings',
        label: 'Ayarlar',
        description: 'Uygulama ayarlari',
        icon: Settings,
        category: 'navigation',
        keywords: ['setting', 'ayar', 'config'],
        action: 'navigate',
        value: ROUTES.SETTINGS,
        shortcut: 'G then S',
      },
      // Projects
      {
        id: 'project-new',
        label: 'Yeni Proje',
        description: 'Yeni proje olustur',
        icon: Plus,
        category: 'projects',
        keywords: ['new', 'yeni', 'create', 'olustur'],
        action: 'function',
        value: 'create-project',
        shortcut: 'N',
      },
      {
        id: 'project-import',
        label: 'GitHub Import',
        description: 'Repo import et',
        icon: GitBranch,
        category: 'projects',
        keywords: ['import', 'github', 'clone', 'repo'],
        action: 'function',
        value: 'import-project',
      },
      // Sessions
      {
        id: 'session-new',
        label: 'Yeni Oturum',
        description: 'Yeni chat oturumu baslat',
        icon: Plus,
        category: 'sessions',
        keywords: ['new', 'yeni', 'chat', 'conversation'],
        action: 'function',
        value: 'create-session',
        shortcut: 'C',
      },
      // ECC
      {
        id: 'ecc-agents',
        label: 'Agent Yonetimi',
        description: 'ECC agentlerini goruntule',
        icon: Bot,
        category: 'ecc',
        keywords: ['agent', 'ecc'],
        action: 'navigate',
        value: ROUTES.AGENTS,
      },
      {
        id: 'ecc-skills',
        label: 'Skill Yonetimi',
        description: 'ECC skills goruntule',
        icon: Zap,
        category: 'ecc',
        keywords: ['skill', 'ecc'],
        action: 'navigate',
        value: ROUTES.SKILLS,
      },
      {
        id: 'ecc-sources',
        label: 'Kaynak Yonetimi',
        description: 'MCP ve API kaynaklari',
        icon: Plug,
        category: 'ecc',
        keywords: ['source', 'mcp', 'api', 'ecc'],
        action: 'navigate',
        value: ROUTES.SOURCES,
      },
      // Settings
      {
        id: 'settings-profile',
        label: 'Profil Ayarlari',
        description: 'Kullanici profili',
        icon: Settings,
        category: 'settings',
        keywords: ['profile', 'profil'],
        action: 'navigate',
        value: `${ROUTES.SETTINGS}?tab=profile`,
      },
      {
        id: 'settings-models',
        label: 'Model Ayarlari',
        description: 'AI model konfigurasyonu',
        icon: Bot,
        category: 'settings',
        keywords: ['model', 'ai', 'claude', 'glm'],
        action: 'navigate',
        value: `${ROUTES.SETTINGS}?tab=models`,
      },
      {
        id: 'settings-theme',
        label: 'Tema Ayarlari',
        description: 'Gorunum ayarlari',
        icon: Settings,
        category: 'settings',
        keywords: ['theme', 'tema', 'dark', 'renk'],
        action: 'navigate',
        value: `${ROUTES.SETTINGS}?tab=theme`,
      },
      // System
      {
        id: 'system-logout',
        label: 'Cikis Yap',
        description: 'Oturumu kapat',
        icon: LogOut,
        category: 'system',
        keywords: ['logout', 'cikis', 'exit'],
        action: 'function',
        value: 'logout',
        shortcut: 'Shift+Q',
      },
    ],
    []
  )

  // Merge default and custom commands
  const allCommands = React.useMemo(() => {
    const commandMap = new Map<string, Command>()
    defaultCommands.forEach((cmd) => commandMap.set(cmd.id, cmd))
    customCommands.forEach((cmd) => commandMap.set(cmd.id, cmd))
    return Array.from(commandMap.values())
  }, [defaultCommands, customCommands])

  // Fuzzy search filter
  const filteredCommands = React.useMemo(() => {
    if (!searchQuery.trim()) {
      return allCommands
    }

    const query = searchQuery.toLowerCase()
    return allCommands
      .map((cmd) => {
        let score = 0
        const label = cmd.label.toLowerCase()
        const description = cmd.description?.toLowerCase() || ''
        const keywords = cmd.keywords?.join(' ') || ''

        // Exact match
        if (label === query) score += 100
        else if (label.startsWith(query)) score += 80
        // Contains match
        else if (label.includes(query)) score += 60
        else if (description.includes(query)) score += 40
        else if (keywords.includes(query)) score += 30

        // Fuzzy matching
        let labelIndex = 0
        let queryIndex = 0
        let fuzzyScore = 0
        while (labelIndex < label.length && queryIndex < query.length) {
          if (label[labelIndex] === query[queryIndex]) {
            fuzzyScore += 10
            queryIndex++
          }
          labelIndex++
        }
        if (queryIndex === query.length) {
          score += fuzzyScore
        }

        return { cmd, score }
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ cmd }) => cmd)
  }, [allCommands, searchQuery])

  // Group commands by category
  const groupedCommands = React.useMemo(() => {
    const groups = new Map<CommandCategory, Command[]>()
    filteredCommands.forEach((cmd) => {
      if (!groups.has(cmd.category)) {
        groups.set(cmd.category, [])
      }
      groups.get(cmd.category)!.push(cmd)
    })
    return groups
  }, [filteredCommands])

  // Flatten for keyboard navigation
  const flatCommands = React.useMemo(() => {
    return Array.from(groupedCommands.values()).flat()
  }, [groupedCommands])

  // Reset selected index when search changes
  React.useEffect(() => {
    setSelectedIndex(0)
  }, [searchQuery])

  // Handle keyboard navigation
  React.useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if modifier keys are pressed (except for Cmd+K)
      if (e.metaKey || e.ctrlKey) {
        if (e.key === 'k' || e.key === 'K') {
          e.preventDefault()
          setOpen(false)
        }
        return
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((i) => Math.min(i + 1, flatCommands.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((i) => Math.max(i - 1, 0))
          break
        case 'Enter':
          e.preventDefault()
          if (flatCommands[selectedIndex] && !isExecuting) {
            handleExecute(flatCommands[selectedIndex])
          }
          break
        case 'Escape':
          e.preventDefault()
          setOpen(false)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, flatCommands, selectedIndex, isExecuting])

  // Scroll selected item into view
  React.useEffect(() => {
    if (!open || !listRef.current) return

    const selectedElement = listRef.current.querySelector(
      `[data-command-index="${selectedIndex}"]`
    ) as HTMLElement
    if (selectedElement) {
      selectedElement.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      })
    }
  }, [selectedIndex, open])

  // Focus input on open
  React.useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  // Handle command execution
  const handleExecute = async (command: Command) => {
    if (command.disabled || isExecuting) return

    setIsExecuting(true)

    try {
      // Call custom handler if provided
      if (onCommandExecute) {
        await onCommandExecute(command)
      }

      // Default handlers
      switch (command.action) {
        case 'navigate':
          if (command.value) {
            navigate(command.value)
            setOpen(false)
          }
          break
        case 'function':
          switch (command.value) {
            case 'logout':
              handleLogout()
              setOpen(false)
              break
            case 'create-project':
              toast.info('Yeni proje olusturma yakinda aktif!')
              setOpen(false)
              break
            case 'import-project':
              toast.info('GitHub import yakinda aktif!')
              setOpen(false)
              break
            case 'create-session':
              toast.info('Yeni oturum acma yakinda aktif!')
              setOpen(false)
              break
            default:
              toast.info(`${command.label} komutu calistirildi`)
              setOpen(false)
          }
          break
        case 'external':
          if (command.value) {
            window.open(command.value, '_blank', 'noopener,noreferrer')
            setOpen(false)
          }
          break
        case 'settings-toggle':
          // Settings toggle logic here
          toast.info(`${command.label} ayarı degistirildi`)
          setOpen(false)
          break
      }
    } catch (error) {
      console.error('Command execution error:', error)
      toast.error('Komut calistirilamadi')
    } finally {
      setIsExecuting(false)
    }
  }

  // Handle open change
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      setSearchQuery('')
      setSelectedIndex(0)
    }
  }

  // Get icon component
  const getIcon = (IconComponent: React.ComponentType<LucideProps>) => {
    return <IconComponent className="h-4 w-4 shrink-0" />
  }

  // Render command item
  const renderCommandItem = (command: Command, index: number) => {
    const IconComponent = command.icon
    const isSelected = index === selectedIndex
    const isDisabled = command.disabled || isExecuting

    return (
      <motion.button
        key={command.id}
        data-command-index={index}
        className={commandItemVariants({ selected: isSelected, disabled: isDisabled })}
        onClick={() => !isDisabled && handleExecute(command)}
        disabled={isDisabled}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.03 }}
        type="button"
      >
        <span className="shrink-0">{getIcon(IconComponent)}</span>
        <span className="flex-1 truncate">{command.label}</span>
        {command.description && (
          <span className="text-xs text-foreground/50 truncate hidden sm:block">
            {command.description}
          </span>
        )}
        {command.shortcut && (
          <span className="text-[10px] text-foreground/40 shrink-0 hidden lg:block">
            {command.shortcut}
          </span>
        )}
        {isSelected && (
          <ChevronRight className="h-4 w-4 shrink-0 text-accent" />
        )}
        {isExecuting && isSelected && (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-accent" />
        )}
      </motion.button>
    )
  }

  // Render category section
  const renderCategory = (category: CommandCategory, commands: Command[]) => {
    const categoryConfig = COMMAND_CATEGORIES[category]
    if (!categoryConfig) return null
    const CategoryIcon = categoryConfig.icon

    return (
      <div key={category} className="space-y-1">
        <div className="flex items-center gap-2 px-3 pt-4 pb-2">
          <CategoryIcon className="h-3.5 w-3.5 text-foreground/50" />
          <span className="text-[11px] font-medium text-foreground/50 uppercase tracking-wide">
            {categoryConfig.label}
          </span>
          <div className="h-px flex-1 bg-foreground/10" />
        </div>
        <div className="space-y-0.5">
          {commands.map((cmd) => {
            // Find global index
            const globalIndex = flatCommands.indexOf(cmd)
            return renderCommandItem(cmd, globalIndex)
          })}
        </div>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          'top-[15%] max-w-2xl translate-x-[-50%] translate-y-0 gap-0 border-foreground/10 p-0 shadow-modal-small',
          className
        )}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* Header with search */}
        <div className="flex items-center gap-3 border-b border-foreground/10 px-4 py-3">
          <Search className="h-4 w-4 text-foreground/40 shrink-0" />
          <Input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={placeholder}
            className="border-0 bg-transparent p-0 text-[13px] focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-foreground/30"
          />
          {isExecuting && (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-accent" />
          )}
          {!searchQuery && (
            <kbd className="text-[10px] text-foreground/30 hidden sm:block">
              ESC kapatmak icin
            </kbd>
          )}
        </div>

        {/* Commands list */}
        <ScrollArea className="max-h-[400px] px-2">
          <div ref={listRef} className="py-2">
            <AnimatePresence mode="wait">
              {filteredCommands.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-2 py-12 text-center"
                >
                  <Search className="h-8 w-8 text-foreground/20" />
                  <p className="text-sm text-foreground/50">Sonuc bulunamadi</p>
                  <p className="text-xs text-foreground/30">
                    Farkli anahtar kelimeler deneyin
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="commands"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {Array.from(groupedCommands.entries())
                    .sort(
                      ([catA], [catB]) =>
                        COMMAND_CATEGORIES[catA].order -
                        COMMAND_CATEGORIES[catB].order
                    )
                    .map(([category, commands]) =>
                      renderCategory(category, commands)
                    )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>

        {/* Footer with shortcuts hint */}
        <div className="flex items-center justify-between border-t border-foreground/10 px-4 py-2">
          <div className="flex items-center gap-4 text-[10px] text-foreground/40">
            <span className="flex items-center gap-1">
              <kbd className="rounded bg-foreground/5 px-1.5 py-0.5">↑↓</kbd>
              navigasyon
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded bg-foreground/5 px-1.5 py-0.5">Enter</kbd>
              sec
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded bg-foreground/5 px-1.5 py-0.5">Esc</kbd>
              kapat
            </span>
          </div>
          <div className="text-[10px] text-foreground/30">
            {filteredCommands.length} komut
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// Command Palette Hook
// ============================================================================

/**
 * useCommandPalette - Hook for command palette state management
 *
 * Usage:
 * ```tsx
 * const commandPalette = useCommandPalette()
 * ```
 */
export function useCommandPalette() {
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return {
    open,
    setOpen,
    toggle: () => setOpen((prev) => !prev),
  }
}

// ============================================================================
// Command Palette Provider (Optional)
// ============================================================================

interface CommandPaletteContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  toggle: () => void
  registerCommand: (command: Command) => void
  unregisterCommand: (id: string) => void
}

const CommandPaletteContext = React.createContext<CommandPaletteContextValue | null>(
  null
)

export interface CommandPaletteProviderProps {
  children: React.ReactNode
  commands?: Command[]
}

export function CommandPaletteProvider({
  children,
  commands: initialCommands = [],
}: CommandPaletteProviderProps) {
  const [open, setOpen] = React.useState(false)
  const [commands, setCommands] = React.useState<Command[]>(initialCommands)

  const toggle = React.useCallback(() => {
    setOpen((prev) => !prev)
  }, [])

  const registerCommand = React.useCallback((command: Command) => {
    setCommands((prev) => [...prev, command])
  }, [])

  const unregisterCommand = React.useCallback((id: string) => {
    setCommands((prev) => prev.filter((cmd) => cmd.id !== id))
  }, [])

  // Global keyboard shortcut
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        toggle()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggle])

  const value = React.useMemo(
    () => ({
      open,
      setOpen,
      toggle,
      registerCommand,
      unregisterCommand,
    }),
    [open, toggle, registerCommand, unregisterCommand]
  )

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
      <CommandPalette open={open} onOpenChange={setOpen} commands={commands} />
    </CommandPaletteContext.Provider>
  )
}

export function useCommandPaletteContext() {
  const context = React.useContext(CommandPaletteContext)
  if (!context) {
    throw new Error(
      'useCommandPaletteContext must be used within CommandPaletteProvider'
    )
  }
  return context
}

export default CommandPalette
