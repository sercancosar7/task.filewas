/**
 * Skill Type Definitions
 * @module @task-filewas/shared/types/skill
 */

// =============================================================================
// Skill Type Enum
// =============================================================================

export type SkillCategory =
  | 'coding'
  | 'testing'
  | 'backend'
  | 'frontend'
  | 'security'
  | 'workflow'
  | 'documentation'
  | 'architecture'
  | 'database'
  | 'custom';

export type SkillSourceType =
  | 'ecc'
  | 'project'
  | 'user'
  | 'plugin';

// =============================================================================
// Skill Configuration
// =============================================================================

export interface SkillConfig {
  id: string;
  name: string;
  description: string;
  category: SkillCategory;
  sourceType: SkillSourceType;
  command: string | undefined;
  systemPrompt: string;
  filePath: string;
  enabled: boolean;
  modelPreference: 'claude' | 'glm' | 'auto' | undefined;
  requiredTools: string[] | undefined;
  tags: string[];
  version: string | undefined;
  author: string | undefined;
}

export interface SkillSummary {
  id: string;
  name: string;
  description: string;
  category: SkillCategory;
  sourceType: SkillSourceType;
  command?: string;
  enabled: boolean;
  tags: string[];
}

// =============================================================================
// Skill Operations
// =============================================================================

export interface SkillCreate {
  name: string;
  description: string;
  category: SkillCategory;
  systemPrompt: string;
  command?: string;
  modelPreference?: 'claude' | 'glm' | 'auto';
  requiredTools?: string[];
  tags?: string[];
}

export interface SkillUpdate {
  name?: string;
  description?: string;
  category?: SkillCategory;
  systemPrompt?: string;
  command?: string;
  modelPreference?: 'claude' | 'glm' | 'auto';
  requiredTools?: string[];
  tags?: string[];
  enabled?: boolean;
}

// =============================================================================
// Built-in Skills
// =============================================================================

export interface BuiltInSkill {
  id: string;
  name: string;
  description: string;
  category: SkillCategory;
  command?: string;
}

export const BUILT_IN_SKILLS: BuiltInSkill[] = [
  { id: 'coding-standards', name: 'Coding Standards', description: 'TypeScript/JavaScript best practices', category: 'coding' },
  { id: 'tdd-workflow', name: 'TDD Workflow', description: 'Test-driven development methodology', category: 'testing', command: '/tdd' },
  { id: 'go-patterns', name: 'Go Patterns', description: 'Idiomatic Go patterns', category: 'coding' },
  { id: 'backend-patterns', name: 'Backend Patterns', description: 'API, database, caching patterns', category: 'backend' },
  { id: 'frontend-patterns', name: 'Frontend Patterns', description: 'React, Next.js, state management', category: 'frontend' },
  { id: 'security-review', name: 'Security Review', description: 'Vulnerability detection checklist', category: 'security', command: '/security-review' },
  { id: 'postgres-patterns', name: 'PostgreSQL Patterns', description: 'DB optimization, indexing', category: 'database' },
  { id: 'continuous-learning', name: 'Continuous Learning', description: 'Auto pattern extraction', category: 'workflow' },
  { id: 'update-docs', name: 'Update Docs', description: 'Documentation sync', category: 'documentation', command: '/update-docs' },
  { id: 'e2e', name: 'E2E Testing', description: 'Playwright end-to-end tests', category: 'testing', command: '/e2e' },
  { id: 'planner', name: 'Planner', description: 'Implementation planning', category: 'architecture', command: '/plan' },
  { id: 'architect', name: 'Architect', description: 'System design decisions', category: 'architecture' },
];
