/**
 * Utility exports
 * @module @task-filewas/backend/utils
 */

export {
  success,
  error,
  paginated,
  withTimestamp,
  created,
  noContent,
  parsePaginationParams,
} from './apiResponse.js'

// Stream parser
export {
  StreamParser,
  parseStreamLine,
  parseToolCall,
  parseToolResult,
  parseTextResponse,
  isMessageType,
  isInitMessage,
  isTextMessage,
  isToolUseMessage,
  isToolResultMessage,
  isResultMessage,
  extractTextContent,
  extractToolUsesFromContent,
  normalizeToolName,
  summarizeToolUse,
  calculateTokenUsage,
  isContextWarning,
  needsContextRefresh,
  toSharedTokenUsage,
  parseCliError,
  isErrorResult,
  extractResultError,
} from './stream-parser.js'

export type {
  StreamMessageType,
  ContentItem,
  InitMessage,
  TextMessage,
  ToolUseMessage,
  ToolResultMessage,
  ResultMessage,
  StreamMessage,
  ParseResult,
  ParsedToolCall,
  ParsedToolResult,
  ParsedTextResponse,
  ParsedTokenUsage,
} from './stream-parser.js'
