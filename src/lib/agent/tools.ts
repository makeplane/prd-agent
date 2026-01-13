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
  issueId: string
): Promise<{ title: string; description: string } | { error: string }> => {
  try {
    const response = await planeClient.workItems.retrieve(workspaceSlug, projectId, issueId);
    
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
 * Create a PRD using OpenAI based on issue title and description
 * @param openai - The OpenAI client instance
 * @param issueTitle - The issue title
 * @param issueDescription - The issue description (optional)
 * @returns The generated PRD
 */
export const createPRD = async (
  openai: OpenAI,
  issueTitle: string,
  issueDescription?: string
): Promise<string> => {
  try {
    const prompt = `You are a product manager tasked with creating a comprehensive Product Requirements Document (PRD) based on the following issue:

Title: ${issueTitle}
${issueDescription ? `Description: ${issueDescription}` : ""}

Please create a detailed PRD that includes:
1. Overview - A brief summary of the feature/requirement
2. Goals and Objectives - What we aim to achieve
3. User Stories - Who will use this and how
4. Functional Requirements - Detailed features and functionality
5. Non-Functional Requirements - Performance, security, scalability considerations
6. Acceptance Criteria - Clear criteria for completion
7. Out of Scope - What is explicitly not included
8. Dependencies - Any dependencies or prerequisites
9. Timeline Considerations - Any time-sensitive aspects

IMPORTANT: Format the PRD in HTML (not markdown). Use proper HTML tags like:
- <h1>, <h2>, <h3> for headings
- <p> for paragraphs
- <ul>, <ol>, <li> for lists
- <strong> or <b> for bold text
- <em> or <i> for italic text
- <br> for line breaks
- <div> for sections

Make it comprehensive, clear, and actionable. Use proper HTML structure with good formatting.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an expert product manager who creates clear, comprehensive, and actionable PRDs. Always format your PRDs in HTML with proper structure, headings, lists, and formatting. Use semantic HTML tags for better readability.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
    });

    const prdContent = response.choices[0]?.message?.content || "Failed to generate PRD";
    
    // Log the PRD content received from OpenAI
    console.log("=== PRD Generated from OpenAI ===");
    console.log("PRD Length:", prdContent.length);
    console.log("PRD Content (first 500 chars):", prdContent.substring(0, 500));
    console.log("PRD Content (full):", prdContent);
    console.log("================================");
    
    return prdContent;
  } catch (error) {
    return `Failed to create PRD: ${
      error instanceof Error ? error.message : "Unknown error"
    }`;
  }
};

/**
 * Create a new page in Plane with the PRD content
 * @param planeClient - The Plane client instance
 * @param workspaceSlug - The workspace slug
 * @param projectId - The project ID
 * @param pageName - The name of the page
 * @param prdContent - The PRD content to use as description
 * @returns The created page with its URL
 */
export const createPage = async (
  planeClient: PlaneClient,
  workspaceSlug: string,
  projectId: string,
  pageName: string,
  prdContent: string,
  appBaseUrl?: string
): Promise<{ pageId: string; pageUrl: string } | { error: string }> => {
  try {
    // Log what we're sending to Plane
    console.log("=== Creating Page in Plane ===");
    console.log("Workspace Slug:", workspaceSlug);
    console.log("Project ID:", projectId);
    console.log("Page Name:", pageName);
    console.log("PRD Content Length:", prdContent.length);
    console.log("PRD Content (first 500 chars):", prdContent.substring(0, 500));
    console.log("PRD Content (full):", prdContent);
    console.log("description_html is set:", !!prdContent);
    console.log("description_html type:", typeof prdContent);
    console.log("==============================");
    
    const pageData = {
      name: pageName,
      description_html: prdContent,
    };
    
    console.log("Page data being sent:", JSON.stringify({
      name: pageData.name,
      description_html_length: pageData.description_html?.length || 0,
      description_html_preview: pageData.description_html?.substring(0, 200) || "",
    }));
    
    const response = await planeClient.pages.createProjectPage(workspaceSlug, projectId, pageData);
    
    console.log("Page creation response:", JSON.stringify({
      id: response?.id,
      name: response?.name,
      has_description: !!response?.description_html,
    }));

    if (response && response.id) {
      // Construct the page URL
      // Format: https://app.plane.so/{workspaceSlug}/projects/{projectId}/pages/{pageId}
      // The baseUrl is typically https://api.plane.so, so we need to convert to app.plane.so
      const baseUrl = "http://localhost:3000";
      const pageUrl = `${baseUrl}/${workspaceSlug}/projects/${projectId}/pages/${response.id}`;
      
      return {
        pageId: response.id,
        pageUrl: pageUrl,
      };
    } else {
      return { error: "Failed to create page" };
    }
  } catch (error) {
    return {
      error: `Failed to create page: ${
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
  pageName: string
): Promise<string> => {
  try {
    await planeClient.workItems.links.create(workspaceSlug, projectId, issueId, {
      url: pageUrl,
      name: pageName,
    });

    return `Successfully attached page link to issue. Page URL: ${pageUrl}`;
  } catch (error) {
    return `Failed to attach page to issue: ${
      error instanceof Error ? error.message : "Unknown error"
    }`;
  }
};
