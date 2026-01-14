import { PlaneClient } from "@makeplane/plane-node-sdk/dist/index.js";
import OpenAI from "openai";

/**
 * Get issue details from Plane
 * @param planeClient - The Plane client instance
 * @param workspaceSlug - The workspace slug
 * @param issueId - The issue ID
 * @returns The issue details
 */
export const getIssueDetails = async (
  planeClient: PlaneClient,
  workspaceSlug: string,
  projectId: string,
  issueId: string,
): Promise<{ title: string; description: string } | { error: string }> => {
  try {
    const response = await planeClient.workItems.retrieve(
      workspaceSlug,
      projectId,
      issueId,
    );

    if (response && response.name) {
      return {
        title: response.name,
        description: response.description_html || "",
      };
    } else {
      return { error: "Issue not found" };
    }
  } catch (error) {
    return {
      error: `Failed to get issue details: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
};

/**
 * Generate a PRD and create a page in Plane in one step
 * @param openai - The OpenAI client instance
 * @param planeClient - The Plane client instance
 * @param workspaceSlug - The workspace slug
 * @param projectId - The project ID
 * @param issueTitle - The issue title
 * @param issueDescription - The issue description (optional)
 * @param appBaseUrl - The base URL for the Plane app
 * @param additionalContext - Additional context from user responses (optional)
 * @returns The created page with its URL and PRD content
 */
export const createPRDAndPage = async (
  openai: OpenAI,
  planeClient: PlaneClient,
  workspaceSlug: string,
  projectId: string,
  issueTitle: string,
  issueDescription?: string,
  appBaseUrl?: string,
  additionalContext?: string,
): Promise<
  { pageId: string; pageUrl: string; pageName: string } | { error: string }
> => {
  try {
    // Step 1: Generate PRD
    const prompt = `Create a short PRD for:
Title: ${issueTitle}
${issueDescription ? `Description: ${issueDescription}` : ""}
${additionalContext ? `Additional Context from user:\n${additionalContext}` : ""}

Include: Overview, Goals, Requirements, Acceptance Criteria.
Keep it concise (under 500 words).

IMPORTANT: Output raw HTML only. Do NOT wrap in markdown code blocks. No \`\`\`html tags. Just the HTML content directly.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You create concise PRDs. Output raw HTML only - no markdown, no code blocks, no ```html tags. Just pure HTML content starting with tags like <h1>, <p>, etc.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    let prdContent =
      response.choices[0]?.message?.content || "Failed to generate PRD";

    // Strip markdown code blocks if present
    prdContent = prdContent
      .replace(/^```html\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    console.log("=== PRD Generated ===");
    console.log("PRD Length:", prdContent.length);

    // Step 2: Create page with PRD content
    const pageName = `PRD: ${issueTitle}`;
    const pageData = {
      name: pageName,
      description_html: prdContent,
    };

    const pageResponse = await planeClient.pages.createProjectPage(
      workspaceSlug,
      projectId,
      pageData,
    );

    if (pageResponse && pageResponse.id) {
      const baseUrl = appBaseUrl || "https://app.plane.so";
      const pageUrl = `${baseUrl}/${workspaceSlug}/projects/${projectId}/pages/${pageResponse.id}`;

      console.log("=== Page Created ===");
      console.log("Page URL:", pageUrl);

      return {
        pageId: pageResponse.id,
        pageUrl: pageUrl,
        pageName: pageName,
      };
    } else {
      return { error: "Failed to create page" };
    }
  } catch (error) {
    return {
      error: `Failed to create PRD and page: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
};

/**
 * Attach the page link to the issue by adding a comment
 * @param planeClient - The Plane client instance
 * @param workspaceSlug - The workspace slug
 * @param projectId - The project ID
 * @param issueId - The issue ID
 * @param pageUrl - The URL of the page to attach
 * @param pageName - The name of the page
 * @returns Success message or error
 */
export const attachPageToIssue = async (
  planeClient: PlaneClient,
  workspaceSlug: string,
  projectId: string,
  issueId: string,
  pageUrl: string,
  pageName: string,
): Promise<string> => {
  try {
    await planeClient.workItems.links.create(
      workspaceSlug,
      projectId,
      issueId,
      {
        url: pageUrl,
        name: pageName,
      },
    );

    return `Successfully attached page link to issue. Page URL: ${pageUrl}`;
  } catch (error) {
    return `Failed to attach page to issue: ${
      error instanceof Error ? error.message : "Unknown error"
    }`;
  }
};
