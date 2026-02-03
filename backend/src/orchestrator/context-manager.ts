/**
 * Context Summarization Manager
 * Manages context window, token counting, and summarization for sessions
 * @module @task-filewas/backend/orchestrator/context-manager
 */

import { spawnCli, type CliProcess } from '../services/cli.js'
import type { ParsedTokenUsage } from '../utils/stream-parser.js'
import type { ModelProvider } from '@task-filewas/shared'

// =============================================================================
// Types
// =============================================================================

/**
 * Context summary entry
 */
export interface ContextSummary {
  /** Summary ID */
  id: string
  /** Summary content */
  content: string
  /** Turn range this summary covers */
  fromTurn: number
  toTurn: number
  /** Message count included */
  messageCount: number
  /** Timestamp when summary was created */
  createdAt: string
  /** Token estimate of summary */
  tokenEstimate: number
}

/**
 * Message entry for summarization
 */
export interface MessageEntry {
  /** Message ID */
  id: string
  /** Role */
  role: 'user' | 'assistant' | 'system'
  /** Content */
  content: string
  /** Turn number */
  turnNumber: number
  /** Is tool use */
  isToolUse?: boolean
  /** Tool name (if tool use) */
  toolName?: string
}

/**
 * Token count result
 */
export interface TokenCountResult {
  /** Estimated token count */
  tokens: number
  /** Character count */
  characters: number
  /** Message count */
  messageCount: number
  /** Turn count */
  turnCount: number
}

/**
 * Summarization options
 */
export interface SummarizationOptions {
  /** Target percentage to reduce to (default: 50%) */
  targetPercent?: number
  /** Minimum messages to keep (default: 30) */
  minMessagesToKeep?: number
  /** Maximum messages to keep (default: 50) */
  maxMessagesToKeep?: number
  /** Model to use for summarization (default: glm for cost) */
  model?: ModelProvider
  /** Include tool outputs in summary */
  includeToolOutputs?: boolean
  /** Custom summarization prompt */
  customPrompt?: string
}

/**
 * Summarization result
 */
export interface SummarizationResult {
  /** Success status */
  success: boolean
  /** Generated summary */
  summary?: ContextSummary
  /** Error message (if failed) */
  error?: string
  /** Tokens before summarization */
  tokensBefore: number
  /** Tokens after summarization */
  tokensAfter: number
  /** Reduction percentage */
  reductionPercent: number
}

/**
 * Context window state
 */
export interface ContextWindowState {
  /** Session ID */
  sessionId: string
  /** Current token usage */
  tokenUsage: ParsedTokenUsage | null
  /** Message count */
  messageCount: number
  /** Turn count */
  turnCount: number
  /** Warning threshold exceeded */
  isWarning: boolean
  /** Refresh needed */
  needsRefresh: boolean
  /** Last summary */
  lastSummary: ContextSummary | null
  /** Summary entries history */
  summaryHistory: ContextSummary[]
}

// =============================================================================
// Constants
// =============================================================================

/** Maximum context tokens (Claude's limit) */
const MAX_CONTEXT_TOKENS = 200_000

/** Warning threshold: 80% of max context */
const WARNING_THRESHOLD = 0.8

/** Refresh threshold: 90% of max context */
const REFRESH_THRESHOLD = 0.9

/** Target after summarization: 50% of max context */
const TARGET_AFTER_SUMMARIZATION = 0.5

/** Minimum messages to keep in sliding window */
const MIN_MESSAGES_TO_KEEP = 30

/** Maximum messages to keep in sliding window */
const MAX_MESSAGES_TO_KEEP = 50

/** Default summarization model (GLM for cost efficiency) */
const DEFAULT_SUMMARIZATION_MODEL: ModelProvider = 'glm'

/** Token estimation: ~4 characters per token (conservative) */
const TOKENS_PER_CHAR = 0.25

/** Summary prompt template */
const DEFAULT_SUMMARY_PROMPT = `Summarize the following conversation messages into a concise overview.
Focus on:
1. Key decisions made
2. Important technical details
3. Code changes and their purposes
4. Outstanding tasks or questions

Keep the summary under 500 tokens. Preserve critical information that would be needed to continue the work.

Messages to summarize:
{MESSAGES}

Summary:`

// =============================================================================
// Module State
// =============================================================================

/** Active context windows by session ID */
const contextWindows = new Map<string, ContextWindowState>()

/** Active summarization processes */
const activeSummarizations = new Map<string, CliProcess>()

// =============================================================================
// Token Counting Functions
// =============================================================================

/**
 * Estimate token count from text
 * Uses conservative estimate: ~4 characters per token
 */
export function estimateTokens(text: string): number {
  if (!text) return 0
  // Remove extra whitespace for more accurate count
  const cleaned = text.replace(/\s+/g, ' ')
  return Math.ceil(cleaned.length * TOKENS_PER_CHAR)
}

/**
 * Count tokens in a message entry
 */
export function countMessageTokens(message: MessageEntry): number {
  let tokens = estimateTokens(message.content)

  // Add overhead for metadata
  tokens += 10 // role, id, timestamp overhead

  // Add tokens for tool use
  if (message.isToolUse) {
    tokens += 20 // tool name, input overhead
  }

  return tokens
}

/**
 * Calculate total token count for messages
 */
export function countTokens(messages: MessageEntry[]): TokenCountResult {
  let totalTokens = 0
  const turnNumbers = new Set<number>()

  for (const message of messages) {
    totalTokens += countMessageTokens(message)
    turnNumbers.add(message.turnNumber)
  }

  return {
    tokens: totalTokens,
    characters: messages.reduce((sum, m) => sum + m.content.length, 0),
    messageCount: messages.length,
    turnCount: turnNumbers.size,
  }
}

/**
 * Token usage from CLI result message
 */
export interface CliTokenUsage {
  input_tokens: number
  output_tokens: number
  cache_creation_input_tokens?: number
  cache_read_input_tokens?: number
}

/**
 * Calculate token count from CLI usage data
 */
export function calculateTokenUsage(usage: CliTokenUsage): ParsedTokenUsage {
  const inputTokens = usage.input_tokens || 0
  const outputTokens = usage.output_tokens || 0
  const cacheCreationTokens = usage.cache_creation_input_tokens || 0
  const cacheReadTokens = usage.cache_read_input_tokens || 0

  // Total context is input + cache read (cache read replaces some input)
  const totalContext = inputTokens + cacheReadTokens

  // Percentage of max context used
  const percentUsed = (totalContext / MAX_CONTEXT_TOKENS) * 100

  return {
    inputTokens,
    outputTokens,
    cacheCreationTokens,
    cacheReadTokens,
    totalContext,
    percentUsed: Math.round(percentUsed * 100) / 100,
  }
}

// =============================================================================
// Context Window Management
// =============================================================================

/**
 * Get or create context window state for a session
 */
export function getContextWindow(sessionId: string): ContextWindowState {
  let window = contextWindows.get(sessionId)

  if (!window) {
    window = {
      sessionId,
      tokenUsage: null,
      messageCount: 0,
      turnCount: 0,
      isWarning: false,
      needsRefresh: false,
      lastSummary: null,
      summaryHistory: [],
    }
    contextWindows.set(sessionId, window)
  }

  return window
}

/**
 * Update context window with new token usage
 */
export function updateContextWindow(
  sessionId: string,
  tokenUsage: ParsedTokenUsage | null,
  messageCount: number,
  turnCount: number
): ContextWindowState {
  const window = getContextWindow(sessionId)

  window.tokenUsage = tokenUsage
  window.messageCount = messageCount
  window.turnCount = turnCount

  if (tokenUsage) {
    window.isWarning = tokenUsage.percentUsed >= WARNING_THRESHOLD * 100
    window.needsRefresh = tokenUsage.percentUsed >= REFRESH_THRESHOLD * 100
  }

  return window
}

/**
 * Check if context warning threshold is reached
 */
export function isContextWarning(sessionId: string): boolean {
  const window = contextWindows.get(sessionId)
  return window?.isWarning ?? false
}

/**
 * Check if context refresh is needed
 */
export function needsContextRefresh(sessionId: string): boolean {
  const window = contextWindows.get(sessionId)
  return window?.needsRefresh ?? false
}

/**
 * Remove context window state
 */
export function removeContextWindow(sessionId: string): void {
  contextWindows.delete(sessionId)
}

/**
 * Get all context windows
 */
export function getAllContextWindows(): Map<string, ContextWindowState> {
  return new Map(contextWindows)
}

// =============================================================================
// Sliding Window Functions
// =============================================================================

/**
 * Apply sliding window to messages
 * Keeps recent messages within token limit
 */
export function applySlidingWindow(
  messages: MessageEntry[],
  options: SummarizationOptions = {}
): {
  keptMessages: MessageEntry[]
  removedMessages: MessageEntry[]
  tokenCount: TokenCountResult
} {
  const minMessages = options.minMessagesToKeep ?? MIN_MESSAGES_TO_KEEP
  const maxMessages = options.maxMessagesToKeep ?? MAX_MESSAGES_TO_KEEP

  // If we have fewer messages than minimum, keep all
  if (messages.length <= minMessages) {
    return {
      keptMessages: messages,
      removedMessages: [],
      tokenCount: countTokens(messages),
    }
  }

  // Sort by turn number (most recent last)
  const sorted = [...messages].sort((a, b) => a.turnNumber - b.turnNumber)

  // Calculate target token count (50% of max context)
  const targetTokens = MAX_CONTEXT_TOKENS * TARGET_AFTER_SUMMARIZATION

  // Start from the end and keep messages until we hit target
  const kept: MessageEntry[] = []
  let currentTokens = 0

  for (let i = sorted.length - 1; i >= 0; i--) {
    const msg = sorted[i]
    if (!msg) continue

    const msgTokens = countMessageTokens(msg)

    // Always keep at least minMessages
    const messagesRemainingFromStart = i
    if (kept.length < minMessages && messagesRemainingFromStart < minMessages - kept.length) {
      kept.unshift(msg)
      currentTokens += msgTokens
      continue
    }

    // Check if adding this message would exceed target
    if (kept.length >= minMessages && currentTokens + msgTokens > targetTokens) {
      break
    }

    // Don't exceed maxMessages even if under token limit
    if (kept.length >= maxMessages) {
      break
    }

    kept.unshift(msg)
    currentTokens += msgTokens
  }

  // Sort kept messages back to original order
  kept.sort((a, b) => a.turnNumber - b.turnNumber)

  const removed = sorted.filter((m) => !kept.find((k) => k.id === m.id))

  return {
    keptMessages: kept,
    removedMessages: removed,
    tokenCount: countTokens(kept),
  }
}

/**
 * Get sliding window summary
 */
export function getSlidingWindowSummary(messages: MessageEntry[]): string {
  const { removedMessages, keptMessages } = applySlidingWindow(messages)
  void keptMessages // Used for side effects, will be re-evaluated

  const parts: string[] = []

  // Count removed messages by type
  const removedUser = removedMessages.filter((m) => m.role === 'user').length
  const removedAssistant = removedMessages.filter((m) => m.role === 'assistant').length
  const removedTool = removedMessages.filter((m) => m.isToolUse).length

  if (removedMessages.length > 0) {
    parts.push(`## Previous Context Summary`)
    parts.push(`*Session contains ${removedMessages.length} prior messages not shown:*`)
    if (removedUser > 0) parts.push(`- ${removedUser} user messages`)
    if (removedAssistant > 0) parts.push(`- ${removedAssistant} assistant responses`)
    if (removedTool > 0) parts.push(`- ${removedTool} tool calls`)
    parts.push(`*These messages have been summarized to manage context window.*`)
  }

  return parts.join('\n')
}

// =============================================================================
// Summarization Functions
// =============================================================================

/**
 * Build summarization prompt from messages
 */
function buildSummaryPrompt(messages: MessageEntry[], customPrompt?: string): string {
  // Format messages for the prompt
  const formattedMessages = messages.map((msg) => {
    const toolInfo = msg.isToolUse ? ` [Tool: ${msg.toolName}]` : ''
    return `[${msg.role}]${toolInfo} ${msg.content.substring(0, 500)}${msg.content.length > 500 ? '...' : ''}`
  }).join('\n\n')

  const prompt = customPrompt ?? DEFAULT_SUMMARY_PROMPT
  return prompt.replace('{MESSAGES}', formattedMessages)
}

/**
 * Generate summary using CLI (GLM for cost efficiency)
 */
async function generateSummaryWithCli(
  messages: MessageEntry[],
  model: ModelProvider = DEFAULT_SUMMARIZATION_MODEL,
  customPrompt?: string
): Promise<SummarizationResult> {
  const prompt = buildSummaryPrompt(messages, customPrompt)
  const tokensBefore = countTokens(messages).tokens

  try {
    // Spawn CLI process
    const proc = spawnCli({
      cwd: process.cwd(),
      model,
      prompt,
      systemPrompt: 'You are a concise summarizer. Create brief, accurate summaries of conversations.',
      timeout: 60000, // 1 minute timeout
    })

    // Collect output
    const outputChunks: string[] = []
    const errorChunks: string[] = []

    proc.process.stdout?.on('data', (data: Buffer) => {
      outputChunks.push(data.toString())
    })

    proc.process.stderr?.on('data', (data: Buffer) => {
      errorChunks.push(data.toString())
    })

    // Wait for process to complete
    await new Promise<void>((resolve, reject) => {
      proc.process.on('close', (code) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`Process exited with code ${code}`))
        }
      })

      proc.process.on('error', reject)
    })

    // Parse output
    const rawOutput = outputChunks.join('')
    const summaryContent = extractSummaryContent(rawOutput)

    if (!summaryContent) {
      return {
        success: false,
        tokensBefore,
        tokensAfter: tokensBefore,
        reductionPercent: 0,
        error: 'Failed to extract summary from CLI output',
      }
    }

    const summary: ContextSummary = {
      id: `summary-${Date.now()}`,
      content: summaryContent,
      fromTurn: messages[0]?.turnNumber || 0,
      toTurn: messages[messages.length - 1]?.turnNumber || 0,
      messageCount: messages.length,
      createdAt: new Date().toISOString(),
      tokenEstimate: estimateTokens(summaryContent),
    }

    const tokensAfter = summary.tokenEstimate
    const reductionPercent = ((tokensBefore - tokensAfter) / tokensBefore) * 100

    return {
      success: true,
      summary,
      tokensBefore,
      tokensAfter,
      reductionPercent: Math.round(reductionPercent * 100) / 100,
    }
  } catch (error) {
    return {
      success: false,
      tokensBefore,
      tokensAfter: tokensBefore,
      reductionPercent: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Extract summary content from CLI output
 * Filters out non-summary content
 */
function extractSummaryContent(rawOutput: string): string | null {
  // Look for summary content after common markers
  const lines = rawOutput.split('\n')

  let inSummary = false
  const summaryLines: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()

    // Skip empty lines and CLI artifacts
    if (!trimmed || trimmed.startsWith('> ') || trimmed.startsWith('<!--')) {
      continue
    }

    // Start collecting after certain markers
    if (trimmed.match(/^#+\s*(Summary|Overview|Conversation Summary)/i)) {
      inSummary = true
      summaryLines.push(trimmed)
      continue
    }

    if (inSummary || trimmed.length > 20) {
      summaryLines.push(trimmed)
      inSummary = true
    }
  }

  const summary = summaryLines.join('\n').trim()
  return summary.length > 50 ? summary : null
}

/**
 * Generate summary for a session
 */
export async function generateSummary(
  sessionId: string,
  messages: MessageEntry[],
  options: SummarizationOptions = {}
): Promise<SummarizationResult> {
  // Check if already summarizing
  if (activeSummarizations.has(sessionId)) {
    return {
      success: false,
      tokensBefore: countTokens(messages).tokens,
      tokensAfter: countTokens(messages).tokens,
      reductionPercent: 0,
      error: 'Summarization already in progress',
    }
  }

  // Use specified model or default to GLM
  const model = options.model ?? DEFAULT_SUMMARIZATION_MODEL

  const result = await generateSummaryWithCli(messages, model, options.customPrompt)

  if (result.success && result.summary) {
    // Update context window state
    const window = getContextWindow(sessionId)
    window.lastSummary = result.summary
    window.summaryHistory.push(result.summary)
  }

  return result
}

/**
 * Check if summarization should be triggered
 */
export function shouldSummarize(sessionId: string): boolean {
  const window = contextWindows.get(sessionId)

  if (!window || !window.tokenUsage) {
    return false
  }

  // Trigger at 80% context usage
  return window.tokenUsage.percentUsed >= WARNING_THRESHOLD * 100
}

/**
 * Create summary entry for session JSONL
 */
export function createSummaryEntry(summary: ContextSummary): {
  type: 'summary'
  content: string
  fromTurn?: number
  toTurn?: number
  ts: string
} {
  return {
    type: 'summary',
    content: summary.content,
    fromTurn: summary.fromTurn,
    toTurn: summary.toTurn,
    ts: summary.createdAt,
  }
}

// =============================================================================
// Context Refresh Functions
// =============================================================================

/**
 * Prepare context for refresh (before starting new session)
 */
export interface ContextRefreshPlan {
  /** Summary to inject */
  summary: string
  /** Messages to keep (recent) */
  messagesToKeep: MessageEntry[]
  /** Token count before */
  tokensBefore: number
  /** Expected token count after */
  tokensAfter: number
}

/**
 * Build context refresh plan
 */
export function buildContextRefreshPlan(
  messages: MessageEntry[],
  existingSummaries: ContextSummary[] = [],
  options: SummarizationOptions = {}
): ContextRefreshPlan {
  const tokensBefore = countTokens(messages).tokens
  const windowPercent = (tokensBefore / MAX_CONTEXT_TOKENS) * 100

  // If under 80%, no need to refresh
  if (windowPercent < WARNING_THRESHOLD * 100) {
    return {
      summary: '',
      messagesToKeep: messages,
      tokensBefore,
      tokensAfter: tokensBefore,
    }
  }

  // Apply sliding window
  const { keptMessages, removedMessages } = applySlidingWindow(messages, options)

  // Build summary from existing summaries + removed messages overview
  const summaryParts: string[] = []

  // Add existing summaries
  if (existingSummaries.length > 0) {
    summaryParts.push('## Previous Session Summaries')
    for (const sum of existingSummaries) {
      summaryParts.push(sum.content)
    }
  }

  // Add overview of removed messages
  if (removedMessages.length > 0) {
    summaryParts.push(getSlidingWindowSummary(messages))
  }

  const summary = summaryParts.join('\n\n')
  const summaryTokens = estimateTokens(summary)
  const keptTokens = countTokens(keptMessages).tokens

  return {
    summary,
    messagesToKeep: keptMessages,
    tokensBefore,
    tokensAfter: summaryTokens + keptTokens,
  }
}

/**
 * Format refreshed context for new session prompt
 */
export function formatRefreshedContext(plan: ContextRefreshPlan): string {
  if (!plan.summary) {
    return ''
  }

  return `<!-- CONTEXT REFRESH -->
The following summarizes previous conversation that was removed to manage context window size:

${plan.summary}

-->
`
}

// =============================================================================
// Cleanup Functions
// =============================================================================

/**
 * Stop active summarization
 */
export function stopSummarization(sessionId: string): boolean {
  const proc = activeSummarizations.get(sessionId)
  if (proc && proc.status === 'running') {
    // Note: We don't have killProcess directly imported here
    // The process will complete or timeout on its own
    activeSummarizations.delete(sessionId)
    return true
  }
  return false
}

/**
 * Clear all context windows (for testing/shutdown)
 */
export function clearAllContextWindows(): void {
  contextWindows.clear()
  activeSummarizations.clear()
}

// =============================================================================
// Export Default
// =============================================================================

export default {
  // Token counting
  estimateTokens,
  countMessageTokens,
  countTokens,
  calculateTokenUsage,
  // Context window
  getContextWindow,
  updateContextWindow,
  isContextWarning,
  needsContextRefresh,
  removeContextWindow,
  getAllContextWindows,
  // Sliding window
  applySlidingWindow,
  getSlidingWindowSummary,
  // Summarization
  generateSummary,
  shouldSummarize,
  createSummaryEntry,
  // Context refresh
  buildContextRefreshPlan,
  formatRefreshedContext,
  // Cleanup
  stopSummarization,
  clearAllContextWindows,
  // Constants
  MAX_CONTEXT_TOKENS,
  WARNING_THRESHOLD,
  REFRESH_THRESHOLD,
  MIN_MESSAGES_TO_KEEP,
  MAX_MESSAGES_TO_KEEP,
}

// =============================================================================
// Named Constant Exports
// =============================================================================

export const MAX_CONTEXT_TOKENS_EXPORT = MAX_CONTEXT_TOKENS
export const WARNING_THRESHOLD_EXPORT = WARNING_THRESHOLD
export const REFRESH_THRESHOLD_EXPORT = REFRESH_THRESHOLD
export const MIN_MESSAGES_TO_KEEP_EXPORT = MIN_MESSAGES_TO_KEEP
export const MAX_MESSAGES_TO_KEEP_EXPORT = MAX_MESSAGES_TO_KEEP
