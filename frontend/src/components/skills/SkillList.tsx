/**
 * SkillList Component
 * Display list of skills with filtering and search
 * @module @task-filewas/frontend/components/skills/SkillList
 *
 * Features:
 * - Display skill cards
 * - Filter by category
 * - Search by name
 * - Filter by enabled state
 * - Expand/collapse all
 *
 * Design Reference: Craft Agents list view
 */

import { useState, useMemo } from 'react'
import {
  Search,
  Maximize2,
  Minimize2,
  Filter,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SkillCard } from './SkillCard'
import { cn } from '@/lib/utils'
import type { SkillConfig, SkillCategory } from '@task-filewas/shared'

// =============================================================================
// Types
// =============================================================================

export interface SkillListProps {
  /** Skills to display */
  skills: SkillConfig[]
  /** Toggle enabled callback */
  onEnabledToggle?: (skillId: string) => void
  /** Preview callback */
  onPreview?: (skill: SkillConfig) => void
  /** Optional className */
  className?: string
}

// =============================================================================
// Constants
// =============================================================================

const CATEGORY_LABELS: Record<SkillCategory, string> = {
  coding: 'Kodlama',
  testing: 'Test',
  backend: 'Backend',
  frontend: 'Frontend',
  security: 'Guvenlik',
  workflow: 'Workflow',
  documentation: 'Dokumantasyon',
  architecture: 'Mimari',
  database: 'Veritabani',
  custom: 'Ozel',
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * SkillList - Display skills with filtering and actions
 */
export function SkillList({
  skills,
  onEnabledToggle,
  onPreview,
  className,
}: SkillListProps) {
  // State
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<SkillCategory | 'all'>('all')
  const [enabledFilter, setEnabledFilter] = useState<'all' | 'enabled' | 'disabled'>('all')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  // Filter skills by category, search, and enabled state
  const filteredSkills = useMemo(() => {
    let filtered = skills

    if (activeCategory !== 'all') {
      filtered = filtered.filter((s) => s.category === activeCategory)
    }

    if (enabledFilter === 'enabled') {
      filtered = filtered.filter((s) => s.enabled)
    } else if (enabledFilter === 'disabled') {
      filtered = filtered.filter((s) => !s.enabled)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((s) =>
        s.name.toLowerCase().includes(query) ||
        s.id.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query) ||
        s.tags.some((tag) => tag.toLowerCase().includes(query))
      )
    }

    return filtered
  }, [skills, activeCategory, enabledFilter, searchQuery])

  // Toggle expanded state
  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Expand all
  const expandAll = () => {
    setExpandedIds(new Set(filteredSkills.map((s) => s.id)))
  }

  // Collapse all
  const collapseAll = () => {
    setExpandedIds(new Set())
  }

  // Get count for each category
  const getCount = (category: SkillCategory) => skills.filter((s) => s.category === category).length

  // Get enabled count
  const enabledCount = skills.filter((s) => s.enabled).length
  const disabledCount = skills.length - enabledCount

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search and Filter Bar */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
          <Input
            type="search"
            placeholder="Skill ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-9"
          />
        </div>

        {/* Enabled Filter */}
        <Select value={enabledFilter} onValueChange={(v: typeof enabledFilter) => setEnabledFilter(v)}>
          <SelectTrigger className="h-9 w-32 text-[11px]">
            <Filter className="h-3.5 w-3.5 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-[11px]">
              Tumu ({skills.length})
            </SelectItem>
            <SelectItem value="enabled" className="text-[11px]">
              Aktif ({enabledCount})
            </SelectItem>
            <SelectItem value="disabled" className="text-[11px]">
              Pasif ({disabledCount})
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Expand/Collapse All */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-[11px]"
            onClick={expandAll}
          >
            <Maximize2 className="h-3.5 w-3.5 mr-1" />
            Hepsini Ac
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-[11px]"
            onClick={collapseAll}
          >
            <Minimize2 className="h-3.5 w-3.5 mr-1" />
            Kapat
          </Button>
        </div>
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-1.5">
        <Badge
          variant={activeCategory === 'all' ? 'default' : 'outline'}
          className="cursor-pointer text-[10px] px-2 py-1"
          onClick={() => setActiveCategory('all')}
        >
          Tumu ({skills.length})
        </Badge>
        {Object.entries(CATEGORY_LABELS).map(([category, label]) => {
          const count = getCount(category as SkillCategory)
          return (
            <Badge
              key={category}
              variant={activeCategory === category ? 'default' : 'outline'}
              className="cursor-pointer text-[10px] px-2 py-1"
              onClick={() => setActiveCategory(category as SkillCategory)}
            >
              {label} ({count})
            </Badge>
          )
        })}
      </div>

      {/* Skill List */}
      <div className="space-y-1.5">
        {filteredSkills.length === 0 ? (
          <div className="flex min-h-[120px] items-center justify-center rounded-lg border border-dashed border-foreground/10">
            <p className="text-[13px] text-foreground/40">
              {searchQuery ? 'Skill bulunamadi' : 'Skill tanimli degil'}
            </p>
          </div>
        ) : (
          filteredSkills.map((skill) => (
            <SkillCard
              key={skill.id}
              skill={skill}
              expanded={expandedIds.has(skill.id)}
              onToggle={() => toggleExpanded(skill.id)}
              onEnabledToggle={onEnabledToggle}
              onPreview={onPreview}
            />
          ))
        )}
      </div>

      {/* Footer Stats */}
      <div className="text-[11px] text-foreground/40">
        {filteredSkills.length} / {skills.length} skill gosteriliyor
      </div>
    </div>
  )
}

export default SkillList
