/**
 * Project Zod schemas for validation
 * @module @task-filewas/shared/schemas/project
 */

import { z } from 'zod';
import { idSchema, timestampSchema } from './index';

// =============================================================================
// Enum Schemas
// =============================================================================

/** Project status */
export const projectStatusSchema = z.enum(['active', 'archived', 'deleted']);

/** Project type based on tech stack */
export const projectTypeSchema = z.enum([
  'web',
  'backend',
  'fullstack',
  'mobile',
  'cli',
  'library',
  'monorepo',
  'other',
]);

/** Version status */
export const versionStatusSchema = z.enum(['draft', 'active', 'completed']);

// =============================================================================
// Sub-schemas
// =============================================================================

/** GitHub repository information */
export const gitHubInfoSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  url: z.string().url(),
  defaultBranch: z.string().min(1),
  autoPush: z.boolean(),
});

/** Tech stack information */
export const techStackSchema = z.object({
  languages: z.array(z.string()),
  frameworks: z.array(z.string()),
  databases: z.array(z.string()).optional(),
  uiLibraries: z.array(z.string()).optional(),
  buildTools: z.array(z.string()).optional(),
  testingFrameworks: z.array(z.string()).optional(),
  other: z.array(z.string()).optional(),
});

/** Custom status definition */
export const customStatusSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  icon: z.string().min(1),
  color: z.string().min(1),
});

/** Project settings */
export const projectSettingsSchema = z.object({
  defaultModel: z.enum(['claude', 'glm', 'auto']).optional(),
  defaultPermissionMode: z.enum(['safe', 'ask', 'auto']).optional(),
  defaultThinkingLevel: z.enum(['off', 'think', 'max']).optional(),
  autoCommit: z.boolean().optional(),
  autoPush: z.boolean().optional(),
  customLabels: z.array(z.string()).optional(),
  customStatuses: z.array(customStatusSchema).optional(),
});

/** Project version */
export const projectVersionSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Must be semantic version (e.g., 0.1.0)'),
  description: z.string().optional(),
  createdAt: timestampSchema,
  currentPhase: z.number().int().min(0),
  totalPhases: z.number().int().min(0),
  status: versionStatusSchema,
});

// =============================================================================
// Create Schema
// =============================================================================

/** Schema for creating a new project */
export const projectCreateSchema = z.object({
  /** Project name (required) */
  name: z
    .string()
    .min(1, 'Project name is required')
    .max(100, 'Project name must be 100 characters or less'),

  /** Project description */
  description: z.string().max(1000).optional(),

  /** Project type */
  type: projectTypeSchema.optional().default('other'),

  /** File system path (optional - will be generated if not provided) */
  path: z.string().optional(),

  /** GitHub repository URL for import */
  githubUrl: z.string().url().optional(),

  /** Initial tech stack (optional - will be detected) */
  techStack: techStackSchema.partial().optional(),

  /** Initial settings */
  settings: projectSettingsSchema.partial().optional(),

  /** Project icon or emoji */
  icon: z.string().max(10).optional(),

  /** Project color for UI (hex) */
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Must be hex color (e.g., #FF5733)')
    .optional(),

  /** Tags for organization */
  tags: z.array(z.string().max(50)).max(20).optional(),
});

// =============================================================================
// Update Schema
// =============================================================================

/** Schema for updating an existing project */
export const projectUpdateSchema = z.object({
  /** Updated project name */
  name: z.string().min(1).max(100).optional(),

  /** Updated description */
  description: z.string().max(1000).nullable().optional(),

  /** Updated project type */
  type: projectTypeSchema.optional(),

  /** Updated status */
  status: projectStatusSchema.optional(),

  /** Updated settings (partial) */
  settings: projectSettingsSchema.partial().optional(),

  /** Updated GitHub info (partial) */
  github: gitHubInfoSchema.partial().optional(),

  /** Updated tech stack (partial) */
  techStack: techStackSchema.partial().optional(),

  /** Updated icon */
  icon: z.string().max(10).nullable().optional(),

  /** Updated color */
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .nullable()
    .optional(),

  /** Updated tags */
  tags: z.array(z.string().max(50)).max(20).optional(),
});

// =============================================================================
// Full Project Schema
// =============================================================================

/** Full project schema for validation */
export const projectSchema = z.object({
  id: idSchema,
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  type: projectTypeSchema,
  status: projectStatusSchema,
  path: z.string().min(1),
  github: gitHubInfoSchema.optional(),
  techStack: techStackSchema.optional(),
  versions: z.array(projectVersionSchema),
  activeVersion: z.string(),
  settings: projectSettingsSchema,
  sessionCount: z.number().int().min(0),
  lastActivityAt: timestampSchema.optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  tags: z.array(z.string()).optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema.optional(),
});

/** Project summary schema */
export const projectSummarySchema = z.object({
  id: idSchema,
  name: z.string(),
  description: z.string().optional(),
  type: projectTypeSchema,
  status: projectStatusSchema,
  activeVersion: z.string(),
  sessionCount: z.number().int().min(0),
  lastActivityAt: timestampSchema.optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

// =============================================================================
// Type Exports
// =============================================================================

export type ProjectStatusSchema = z.infer<typeof projectStatusSchema>;
export type ProjectTypeSchema = z.infer<typeof projectTypeSchema>;
export type VersionStatusSchema = z.infer<typeof versionStatusSchema>;
export type GitHubInfoSchemaType = z.infer<typeof gitHubInfoSchema>;
export type TechStackSchemaType = z.infer<typeof techStackSchema>;
export type ProjectSettingsSchemaType = z.infer<typeof projectSettingsSchema>;
export type ProjectVersionSchemaType = z.infer<typeof projectVersionSchema>;
export type ProjectCreateSchemaType = z.infer<typeof projectCreateSchema>;
export type ProjectUpdateSchemaType = z.infer<typeof projectUpdateSchema>;
export type ProjectSchemaType = z.infer<typeof projectSchema>;
export type ProjectSummarySchemaType = z.infer<typeof projectSummarySchema>;
