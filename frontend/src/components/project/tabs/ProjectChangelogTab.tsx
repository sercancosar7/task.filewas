/**
 * ProjectChangelogTab - Changelog tab içeriği
 * @module @task-filewas/frontend/components/project/tabs/ProjectChangelogTab
 *
 * Değişiklik geçmişi görüntüleme
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollText, GitCommit, Calendar, FileEdit } from 'lucide-react'

// =============================================================================
// Types
// =============================================================================

export interface ProjectChangelogTabProps {
  projectId: string
  className?: string
}

interface ChangelogEntry {
  phase: number
  date: string
  title: string
  changes: string[]
  files: string[]
}

// =============================================================================
// Mock Data (placeholder)
// =============================================================================

const MOCK_CHANGELOG: ChangelogEntry[] = [
  {
    phase: 3,
    date: '2026-01-15',
    title: 'Auth API Implement Edildi',
    changes: [
      'Login endpoint oluşturuldu',
      'JWT token yönetimi eklendi',
      'Refresh mekanizması implement edildi',
    ],
    files: ['backend/src/routes/auth.ts', 'backend/src/middleware/auth.ts', 'backend/src/services/jwt.ts'],
  },
  {
    phase: 2,
    date: '2026-01-14',
    title: 'Storage Yapısı Oluşturuldu',
    changes: [
      'File-based storage system',
      'JSONL okuma/yazma utils',
      'Session storage eklendi',
    ],
    files: ['backend/src/storage/sessions.ts', 'backend/src/utils/jsonl.ts'],
  },
  {
    phase: 1,
    date: '2026-01-13',
    title: 'Proje Kurulumu Tamamlandı',
    changes: [
      'Monorepo yapılandırması',
      'TypeScript konfigürasyonu',
      'ESLint + Prettier',
    ],
    files: ['package.json', 'tsconfig.json', '.eslintrc.js'],
  },
]

// =============================================================================
// Helpers
// =============================================================================

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })
}

// =============================================================================
// Component
// =============================================================================

/**
 * ProjectChangelogTab - Değişiklik geçmişi görüntüleme
 */
export function ProjectChangelogTab({ projectId, className }: ProjectChangelogTabProps) {
  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ScrollText className="h-5 w-5 text-accent" />
          <h3 className="text-[15px] font-semibold">Değişiklik Geçmişi</h3>
        </div>
        <Badge className="bg-foreground/5 text-foreground/60">
          {MOCK_CHANGELOG.length} giriş
        </Badge>
      </div>

      {/* Changelog List */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {MOCK_CHANGELOG.map((entry, index) => (
          <Card
            key={`${entry.phase}-${index}`}
            className="p-4 hover:bg-foreground/[0.02] transition-colors"
          >
            {/* Entry Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-accent/10 text-accent text-[12px] font-semibold">
                  {entry.phase}
                </div>
                <div>
                  <h4 className="text-[13px] font-medium">{entry.title}</h4>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-foreground/40">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(entry.date)}
                    </span>
                    <span className="flex items-center gap-1">
                      <GitCommit className="h-3 w-3" />
                      Faz {entry.phase}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Changes List */}
            <div className="mb-3">
              <p className="text-[11px] font-medium text-foreground/60 mb-2 uppercase tracking-wide">
                Değişiklikler
              </p>
              <ul className="space-y-1">
                {entry.changes.map((change, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-[12px] text-foreground/80">
                    <span className="text-accent mt-0.5">•</span>
                    {change}
                  </li>
                ))}
              </ul>
            </div>

            {/* Changed Files */}
            {entry.files.length > 0 && (
              <div className="pt-3 border-t border-foreground/5">
                <p className="text-[11px] font-medium text-foreground/60 mb-2 uppercase tracking-wide">
                  Değişen Dosyalar ({entry.files.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {entry.files.map((file, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className="px-2 py-0.5 text-[10px] bg-foreground/5 border-foreground/10 hover:bg-foreground/10 cursor-default"
                    >
                      <FileEdit className="h-2.5 w-2.5 mr-1" />
                      {file.split('/').pop()}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Empty State Note */}
      <div className="mt-4 p-3 rounded-md bg-foreground/5 text-center">
        <p className="text-[11px] text-foreground/40">
          Changelog verisi placeholder'dır. Gerçek veri API'den gelecektir.
        </p>
      </div>
    </div>
  )
}

export default ProjectChangelogTab
