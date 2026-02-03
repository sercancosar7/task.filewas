/**
 * ProjectTabs - Proje detay tab navigasyonu (Craft Agents style)
 * @module @task-filewas/frontend/components/project/ProjectTabs
 *
 * Layout Structure:
 * ┌────────────────────────────────────────────────────────────────────┐
 * │ 📁 task.filewas                                    [⚙️] [GitHub]│  ← Header
 * ├────────────────────────────────────────────────────────────────────┤
 * │ [Sessions] [Roadmap] [Files] [Changelog] [Settings]               │  ← Tabs
 * ├────────────────────────────────────────────────────────────────────┤
 * │                                                                    │
 * │                    TAB CONTENT                                     │
 * │                                                                    │
 * └────────────────────────────────────────────────────────────────────┘
 *
 * Tab Options:
 * - Sessions: 3 panel session inbox (Sidebar, Session List, Chat)
 * - Roadmap: Faz listesi, milestone'lar, ilerleme
 * - Files: Proje dosya yapisi, file browser
 * - Changelog: Degisiklik gecmisi
 * - Settings: Proje-ozel ayarlar
 */

import * as React from 'react'
import { useParams } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Settings2, FolderOpen, ListTodo, ScrollText, Github } from 'lucide-react'
import { ProjectSessionsTab } from './tabs/ProjectSessionsTab'
import { ProjectRoadmapTab } from './tabs/ProjectRoadmapTab'
import { ProjectFilesTab } from './tabs/ProjectFilesTab'
import { ProjectChangelogTab } from './tabs/ProjectChangelogTab'
import { ProjectSettingsTab } from './tabs/ProjectSettingsTab'

// =============================================================================
// Types
// =============================================================================

export type ProjectTabValue = 'sessions' | 'roadmap' | 'files' | 'changelog' | 'settings'

export interface ProjectTabsProps {
  /** Initial active tab */
  defaultValue?: ProjectTabValue
  /** Current active tab (controlled) */
  value?: ProjectTabValue
  /** Callback when tab changes */
  onValueChange?: (value: ProjectTabValue) => void
  /** Project ID (from URL params if not provided) */
  projectId?: string
  /** Additional CSS classes */
  className?: string
}

// =============================================================================
// Tab Configuration
// =============================================================================

interface TabConfig {
  value: ProjectTabValue
  label: string
  icon: React.ReactNode
  description: string
}

const TABS: TabConfig[] = [
  {
    value: 'sessions',
    label: 'Sessions',
    icon: <ListTodo className="h-4 w-4" />,
    description: 'Session listesi ve chat arayüzü',
  },
  {
    value: 'roadmap',
    label: 'Roadmap',
    icon: <Settings2 className="h-4 w-4" />,
    description: 'Faz listesi ve ilerleme takibi',
  },
  {
    value: 'files',
    label: 'Files',
    icon: <FolderOpen className="h-4 w-4" />,
    description: 'Proje dosya yapısı',
  },
  {
    value: 'changelog',
    label: 'Changelog',
    icon: <ScrollText className="h-4 w-4" />,
    description: 'Değişiklik geçmişi',
  },
  {
    value: 'settings',
    label: 'Settings',
    icon: <Settings2 className="h-4 w-4" />,
    description: 'Proje ayarları',
  },
]

// =============================================================================
// Component
// =============================================================================

/**
 * ProjectTabs - Proje detay sayfası tab navigasyonu
 *
 * @example
 * ```tsx
 * <ProjectTabs
 *   projectId="project-123"
 *   defaultValue="sessions"
 *   onValueChange={(tab) => console.log(tab)}
 * />
 * ```
 */
export function ProjectTabs({
  defaultValue = 'sessions',
  value: controlledValue,
  onValueChange,
  projectId: propProjectId,
  className,
}: ProjectTabsProps) {
  // Get project ID from URL params if not provided
  const params = useParams<{ id: string }>()
  const projectId = propProjectId || params.id

  // Internal state for uncontrolled mode
  const [internalValue, setInternalValue] = React.useState<ProjectTabValue>(defaultValue)

  // Use controlled value if provided, otherwise use internal state
  const activeTab = controlledValue ?? internalValue

  // Handle tab change
  const handleValueChange = React.useCallback(
    (newValue: string) => {
      const tabValue = newValue as ProjectTabValue
      if (controlledValue === undefined) {
        setInternalValue(tabValue)
      }
      onValueChange?.(tabValue)
    },
    [controlledValue, onValueChange]
  )

  if (!projectId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Proje bulunamadı</p>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Project Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-foreground/10 shrink-0">
        <div className="flex items-center gap-3">
          <FolderOpen className="h-5 w-5 text-accent" />
          <div>
            <h1 className="text-[17px] font-semibold">Proje Detayı</h1>
            <p className="text-[12px] text-foreground/40">ID: {projectId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="px-3 py-1.5 text-[12px] font-medium rounded-md bg-foreground/5 hover:bg-foreground/10 transition-colors flex items-center gap-1.5"
          >
            <Github className="h-3.5 w-3.5" />
            GitHub
          </button>
          <button
            type="button"
            className="p-2 rounded-md hover:bg-foreground/5 transition-colors"
            aria-label="Ayarlar"
          >
            <Settings2 className="h-4 w-4 text-foreground/60" />
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={handleValueChange} className="flex flex-col flex-1 min-h-0">
        {/* Tab List */}
        <div className="px-6 pt-4 shrink-0">
          <TabsList className="bg-foreground/5">
            {TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <span className="mr-1.5">{tab.icon}</span>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Tab Content */}
        <div className="flex-1 min-h-0 px-6 pb-6">
          {/* Sessions Tab */}
          <TabsContent value="sessions" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
            <ProjectSessionsTab projectId={projectId} />
          </TabsContent>

          {/* Roadmap Tab */}
          <TabsContent value="roadmap" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
            <ProjectRoadmapTab projectId={projectId} />
          </TabsContent>

          {/* Files Tab */}
          <TabsContent value="files" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
            <ProjectFilesTab projectId={projectId} />
          </TabsContent>

          {/* Changelog Tab */}
          <TabsContent value="changelog" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
            <ProjectChangelogTab projectId={projectId} />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
            <ProjectSettingsTab projectId={projectId} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}

export default ProjectTabs
