/**
 * Shared Zod schemas for validation
 * Will be populated with project, session, message schemas etc.
 */

import { z } from 'zod';

// Base schemas
export const idSchema = z.string().min(1);
export const timestampSchema = z.string().datetime();

// Pagination schema
export const paginationSchema = z.object({
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(20),
  offset: z.number().int().nonnegative().optional(),
});

// Status schemas
export const sessionStatusSchema = z.enum([
  'todo',
  'in-progress',
  'needs-review',
  'done',
  'cancelled',
]);

export const phaseStatusSchema = z.enum(['pending', 'in_progress', 'completed']);

export const agentStatusSchema = z.enum([
  'idle',
  'running',
  'paused',
  'error',
  'completed',
]);

export const permissionModeSchema = z.enum(['safe', 'ask', 'auto']);

export const thinkingLevelSchema = z.enum(['off', 'think', 'max']);

export const modelProviderSchema = z.enum(['claude', 'glm']);

// Message schemas
export const messageRoleSchema = z.enum(['user', 'assistant', 'system']);

export const messageSchema = z.object({
  id: idSchema,
  role: messageRoleSchema,
  content: z.string(),
  timestamp: timestampSchema,
  metadata: z.record(z.unknown()).optional(),
});

// API response schemas
export const apiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
    meta: z
      .object({
        total: z.number().optional(),
        page: z.number().optional(),
        limit: z.number().optional(),
      })
      .optional(),
  });

// Infer types from schemas
export type SessionStatusSchema = z.infer<typeof sessionStatusSchema>;
export type PhaseStatusSchema = z.infer<typeof phaseStatusSchema>;
export type AgentStatusSchema = z.infer<typeof agentStatusSchema>;
export type PermissionModeSchema = z.infer<typeof permissionModeSchema>;
export type ThinkingLevelSchema = z.infer<typeof thinkingLevelSchema>;
export type ModelProviderSchema = z.infer<typeof modelProviderSchema>;
export type MessageRoleSchema = z.infer<typeof messageRoleSchema>;
export type MessageSchema = z.infer<typeof messageSchema>;
export type PaginationSchema = z.infer<typeof paginationSchema>;
