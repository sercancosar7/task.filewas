/**
 * CLI Stream Parser
 * Parses Claude/GLM CLI NDJSON streaming output
 * @module @task-filewas/backend/utils/stream-parser
 */

import type { ToolName, MessageRole, TokenUsage } from '@task-filewas/shared'

// =============================================================================
// Types
// =============================================================================

/**
 * Stream message types from CLI
 */
export type StreamMessageType =
  | 'init'
  | 'message'
  | 'tool_use'
  | 'tool_result'
  | 'result'

/**
 * Content item in a message
 */
export interface ContentItem {
  /** Content type */
  type: 'text' | 'tool_use'
  /** Text content (for text type) */
  text?: string
  /** Tool name (for tool_use type) */
  name?: string
  /** Tool ID (for tool_use type) */
  id?: string
  /** Tool input (for tool_use type) */
  input?: Record<string, unknown>
}

/**
 * Init message - Session started
 */
export interface InitMessage {
  type: 'init'
  session_id: string
  timestamp?: string
  tools?: string[]
  mcp_servers?: Record<string, unknown>[]
}

/**
 * Text/assistant message
 */
export interface TextMessage {
  type: 'message'
  role: 'assistant' | 'user'
  content: ContentItem[] | string
  timestamp?: string
}

/**
 * Tool use message
 */
export interface ToolUseMessage {
  type: 'tool_use'
  name: string
  id?: string | undefined
  input: Record<string, unknown>
  timestamp?: string | undefined
}

/**
 * Tool result message
 */
export interface ToolResultMessage {
  type: 'tool_result'
  tool_use_id?: string
  output: string
  is_error?: boolean
  timestamp?: string
}

/**
 * Result message - Session ended
 */
export interface ResultMessage {
  type: 'result'
  status: 'success' | 'error' | 'interrupted'
  duration_ms?: number
  num_turns?: number
  session_id?: string
  usage?: {
    input_tokens: number
    output_tokens: number
    cache_creation_input_tokens?: number
    cache_read_input_tokens?: number
  }
  error?: string
  timestamp?: string
}

/**
 * Union type of all stream messages
 */
export type StreamMessage =
  | InitMessage
  | TextMessage
  | ToolUseMessage
  | ToolResultMessage
  | ResultMessage

/**
 * Parse result
 */
export interface ParseResult {
  /** Was parsing successful */
  success: boolean
  /** Parsed message (if successful) */
  message?: StreamMessage
  /** Error message (if failed) */
  error?: string
  /** Error type */
  errorType?: 'json_parse_error' | 'empty_line' | 'missing_type' | 'unknown_type'
  /** Original raw line */
  rawLine: string
}

/**
 * Parsed tool information
 */
export interface ParsedToolCall {
  /** Tool name */
  name: ToolName
  /** Tool ID */
  id?: string | undefined
  /** Tool input/parameters */
  input: Record<string, unknown>
  /** Human-readable summary */
  summary: string
  /** Timestamp */
  timestamp: string
}

/**
 * Parsed tool result
 */
export interface ParsedToolResult {
  /** Tool use ID this result belongs to */
  toolUseId?: string | undefined
  /** Output text */
  output: string
  /** Was there an error */
  isError: boolean
  /** Timestamp */
  timestamp: string
  /** Truncated (if output was very long) */
  truncated?: boolean | undefined
}

/**
 * Parsed text response
 */
export interface ParsedTextResponse {
  /** Role */
  role: MessageRole
  /** Text content */
  content: string
  /** Timestamp */
  timestamp: string
}

/**
 * Token usage from result
 */
export interface ParsedTokenUsage {
  /** Input tokens */
  inputTokens: number
  /** Output tokens */
  outputTokens: number
  /** Cache creation tokens */
  cacheCreationTokens: number
  /** Cache read tokens */
  cacheReadTokens: number
  /** Total context used */
  totalContext: number
  /** Percentage of context used (assuming 200k limit) */
  percentUsed: number
}

// =============================================================================
// Constants
// =============================================================================

/** Maximum context tokens (Claude's limit) */
const MAX_CONTEXT_TOKENS = 200_000

/** Valid stream message types */
const VALID_MESSAGE_TYPES: StreamMessageType[] = [
  'init',
  'message',
  'tool_use',
  'tool_result',
  'result',
]

/** Tool names that are recognized */
const KNOWN_TOOLS: ToolName[] = [
  'Read',
  'Write',
  'Edit',
  'Bash',
  'Grep',
  'Glob',
  'Task',
  'WebFetch',
  'TodoWrite',
  'AskUserQuestion',
  'EnterPlanMode',
  'ExitPlanMode',
  'Skill',
  'WebSearch',
  'NotebookEdit',
]

// =============================================================================
// StreamParser Class (Stateful)
// =============================================================================

/**
 * Stateful stream parser for handling chunked NDJSON data
 */
export class StreamParser {
  /** Buffer for incomplete lines */
  private buffer: string = ''

  /** Parsed messages in order */
  private messages: StreamMessage[] = []

  /** Current session ID (from init) */
  private sessionId: string | null = null

  /** Token usage from result */
  private tokenUsage: ParsedTokenUsage | null = null

  /**
   * Parse a chunk of data (may contain partial lines)
   * @returns Array of successfully parsed messages
   */
  parseChunk(chunk: string): ParseResult[] {
    const results: ParseResult[] = []

    // Add chunk to buffer
    this.buffer += chunk

    // Split by newlines
    const lines = this.buffer.split('\n')

    // Last element might be incomplete, keep it in buffer
    this.buffer = lines.pop() || ''

    // Parse complete lines
    for (const line of lines) {
      const result = this.parseLine(line)
      if (result.success && result.message) {
        this.messages.push(result.message)

        // Extract session ID from init message
        if (result.message.type === 'init') {
          this.sessionId = result.message.session_id
        }

        // Extract token usage from result message
        if (result.message.type === 'result' && result.message.usage) {
          this.tokenUsage = calculateTokenUsage(result.message.usage)
        }
      }
      results.push(result)
    }

    return results
  }

  /**
   * Parse a single line
   */
  parseLine(line: string): ParseResult {
    return parseStreamLine(line)
  }

  /**
   * Flush any remaining data in buffer
   */
  flush(): ParseResult | null {
    if (this.buffer.trim()) {
      const result = this.parseLine(this.buffer)
      this.buffer = ''
      if (result.success && result.message) {
        this.messages.push(result.message)
      }
      return result
    }
    this.buffer = ''
    return null
  }

  /**
   * Reset parser state
   */
  reset(): void {
    this.buffer = ''
    this.messages = []
    this.sessionId = null
    this.tokenUsage = null
  }

  /**
   * Get session ID
   */
  getSessionId(): string | null {
    return this.sessionId
  }

  /**
   * Get token usage
   */
  getTokenUsage(): ParsedTokenUsage | null {
    return this.tokenUsage
  }

  /**
   * Get all parsed messages
   */
  getMessages(): StreamMessage[] {
    return [...this.messages]
  }

  /**
   * Get buffer content (for debugging)
   */
  getBuffer(): string {
    return this.buffer
  }
}

// =============================================================================
// Stateless Parse Functions
// =============================================================================

/**
 * Parse a single NDJSON line
 */
export function parseStreamLine(line: string): ParseResult {
  const trimmed = line.trim()

  // Empty line
  if (!trimmed) {
    return {
      success: false,
      errorType: 'empty_line',
      rawLine: line,
    }
  }

  // Try to parse JSON
  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'JSON parse error',
      errorType: 'json_parse_error',
      rawLine: line,
    }
  }

  // Validate it's an object with type field
  if (!parsed || typeof parsed !== 'object' || !('type' in parsed)) {
    return {
      success: false,
      error: 'Missing type field',
      errorType: 'missing_type',
      rawLine: line,
    }
  }

  const obj = parsed as Record<string, unknown>
  const messageType = obj['type'] as string

  // Validate message type
  if (!VALID_MESSAGE_TYPES.includes(messageType as StreamMessageType)) {
    return {
      success: false,
      error: `Unknown message type: ${messageType}`,
      errorType: 'unknown_type',
      rawLine: line,
    }
  }

  // Return successfully parsed message
  return {
    success: true,
    message: parsed as StreamMessage,
    rawLine: line,
  }
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Check if message is of a specific type
 */
export function isMessageType<T extends StreamMessage>(
  message: StreamMessage,
  type: T['type']
): message is T {
  return message.type === type
}

/**
 * Check if message is init
 */
export function isInitMessage(message: StreamMessage): message is InitMessage {
  return message.type === 'init'
}

/**
 * Check if message is text/assistant message
 */
export function isTextMessage(message: StreamMessage): message is TextMessage {
  return message.type === 'message'
}

/**
 * Check if message is tool use
 */
export function isToolUseMessage(message: StreamMessage): message is ToolUseMessage {
  return message.type === 'tool_use'
}

/**
 * Check if message is tool result
 */
export function isToolResultMessage(message: StreamMessage): message is ToolResultMessage {
  return message.type === 'tool_result'
}

/**
 * Check if message is result (session end)
 */
export function isResultMessage(message: StreamMessage): message is ResultMessage {
  return message.type === 'result'
}

// =============================================================================
// Content Extraction Functions
// =============================================================================

/**
 * Extract text content from a TextMessage
 */
export function extractTextContent(message: TextMessage): string {
  if (typeof message.content === 'string') {
    return message.content
  }

  // Content is an array of ContentItems
  return message.content
    .filter((item) => item.type === 'text' && item.text)
    .map((item) => item.text!)
    .join('')
}

/**
 * Extract tool uses from a TextMessage content array
 */
export function extractToolUsesFromContent(message: TextMessage): ToolUseMessage[] {
  if (typeof message.content === 'string') {
    return []
  }

  const toolUses: ToolUseMessage[] = []
  for (const item of message.content) {
    if (item.type === 'tool_use' && item.name) {
      toolUses.push({
        type: 'tool_use',
        name: item.name,
        id: item.id ?? undefined,
        input: item.input || {},
      })
    }
  }
  return toolUses
}

/**
 * Parse a ToolUseMessage into a structured ParsedToolCall
 */
export function parseToolCall(message: ToolUseMessage): ParsedToolCall {
  const toolName = normalizeToolName(message.name)

  return {
    name: toolName,
    id: message.id,
    input: message.input || {},
    summary: summarizeToolUse(toolName, message.input || {}),
    timestamp: message.timestamp || new Date().toISOString(),
  }
}

/**
 * Parse a ToolResultMessage into structured data
 */
export function parseToolResult(message: ToolResultMessage): ParsedToolResult {
  const output = message.output || ''
  const MAX_OUTPUT_LENGTH = 5000

  return {
    toolUseId: message.tool_use_id,
    output: output.length > MAX_OUTPUT_LENGTH
      ? output.substring(0, MAX_OUTPUT_LENGTH)
      : output,
    isError: message.is_error || false,
    timestamp: message.timestamp || new Date().toISOString(),
    truncated: output.length > MAX_OUTPUT_LENGTH,
  }
}

/**
 * Parse a TextMessage into a structured text response
 */
export function parseTextResponse(message: TextMessage): ParsedTextResponse {
  return {
    role: message.role === 'assistant' ? 'assistant' : 'user',
    content: extractTextContent(message),
    timestamp: message.timestamp || new Date().toISOString(),
  }
}

// =============================================================================
// Tool Summary Functions
// =============================================================================

/**
 * Normalize tool name to match ToolName type
 */
export function normalizeToolName(name: string): ToolName {
  // Direct match
  if (KNOWN_TOOLS.includes(name as ToolName)) {
    return name as ToolName
  }

  // Case-insensitive match
  const lowerName = name.toLowerCase()
  const found = KNOWN_TOOLS.find((t) => t.toLowerCase() === lowerName)
  if (found) {
    return found
  }

  // Default to 'Bash' for unknown tools (most likely a command)
  return 'Bash'
}

/**
 * Helper to safely get string from input
 */
function getInputString(input: Record<string, unknown>, key: string): string | undefined {
  const val = input[key]
  return typeof val === 'string' ? val : undefined
}

/**
 * Helper to safely get number from input
 */
function getInputNumber(input: Record<string, unknown>, key: string): number | undefined {
  const val = input[key]
  return typeof val === 'number' ? val : undefined
}

/**
 * Helper to safely get array from input
 */
function getInputArray(input: Record<string, unknown>, key: string): unknown[] | undefined {
  const val = input[key]
  return Array.isArray(val) ? val : undefined
}

/**
 * Generate human-readable summary of a tool use
 */
export function summarizeToolUse(toolName: ToolName, input: Record<string, unknown>): string {
  switch (toolName) {
    case 'Write': {
      const path = getInputString(input, 'file_path') || getInputString(input, 'path') || '(unknown)'
      return `Writing file: ${path}`
    }

    case 'Edit': {
      const path = getInputString(input, 'file_path') || getInputString(input, 'path') || '(unknown)'
      const oldStr = getInputString(input, 'old_string')
      const newStr = getInputString(input, 'new_string')
      if (oldStr && newStr) {
        const oldPreview = oldStr.length > 30 ? oldStr.substring(0, 30) + '...' : oldStr
        const newPreview = newStr.length > 30 ? newStr.substring(0, 30) + '...' : newStr
        return `Editing ${path}: "${oldPreview}" → "${newPreview}"`
      }
      return `Editing file: ${path}`
    }

    case 'Read': {
      const path = getInputString(input, 'file_path') || getInputString(input, 'path') || '(unknown)'
      const offset = getInputNumber(input, 'offset')
      const limit = getInputNumber(input, 'limit')
      if (offset !== undefined || limit !== undefined) {
        return `Reading ${path} (lines ${offset || 1}-${(offset || 0) + (limit || 100)})`
      }
      return `Reading file: ${path}`
    }

    case 'Bash': {
      const command = getInputString(input, 'command')
      const description = getInputString(input, 'description')
      if (description) {
        return description
      }
      if (command) {
        const preview = command.length > 50 ? command.substring(0, 50) + '...' : command
        return `Running: ${preview}`
      }
      return 'Running command'
    }

    case 'Grep': {
      const pattern = getInputString(input, 'pattern')
      const path = getInputString(input, 'path')
      if (pattern) {
        return `Searching for "${pattern}"${path ? ` in ${path}` : ''}`
      }
      return 'Searching content'
    }

    case 'Glob': {
      const pattern = getInputString(input, 'pattern')
      const path = getInputString(input, 'path')
      if (pattern) {
        return `Finding files: ${pattern}${path ? ` in ${path}` : ''}`
      }
      return 'Finding files'
    }

    case 'Task': {
      const description = getInputString(input, 'description')
      const subagentType = getInputString(input, 'subagent_type')
      if (description) {
        return `Task: ${description}`
      }
      if (subagentType) {
        return `Spawning ${subagentType} agent`
      }
      return 'Running task'
    }

    case 'WebFetch': {
      const url = getInputString(input, 'url')
      if (url) {
        const domain = extractDomain(url)
        return `Fetching: ${domain}`
      }
      return 'Fetching web content'
    }

    case 'TodoWrite': {
      const todos = getInputArray(input, 'todos')
      const count = todos?.length || 0
      return `Updating todo list (${count} items)`
    }

    case 'AskUserQuestion': {
      const questions = getInputArray(input, 'questions')
      const count = questions?.length || 1
      return `Asking ${count} question${count > 1 ? 's' : ''}`
    }

    case 'EnterPlanMode':
      return 'Entering plan mode'

    case 'ExitPlanMode':
      return 'Submitting plan for approval'

    case 'Skill': {
      const skill = getInputString(input, 'skill')
      return `Using skill: ${skill || '(unknown)'}`
    }

    case 'WebSearch': {
      const query = getInputString(input, 'query')
      if (query) {
        const preview = query.length > 40 ? query.substring(0, 40) + '...' : query
        return `Searching: "${preview}"`
      }
      return 'Web search'
    }

    case 'NotebookEdit': {
      const path = getInputString(input, 'notebook_path')
      const mode = getInputString(input, 'edit_mode')
      return `${mode || 'Editing'} notebook: ${path || '(unknown)'}`
    }

    default:
      return `Using ${toolName}`
  }
}

// =============================================================================
// Token Usage Functions
// =============================================================================

/**
 * Calculate token usage from result message usage
 */
export function calculateTokenUsage(usage: NonNullable<ResultMessage['usage']>): ParsedTokenUsage {
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
    percentUsed: Math.round(percentUsed * 100) / 100, // 2 decimal places
  }
}

/**
 * Check if context is approaching limit
 */
export function isContextWarning(usage: ParsedTokenUsage): boolean {
  return usage.percentUsed >= 80
}

/**
 * Check if context needs refresh
 */
export function needsContextRefresh(usage: ParsedTokenUsage): boolean {
  return usage.percentUsed >= 90
}

// =============================================================================
// Error Handling Functions
// =============================================================================

/**
 * Parse CLI error from stderr or error message
 */
export function parseCliError(stderr: string): {
  type: 'rate_limit' | 'auth' | 'network' | 'timeout' | 'unknown'
  message: string
  retryable: boolean
  retryAfterMs?: number
} {
  const lowerStderr = stderr.toLowerCase()

  // Rate limit error
  if (lowerStderr.includes('rate limit') || lowerStderr.includes('429')) {
    // Try to extract retry-after
    const retryMatch = stderr.match(/retry.?after[:\s]+(\d+)/i)
    const retryAfterMs = retryMatch && retryMatch[1] ? parseInt(retryMatch[1], 10) * 1000 : 60000

    return {
      type: 'rate_limit',
      message: 'Rate limit exceeded',
      retryable: true,
      retryAfterMs,
    }
  }

  // Auth error
  if (
    lowerStderr.includes('unauthorized') ||
    lowerStderr.includes('401') ||
    lowerStderr.includes('authentication')
  ) {
    return {
      type: 'auth',
      message: 'Authentication failed',
      retryable: false,
    }
  }

  // Network error
  if (
    lowerStderr.includes('network') ||
    lowerStderr.includes('econnrefused') ||
    lowerStderr.includes('etimedout') ||
    lowerStderr.includes('connection')
  ) {
    return {
      type: 'network',
      message: 'Network error',
      retryable: true,
      retryAfterMs: 5000,
    }
  }

  // Timeout
  if (lowerStderr.includes('timeout')) {
    return {
      type: 'timeout',
      message: 'Request timeout',
      retryable: true,
      retryAfterMs: 1000,
    }
  }

  // Unknown error
  return {
    type: 'unknown',
    message: stderr.substring(0, 200) || 'Unknown error',
    retryable: false,
  }
}

/**
 * Check if result message indicates an error
 */
export function isErrorResult(message: ResultMessage): boolean {
  return message.status === 'error' || message.status === 'interrupted'
}

/**
 * Extract error message from result
 */
export function extractResultError(message: ResultMessage): string | null {
  if (!isErrorResult(message)) {
    return null
  }
  return message.error || `Session ended with status: ${message.status}`
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    const parsed = new URL(url)
    return parsed.hostname
  } catch {
    return url.substring(0, 50)
  }
}

/**
 * Convert TokenUsage to shared type format
 */
export function toSharedTokenUsage(usage: ParsedTokenUsage): TokenUsage {
  return {
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    cacheCreationTokens: usage.cacheCreationTokens,
    cacheReadTokens: usage.cacheReadTokens,
    totalContext: usage.totalContext,
    percentUsed: usage.percentUsed,
  }
}

// =============================================================================
// Export Default
// =============================================================================

export default {
  // Parser class
  StreamParser,
  // Parse functions
  parseStreamLine,
  parseToolCall,
  parseToolResult,
  parseTextResponse,
  // Type guards
  isMessageType,
  isInitMessage,
  isTextMessage,
  isToolUseMessage,
  isToolResultMessage,
  isResultMessage,
  // Content extraction
  extractTextContent,
  extractToolUsesFromContent,
  // Tool utilities
  normalizeToolName,
  summarizeToolUse,
  // Token usage
  calculateTokenUsage,
  isContextWarning,
  needsContextRefresh,
  toSharedTokenUsage,
  // Error handling
  parseCliError,
  isErrorResult,
  extractResultError,
}
