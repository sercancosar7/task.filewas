/**
 * Shared Zod schemas for validation
 * @module @task-filewas/shared/schemas
 */

import { z } from 'zod';

// =============================================================================
// Base Schemas
// =============================================================================

/** ID schema - non-empty string */
export const idSchema = z.string().min(1, 'ID is required');

/** Timestamp schema - ISO datetime string */
export const timestampSchema = z.string().datetime({ message: 'Must be a valid ISO datetime' });

/** Optional timestamp schema */
export const optionalTimestampSchema = timestampSchema.optional();

// =============================================================================
// Pagination Schema
// =============================================================================

/** Pagination parameters */
export const paginationSchema = z.object({
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(20),
  offset: z.number().int().nonnegative().optional(),
});

// =============================================================================
// Common Status Schemas
// =============================================================================

/** Session status (workflow state) */
export const sessionStatusSchema = z.enum([
  'todo',
  'in-progress',
  'needs-review',
  'done',
  'cancelled',
]);

/** Phase status in roadmap */
export const phaseStatusSchema = z.enum(['pending', 'in_progress', 'completed']);

/** Agent runtime status */
export const agentStatusSchema = z.enum(['idle', 'running', 'paused', 'error', 'completed']);

/** Permission mode for CLI operations */
export const permissionModeSchema = z.enum(['safe', 'ask', 'auto']);

/** Thinking level */
export const thinkingLevelSchema = z.enum(['off', 'think', 'max']);

/** Model provider */
export const modelProviderSchema = z.enum(['claude', 'glm']);

// =============================================================================
// Message Role Schema
// =============================================================================

/** Message role */
export const messageRoleSchema = z.enum(['user', 'assistant', 'system']);

// =============================================================================
// API Response Schemas
// =============================================================================

/** Generic API response wrapper */
export const apiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
    meta: z
      .object({
        total: z.number().int().min(0).optional(),
        page: z.number().int().min(1).optional(),
        limit: z.number().int().min(1).optional(),
        hasMore: z.boolean().optional(),
      })
      .optional(),
  });

/** Success response schema */
export const successResponseSchema = z.object({
  success: z.literal(true),
  message: z.string().optional(),
});

/** Error response schema */
export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  code: z.string().optional(),
  details: z.record(z.unknown()).optional(),
});

// =============================================================================
// Re-export from Project Schemas
// =============================================================================

export {
  // Enums
  projectStatusSchema,
  projectTypeSchema,
  versionStatusSchema,
  // Sub-schemas
  gitHubInfoSchema,
  techStackSchema,
  customStatusSchema,
  projectSettingsSchema,
  projectVersionSchema,
  // Main schemas
  projectCreateSchema,
  projectUpdateSchema,
  projectSchema,
  projectSummarySchema,
  // Types
  type ProjectStatusSchema,
  type ProjectTypeSchema,
  type VersionStatusSchema,
  type GitHubInfoSchemaType,
  type TechStackSchemaType,
  type ProjectSettingsSchemaType,
  type ProjectVersionSchemaType,
  type ProjectCreateSchemaType,
  type ProjectUpdateSchemaType,
  type ProjectSchemaType,
  type ProjectSummarySchemaType,
} from './project';

// =============================================================================
// Re-export from Session Schemas
// =============================================================================

export {
  // Enums
  sessionModeSchema,
  sessionProcessingStateSchema,
  messageContentTypeSchema,
  toolNameSchema,
  toolStatusSchema,
  // Sub-schemas
  tokenUsageSchema,
  sessionPhaseProgressSchema,
  sessionLabelSchema,
  sessionAgentSchema,
  messageMetadataSchema,
  todoItemSchema,
  // Main schemas
  sessionCreateSchema,
  sessionUpdateSchema,
  sessionSchema,
  sessionSummarySchema,
  sessionFilterSchema,
  sessionSortSchema,
  messageSchema,
  messageCreateSchema,
  messageChunkSchema,
  todoListSchema,
  planSchema,
  // Types
  type SessionModeSchema,
  type SessionProcessingStateSchema,
  type TokenUsageSchemaType,
  type SessionPhaseProgressSchemaType,
  type SessionLabelSchemaType,
  type SessionAgentSchemaType,
  type SessionCreateSchemaType,
  type SessionUpdateSchemaType,
  type SessionSchemaType,
  type SessionSummarySchemaType,
  type SessionFilterSchemaType,
  type SessionSortSchemaType,
  type MessageContentTypeSchema,
  type ToolNameSchemaType,
  type ToolStatusSchemaType,
  type MessageMetadataSchemaType,
  type MessageSchemaType,
  type MessageCreateSchemaType,
  type MessageChunkSchemaType,
  type TodoItemSchemaType,
  type TodoListSchemaType,
  type PlanSchemaType,
} from './session';

// =============================================================================
// Base Type Exports (inferred from this file's schemas)
// =============================================================================

export type SessionStatusSchema = z.infer<typeof sessionStatusSchema>;
export type PhaseStatusSchema = z.infer<typeof phaseStatusSchema>;
export type AgentStatusSchema = z.infer<typeof agentStatusSchema>;
export type PermissionModeSchema = z.infer<typeof permissionModeSchema>;
export type ThinkingLevelSchema = z.infer<typeof thinkingLevelSchema>;
export type ModelProviderSchema = z.infer<typeof modelProviderSchema>;
export type MessageRoleSchema = z.infer<typeof messageRoleSchema>;
export type PaginationSchema = z.infer<typeof paginationSchema>;
