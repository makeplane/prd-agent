/**
 * Error thrown when an unreachable case is encountered in an exhaustive switch statement
 */
export class UnreachableCaseError extends Error {
  constructor(value: unknown) {
    super(`Unreachable case: ${value}`);
    this.name = "UnreachableCaseError";
  }
}

/**
 * The name of a tool that can be executed by the agent
 */
export type ToolName = "getIssueDetails" | "createPRD" | "createPage" | "attachPageToIssue";

/**
 * Check if a string is a valid tool name
 * @param value - The string to check
 * @returns True if the string is a valid tool name, false otherwise
 */
export const isToolName = (value: string): value is ToolName => {
  return (
    value === "getIssueDetails" || 
    value === "createPRD" || 
    value === "createPage" || 
    value === "attachPageToIssue"
  );
};

/**
 * Stored credentials for Plane workspace
 */
export interface StoredCredentials {
  app_installation_id: string;
  access_token: string;
  bot_user_id: string;
  workspace_id: string;
  workspace_slug: string;
  expires_at: number;
}

/**
 * Agent run activity from webhook
 */
export interface AgentRunActivity {
  id: string;
  agent_run: string;
  content: {
    type: string;
    body?: string;
    action?: string;
    parameters?: Record<string, string>;
  };
  content_metadata?: Record<string, unknown>;
  ephemeral: boolean;
  signal: string;
  signal_metadata?: Record<string, unknown>;
  comment?: string;
  actor?: string;
  type: string;
  project?: string;
  workspace: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Agent run from webhook
 */
export interface AgentRun {
  id: string;
  agent_user: string;
  comment?: string;
  source_comment?: string;
  creator: string;
  stopped_at?: string;
  stopped_by?: string;
  started_at: string;
  ended_at?: string;
  external_link?: string;
  issue?: string;
  workspace: string;
  project?: string;
  status: string;
  error_metadata?: Record<string, unknown>;
  type: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Webhook event payload for agent_run_user_prompt
 */
export interface AgentRunUserPromptWebhook {
  action: string;
  agent_run_activity: AgentRunActivity;
  agent_run: AgentRun;
  agent_user_id: string;
  app_client_id: string;
  comment_id: string;
  issue_id: string;
  project_id: string;
  workspace_id: string;
  type: "agent_run_activity";
}

/**
 * Generic webhook event structure
 */
export interface WebhookEvent {
  event: string;
  action: string;
  webhook_id: string;
  workspace_id: string;
  data: AgentRunUserPromptWebhook | Record<string, unknown>;
  activity?: Record<string, unknown>;
}

/**
 * OAuth configuration
 */
export interface OAuthConfig {
  PLANE_CLIENT_ID: string;
  PLANE_CLIENT_SECRET: string;
  PLANE_BASE_URL: string;
  SERVER_URL: string;
  PLANE_REDIRECT_URI: string;
}
