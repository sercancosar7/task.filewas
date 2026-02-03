/**
 * Project type definitions
 * @module @task-filewas/shared/types/project
 */

import type { BaseEntity } from './index';

/**
 * Project status enumeration
 */
export type ProjectStatus = 'active' | 'archived' | 'deleted';

/**
 * Project type based on tech stack
 */
export type ProjectType =
  | 'web'
  | 'backend'
  | 'fullstack'
  | 'mobile'
  | 'cli'
  | 'library'
  | 'monorepo'
  | 'other';

/**
 * Version information for a project
 */
export interface ProjectVersion {
  /** Semantic version (e.g., "0.1.0") */
  version: string;
  /** Version description */
  description?: string;
  /** When this version was created */
  createdAt: string;
  /** Current phase in this version */
  currentPhase: number;
  /** Total phases in this version */
  totalPhases: number;
  /** Version status */
  status: 'draft' | 'active' | 'completed';
}

/**
 * GitHub repository information
 */
export interface GitHubInfo {
  /** Repository owner */
  owner: string;
  /** Repository name */
  repo: string;
  /** Full repository URL */
  url: string;
  /** Default branch (e.g., "main") */
  defaultBranch: string;
  /** Whether auto-push is enabled */
  autoPush: boolean;
}

/**
 * Project settings
 */
export interface ProjectSettings {
  /** Default model for this project */
  defaultModel?: 'claude' | 'glm' | 'auto';
  /** Default permission mode */
  defaultPermissionMode?: 'safe' | 'ask' | 'auto';
  /** Default thinking level */
  defaultThinkingLevel?: 'off' | 'think' | 'max';
  /** Auto-commit after phase completion */
  autoCommit?: boolean;
  /** Auto-push after commit */
  autoPush?: boolean;
  /** Custom labels for this project */
  customLabels?: string[];
  /** Custom statuses for sessions */
  customStatuses?: Array<{
    id: string;
    name: string;
    icon: string;
    color: string;
  }>;
}

/**
 * Project tech stack information
 */
export interface TechStack {
  /** Programming languages */
  languages: string[];
  /** Frameworks */
  frameworks: string[];
  /** Databases */
  databases?: string[];
  /** UI libraries */
  uiLibraries?: string[];
  /** Build tools */
  buildTools?: string[];
  /** Testing frameworks */
  testingFrameworks?: string[];
  /** Other notable dependencies */
  other?: string[];
}

/**
 * Full Project interface
 */
export interface Project extends BaseEntity {
  /** Project name */
  name: string;
  /** Project description */
  description?: string;
  /** Project type */
  type: ProjectType;
  /** Project status */
  status: ProjectStatus;
  /** File system path to project root */
  path: string;
  /** GitHub repository information */
  github?: GitHubInfo;
  /** Tech stack detected or configured */
  techStack?: TechStack;
  /** Project versions */
  versions: ProjectVersion[];
  /** Active version string */
  activeVersion: string;
  /** Project settings */
  settings: ProjectSettings;
  /** Total sessions in this project */
  sessionCount: number;
  /** Last activity timestamp */
  lastActivityAt?: string;
  /** Project icon or emoji */
  icon?: string;
  /** Project color for UI */
  color?: string;
  /** Tags for organization */
  tags?: string[];
}

/**
 * Data required to create a new project
 */
export interface ProjectCreate {
  /** Project name (required) */
  name: string;
  /** Project description */
  description?: string;
  /** Project type */
  type?: ProjectType;
  /** File system path (optional - will be generated if not provided) */
  path?: string;
  /** GitHub repository URL for import */
  githubUrl?: string;
  /** Initial tech stack (optional - will be detected) */
  techStack?: Partial<TechStack>;
  /** Initial settings */
  settings?: Partial<ProjectSettings>;
  /** Project icon or emoji */
  icon?: string;
  /** Project color for UI */
  color?: string;
  /** Tags for organization */
  tags?: string[];
}

/**
 * Data for updating an existing project
 */
export interface ProjectUpdate {
  /** Updated project name */
  name?: string;
  /** Updated description */
  description?: string;
  /** Updated project type */
  type?: ProjectType;
  /** Updated status */
  status?: ProjectStatus;
  /** Updated file system path */
  path?: string;
  /** Updated GitHub URL */
  githubUrl?: string;
  /** Updated git remote */
  gitRemote?: string;
  /** Updated settings */
  settings?: Partial<ProjectSettings>;
  /** Updated GitHub info */
  github?: Partial<GitHubInfo>;
  /** Updated tech stack */
  techStack?: Partial<TechStack>;
  /** Updated icon */
  icon?: string;
  /** Updated color */
  color?: string;
  /** Updated tags */
  tags?: string[];
}

/**
 * Project summary for list views
 */
export interface ProjectSummary {
  /** Project ID */
  id: string;
  /** Project name */
  name: string;
  /** Project description */
  description?: string;
  /** Project type */
  type: ProjectType;
  /** Project status */
  status: ProjectStatus;
  /** Active version */
  activeVersion: string;
  /** Number of sessions */
  sessionCount: number;
  /** Last activity */
  lastActivityAt?: string;
  /** Project icon */
  icon?: string;
  /** Project color */
  color?: string;
  /** Tags */
  tags?: string[];
}

/**
 * Project with version details
 */
export interface ProjectWithVersion extends Project {
  /** Current version details */
  currentVersion: ProjectVersion;
}
