/**
 * Supabase MCP Client
 * Model Context Protocol integration for Supabase
 * 
 * NOVA Framework v6.0 - ANTARES Implementation
 * January 2026 - MCP-First Architecture
 * 
 * Connects to official Supabase MCP server:
 * - Database operations (execute_sql, list_tables, apply_migration)
 * - Edge Functions (deploy, invoke)
 * - Storage operations
 * - Project management
 * 
 * MCP Server URL: https://mcp.supabase.com
 * Auth: Personal Access Token (PAT) or OAuth 2.1
 */

export interface SupabaseMCPConfig {
  accessToken: string;
  projectRef?: string;      // Scope to specific project
  readOnly?: boolean;       // Restrict to read-only operations
  features?: SupabaseFeature[];
}

export type SupabaseFeature = 
  | 'account'
  | 'database'
  | 'debugging'
  | 'development'
  | 'docs'
  | 'functions'
  | 'storage'
  | 'branching';

export interface MCPResult<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

export interface TableInfo {
  name: string;
  schema: string;
  rowCount?: number;
  columns: Array<{
    name: string;
    type: string;
    nullable: boolean;
    defaultValue?: string;
  }>;
}

export interface QueryResult {
  rows: Record<string, unknown>[];
  rowCount: number;
  fields: Array<{ name: string; type: string }>;
}

export interface MigrationResult {
  version: string;
  name: string;
  appliedAt: string;
}

export interface EdgeFunctionInfo {
  id: string;
  name: string;
  slug: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// MCP CLIENT
// =============================================================================

/**
 * Supabase MCP Client
 * Communicates with Supabase MCP server for database and project operations
 */
export class SupabaseMCPClient {
  private baseUrl = 'https://mcp.supabase.com';
  private config: SupabaseMCPConfig;

  constructor(config: SupabaseMCPConfig) {
    this.config = config;
  }

  /**
   * Build MCP server URL with configuration
   */
  getServerUrl(): string {
    const params = new URLSearchParams();
    
    if (this.config.projectRef) {
      params.set('project_ref', this.config.projectRef);
    }
    
    if (this.config.readOnly) {
      params.set('read_only', 'true');
    }
    
    if (this.config.features && this.config.features.length > 0) {
      params.set('features', this.config.features.join(','));
    }
    
    const queryString = params.toString();
    return queryString ? `${this.baseUrl}?${queryString}` : this.baseUrl;
  }

  /**
   * Make MCP tool call
   */
  private async callTool<T>(
    toolName: string,
    args: Record<string, unknown> = {}
  ): Promise<MCPResult<T>> {
    try {
      const response = await fetch(this.getServerUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.accessToken}`,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'tools/call',
          params: {
            name: toolName,
            arguments: args,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, message: `❌ MCP error: ${error}` };
      }

      const result = await response.json() as { error?: { message: string }; result?: T };
      
      if (result.error) {
        return { success: false, message: `❌ ${result.error.message}` };
      }

      return { success: true, message: '✅ Success', data: result.result };
    } catch (error) {
      return { success: false, message: `❌ Connection failed: ${(error as Error).message}` };
    }
  }

  // ===========================================================================
  // DATABASE OPERATIONS
  // ===========================================================================

  /**
   * Execute SQL query
   * Uses read-only Postgres user if readOnly is enabled
   */
  async executeSql(query: string): Promise<MCPResult<QueryResult>> {
    if (this.config.readOnly && this.isMutatingQuery(query)) {
      return { 
        success: false, 
        message: '❌ Read-only mode: Cannot execute mutating queries' 
      };
    }

    return this.callTool<QueryResult>('execute_sql', { query });
  }

  /**
   * List all tables in the database
   */
  async listTables(schema: string = 'public'): Promise<MCPResult<TableInfo[]>> {
    return this.callTool<TableInfo[]>('list_tables', { schema });
  }

  /**
   * Get table schema/structure
   */
  async getTableSchema(tableName: string, schema: string = 'public'): Promise<MCPResult<TableInfo>> {
    return this.callTool<TableInfo>('get_table_schema', { table: tableName, schema });
  }

  /**
   * Apply a migration
   */
  async applyMigration(sql: string, name: string): Promise<MCPResult<MigrationResult>> {
    if (this.config.readOnly) {
      return { success: false, message: '❌ Read-only mode: Cannot apply migrations' };
    }

    return this.callTool<MigrationResult>('apply_migration', { sql, name });
  }

  /**
   * List applied migrations
   */
  async listMigrations(): Promise<MCPResult<MigrationResult[]>> {
    return this.callTool<MigrationResult[]>('list_migrations', {});
  }

  // ===========================================================================
  // EDGE FUNCTIONS
  // ===========================================================================

  /**
   * Deploy an Edge Function
   */
  async deployEdgeFunction(
    name: string,
    code: string,
    options: { importMap?: string; verifyJwt?: boolean } = {}
  ): Promise<MCPResult<EdgeFunctionInfo>> {
    if (this.config.readOnly) {
      return { success: false, message: '❌ Read-only mode: Cannot deploy functions' };
    }

    return this.callTool<EdgeFunctionInfo>('deploy_edge_function', {
      name,
      code,
      ...options,
    });
  }

  /**
   * List Edge Functions
   */
  async listEdgeFunctions(): Promise<MCPResult<EdgeFunctionInfo[]>> {
    return this.callTool<EdgeFunctionInfo[]>('list_edge_functions', {});
  }

  /**
   * Invoke an Edge Function
   */
  async invokeEdgeFunction(
    name: string,
    body?: unknown,
    headers?: Record<string, string>
  ): Promise<MCPResult<unknown>> {
    return this.callTool('invoke_edge_function', { name, body, headers });
  }

  // ===========================================================================
  // PROJECT MANAGEMENT
  // ===========================================================================

  /**
   * List projects (requires account feature)
   */
  async listProjects(): Promise<MCPResult<Array<{ id: string; name: string; region: string }>>> {
    return this.callTool('list_projects', {});
  }

  /**
   * Get project details
   */
  async getProject(projectRef?: string): Promise<MCPResult<{
    id: string;
    name: string;
    region: string;
    status: string;
    database: { host: string; version: string };
  }>> {
    return this.callTool('get_project', { project_ref: projectRef || this.config.projectRef });
  }

  // ===========================================================================
  // STORAGE OPERATIONS
  // ===========================================================================

  /**
   * List storage buckets
   */
  async listBuckets(): Promise<MCPResult<Array<{ id: string; name: string; public: boolean }>>> {
    return this.callTool('list_buckets', {});
  }

  /**
   * List files in a bucket
   */
  async listFiles(
    bucket: string,
    path: string = ''
  ): Promise<MCPResult<Array<{ name: string; size: number; createdAt: string }>>> {
    return this.callTool('list_files', { bucket, path });
  }

  // ===========================================================================
  // BRANCHING (Experimental - requires paid plan)
  // ===========================================================================

  /**
   * Create a database branch
   */
  async createBranch(name: string): Promise<MCPResult<{ id: string; name: string }>> {
    if (this.config.readOnly) {
      return { success: false, message: '❌ Read-only mode: Cannot create branches' };
    }

    return this.callTool('create_branch', { name });
  }

  /**
   * List database branches
   */
  async listBranches(): Promise<MCPResult<Array<{ id: string; name: string; status: string }>>> {
    return this.callTool('list_branches', {});
  }

  /**
   * Merge a branch
   */
  async mergeBranch(branchId: string): Promise<MCPResult<{ merged: boolean }>> {
    if (this.config.readOnly) {
      return { success: false, message: '❌ Read-only mode: Cannot merge branches' };
    }

    return this.callTool('merge_branch', { branch_id: branchId });
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  /**
   * Check if query is mutating (INSERT, UPDATE, DELETE, etc.)
   */
  private isMutatingQuery(query: string): boolean {
    const mutatingKeywords = [
      'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER', 
      'TRUNCATE', 'GRANT', 'REVOKE', 'MERGE'
    ];
    
    const upperQuery = query.trim().toUpperCase();
    return mutatingKeywords.some(keyword => upperQuery.startsWith(keyword));
  }

  /**
   * Get configuration info for display
   */
  getConfigInfo(): string {
    let info = '🗄️ Supabase MCP Configuration\n\n';
    info += `Server: ${this.baseUrl}\n`;
    info += `Project: ${this.config.projectRef || 'All projects'}\n`;
    info += `Mode: ${this.config.readOnly ? '🔒 Read-only' : '✏️ Read-write'}\n`;
    
    if (this.config.features) {
      info += `Features: ${this.config.features.join(', ')}\n`;
    }
    
    return info;
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create Supabase MCP client from environment or config
 */
export function createSupabaseMCPClient(
  config?: Partial<SupabaseMCPConfig>
): SupabaseMCPClient | null {
  const accessToken = config?.accessToken || process.env.SUPABASE_ACCESS_TOKEN;
  
  if (!accessToken) {
    return null;
  }

  return new SupabaseMCPClient({
    accessToken,
    projectRef: config?.projectRef || process.env.SUPABASE_PROJECT_REF,
    readOnly: config?.readOnly ?? true, // Default to read-only for safety
    features: config?.features || ['database', 'docs', 'debugging'],
  });
}

/**
 * Get Supabase setup instructions
 */
export function getSupabaseSetupInfo(hasToken: boolean): string {
  let msg = '🗄️ Supabase MCP Setup\n\n';
  
  msg += `Status: ${hasToken ? '✅ Configured' : '❌ Not configured'}\n\n`;
  
  if (!hasToken) {
    msg += '📋 Setup:\n\n';
    msg += '1. Go to https://supabase.com/dashboard/account/tokens\n';
    msg += '2. Create a new access token\n';
    msg += '3. Run: /supabase_setup <token>\n\n';
    msg += 'Or set SUPABASE_ACCESS_TOKEN in environment\n\n';
  }
  
  msg += '📋 Commands:\n';
  msg += '/supabase_setup <token> - Set access token\n';
  msg += '/supabase_project <ref> - Scope to project\n';
  msg += '/supabase_tables - List tables\n';
  msg += '/supabase_query <sql> - Execute SQL\n';
  msg += '/supabase_migrate <name> <sql> - Apply migration\n';
  
  return msg;
}

