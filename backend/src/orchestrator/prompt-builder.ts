/**
 * Prompt Builder Service
 * Constructs complete prompts for agent execution
 * @module @task-filewas/backend/orchestrator/prompt-builder
 */

import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type {
  AgentType,
  AgentConfig,
  AgentHandoff,
  ModelProvider,
  ThinkingLevel,
} from '@task-filewas/shared'
import { readClaudeMd } from '../services/claudeMd.js'
import { getProject } from '../storage/projects.js'

// =============================================================================
// Types
// =============================================================================

/**
 * Prompt builder context
 */
export interface PromptBuilderContext {
  /** Agent configuration */
  agentConfig: AgentConfig
  /** Session ID */
  sessionId: string
  /** Project ID */
  projectId?: string
  /** Current phase ID (if in phase execution) */
  phaseId?: number
  /** User prompt/task */
  userPrompt: string
  /** Previous agent handoff (if any) */
  handoff?: AgentHandoff
  /** Additional context */
  additionalContext?: Record<string, unknown>
}

/**
 * Built prompt result
 */
export interface BuiltPrompt {
  /** System prompt (agent definition) */
  systemPrompt: string
  /** User prompt (context + task) */
  userPrompt: string
  /** Metadata about the prompt */
  metadata: {
    agentType: AgentType
    model: ModelProvider
    thinkingLevel: ThinkingLevel
    hasClaudeMd: boolean
    hasContext: boolean
    hasHandoff: boolean
    injectedFiles: string[]
    totalTokens: number
  }
}

/**
 * Document load result
 */
export interface DocumentLoadResult {
  path: string
  content: string
  exists: boolean
  size: number
}

// =============================================================================
// Constants
// =============================================================================

const __filename = resolve()

/** Approximate token count (1 token ≈ 4 characters) */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

// =============================================================================
// Path Utilities
// =============================================================================

/**
 * Get platform overview path
 */
export function getPlatformOverviewPath(): string {
  return resolve(__filename, '../../../docs/overviews/v0.1.0.md')
}

/**
 * Get platform roadmap path
 */
export function getPlatformRoadmapPath(): string {
  return resolve(__filename, '../../../docs/roadmaps/v0.1.0-roadmap.jsonl')
}

/**
 * Get project docs directory
 */
export function getProjectDocsDir(projectId: string): string {
  return resolve(__filename, `../../../data/projects/${projectId}/docs`)
}

/**
 * Get project overview path
 */
export function getProjectOverviewPath(projectId: string, version = 'v0.1.0'): string {
  return resolve(getProjectDocsDir(projectId), `${version}/overview.md`)
}

/**
 * Get project roadmap path
 */
export function getProjectRoadmapPath(projectId: string, version = 'v0.1.0'): string {
  return resolve(getProjectDocsDir(projectId), `${version}/roadmap.jsonl`)
}

/**
 * Get project CLAUDE.md path
 */
export function getProjectClaudeMdPath(projectId: string): string {
  return resolve(__filename, `../../../data/projects/${projectId}/CLAUDE.md`)
}

// =============================================================================
// Document Loading
// =============================================================================

/**
 * Load a document with error handling
 */
async function loadDocument(
  path: string,
  defaultValue = ''
): Promise<DocumentLoadResult> {
  try {
    const content = await readFile(path, 'utf-8')
    return {
      path,
      content,
      exists: true,
      size: content.length,
    }
  } catch {
    return {
      path,
      content: defaultValue,
      exists: false,
      size: 0,
    }
  }
}

/**
 * Load project overview document
 */
export async function loadProjectOverview(
  projectId: string,
  version?: string
): Promise<DocumentLoadResult> {
  const path = getProjectOverviewPath(projectId, version)
  return loadDocument(path)
}

/**
 * Load project roadmap document (JSONL format)
 */
export async function loadProjectRoadmap(
  projectId: string,
  version?: string
): Promise<DocumentLoadResult> {
  const path = getProjectRoadmapPath(projectId, version)
  return loadDocument(path)
}

/**
 * Load project changelog document
 */
export async function loadProjectChangelog(
  projectId: string,
  version = 'v0.1.0'
): Promise<DocumentLoadResult> {
  const path = resolve(getProjectDocsDir(projectId), `${version}/changelog.jsonl`)
  return loadDocument(path)
}

/**
 * Load project CLAUDE.md
 */
export async function loadProjectClaudeMd(projectId: string): Promise<DocumentLoadResult> {
  const path = getProjectClaudeMdPath(projectId)
  return loadDocument(path)
}

/**
 * Get current version from project
 */
export async function getProjectCurrentVersion(projectId: string): Promise<string> {
  try {
    const result = await getProject(projectId)
    if (result.success && result.data) {
      return result.data.activeVersion
    }
  } catch {
    // Fall through to default
  }
  return 'v0.1.0'
}

// =============================================================================
// CLAUDE.md Injection
// =============================================================================

/**
 * Build CLAUDE.md section for prompt
 */
export async function buildClaudeMdSection(
  projectId?: string
): Promise<string> {
  const sections: string[] = []

  // Platform CLAUDE.md (always include)
  const platformResult = await readClaudeMd(undefined, { useDefault: true })
  if (platformResult.success && platformResult.data?.content) {
    sections.push(`<project-rules type="platform">`)
    sections.push(platformResult.data.content)
    sections.push(`</project-rules>`)
  }

  // Project CLAUDE.md (if projectId provided)
  if (projectId) {
    const projectResult = await readClaudeMd(projectId, { useDefault: true })
    if (projectResult.success && projectResult.data?.content) {
      sections.push(`<project-rules type="project" id="${projectId}">`)
      sections.push(projectResult.data.content)
      sections.push(`</project-rules>`)
    }
  }

  return sections.join('\n\n')
}

// =============================================================================
// Context Injection
// =============================================================================

/**
 * Build context section with project documents
 */
export async function buildContextSection(
  projectId?: string,
  phaseId?: number
): Promise<{ content: string; files: string[] }> {
  const sections: string[] = []
  const injectedFiles: string[] = []

  if (!projectId) {
    return { content: '', files: [] }
  }

  const version = await getProjectCurrentVersion(projectId)

  // Load overview
  const overviewResult = await loadProjectOverview(projectId, version)
  if (overviewResult.exists) {
    sections.push(`<overview source="${overviewResult.path}">`)
    sections.push(overviewResult.content)
    sections.push(`</overview>`)
    injectedFiles.push(overviewResult.path)
  }

  // Load roadmap (JSONL - parse for relevant phase)
  const roadmapResult = await loadProjectRoadmap(projectId, version)
  if (roadmapResult.exists) {
    sections.push(`<roadmap source="${roadmapResult.path}" version="${version}">`)

    // If phaseId is specified, filter and include only relevant entries
    if (phaseId !== undefined) {
      const lines = roadmapResult.content.split('\n').filter((line) => line.trim())
      const relevantLines: string[] = []

      for (const line of lines) {
        try {
          const entry = JSON.parse(line)
          // Include header, the specific phase, and nearby phases for context
          if (entry.type === 'header') {
            relevantLines.push(line) // Always include header
          } else if (entry.type === 'phase') {
            // Include current phase and adjacent ones for context
            if (Math.abs(entry.id - phaseId) <= 1) {
              relevantLines.push(line)
            }
          } else if (entry.type === 'milestone') {
            // Include milestone if it covers current phase
            if (entry.phases?.includes(phaseId)) {
              relevantLines.push(line)
            }
          }
        } catch {
          // Skip invalid JSON lines
        }
      }
      sections.push(relevantLines.join('\n'))
    } else {
      sections.push(roadmapResult.content)
    }

    sections.push(`</roadmap>`)
    injectedFiles.push(roadmapResult.path)
  }

  // Load changelog for recent context (limit to last 5 entries)
  const changelogResult = await loadProjectChangelog(projectId, version)
  if (changelogResult.exists) {
    sections.push(`<changelog source="${changelogResult.path}" version="${version}">`)

    const lines = changelogResult.content.split('\n').filter((line) => line.trim())
    const recentEntries: string[] = []
    let entryCount = 0

    for (const line of lines) {
      if (entryCount >= 5) break
      try {
        const entry = JSON.parse(line)
        if (entry.type === 'entry') {
          recentEntries.push(line)
          entryCount++
        }
      } catch {
        // Skip invalid JSON
      }
    }

    sections.push(recentEntries.join('\n'))
    sections.push(`</changelog>`)
    injectedFiles.push(changelogResult.path)
  }

  return {
    content: sections.join('\n\n'),
    files: injectedFiles,
  }
}

// =============================================================================
// Handoff Injection
// =============================================================================

/**
 * Build handoff section from previous agent
 */
export function buildHandoffSection(handoff?: AgentHandoff): string {
  if (!handoff) {
    return ''
  }

  const sections: string[] = []
  sections.push(`<handoff from="${handoff.fromAgentType}" id="${handoff.fromAgentId}">`)
  sections.push(`## Summary`)
  sections.push(handoff.summary)
  sections.push(``)
  sections.push(`## Files Modified`)
  if (handoff.files.length > 0) {
    sections.push(handoff.files.map((f) => `- ${f}`).join('\n'))
  } else {
    sections.push('(No files modified)')
  }
  sections.push(``)
  sections.push(`## Open Questions`)
  if (handoff.questions.length > 0) {
    sections.push(handoff.questions.map((q, i) => `${i + 1}. ${q}`).join('\n'))
  } else {
    sections.push('(No open questions)')
  }
  sections.push(``)
  sections.push(`## Recommendations`)
  if (handoff.recommendations.length > 0) {
    sections.push(handoff.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n'))
  } else {
    sections.push('(No recommendations)')
  }
  sections.push(``)
  sections.push(`</handoff>`)

  return sections.join('\n')
}

// =============================================================================
// Phase Instruction
// =============================================================================

/**
 * Build phase-specific instruction
 */
export function buildPhaseInstruction(phaseId?: number): string {
  if (phaseId === undefined) {
    return ''
  }

  return `<phase-instruction id="${phaseId}">
You are currently working on **Phase ${phaseId}** of the project roadmap.

Important notes for this phase:
- Follow the tasks defined in the roadmap for this phase
- Meet all acceptance criteria before marking the phase as complete
- Document your changes in the changelog
- Test your work before considering the phase complete

When this phase is complete:
1. Update the roadmap: set phase status to "completed"
2. Add an entry to the changelog with:
   - Phase number
   - Date (today's date in YYYY-MM-DD format)
   - Title describing what was done
   - List of changes made
   - List of files modified
3. Stop and report completion
</phase-instruction>`
}

// =============================================================================
// Main Builder
// =============================================================================

/**
 * Build complete prompt for agent execution
 */
export async function buildPrompt(context: PromptBuilderContext): Promise<BuiltPrompt> {
  const {
    agentConfig,
    sessionId: _sessionId,
    projectId,
    phaseId,
    userPrompt,
    handoff,
    additionalContext,
  } = context

  // Collect all prompt sections
  const userPromptSections: string[] = []

  // 1. CLAUDE.md injection
  const claudeMdContent = await buildClaudeMdSection(projectId)
  const hasClaudeMd = claudeMdContent.length > 0
  if (hasClaudeMd) {
    userPromptSections.push(claudeMdContent)
  }

  // 2. Context injection (overview, roadmap, changelog)
  const { content: contextContent, files: injectedFiles } = await buildContextSection(
    projectId,
    phaseId
  )
  const hasContext = contextContent.length > 0
  if (hasContext) {
    userPromptSections.push(contextContent)
  }

  // 3. Phase instruction
  const phaseInstruction = buildPhaseInstruction(phaseId)
  if (phaseInstruction) {
    userPromptSections.push(phaseInstruction)
  }

  // 4. Handoff from previous agent
  const handoffContent = buildHandoffSection(handoff)
  const hasHandoff = handoffContent.length > 0
  if (hasHandoff) {
    userPromptSections.push(handoffContent)
  }

  // 5. Additional context (if provided)
  if (additionalContext) {
    userPromptSections.push(`<additional-context>`)
    userPromptSections.push(JSON.stringify(additionalContext, null, 2))
    userPromptSections.push(`</additional-context>`)
  }

  // 6. User task
  userPromptSections.push(`<task>`)
  userPromptSections.push(userPrompt)
  userPromptSections.push(`</task>`)

  // Combine user prompt sections
  const finalUserPrompt = userPromptSections.join('\n\n')

  // Calculate metadata
  const totalTokens = estimateTokens(agentConfig.systemPrompt + finalUserPrompt)

  return {
    systemPrompt: agentConfig.systemPrompt,
    userPrompt: finalUserPrompt,
    metadata: {
      agentType: agentConfig.type,
      model: agentConfig.model,
      thinkingLevel: agentConfig.thinkingLevel,
      hasClaudeMd,
      hasContext,
      hasHandoff,
      injectedFiles,
      totalTokens,
    },
  }
}

/**
 * Build simple prompt without context (for quick tasks)
 */
export async function buildSimplePrompt(
  agentConfig: AgentConfig,
  userPrompt: string
): Promise<BuiltPrompt> {
  return {
    systemPrompt: agentConfig.systemPrompt,
    userPrompt: `<task>\n${userPrompt}\n</task>`,
    metadata: {
      agentType: agentConfig.type,
      model: agentConfig.model,
      thinkingLevel: agentConfig.thinkingLevel,
      hasClaudeMd: false,
      hasContext: false,
      hasHandoff: false,
      injectedFiles: [],
      totalTokens: estimateTokens(agentConfig.systemPrompt + userPrompt),
    },
  }
}

/**
 * Build resume prompt (for continuing a paused session)
 */
export async function buildResumePrompt(
  context: PromptBuilderContext,
  previousOutput: string
): Promise<BuiltPrompt> {
  const resumeContext = `<session-resume>
You are resuming a previous session that was paused.

## Previous Output Summary
${previousOutput.slice(0, 2000)}${previousOutput.length > 2000 ? '\n... (truncated)' : ''}

## Instructions
Continue from where you left off. Maintain the same context and approach.
</session-resume>`

  // Build normal prompt with resume context added
  const basePrompt = await buildPrompt(context)

  return {
    systemPrompt: basePrompt.systemPrompt,
    userPrompt: resumeContext + '\n\n' + basePrompt.userPrompt,
    metadata: {
      ...basePrompt.metadata,
      totalTokens: estimateTokens(basePrompt.systemPrompt + resumeContext + basePrompt.userPrompt),
    },
  }
}

// =============================================================================
// Path Utilities (exported for external use)
// =============================================================================

export const paths = {
  getPlatformOverviewPath,
  getPlatformRoadmapPath,
  getProjectDocsDir,
  getProjectOverviewPath,
  getProjectRoadmapPath,
  getProjectClaudeMdPath,
}

// =============================================================================
// Export Default
// =============================================================================

export default {
  buildPrompt,
  buildSimplePrompt,
  buildResumePrompt,
  buildClaudeMdSection,
  buildContextSection,
  buildHandoffSection,
  buildPhaseInstruction,
  loadProjectOverview,
  loadProjectRoadmap,
  loadProjectChangelog,
  loadProjectClaudeMd,
  paths,
}
