import { OAuthConfig } from "./types";
import { OAuthClient } from "@makeplane/plane-node-sdk/dist/client/oauth-client";

/**
 * Helper function to get environment variables with validation
 */
export function getRequiredEnv(env: Env, key: string): string {
  const value = env[key as keyof Env] as string;
  if (!value) {
    throw new Error(`${key} environment variable is required`);
  }
  return value;
}

/**
 * Helper function to get OAuth API configuration
 */
export function getOAuthConfig(env: Env): OAuthConfig {
  const PLANE_CLIENT_ID = getRequiredEnv(env, "PLANE_CLIENT_ID");
  const PLANE_CLIENT_SECRET = getRequiredEnv(env, "PLANE_CLIENT_SECRET");
  const PLANE_BASE_URL = getRequiredEnv(env, "PLANE_BASE_URL");
  const SERVER_URL = getRequiredEnv(env, "SERVER_URL");
  const PLANE_REDIRECT_URI = `${SERVER_URL}/oauth/callback`;

  return {
    PLANE_CLIENT_ID,
    PLANE_CLIENT_SECRET,
    PLANE_BASE_URL,
    SERVER_URL,
    PLANE_REDIRECT_URI,
  };
}
// Helper function to create OAuthApi instance
export function createOAuthApi(config: ReturnType<typeof getOAuthConfig>): OAuthClient {
	return new OAuthClient({
		baseUrl: config.PLANE_BASE_URL,
		clientId: config.PLANE_CLIENT_ID,
		clientSecret: config.PLANE_CLIENT_SECRET,
		redirectUri: config.PLANE_REDIRECT_URI,
	});
}
