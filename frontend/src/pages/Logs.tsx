/**
 * Logs Page
 * System logs viewing and filtering
 * @module @task-filewas/frontend/pages/Logs
 *
 * Features:
 * - View all system logs (api, agent, error, system, session)
 * - Filter by type, level, date range
 * - Search in logs
 * - Log details view
 * - Real-time log updates via WebSocket
 */

import * as React from 'react'
import { useState, useCallback, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileSearch,
  Loader2,
  RefreshCw,
  Search,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { LogEntry, LogType, LogLevel } from '@task-filewas/shared'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/lib/utils'
import { useSocketEvent } from '@/hooks/useSocketEvent'

// =============================================================================
// Types
// =============================================================================

interface LogGroup {
  date: string
  logs: LogEntry[]
}

// =============================================================================
// Helpers
// =============================================================================

function getApiUrl(): string {
  return import.meta.env.VITE_API_URL || 'http://localhost:3001'
}

async function fetchLogs(params: Record<string, string> = {}): Promise<LogEntry[]> {
  const token = localStorage.getItem('token')
  const queryString = new URLSearchParams(params).toString()
  const url = `${getApiUrl()}/api/logs${queryString ? `?${queryString}` : ''}`

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`)
  }

  const result = await response.json()
  return result.data || []
}

async function fetchLogStats(): Promise<{
  total: number
  byType: Record<string, number>
  byLevel: Record<string, number>
}> {
  const token = localStorage.getItem('token')
  const response = await fetch(`${getApiUrl()}/api/logs/stats`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`)
  }

  const result = await response.json()
  return result.data
}

// Format timestamp to readable time
function formatTime(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

// Format timestamp to readable date
function formatDate(timestamp: string): string {
  const date = new Date(timestamp)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) {
    return 'Bugün'
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Dün'
  } else {
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
  }
}

// Group logs by date
function groupLogsByDate(logs: LogEntry[]): LogGroup[] {
  const groups: Record<string, LogEntry[]> = {}

  for (const log of logs) {
    const dateKey = new Date(log.timestamp).toDateString()
    if (!groups[dateKey]) {
      groups[dateKey] = []
    }
    groups[dateKey].push(log)
  }

  return Object.entries(groups)
    .map(([date, logs]) => ({ date, logs }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

// Get log type icon
function getLogTypeIcon(type: LogType): string {
  const icons: Record<LogType, string> = {
    api: '🌐',
    agent: '🤖',
    error: '❌',
    system: '⚙️',
    session: '💬',
  }
  return icons[type] || '📝'
}

// Get log level color
function getLevelColor(level: LogLevel): string {
  const colors: Record<LogLevel, string> = {
    debug: 'text-foreground/40',
    info: 'text-info',
    warn: 'text-warning',
    error: 'text-destructive',
  }
  return colors[level] || 'text-foreground'
}

// Get log level badge variant
function getLevelBadgeVariant(level: LogLevel): 'default' | 'secondary' | 'destructive' | 'outline' {
  const variants: Record<LogLevel, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    debug: 'outline',
    info: 'default',
    warn: 'secondary',
    error: 'destructive',
  }
  return variants[level] || 'outline'
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Logs page - View and filter system logs
 */
export default function Logs() {
  const navigate = useNavigate()
  const { toast } = useToast()

  // State
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeType, setActiveType] = useState<LogType | 'all'>('all')
  const [activeLevel, setActiveLevel] = useState<LogLevel | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set())
  const [stats, setStats] = useState<{ total: number; byType: Record<string, number>; byLevel: Record<string, number> } | null>(null)

  // Fetch logs
  const loadLogs = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        navigate('/login')
        return
      }

      const params: Record<string, string> = {}
      if (activeType !== 'all') {
        params.type = activeType
      }
      if (activeLevel !== 'all') {
        params.level = activeLevel
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim()
      }

      const data = await fetchLogs(params)
      setLogs(data)

      // Load stats
      const statsData = await fetchLogStats()
      setStats(statsData)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load logs'
      setError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setIsLoading(false)
    }
  }, [navigate, activeType, activeLevel, searchQuery, toast])

  // Initial load
  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  // Handle new log from WebSocket
  useSocketEvent('log:new', (data: LogEntry) => {
    setLogs((prev) => {
      // Check if log already exists
      if (prev.some(l => l.id === data.id)) {
        return prev
      }
      // Add new log at the beginning
      return [data, ...prev]
    })
  })

  // Filter logs by search query
  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) {
      return logs
    }

    const query = searchQuery.toLowerCase()
    return logs.filter(log =>
      log.title.toLowerCase().includes(query) ||
      log.message?.toLowerCase().includes(query)
    )
  }, [logs, searchQuery])

  // Group logs by date
  const logGroups = useMemo(() => groupLogsByDate(filteredLogs), [filteredLogs])

  // Toggle log expansion
  const toggleLog = useCallback((logId: string) => {
    setExpandedLogs((prev) => {
      const next = new Set(prev)
      if (next.has(logId)) {
        next.delete(logId)
      } else {
        next.add(logId)
      }
      return next
    })
  }, [])

  // Clear filters
  const clearFilters = useCallback(() => {
    setActiveType('all')
    setActiveLevel('all')
    setSearchQuery('')
  }, [])

  // Get count for a type
  const getCount = (type: LogType) => stats?.byType[type] ?? 0

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-foreground/10 bg-foreground/[0.02]">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Sistem Logları
              </h1>
              <p className="mt-1 text-[13px] text-foreground/60">
                API, agent, hata ve sistem loglarını görüntüleyin
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={loadLogs}
                disabled={isLoading}
              >
                <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-6xl px-6 py-6">
        {/* Error Message */}
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="text-[13px]">{error}</span>
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
            <div className="rounded-lg bg-foreground/5 p-3">
              <div className="text-[11px] text-foreground/40">Toplam</div>
              <div className="text-xl font-semibold text-foreground">{stats.total}</div>
            </div>
            <div className="rounded-lg bg-foreground/5 p-3">
              <div className="text-[11px] text-foreground/40">API</div>
              <div className="text-xl font-semibold text-foreground">{getCount('api')}</div>
            </div>
            <div className="rounded-lg bg-foreground/5 p-3">
              <div className="text-[11px] text-foreground/40">Agent</div>
              <div className="text-xl font-semibold text-foreground">{getCount('agent')}</div>
            </div>
            <div className="rounded-lg bg-foreground/5 p-3">
              <div className="text-[11px] text-foreground/40">Error</div>
              <div className="text-xl font-semibold text-destructive">{getCount('error')}</div>
            </div>
            <div className="rounded-lg bg-foreground/5 p-3">
              <div className="text-[11px] text-foreground/40">Session</div>
              <div className="text-xl font-semibold text-foreground">{getCount('session')}</div>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
            <Input
              type="search"
              placeholder="Loglarda ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-9"
            />
          </div>

          {/* Filter Controls */}
          <div className="flex items-center gap-2">
            {(activeType !== 'all' || activeLevel !== 'all' || searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-9"
              >
                <X className="h-4 w-4 mr-1" />
                Temizle
              </Button>
            )}
          </div>
        </div>

        {/* Type Filters */}
        <Tabs value={activeType} onValueChange={(v) => setActiveType(v as LogType | 'all')}>
          <TabsList className="mb-4">
            <TabsTrigger value="all">
              Tümü ({stats?.total ?? 0})
            </TabsTrigger>
            <TabsTrigger value="api">
              🌐 API ({getCount('api')})
            </TabsTrigger>
            <TabsTrigger value="agent">
              🤖 Agent ({getCount('agent')})
            </TabsTrigger>
            <TabsTrigger value="error">
              ❌ Error ({getCount('error')})
            </TabsTrigger>
            <TabsTrigger value="session">
              💬 Session ({getCount('session')})
            </TabsTrigger>
            <TabsTrigger value="system">
              ⚙️ System ({getCount('system')})
            </TabsTrigger>
          </TabsList>

          {/* Level Filters */}
          <div className="mb-4 flex items-center gap-2">
            <span className="text-[13px] text-foreground/60">Seviye:</span>
            <Button
              variant={activeLevel === 'all' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveLevel('all')}
              className="h-7"
            >
              Tümü
            </Button>
            <Button
              variant={activeLevel === 'info' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveLevel('info')}
              className="h-7"
            >
              Info
            </Button>
            <Button
              variant={activeLevel === 'warn' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveLevel('warn')}
              className="h-7"
            >
              Warn
            </Button>
            <Button
              variant={activeLevel === 'error' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveLevel('error')}
              className="h-7"
            >
              Error
            </Button>
          </div>

          {/* Loading State */}
          {isLoading ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-foreground/40" />
            </div>
          ) : filteredLogs.length === 0 ? (
            /* Empty State */
            <div className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-dashed border-foreground/10">
              <FileSearch className="h-12 w-12 text-foreground/20 mb-3" />
              <p className="text-[13px] text-foreground/40">
                {searchQuery || activeType !== 'all' || activeLevel !== 'all'
                  ? 'Filtrelere uygun log bulunamadı'
                  : 'Henüz log kaydı yok'}
              </p>
            </div>
          ) : (
            /* Log List */
            <div className="space-y-4">
              {logGroups.map((group) => (
                <div key={group.date}>
                  {/* Date Header */}
                  <div className="sticky top-0 z-10 mb-2 bg-background px-2 py-1">
                    <span className="text-[13px] font-medium text-foreground/60">
                      {formatDate(group.logs[0]?.timestamp || group.date)}
                    </span>
                  </div>

                  {/* Logs for this date */}
                  <div className="space-y-1">
                    {group.logs.map((log) => {
                      const isExpanded = expandedLogs.has(log.id)

                      return (
                        <div
                          key={log.id}
                          className="rounded-lg border border-foreground/5 hover:border-foreground/10 hover:bg-foreground/[0.02] transition-colors"
                        >
                          {/* Log Header */}
                          <button
                            onClick={() => toggleLog(log.id)}
                            className="flex w-full items-start gap-3 p-3 text-left"
                          >
                            {/* Expand Icon */}
                            <div className="mt-0.5 shrink-0">
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-foreground/40" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-foreground/40" />
                              )}
                            </div>

                            {/* Log Icon */}
                            <div className="mt-0.5 shrink-0 text-lg">
                              {getLogTypeIcon(log.type)}
                            </div>

                            {/* Log Content */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[13px] font-medium text-foreground">
                                  {log.title}
                                </span>
                                <Badge
                                  variant={getLevelBadgeVariant(log.level)}
                                  className={cn('text-[10px]', getLevelColor(log.level))}
                                >
                                  {log.level.toUpperCase()}
                                </Badge>
                                <Badge variant="outline" className="text-[10px] text-foreground/40">
                                  {log.type.toUpperCase()}
                                </Badge>
                              </div>

                              {/* Message preview */}
                              {log.message && !isExpanded && (
                                <p className="mt-1 truncate text-[11px] text-foreground/60">
                                  {log.message}
                                </p>
                              )}
                            </div>

                            {/* Timestamp */}
                            <div className="shrink-0 text-[11px] text-foreground/40">
                              {formatTime(log.timestamp)}
                            </div>
                          </button>

                          {/* Expanded Details */}
                          {isExpanded && (
                            <div className="border-t border-foreground/10 p-3">
                              {/* Full Message */}
                              {log.message && (
                                <div className="mb-2 text-[13px] text-foreground/80">
                                  {log.message}
                                </div>
                              )}

                              {/* Error Details */}
                              {log.error && (
                                <div className="mb-2 rounded bg-destructive/5 p-2">
                                  <div className="text-[11px] font-medium text-destructive">
                                    {log.error.name || 'Error'}
                                  </div>
                                  <div className="text-[11px] text-destructive/80">
                                    {log.error.message}
                                  </div>
                                  {log.error.stack && (
                                    <pre className="mt-1 overflow-x-auto text-[10px] text-destructive/60">
                                      {log.error.stack}
                                    </pre>
                                  )}
                                </div>
                              )}

                              {/* Metadata */}
                              {log.metadata && Object.keys(log.metadata).length > 0 && (
                                <div className="mb-2">
                                  <div className="text-[11px] text-foreground/40">Metadata:</div>
                                  <pre className="mt-1 overflow-x-auto rounded bg-foreground/5 p-2 text-[10px] text-foreground/60">
                                    {JSON.stringify(log.metadata, null, 2)}
                                  </pre>
                                </div>
                              )}

                              {/* Entity IDs */}
                              {log.entityIds && (
                                <div className="mb-2 flex flex-wrap gap-2">
                                  {log.entityIds.sessionId && (
                                    <Badge variant="outline" className="text-[10px]">
                                      Session: {log.entityIds.sessionId.slice(0, 8)}...
                                    </Badge>
                                  )}
                                  {log.entityIds.projectId && (
                                    <Badge variant="outline" className="text-[10px]">
                                      Project: {log.entityIds.projectId.slice(0, 8)}...
                                    </Badge>
                                  )}
                                  {log.entityIds.agentId && (
                                    <Badge variant="outline" className="text-[10px]">
                                      Agent: {log.entityIds.agentId}
                                    </Badge>
                                  )}
                                </div>
                              )}

                              {/* Navigate To */}
                              {log.navigateTo && (
                                <div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => navigate(log.navigateTo!.path)}
                                    className="h-7 text-[11px]"
                                  >
                                    Git →
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Tabs>

        {/* Selected Log Detail Panel */}
        {/* Log details shown inline when expanded */}
      </div>
    </div>
  )
}
