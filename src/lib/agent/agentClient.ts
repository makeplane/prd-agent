import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/index";
import { PlaneClient, CreateAgentRunActivityRequest } from "@makeplane/plane-node-sdk";
import { getIssueDetails, createPRD, createPage, attachPageToIssue } from "./tools";
import { prompt } from "./prompt";
import { isToolName, ToolName, UnreachableCaseError } from "../types";

/**
 * Agent activity content type for internal processing
 */
type Content =
  | { type: "thought"; body: string }
  | {
      type: "action";
      action: ToolName;
      parameter: string | null;
      result?: string;
    }
  | { type: "response"; body: string }
  | { type: "elicitation"; body: string }
  | { type: "error"; body: string };

export class AgentClient {
  private planeClient: PlaneClient;
  private openai: OpenAI;
  private workspaceSlug?: string;
  private projectId?: string;
  private issueId?: string;
  
  // Store intermediate results to avoid parameter parsing issues
  private issueDetails?: { title: string; description: string };
  private prdContent?: string;
  private pageInfo?: { pageId: string; pageUrl: string; pageName: string };

  // Maximum number of iterations for the agent to prevent infinite loops
  private MAX_ITERATIONS = 10;

  constructor(accessToken: string, planeBaseUrl: string, openaiApiKey: string) {
    this.planeClient = new PlaneClient({
      baseUrl: planeBaseUrl,
      accessToken: accessToken,
    });
    this.openai = new OpenAI({
      apiKey: openaiApiKey,
    });
  }

  /**
   * Handle a user prompt by processing it through the agent.
   * @param agentRunId - The Plane agent run ID
   * @param workspaceSlug - The workspace slug
   * @param userPrompt - The user prompt
   * @param projectId - The project ID (optional)
   * @param issueId - The issue ID (optional)
   */
  public async handleUserPrompt(
    agentRunId: string,
    workspaceSlug: string,
    userPrompt: string,
    projectId?: string,
    issueId?: string
  ) {
    // Store context for tools
    this.workspaceSlug = workspaceSlug;
    this.projectId = projectId;
    this.issueId = issueId;
    // Generate more context for the LLM from previous activities in this agent run
    const activities = await this.generateMessagesFromPreviousActivities(
      agentRunId,
      workspaceSlug
    );

    const messages = [
      { role: "system", content: prompt },
      ...activities,
      userPrompt ? { role: "user", content: userPrompt } : undefined,
    ].filter(Boolean) as ChatCompletionMessageParam[];

    let taskComplete = false;
    let iterations = 0;

    while (!taskComplete && iterations < this.MAX_ITERATIONS) {
      iterations++;

      try {
        const response = await this.callOpenAI(messages);
        const content = this.mapResponseToActivityContent(response);

        if (content.type === "thought") {
          await this.createAgentActivity(agentRunId, workspaceSlug, {
            type: "thought",
            content: { type: "thought", body: content.body },
            project: projectId,
          });

          // Add to conversation history
          messages.push({ role: "assistant", content: response });

          // Continue the loop for next cycle
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } else if (content.type === "action") {
          const toolName = content.action;
          const parameter = content.parameter;

          // Build meaningful parameters for display based on stored state
          const actionParams = this.buildActionParameters(toolName);

          // PART 1: Create the action activity to inform the user that the agent is going to use the tool
          await this.createAgentActivity(agentRunId, workspaceSlug, {
            type: "action",
            content: {
              type: "action",
              action: `Using tool: ${toolName}`,
              parameters: actionParams,
            },
            project: projectId,
          });

          // PART 2: Execute the tool
          const toolResult = await this.executeAction({
            action: toolName,
            parameter,
            workspaceSlug: this.workspaceSlug,
            projectId: this.projectId || "",
            issueId: this.issueId,
          });

          // Add tool result to conversation for next LLM call
          messages.push({ role: "assistant", content: response });
          messages.push({
            role: "user",
            content: `Tool result: ${toolResult}`,
          });

          // Build updated parameters with result
          const resultParams = {
            ...actionParams,
            result: toolResult,
          };

          // PART 3: Create the result activity to inform the user that the tool has been executed
          await this.createAgentActivity(agentRunId, workspaceSlug, {
            type: "action",
            content: {
              type: "action",
              action: toolName,
              parameters: resultParams,
            },
            content_metadata: { result: toolResult },
            project: projectId,
          });

          // If attachPageToIssue was executed, stop the flow and send a final response
          if (toolName === "attachPageToIssue") {
            console.log("attachPageToIssue completed, stopping flow");
            
            // Use stored page info for the response
            let responseMessage = "✅ PRD has been successfully created and linked to the issue!";
            if (this.pageInfo) {
              responseMessage = `✅ PRD has been successfully created and linked to the issue! 📄`;
            }

            await this.createAgentActivity(agentRunId, workspaceSlug, {
              type: "response",
              content: { type: "response", body: responseMessage },
              signal: "continue",
              project: projectId,
            });
            
            // CRITICAL: Stop the loop immediately
            taskComplete = true;
            console.log("Flow stopped after attachPageToIssue");
          } else {
            // Continue the loop for next cycle
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        } else if (content.type === "response") {
          await this.createAgentActivity(agentRunId, workspaceSlug, {
            type: "response",
            content: { type: "response", body: content.body },
            signal: "continue",
            project: projectId,
          });
          taskComplete = true;
        } else if (content.type === "error") {
          await this.createAgentActivity(agentRunId, workspaceSlug, {
            type: "error",
            content: { type: "error", body: content.body },
            project: projectId,
          });
          taskComplete = true;
        } else if (content.type === "elicitation") {
          await this.createAgentActivity(agentRunId, workspaceSlug, {
            type: "elicitation",
            content: {
              type: "elicitation",
              body: content.body,
            },
            project: projectId,
          });
          taskComplete = true;
        }
      } catch (error) {
        const errorMessage = `Agent error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`;
        await this.createAgentActivity(agentRunId, workspaceSlug, {
          type: "error",
          content: { type: "error", body: errorMessage },
          project: projectId,
        });
        taskComplete = true;
      }
    }

    if (!taskComplete && iterations >= this.MAX_ITERATIONS) {
      const maxIterationsMessage =
        "The agent has reached the maximum number of iterations and will now stop.";
      await this.createAgentActivity(agentRunId, workspaceSlug, {
        type: "error",
        content: { type: "error", body: maxIterationsMessage },
        project: projectId,
      });
    }
  }

  /**
   * Create an agent activity using the Plane SDK
   */
  private async createAgentActivity(
    agentRunId: string,
    workspaceSlug: string,
    data: CreateAgentRunActivityRequest
  ): Promise<void> {
    console.log("Creating agent activity:", {
      runId: agentRunId,
      type: data.type,
      contentType: data.content.type,
    });

    await this.planeClient.agentRuns.activities.create(
      workspaceSlug,
      agentRunId,
      data
    );

    console.log("Agent activity created successfully");
  }

  /**
   * Map the response from the OpenAI API to content for an agent activity in Plane.
   *
   * @param response - The response from the OpenAI API
   * @returns The activity content
   */
  private mapResponseToActivityContent(response: string): Content {
    const typeToKeyword = {
      thought: "THINKING:",
      action: "ACTION:",
      response: "RESPONSE:",
      elicitation: "ELICITATION:",
      error: "ERROR:",
    } as const;

    const mappedType = Object.entries(typeToKeyword).find(([_, keyword]) =>
      response.startsWith(keyword)
    );
    const type = mappedType?.[0]
      ? (mappedType[0] as keyof typeof typeToKeyword)
      : "thought";

    switch (type) {
      case "thought":
      case "response":
      case "elicitation":
      case "error":
        return { type, body: response.replace(typeToKeyword[type], "").trim() };
      case "action":
        // Parse action parameters - allow empty parameters
        const actionMatch = response.match(/ACTION:\s*(\w+)\(([^)]*)\)/);
        if (actionMatch) {
          const [, toolNameRaw, params] = actionMatch;
          if (!isToolName(toolNameRaw)) {
            throw new Error(`Invalid tool name: ${toolNameRaw}`);
          }
          const toolName = toolNameRaw as ToolName;
          return {
            type,
            action: toolName,
            parameter: params ? params.trim() : null,
          };
        }
        throw new Error(`Invalid ACTION format: ${response}`);
      default:
        throw new UnreachableCaseError(type);
    }
  }

  /**
   * Build meaningful parameters for action activities based on stored state
   * @param toolName - The name of the tool
   * @returns Parameters object for display
   */
  private buildActionParameters(toolName: ToolName): Record<string, string> {
    switch (toolName) {
      case "getIssueDetails":
        return {
          issue_id: this.issueId || "not provided",
        };
      case "createPRD":
        if (this.issueDetails) {
          return {
            issue_title: this.issueDetails.title,
            issue_description: this.issueDetails.description 
              ? (this.issueDetails.description.length > 100 
                  ? this.issueDetails.description.substring(0, 100) + "..." 
                  : this.issueDetails.description)
              : "none",
          };
        }
        return { status: "waiting for issue details" };
      case "createPage":
        if (this.issueDetails && this.prdContent) {
          return {
            page_name: `PRD: ${this.issueDetails.title}`,
            prd_length: `${this.prdContent.length} characters`,
            prd_preview: this.prdContent.length > 200 
              ? this.prdContent.substring(0, 200) + "..." 
              : this.prdContent,
          };
        }
        return { status: "waiting for PRD content" };
      case "attachPageToIssue":
        if (this.pageInfo) {
          return {
            issue_id: this.issueId || "not provided",
            page_url: this.pageInfo.pageUrl,
            page_name: this.pageInfo.pageName,
          };
        }
        return { status: "waiting for page info" };
      default:
        return {};
    }
  }

  /**
   * Parse action parameters, handling quoted strings
   * @param paramString - The parameter string from the action
   * @returns Array of parsed parameters
   */
  private parseParameters(paramString: string): string[] {
    const params: string[] = [];
    let current = "";
    let inQuotes = false;
    let quoteChar = '';

    for (let i = 0; i < paramString.length; i++) {
      const char = paramString[i];
      
      if ((char === '"' || char === "'") && (i === 0 || paramString[i - 1] !== '\\')) {
        if (!inQuotes) {
          inQuotes = true;
          quoteChar = char;
        } else if (char === quoteChar) {
          inQuotes = false;
          quoteChar = '';
        } else {
          current += char;
        }
      } else if (char === ',' && !inQuotes) {
        params.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    
    if (current.trim()) {
      params.push(current.trim());
    }
    
    // Remove surrounding quotes from each parameter
    return params.map(p => {
      const trimmed = p.trim();
      if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
          (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
        return trimmed.slice(1, -1);
      }
      return trimmed;
    });
  }

  /**
   * Execute an action and return the result
   * @param props - The action and parameter, plus context
   * @returns The result of the action
   */
  private async executeAction(props: {
    action: ToolName;
    parameter: string | null;
    workspaceSlug: string;
    projectId: string;
    issueId?: string;
  }): Promise<string> {
    const { action, parameter, workspaceSlug, projectId, issueId } = props;
    
    // Tools now work with stored state, so parameter is often not needed
    // But we still accept it for backward compatibility
    
    switch (action) {
      case "getIssueDetails": {
        if (!issueId) {
          throw new Error("Issue ID is required for getIssueDetails");
        }
        if (!projectId) {
          throw new Error("Project ID is required for getIssueDetails");
        }
        
        console.log("Getting issue details for:", issueId);
        const result = await getIssueDetails(this.planeClient, workspaceSlug, projectId, issueId);
        
        // Store the result for later use
        if (!("error" in result)) {
          this.issueDetails = result;
          console.log("Issue details stored:", { title: result.title, descriptionLength: result.description.length });
        }
        
        return JSON.stringify(result);
      }
      case "createPRD": {
        // Use stored issue details - no parameters needed
        if (!this.issueDetails) {
          throw new Error("Issue details are required for createPRD. Call getIssueDetails() first.");
        }
        
        console.log("Creating PRD for issue:", this.issueDetails.title);
        const prd = await createPRD(this.openai, this.issueDetails.title, this.issueDetails.description || undefined);
        
        // Store the PRD content
        this.prdContent = prd;
        console.log("PRD created and stored, length:", prd.length);
        
        return `PRD created successfully. Length: ${prd.length} characters.`;
      }
      case "createPage": {
        if (!projectId) {
          throw new Error("Project ID is required for createPage");
        }
        if (!this.prdContent) {
          throw new Error("PRD content is required. Call createPRD() first.");
        }
        
        // Use stored PRD content and generate page name from issue title
        const pageName = this.issueDetails 
          ? `PRD: ${this.issueDetails.title}`
          : "PRD";
        
        console.log("Creating page with name:", pageName, "PRD length:", this.prdContent.length);
        const result = await createPage(
          this.planeClient,
          workspaceSlug,
          projectId,
          pageName,
          this.prdContent
        );
        
        // Store page info for later use
        if (!("error" in result)) {
          this.pageInfo = {
            pageId: result.pageId,
            pageUrl: result.pageUrl,
            pageName: pageName,
          };
          console.log("Page created:", result.pageUrl);
        }
        
        return JSON.stringify(result);
      }
      case "attachPageToIssue": {
        if (!projectId || !issueId) {
          throw new Error("Project ID and Issue ID are required for attachPageToIssue");
        }
        if (!this.pageInfo) {
          throw new Error("Page info is required. Call createPage() first.");
        }
        
        console.log("Attaching page to issue:", this.pageInfo.pageUrl);
        const result = await attachPageToIssue(
          this.planeClient,
          workspaceSlug,
          projectId,
          issueId,
          this.pageInfo.pageUrl,
          this.pageInfo.pageName
        );
        console.log("Page attached, stopping flow");
        return result;
      }
      default:
        throw new UnreachableCaseError(action);
    }
  }

  /**
   * Call the OpenAI API to get a response
   * @param messages - The messages to send to the OpenAI API
   * @returns The response from the OpenAI API
   */
  private async callOpenAI(
    messages: ChatCompletionMessageParam[]
  ): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
      });

      return response.choices[0]?.message?.content || "No response";
    } catch (error) {
      throw new Error(
        `OpenAI API error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Generate additional context for the LLM from previous activities in this agent run.
   * We consider user prompts and agent responses.
   *
   * @param agentRunId - The Plane agent run ID
   * @param workspaceSlug - The workspace slug
   * @returns All activities formatted as chat messages
   */
  private async generateMessagesFromPreviousActivities(
    agentRunId: string,
    workspaceSlug: string
  ): Promise<ChatCompletionMessageParam[]> {
    try {
      const response = await this.planeClient.agentRuns.activities.list(
        workspaceSlug,
        agentRunId
      );

      const chatMessages: ChatCompletionMessageParam[] = [];

      const filteredActivities = response.results.filter(
        (a: { type: string }) => a.type === "prompt" || a.type === "response"
      );

      for (const activity of filteredActivities.reverse()) {
        const role = activity.type === "prompt" ? "user" : "assistant";
        // For text content types (prompt, response), get the body
        const content =
          activity.content.type !== "action"
            ? (activity.content as { type: string; body: string }).body
            : "";
        if (content) {
          chatMessages.push({ role, content });
        }
      }

      return chatMessages;
    } catch (error) {
      console.error("Error fetching previous activities:", error);
      return [];
    }
  }
}
