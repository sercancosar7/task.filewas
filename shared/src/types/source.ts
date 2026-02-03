/**
 * Source Types
 * MCP, API, and Local source definitions
 * @module @task-filewas/shared/types/source
 */

// =============================================================================
// Source Type Enum
// =============================================================================

/**
 * Type of external data source
 */
export type SourceType = 'mcp' | 'api' | 'local';

/**
 * MCP server types
 */
export type MCPServerType =
  | 'memory'      // Memory MCP for knowledge graph
  | 'context7'    // Context7 for documentation lookup
  | 'playwright'  // Playwright for browser automation
  | 'puppeteer'   // Puppeteer for web scraping
  | 'sequential-thinking' // Sequential thinking MCP
  | 'custom';     // Custom MCP server

/**
 * API authentication types
 */
export type APIAuthType =
  | 'none'        // No authentication
  | 'bearer'      // Bearer token
  | 'basic'       // Basic auth
  | 'api-key'     // API key in header
  | 'oauth2';     // OAuth2 flow

/**
 * Local folder types
 */
export type LocalFolderType =
  | 'project'     // Project source directory
  | 'docs'        // Documentation folder
  | 'tests'       // Test files
  | 'config'      // Configuration files
  | 'custom';     // Custom folder

// =============================================================================
// MCP Source Configuration
// =============================================================================

/**
 * MCP source configuration
 */
export interface MCPSourceConfig {
  /** MCP server type */
  type: MCPServerType;
  /** MCP server name (unique identifier) */
  name: string;
  /** Command to start the MCP server */
  command?: string;
  /** Command arguments */
  args?: string[];
  /** Environment variables for the MCP server */
  env?: Record<string, string>;
  /** MCP server endpoint URL (if using HTTP transport) */
  endpoint?: string;
  /** Is this MCP server enabled */
  enabled: boolean;
}

// =============================================================================
// API Source Configuration
// =============================================================================

/**
 * API source configuration
 */
export interface APISourceConfig {
  /** API base URL */
  baseUrl: string;
  /** API name (unique identifier) */
  name: string;
  /** Authentication type */
  authType: APIAuthType;
  /** Authentication credentials (stored securely) */
  authConfig?: APIAuthConfig;
  /** Default headers to include in requests */
  headers?: Record<string, string>;
  /** Rate limiting (requests per minute) */
  rateLimit?: number;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Is this API source enabled */
  enabled: boolean;
}

/**
 * API authentication configuration
 */
export interface APIAuthConfig {
  /** For bearer/bearer: token value */
  token?: string;
  /** For basic: username */
  username?: string;
  /** For basic: password (stored encrypted) */
  password?: string;
  /** For api-key: header name */
  keyHeader?: string;
  /** For api-key: key value */
  keyValue?: string;
  /** For oauth2: access token */
  accessToken?: string;
  /** For oauth2: refresh token */
  refreshToken?: string;
  /** For oauth2: token expiry */
  expiresAt?: string;
}

// =============================================================================
// Local Source Configuration
// =============================================================================

/**
 * Local folder source configuration
 */
export interface LocalSourceConfig {
  /** Absolute path to folder */
  path: string;
  /** Folder type classification */
  type: LocalFolderType;
  /** Source name (unique identifier) */
  name: string;
  /** File patterns to include (glob patterns) */
  include?: string[];
  /** File patterns to exclude (glob patterns) */
  exclude?: string[];
  /** Watch for changes */
  watch?: boolean;
  /** Is this source enabled */
  enabled: boolean;
}

// =============================================================================
// Unified Source Configuration
// =============================================================================

/**
 * Union type for all source configurations
 */
export type SourceConfig = MCPSourceConfig | APISourceConfig | LocalSourceConfig;

/**
 * Source entry with metadata
 */
export interface Source {
  /** Unique source ID */
  id: string;
  /** Source type discriminator */
  type: SourceType;
  /** Source name */
  name: string;
  /** Type-specific configuration */
  config: SourceConfig;
  /** Is this source enabled */
  enabled: boolean;
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt?: string;
  /** Last successful connection */
  lastConnectedAt?: string;
  /** Connection status */
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  /** Error message if status is error */
  error?: string;
}

// =============================================================================
// Source Operations
// =============================================================================

/**
 * Source creation request
 */
export interface SourceCreate {
  /** Source type */
  type: SourceType;
  /** Source name */
  name: string;
  /** Type-specific configuration */
  config: SourceConfig;
}

/**
 * Source update request
 */
export interface SourceUpdate {
  /** Source name */
  name?: string;
  /** Type-specific configuration */
  config?: Partial<MCPSourceConfig> | Partial<APISourceConfig> | Partial<LocalSourceConfig>;
  /** Enabled status */
  enabled?: boolean;
}

/**
 * Source summary (for list views)
 */
export interface SourceSummary {
  /** Source ID */
  id: string;
  /** Source type */
  type: SourceType;
  /** Source name */
  name: string;
  /** Enabled status */
  enabled: boolean;
  /** Connection status */
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
}

/**
 * Source connection test result
 */
export interface SourceConnectionTest {
  /** Success status */
  success: boolean;
  /** Response time in milliseconds */
  latency?: number;
  /** Error message if failed */
  error?: string;
  /** Additional info */
  info?: Record<string, unknown>;
}

// =============================================================================
// MCP Server Presets
// =============================================================================

/**
 * Built-in MCP server presets
 */
export const MCP_PRESETS: Record<MCPServerType, Partial<MCPSourceConfig>> = {
  memory: {
    type: 'memory',
    name: 'Memory MCP',
    enabled: false,
  },
  context7: {
    type: 'context7',
    name: 'Context7',
    enabled: false,
  },
  playwright: {
    type: 'playwright',
    name: 'Playwright',
    enabled: false,
  },
  puppeteer: {
    type: 'puppeteer',
    name: 'Puppeteer',
    enabled: false,
  },
  'sequential-thinking': {
    type: 'sequential-thinking',
    name: 'Sequential Thinking',
    enabled: false,
  },
  custom: {
    type: 'custom',
    name: 'Custom MCP',
    enabled: false,
  },
} as const;
