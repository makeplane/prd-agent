import { AgentClient } from "./agent/agentClient";
import { createOAuthApi } from "./helpers";
import { saveCredentials } from "./store";
import {
  StoredCredentials,
  AgentRunUserPromptWebhook,
  OAuthConfig,
} from "./types";

/**
 * Handle the agent_run_user_prompt webhook event
 * This is triggered when a user mentions the agent in a comment
 */
export async function handleAgentRunUserPromptWebhook(
  webhook: AgentRunUserPromptWebhook,
  credentials: StoredCredentials,
  config: OAuthConfig,
  env: Env
): Promise<void> {
  console.log("Processing agent_run_user_prompt webhook:", {
    agent_run_id: webhook.agent_run.id,
    workspace_id: webhook.workspace_id,
    project_id: webhook.project_id,
    issue_id: webhook.issue_id,
  });

  // Check if token is expired and refresh if needed
  if (credentials.expires_at <= Date.now() / 1000) {
    console.log(
      `Token expired for workspace ${webhook.workspace_id}, refreshing token`
    );
    const oauthApi = createOAuthApi(config);
    const tokenResponse = await oauthApi.getBotToken(
      credentials.app_installation_id
    );

    credentials.access_token = tokenResponse.access_token;
    credentials.expires_at =
      (tokenResponse.expires_in || 3600) + Date.now() / 1000;

    await saveCredentials(env, credentials);
  }

  // Extract the user prompt from the activity content
  const activityContent = webhook.agent_run_activity.content;
  const userPrompt = activityContent.body || "";

  // Build a comprehensive prompt that includes issue context
  const issueId = webhook.issue_id;
  const projectId = webhook.project_id;

  // Create a prompt that instructs the agent to create a PRD for the current issue
  const enhancedPrompt = issueId
    ? `Create a PRD for the current issue. 
Issue ID: ${issueId}
Project ID: ${projectId || "not provided"}
${userPrompt ? `User request: ${userPrompt}` : ""}

Please follow the workflow:
1. Get the issue details using the issue ID
2. Generate a comprehensive PRD based on the issue title and description
3. Create a new page in Plane with the PRD content
4. Attach the page link to the issue

Start by getting the issue details.`
    : userPrompt || "Please create a PRD for the current issue.";

  // Create agent client and process the prompt
  const agentClient = new AgentClient(
    credentials.access_token,
    config.PLANE_BASE_URL,
    env.OPENAI_API_KEY
  );

  await agentClient.handleUserPrompt(
    webhook.agent_run.id,
    credentials.workspace_slug,
    enhancedPrompt,
    projectId,
    issueId
  );
}

/**
 * Main webhook handler
 * Routes webhooks to appropriate handlers based on event type
 */
export async function handleWebhook(
  event: string,
  data: AgentRunUserPromptWebhook,
  credentials: StoredCredentials,
  config: OAuthConfig,
  env: Env
): Promise<void> {
  console.log("Handling webhook event:", event);

  if (event === "agent_run_user_prompt") {
    await handleAgentRunUserPromptWebhook(data, credentials, config, env);
  } else {
    console.log(`Unhandled event type: ${event}`);
  }
}
