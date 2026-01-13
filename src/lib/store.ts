import { StoredCredentials } from "./types";

/**
 * Storage utilities for Weather Bot Cloudflare Worker
 *
 * This module handles credential storage and retrieval using Cloudflare KV
 */

/**
 * Save credentials for a workspace
 */
export async function saveCredentials(
  env: Env,
  credentials: StoredCredentials
): Promise<void> {
  if (!env.CREDENTIALS_KV) {
    throw new Error("CREDENTIALS_KV binding not configured");
  }

  // Store by workspace ID for webhook lookups
  await env.CREDENTIALS_KV.put(
    `workspace:${credentials.workspace_id}`,
    JSON.stringify(credentials)
  );

  // Store by app installation ID for OAuth lookups
  await env.CREDENTIALS_KV.put(
    `app_installation:${credentials.app_installation_id}`,
    JSON.stringify(credentials)
  );
}

/**
 * Get credentials for a workspace
 */
export async function getCredentialsForWorkspace(
  env: Env,
  workspaceId: string
): Promise<StoredCredentials | null> {
  if (!env.CREDENTIALS_KV) {
    throw new Error("CREDENTIALS_KV binding not configured");
  }

  const stored = await env.CREDENTIALS_KV.get(`workspace:${workspaceId}`);
  return stored ? (JSON.parse(stored) as StoredCredentials) : null;
}

/**
 * Get credentials by app installation ID
 */
export async function getCredentialsByAppInstallation(
  env: Env,
  appInstallationId: string
): Promise<StoredCredentials | null> {
  if (!env.CREDENTIALS_KV) {
    throw new Error("CREDENTIALS_KV binding not configured");
  }

  const stored = await env.CREDENTIALS_KV.get(
    `app_installation:${appInstallationId}`
  );
  return stored ? (JSON.parse(stored) as StoredCredentials) : null;
}

/**
 * List all workspaces with stored credentials
 */
export async function listWorkspaces(env: Env): Promise<string[]> {
  if (!env.CREDENTIALS_KV) {
    throw new Error("CREDENTIALS_KV binding not configured");
  }

  const list = await env.CREDENTIALS_KV.list({ prefix: "workspace:" });
  return list.keys.map((key: { name: string }) =>
    key.name.replace("workspace:", "")
  );
}

