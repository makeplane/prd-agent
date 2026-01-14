import { getOAuthConfig, createOAuthApi } from "./lib/helpers";
import {
  saveCredentials,
  getCredentialsForWorkspace,
  listWorkspaces,
} from "./lib/store";
import { handleWebhook } from "./lib/webhook-handler";
import { getOAuthSuccessTemplate } from "./lib/templates";
import { StoredCredentials, AgentRunUserPromptWebhook } from "./lib/types";

/**
 * Router function for handling all requests
 */
async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  console.log(`${method} ${path}`);

  try {
    // Root endpoint
    if (path === "/" && method === "GET") {
      return new Response("PRD Agent says hello! 📄", { status: 200 });
    }

    // OAuth setup endpoint - redirects to Plane authorization
    if (path === "/oauth/setup" && method === "GET") {
      const config = getOAuthConfig(env);
      const oauthApi = createOAuthApi(config);
      const consentUrl = oauthApi.getAuthorizationUrl("code", "oauth_setup");
      return Response.redirect(consentUrl, 302);
    }

    // OAuth callback endpoint - handles the authorization callback
    if (path === "/oauth/callback" && method === "GET") {
      const code = url.searchParams.get("code");
      const appInstallationId = url.searchParams.get("app_installation_id");

      if (!code || !appInstallationId) {
        return new Response("Missing required parameters", { status: 400 });
      }

      const config = getOAuthConfig(env);
      const oauthApi = createOAuthApi(config);

      // Get bot token using client credentials
      const tokenResponse = await oauthApi.getBotToken(appInstallationId);

      // Get app installation details
      const appInstallations = await oauthApi.getAppInstallations(
        tokenResponse.access_token,
        appInstallationId,
      );

      if (!appInstallations.length) {
        return new Response(
          `No app installations found for app installation ID ${appInstallationId}`,
          { status: 404 },
        );
      }

      const appInstallation = appInstallations[0];

      const credentials: StoredCredentials = {
        app_installation_id: appInstallationId,
        access_token: tokenResponse.access_token,
        bot_user_id: appInstallation.app_bot,
        workspace_id: appInstallation.workspace,
        workspace_slug: appInstallation.workspace_detail.slug,
        expires_at: (tokenResponse.expires_in || 3600) + Date.now() / 1000,
      };

      // Store credentials
      await saveCredentials(env, credentials);

      const htmlResponse = getOAuthSuccessTemplate({
        workspace_id: credentials.workspace_id,
        workspace_slug: credentials.workspace_slug,
        app_installation_id: credentials.app_installation_id,
        plane_base_url: config.PLANE_BASE_APP_URL,
      });

      return new Response(htmlResponse, {
        headers: { "Content-Type": "text/html" },
      });
    }

    // Webhook processing endpoint
    if (path === "/webhook" && method === "POST") {
      if (!env.OPENAI_API_KEY) {
        return new Response("OpenAI API key not configured", { status: 500 });
      }

      const webhook = (await request.json()) as {
        event?: string;
        workspace_id?: string;
        data?: AgentRunUserPromptWebhook;
      };

      console.log("Received webhook:", {
        event: webhook.event,
        workspace_id: webhook.workspace_id,
        type: webhook.data?.type,
      });

      // Check if this is an agent_run_user_prompt webhook
      const webhookData = webhook.data as unknown as AgentRunUserPromptWebhook;

      if (webhookData.type !== "agent_run_activity") {
        console.log("Not an agent_run_activity webhook, skipping");
        return new Response(
          JSON.stringify({ message: "Webhook type not handled" }),
          { headers: { "Content-Type": "application/json" } },
        );
      }

      const workspaceId = webhookData.workspace_id;
      if (!workspaceId) {
        return new Response("workspace_id missing from webhook", {
          status: 400,
        });
      }

      // Get stored credentials for this workspace
      const storedCreds = await getCredentialsForWorkspace(env, workspaceId);
      console.log("Stored credentials:", storedCreds);
      if (!storedCreds) {
        return new Response(
          `No credentials found for workspace ${workspaceId}`,
          { status: 404 },
        );
      }

      // Process the webhook
      const config = getOAuthConfig(env);
      await handleWebhook(
        "agent_run_user_prompt",
        webhookData,
        storedCreds,
        config,
        env,
      );

      return new Response(
        JSON.stringify({
          message: "Webhook processed successfully",
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Health check endpoint
    if (path === "/health" && method === "GET") {
      return new Response(
        JSON.stringify({
          status: "healthy",
          service: "prd-agent",
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // List workspaces endpoint (for debugging)
    if (path === "/workspaces" && method === "GET") {
      const workspaces = await listWorkspaces(env);

      return new Response(
        JSON.stringify({
          workspaces,
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Default response for unmatched routes
    return new Response("Not Found", { status: 404 });
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    return handleRequest(request, env);
  },
} satisfies ExportedHandler<Env>;
