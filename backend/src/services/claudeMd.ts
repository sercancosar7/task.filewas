/**
 * CLAUDE.md Management Service
 * Read/write operations for CLAUDE.md files (Platform and Project level)
 * @module @task-filewas/backend/services/claudeMd
 */

import { readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { fileExists, resolveDataPath, ensureDir } from '../storage/jsonl.js'
import type { StorageResult } from '../storage/jsonl.js'

// =============================================================================
// Types
// =============================================================================

/**
 * CLAUDE.md file types
 */
export type ClaudeMdType = 'platform' | 'project'

/**
 * CLAUDE.md file content structure
 */
export interface ClaudeMdContent {
  /** File type */
  type: ClaudeMdType
  /** File path */
  path: string
  /** Raw markdown content */
  content: string
  /** Whether file exists */
  exists: boolean
  /** Last modified timestamp */
  lastModified?: string
}

/**
 * Options for reading CLAUDE.md
 */
export interface ReadClaudeMdOptions {
  /** Return default content if file doesn't exist */
  useDefault?: boolean
}

/**
 * Options for writing CLAUDE.md
 */
export interface WriteClaudeMdOptions {
  /** Create directories if they don't exist */
  createDirs?: boolean
  /** Append to existing content instead of overwriting */
  append?: boolean
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Platform CLAUDE.md file name
 */
const PLATFORM_CLAUDE_MD = 'CLAUDE.md'

/**
 * Project CLAUDE.md file name
 */
const PROJECT_CLAUDE_MD = 'CLAUDE.md'

/**
 * Projects directory relative to data path
 */
const PROJECTS_DIR = 'projects'

// =============================================================================
// Path Utilities
// =============================================================================

/**
 * Get platform CLAUDE.md path
 * Located at data/CLAUDE.md
 */
export function getPlatformClaudeMdPath(): string {
  return resolveDataPath(PLATFORM_CLAUDE_MD)
}

/**
 * Get project CLAUDE.md path
 * Located at data/projects/{projectId}/CLAUDE.md
 */
export function getProjectClaudeMdPath(projectId: string): string {
  return resolveDataPath(`${PROJECTS_DIR}/${projectId}/${PROJECT_CLAUDE_MD}`)
}

/**
 * Get project directory path
 */
export function getProjectDirPath(projectId: string): string {
  return resolveDataPath(`${PROJECTS_DIR}/${projectId}`)
}

// =============================================================================
// Default Templates
// =============================================================================

/**
 * Platform CLAUDE.md default template
 * Contains task.filewas platform rules
 */
export const PLATFORM_CLAUDE_MD_TEMPLATE = `# Task.filewas - Platform Kuralları

**Son Güncelleme:** {{DATE}}

---

## PLATFORM BİLGİSİ

Bu dosya task.filewas platformunun genel kurallarını içerir.
Tüm projeler için geçerli olan global kurallar burada tanımlanır.

---

## GENEL KURALLAR

### Kod Standartları

1. **TypeScript kullan** - Tüm kod TypeScript ile yazılmalı
2. **ESLint kurallarına uy** - Linting hataları düzeltilmeli
3. **Prettier formatını takip et** - Kod formatı tutarlı olmalı

### Git Workflow

1. **Conventional Commits** - Commit mesajları formatı:
   - \`feat:\` - Yeni özellik
   - \`fix:\` - Hata düzeltme
   - \`docs:\` - Dokümantasyon
   - \`refactor:\` - Kod düzenleme
   - \`test:\` - Test ekleme/düzeltme
   - \`chore:\` - Diğer işlemler

2. **Branch Stratejisi**
   - \`main\` - Production
   - \`dev/v{X.Y.Z}/phase-{N}\` - Geliştirme

### Dosya Organizasyonu

- Küçük dosyalar tercih et (200-400 satır ideal)
- Benzer işlevleri grupla
- İsimlendirmede tutarlı ol

---

## MODEL KULLANIMI

| Model | Kullanım Alanı |
|-------|----------------|
| Claude (Opus 4.5) | Kritik kararlar, mimari |
| GLM (4.7) | Rutin görevler, kod yazma |

---

## ARAÇLAR

- \`claude\` - Anthropic Max Plan CLI
- \`glm\` - Z.AI Coding Plan CLI

---

## NOTLAR

Bu dosya platform seviyesinde kuralları içerir.
Proje-özel kurallar için \`projects/{proje-id}/CLAUDE.md\` dosyasına bakın.
`

/**
 * Project CLAUDE.md default template
 * Contains project-specific rules
 */
export const PROJECT_CLAUDE_MD_TEMPLATE = `# {{PROJECT_NAME}} - Proje Kuralları

**Proje ID:** {{PROJECT_ID}}
**Oluşturulma:** {{DATE}}

---

## PROJE BİLGİSİ

Bu dosya {{PROJECT_NAME}} projesinin özel kurallarını içerir.

### Proje Tipi
{{PROJECT_TYPE}}

### Tech Stack
{{TECH_STACK}}

---

## PROJE YAPISI

\`\`\`
{{PROJECT_STRUCTURE}}
\`\`\`

---

## PROJE KURALLARI

### Genel

1. Mevcut kod stilini takip et
2. Test coverage %80+ olmalı
3. Dokümantasyonu güncel tut

### Özel Kurallar

_Proje özel kuralları buraya eklenecek_

---

## ÖNEMLİ NOTLAR

- Platform kuralları için \`/data/CLAUDE.md\` dosyasına bakın
- Bu dosya proje-özel ayarları içerir

---

## DEĞİŞİKLİK GEÇMİŞİ

| Tarih | Değişiklik |
|-------|------------|
| {{DATE}} | İlk oluşturma |
`

// =============================================================================
// Template Utilities
// =============================================================================

/**
 * Replace template variables with actual values
 */
function replaceTemplateVars(
  template: string,
  vars: Record<string, string>
): string {
  let result = template
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value)
  }
  return result
}

/**
 * Get current date in YYYY-MM-DD format
 */
function getCurrentDate(): string {
  return new Date().toISOString().split('T')[0] ?? new Date().toISOString()
}

/**
 * Generate platform CLAUDE.md content from template
 */
export function generatePlatformClaudeMd(): string {
  return replaceTemplateVars(PLATFORM_CLAUDE_MD_TEMPLATE, {
    DATE: getCurrentDate(),
  })
}

/**
 * Generate project CLAUDE.md content from template
 */
export function generateProjectClaudeMd(options: {
  projectId: string
  projectName: string
  projectType?: string
  techStack?: string[]
  projectStructure?: string
}): string {
  const techStackStr = options.techStack?.length
    ? options.techStack.join(', ')
    : 'Belirtilmemiş'

  const projectStructure = options.projectStructure || `${options.projectName}/
├── src/
├── docs/
└── tests/`

  return replaceTemplateVars(PROJECT_CLAUDE_MD_TEMPLATE, {
    PROJECT_ID: options.projectId,
    PROJECT_NAME: options.projectName,
    PROJECT_TYPE: options.projectType || 'Belirtilmemiş',
    TECH_STACK: techStackStr,
    PROJECT_STRUCTURE: projectStructure,
    DATE: getCurrentDate(),
  })
}

// =============================================================================
// Read Operations
// =============================================================================

/**
 * Read platform CLAUDE.md file
 */
export async function readPlatformClaudeMd(
  options: ReadClaudeMdOptions = {}
): Promise<StorageResult<ClaudeMdContent>> {
  const path = getPlatformClaudeMdPath()

  try {
    const exists = await fileExists(path)

    if (!exists) {
      if (options.useDefault) {
        return {
          success: true,
          data: {
            type: 'platform',
            path,
            content: generatePlatformClaudeMd(),
            exists: false,
          },
        }
      }
      return {
        success: true,
        data: {
          type: 'platform',
          path,
          content: '',
          exists: false,
        },
      }
    }

    const content = await readFile(path, 'utf-8')

    return {
      success: true,
      data: {
        type: 'platform',
        path,
        content,
        exists: true,
        lastModified: new Date().toISOString(),
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return {
      success: false,
      error: `Failed to read platform CLAUDE.md: ${message}`,
    }
  }
}

/**
 * Read project CLAUDE.md file
 */
export async function readProjectClaudeMd(
  projectId: string,
  options: ReadClaudeMdOptions = {}
): Promise<StorageResult<ClaudeMdContent>> {
  const path = getProjectClaudeMdPath(projectId)

  try {
    const exists = await fileExists(path)

    if (!exists) {
      if (options.useDefault) {
        return {
          success: true,
          data: {
            type: 'project',
            path,
            content: generateProjectClaudeMd({
              projectId,
              projectName: projectId,
            }),
            exists: false,
          },
        }
      }
      return {
        success: true,
        data: {
          type: 'project',
          path,
          content: '',
          exists: false,
        },
      }
    }

    const content = await readFile(path, 'utf-8')

    return {
      success: true,
      data: {
        type: 'project',
        path,
        content,
        exists: true,
        lastModified: new Date().toISOString(),
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return {
      success: false,
      error: `Failed to read project CLAUDE.md: ${message}`,
    }
  }
}

/**
 * Read CLAUDE.md file (auto-detect type based on projectId)
 */
export async function readClaudeMd(
  projectId?: string,
  options: ReadClaudeMdOptions = {}
): Promise<StorageResult<ClaudeMdContent>> {
  if (projectId) {
    return readProjectClaudeMd(projectId, options)
  }
  return readPlatformClaudeMd(options)
}

// =============================================================================
// Write Operations
// =============================================================================

/**
 * Write platform CLAUDE.md file
 */
export async function writePlatformClaudeMd(
  content: string,
  options: WriteClaudeMdOptions = {}
): Promise<StorageResult<ClaudeMdContent>> {
  const path = getPlatformClaudeMdPath()
  const { createDirs = true, append = false } = options

  try {
    // Ensure directory exists
    if (createDirs) {
      await ensureDir(dirname(path))
    }

    let finalContent = content

    // Append mode
    if (append) {
      const exists = await fileExists(path)
      if (exists) {
        const existingContent = await readFile(path, 'utf-8')
        finalContent = existingContent + '\n' + content
      }
    }

    await writeFile(path, finalContent, 'utf-8')

    return {
      success: true,
      data: {
        type: 'platform',
        path,
        content: finalContent,
        exists: true,
        lastModified: new Date().toISOString(),
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return {
      success: false,
      error: `Failed to write platform CLAUDE.md: ${message}`,
    }
  }
}

/**
 * Write project CLAUDE.md file
 */
export async function writeProjectClaudeMd(
  projectId: string,
  content: string,
  options: WriteClaudeMdOptions = {}
): Promise<StorageResult<ClaudeMdContent>> {
  const path = getProjectClaudeMdPath(projectId)
  const { createDirs = true, append = false } = options

  try {
    // Ensure project directory exists
    if (createDirs) {
      await ensureDir(dirname(path))
    }

    let finalContent = content

    // Append mode
    if (append) {
      const exists = await fileExists(path)
      if (exists) {
        const existingContent = await readFile(path, 'utf-8')
        finalContent = existingContent + '\n' + content
      }
    }

    await writeFile(path, finalContent, 'utf-8')

    return {
      success: true,
      data: {
        type: 'project',
        path,
        content: finalContent,
        exists: true,
        lastModified: new Date().toISOString(),
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return {
      success: false,
      error: `Failed to write project CLAUDE.md: ${message}`,
    }
  }
}

/**
 * Write CLAUDE.md file (auto-detect type based on projectId)
 */
export async function writeClaudeMd(
  content: string,
  projectId?: string,
  options: WriteClaudeMdOptions = {}
): Promise<StorageResult<ClaudeMdContent>> {
  if (projectId) {
    return writeProjectClaudeMd(projectId, content, options)
  }
  return writePlatformClaudeMd(content, options)
}

// =============================================================================
// Initialization Operations
// =============================================================================

/**
 * Initialize platform CLAUDE.md with default template if it doesn't exist
 */
export async function initPlatformClaudeMd(): Promise<StorageResult<ClaudeMdContent>> {
  const path = getPlatformClaudeMdPath()
  const exists = await fileExists(path)

  if (exists) {
    return readPlatformClaudeMd()
  }

  const content = generatePlatformClaudeMd()
  return writePlatformClaudeMd(content)
}

/**
 * Initialize project CLAUDE.md with default template if it doesn't exist
 */
export async function initProjectClaudeMd(options: {
  projectId: string
  projectName: string
  projectType?: string
  techStack?: string[]
  projectStructure?: string
}): Promise<StorageResult<ClaudeMdContent>> {
  const path = getProjectClaudeMdPath(options.projectId)
  const exists = await fileExists(path)

  if (exists) {
    return readProjectClaudeMd(options.projectId)
  }

  const content = generateProjectClaudeMd(options)
  return writeProjectClaudeMd(options.projectId, content)
}

// =============================================================================
// Update Operations
// =============================================================================

/**
 * Update a section in CLAUDE.md file
 * Finds section by header and replaces content until next header
 */
export async function updateClaudeMdSection(
  sectionHeader: string,
  newContent: string,
  projectId?: string
): Promise<StorageResult<ClaudeMdContent>> {
  // Read existing content
  const readResult = await readClaudeMd(projectId)
  if (!readResult.success) {
    return readResult
  }

  const { content: existingContent } = readResult.data

  // If file doesn't exist or is empty, can't update section
  if (!existingContent) {
    return {
      success: false,
      error: 'CLAUDE.md file not found or empty. Cannot update section.',
    }
  }

  // Find section and replace
  const sectionRegex = new RegExp(
    `(^## ${sectionHeader}\\s*\\n)([\\s\\S]*?)(?=^## |\\z)`,
    'm'
  )

  const match = existingContent.match(sectionRegex)

  let updatedContent: string
  if (match) {
    // Replace existing section
    updatedContent = existingContent.replace(
      sectionRegex,
      `$1\n${newContent}\n\n`
    )
  } else {
    // Section not found, append at end
    updatedContent = `${existingContent}\n\n## ${sectionHeader}\n\n${newContent}\n`
  }

  return writeClaudeMd(updatedContent, projectId)
}

/**
 * Append content to CLAUDE.md file
 */
export async function appendToClaudeMd(
  content: string,
  projectId?: string
): Promise<StorageResult<ClaudeMdContent>> {
  return writeClaudeMd(content, projectId, { append: true })
}

// =============================================================================
// Export Default
// =============================================================================

export default {
  // Path utilities
  getPlatformClaudeMdPath,
  getProjectClaudeMdPath,
  getProjectDirPath,
  // Template generation
  generatePlatformClaudeMd,
  generateProjectClaudeMd,
  // Read operations
  readPlatformClaudeMd,
  readProjectClaudeMd,
  readClaudeMd,
  // Write operations
  writePlatformClaudeMd,
  writeProjectClaudeMd,
  writeClaudeMd,
  // Initialize operations
  initPlatformClaudeMd,
  initProjectClaudeMd,
  // Update operations
  updateClaudeMdSection,
  appendToClaudeMd,
}
