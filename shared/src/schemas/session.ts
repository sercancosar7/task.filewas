/**
 * Session and Message Zod schemas for validation
 * @module @task-filewas/shared/schemas/session
 */

import { z } from 'zod';
import {
  idSchema,
  timestampSchema,
  sessionStatusSchema,
  permissionModeSchema,
  thinkingLevelSchema,
  modelProviderSchema,
  messageRoleSchema,
} from './index';

// =============================================================================
// Session Enum Schemas
// =============================================================================

/** Session mode */
export const sessionModeSchema = z.enum([
  'quick-chat',
  'planning',
  'tdd',
  'debug',
  'code-review',
]);

/** Session processing state */
export const sessionProcessingStateSchema = z.enum([
  'idle',
  'starting',
  'running',
  'paused',
  'stopping',
  'completed',
  'error',
]);

// =============================================================================
// Session Sub-schemas
// =============================================================================

/** Token usage tracking */
export const tokenUsageSchema = z.object({
  inputTokens: z.number().int().min(0),
  outputTokens: z.number().int().min(0),
  cacheCreationTokens: z.number().int().min(0),
  cacheReadTokens: z.number().int().min(0),
  totalContext: z.number().int().min(0),
  percentUsed: z.number().min(0).max(100),
});

/** Phase progress within a session */
export const sessionPhaseProgressSchema = z.object({
  currentPhase: z.number().int().min(0),
  totalPhases: z.number().int().min(0),
  phaseName: z.string().optional(),
  phaseStatus: z.enum(['pending', 'in_progress', 'completed']),
});

/** Session label */
export const sessionLabelSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(50),
  color: z.string().min(1),
});

/** Session agent info */
export const sessionAgentSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  model: modelProviderSchema,
  status: z.enum(['pending', 'running', 'completed', 'error']),
  startedAt: timestampSchema.optional(),
  completedAt: timestampSchema.optional(),
  duration: z.number().int().min(0).optional(),
});

// =============================================================================
// Session Create Schema
// =============================================================================

/** Schema for creating a new session */
export const sessionCreateSchema = z.object({
  /** Parent project ID (required) */
  projectId: idSchema,

  /** Session title (required) */
  title: z
    .string()
    .min(1, 'Session title is required')
    .max(200, 'Session title must be 200 characters or less'),

  /** Session description */
  description: z.string().max(2000).optional(),

  /** Session mode */
  mode: sessionModeSchema.optional().default('quick-chat'),

  /** Permission mode */
  permissionMode: permissionModeSchema.optional().default('safe'),

  /** Thinking level */
  thinkingLevel: thinkingLevelSchema.optional().default('off'),

  /** Model provider preference */
  modelProvider: z.union([modelProviderSchema, z.literal('auto')]).optional().default('auto'),

  /** Version to use */
  version: z.string().optional(),

  /** Initial labels (by ID) */
  labels: z.array(z.string()).optional(),

  /** Is flagged */
  isFlagged: z.boolean().optional().default(false),
});

// =============================================================================
// Session Update Schema
// =============================================================================

/** Schema for updating an existing session */
export const sessionUpdateSchema = z.object({
  /** Updated title */
  title: z.string().min(1).max(200).optional(),

  /** Updated description */
  description: z.string().max(2000).nullable().optional(),

  /** Updated status */
  status: sessionStatusSchema.optional(),

  /** Updated mode */
  mode: sessionModeSchema.optional(),

  /** Updated permission mode */
  permissionMode: permissionModeSchema.optional(),

  /** Updated thinking level */
  thinkingLevel: thinkingLevelSchema.optional(),

  /** Updated model provider */
  modelProvider: z.union([modelProviderSchema, z.literal('auto')]).optional(),

  /** Updated labels */
  labels: z.array(sessionLabelSchema).optional(),

  /** Updated flag status */
  isFlagged: z.boolean().optional(),

  /** Mark as read */
  hasUnread: z.boolean().optional(),
});

// =============================================================================
// Full Session Schema
// =============================================================================

/** Full session schema for validation */
export const sessionSchema = z.object({
  id: idSchema,
  projectId: idSchema,
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  status: sessionStatusSchema,
  mode: sessionModeSchema,
  processingState: sessionProcessingStateSchema,
  permissionMode: permissionModeSchema,
  thinkingLevel: thinkingLevelSchema,
  modelProvider: z.union([modelProviderSchema, z.literal('auto')]),
  version: z.string(),
  phaseProgress: sessionPhaseProgressSchema.optional(),
  tokenUsage: tokenUsageSchema.optional(),
  labels: z.array(sessionLabelSchema),
  isFlagged: z.boolean(),
  hasUnread: z.boolean(),
  hasPlan: z.boolean(),
  messageCount: z.number().int().min(0),
  cliSessionId: z.string().optional(),
  agents: z.array(sessionAgentSchema).optional(),
  startedAt: timestampSchema.optional(),
  endedAt: timestampSchema.optional(),
  duration: z.number().int().min(0).optional(),
  errorMessage: z.string().optional(),
  logFile: z.string().optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema.optional(),
});

/** Session summary schema */
export const sessionSummarySchema = z.object({
  id: idSchema,
  projectId: idSchema,
  title: z.string(),
  status: sessionStatusSchema,
  mode: sessionModeSchema,
  processingState: sessionProcessingStateSchema,
  modelProvider: z.union([modelProviderSchema, z.literal('auto')]),
  permissionMode: permissionModeSchema,
  phaseProgress: sessionPhaseProgressSchema.optional(),
  labels: z.array(sessionLabelSchema),
  isFlagged: z.boolean(),
  hasUnread: z.boolean(),
  hasPlan: z.boolean(),
  messageCount: z.number().int().min(0),
  updatedAt: timestampSchema.optional(),
  createdAt: timestampSchema,
});

/** Session filter schema */
export const sessionFilterSchema = z.object({
  projectId: idSchema.optional(),
  status: z.union([sessionStatusSchema, z.array(sessionStatusSchema)]).optional(),
  mode: z.union([sessionModeSchema, z.array(sessionModeSchema)]).optional(),
  labelIds: z.array(z.string()).optional(),
  isFlagged: z.boolean().optional(),
  hasUnread: z.boolean().optional(),
  version: z.string().optional(),
  search: z.string().optional(),
  fromDate: timestampSchema.optional(),
  toDate: timestampSchema.optional(),
});

/** Session sort schema */
export const sessionSortSchema = z.object({
  field: z.enum(['createdAt', 'updatedAt', 'title', 'status', 'messageCount']),
  direction: z.enum(['asc', 'desc']),
});

// =============================================================================
// Message Schemas
// =============================================================================

/** Message content type */
export const messageContentTypeSchema = z.enum([
  'text',
  'tool_use',
  'tool_result',
  'error',
  'summary',
]);

/** Tool names */
export const toolNameSchema = z.enum([
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
]);

/** Tool status */
export const toolStatusSchema = z.enum(['running', 'completed', 'error']);

/** Message metadata schema */
export const messageMetadataSchema = z.object({
  model: z.string().optional(),
  tokenUsage: z
    .object({
      inputTokens: z.number().int().min(0),
      outputTokens: z.number().int().min(0),
    })
    .optional(),
  thinking: z.string().optional(),
  duration: z.number().int().min(0).optional(),
  error: z.string().optional(),
});

/** Full message schema */
export const messageSchema = z.object({
  id: idSchema,
  sessionId: idSchema,
  role: messageRoleSchema,
  content: z.string(),
  contentType: messageContentTypeSchema,
  timestamp: timestampSchema,
  metadata: messageMetadataSchema.optional(),
});

/** Message create schema */
export const messageCreateSchema = z.object({
  sessionId: idSchema,
  content: z.string().min(1, 'Message content is required'),
  role: messageRoleSchema.optional().default('user'),
  metadata: messageMetadataSchema.partial().optional(),
});

/** Message chunk schema (for streaming) */
export const messageChunkSchema = z.object({
  sessionId: idSchema,
  messageId: idSchema,
  type: z.enum(['text', 'tool_use', 'tool_result', 'thinking']),
  content: z.string(),
  isFinal: z.boolean(),
  timestamp: timestampSchema,
});

/** Todo item schema */
export const todoItemSchema = z.object({
  content: z.string().min(1),
  status: z.enum(['pending', 'in_progress', 'completed']),
  activeForm: z.string().min(1),
});

/** Todo list schema */
export const todoListSchema = z.object({
  sessionId: idSchema,
  items: z.array(todoItemSchema),
  updatedAt: timestampSchema,
});

/** Plan schema */
export const planSchema = z.object({
  id: idSchema,
  sessionId: idSchema,
  content: z.string(),
  status: z.enum(['pending', 'approved', 'rejected', 'executing']),
  createdAt: timestampSchema,
  decidedAt: timestampSchema.optional(),
  executionStartedAt: timestampSchema.optional(),
});

// =============================================================================
// Type Exports
// =============================================================================

export type SessionModeSchema = z.infer<typeof sessionModeSchema>;
export type SessionProcessingStateSchema = z.infer<typeof sessionProcessingStateSchema>;
export type TokenUsageSchemaType = z.infer<typeof tokenUsageSchema>;
export type SessionPhaseProgressSchemaType = z.infer<typeof sessionPhaseProgressSchema>;
export type SessionLabelSchemaType = z.infer<typeof sessionLabelSchema>;
export type SessionAgentSchemaType = z.infer<typeof sessionAgentSchema>;
export type SessionCreateSchemaType = z.infer<typeof sessionCreateSchema>;
export type SessionUpdateSchemaType = z.infer<typeof sessionUpdateSchema>;
export type SessionSchemaType = z.infer<typeof sessionSchema>;
export type SessionSummarySchemaType = z.infer<typeof sessionSummarySchema>;
export type SessionFilterSchemaType = z.infer<typeof sessionFilterSchema>;
export type SessionSortSchemaType = z.infer<typeof sessionSortSchema>;
export type MessageContentTypeSchema = z.infer<typeof messageContentTypeSchema>;
export type ToolNameSchemaType = z.infer<typeof toolNameSchema>;
export type ToolStatusSchemaType = z.infer<typeof toolStatusSchema>;
export type MessageMetadataSchemaType = z.infer<typeof messageMetadataSchema>;
export type MessageSchemaType = z.infer<typeof messageSchema>;
export type MessageCreateSchemaType = z.infer<typeof messageCreateSchema>;
export type MessageChunkSchemaType = z.infer<typeof messageChunkSchema>;
export type TodoItemSchemaType = z.infer<typeof todoItemSchema>;
export type TodoListSchemaType = z.infer<typeof todoListSchema>;
export type PlanSchemaType = z.infer<typeof planSchema>;
