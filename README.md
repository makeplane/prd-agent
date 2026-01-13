# PRD Agent for Plane

A Cloudflare Worker-based PRD (Product Requirements Document) generator that integrates with Plane. Users can mention the bot in issue comments to automatically generate comprehensive PRDs and create linked pages.

## Features

- 📄 Automatic PRD generation from Plane issues
- 🤖 AI-powered PRD creation using OpenAI
- 🔗 Automatic page creation with PRD content
- 🔗 Automatic linking of PRD pages to issues
- 🎨 HTML-formatted PRDs for better readability
- 🔄 Multi-step reasoning using OpenAI
- 🔐 OAuth integration with Plane

## Architecture

The bot uses a simple agentic loop:
1. Receives webhook events when users mention the bot in an issue comment
2. Retrieves issue details (title and description)
3. Generates a comprehensive PRD using OpenAI
4. Creates a new page in Plane with the PRD content
5. Links the page to the original issue
6. Responds with a success message and page link

## Available Tools

- `getIssueDetails()` - Get the title and description of the current issue from Plane
- `createPRD()` - Generate a comprehensive PRD using OpenAI based on the issue details
- `createPage()` - Create a new page in Plane with the PRD content as description
- `attachPageToIssue()` - Attach the page link to the issue (automatically stops the flow)

## Setup

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [Cloudflare account](https://dash.cloudflare.com/)
- [Plane workspace](https://plane.so/)
- [OpenAI API key](https://platform.openai.com/)

### 1. Clone and Install

```bash
cd chat-prd-agent
npm install
```

### 2. Create KV Namespace

```bash
wrangler kv namespace create CREDENTIALS_KV
```

Update `wrangler.jsonc` with the KV namespace ID.

### 3. Create Plane App

1. Go to your Plane workspace settings
2. Navigate to **Apps** > **Create App**
3. Set the following:
   - **App Name**: PRD Agent
   - **Redirect URL**: `https://your-worker-url/oauth/callback`
   - **Webhook URL**: `https://your-worker-url/webhook`
   - Enable the `agent_run_user_prompt` webhook event
4. Note the **Client ID** and **Client Secret**

### 4. Configure Environment

Update `wrangler.jsonc`:

```json
{
  "vars": {
    "PLANE_CLIENT_ID": "your-client-id",
    "PLANE_BASE_URL": "https://api.plane.so",
    "PLANE_BASE_APP_URL": "https://app.plane.so",
    "SERVER_URL": "https://your-worker-url"
  }
}
```

Set secrets:

```bash
wrangler secret put PLANE_CLIENT_SECRET
wrangler secret put OPENAI_API_KEY
```

### 5. Deploy

```bash
npm run deploy
```

### 6. Install the App

1. Visit `https://your-worker-url/oauth/setup`
2. Authorize the app for your workspace
3. The bot is now ready to use!

## Usage

Mention the bot in any issue comment:

```
@PRDAgent create a PRD for this issue
```

Or simply mention the bot:

```
@PRDAgent
```

The bot will automatically:
1. Retrieve the issue details (title and description)
2. Generate a comprehensive PRD using OpenAI
3. Create a new page in Plane with the PRD content
4. Link the page to the issue
5. Respond with a success message and page link

### PRD Structure

The generated PRD includes:
- **Overview** - A brief summary of the feature/requirement
- **Goals and Objectives** - What we aim to achieve
- **User Stories** - Who will use this and how
- **Functional Requirements** - Detailed features and functionality
- **Non-Functional Requirements** - Performance, security, scalability considerations
- **Acceptance Criteria** - Clear criteria for completion
- **Out of Scope** - What is explicitly not included
- **Dependencies** - Any dependencies or prerequisites
- **Timeline Considerations** - Any time-sensitive aspects

PRDs are formatted in HTML for better readability in Plane pages.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PLANE_CLIENT_ID` | Plane OAuth Client ID | Yes |
| `PLANE_CLIENT_SECRET` | Plane OAuth Client Secret | Yes |
| `PLANE_BASE_URL` | Plane API URL (default: https://api.plane.so) | Yes |
| `PLANE_BASE_APP_URL` | Plane App URL (default: https://app.plane.so) | Yes |
| `SERVER_URL` | This worker's public URL | Yes |
| `OPENAI_API_KEY` | OpenAI API key for GPT-4 | Yes |

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check message |
| `/health` | GET | Health status JSON |
| `/oauth/setup` | GET | Start OAuth flow |
| `/oauth/callback` | GET | OAuth callback handler |
| `/webhook` | POST | Plane webhook receiver |
| `/workspaces` | GET | List connected workspaces |

## Development

```bash
# Start local development server
npm run dev

# Generate TypeScript types for Cloudflare bindings
npm run cf-typegen

# Lint the code
npm run lint

# Deploy to Cloudflare
npm run deploy
```

## Project Structure

```
chat-prd-agent/
├── src/
│   ├── index.ts              # Main entry point and routing
│   └── lib/
│       ├── helpers.ts        # OAuth helpers and utilities
│       ├── store.ts          # KV storage for credentials
│       ├── templates.ts      # HTML templates
│       ├── types.ts          # TypeScript type definitions
│       ├── webhook-handler.ts # Webhook processing
│       └── agent/
│           ├── agentClient.ts # Agent logic and Plane API
│           ├── prompt.ts      # LLM system prompt
│           └── tools.ts        # PRD generation and page tools
├── wrangler.jsonc            # Cloudflare configuration
├── package.json
├── tsconfig.json
└── README.md
```

## Webhook Events

The bot listens for `agent_run_user_prompt` events, which are triggered when a user mentions the bot in an issue comment. The webhook payload includes:

- `agent_run` - The agent run context
- `agent_run_activity` - The user's prompt activity
- `workspace_id` - The workspace identifier
- `project_id` - The project identifier
- `issue_id` - The issue identifier

## Agent Activity Types

The bot creates various activity types in Plane:

- `thought` - Shows the bot's reasoning process
- `action` - Indicates tool execution with parameters
- `response` - Final answer to the user with page link
- `elicitation` - Request for more information
- `error` - Error messages

## Workflow

When the bot is mentioned in an issue comment, it follows this workflow:

1. **getIssueDetails()** - Retrieves the issue title and description
2. **createPRD()** - Generates a comprehensive PRD using OpenAI based on the issue
3. **createPage()** - Creates a new page in Plane with the PRD content (HTML formatted)
4. **attachPageToIssue()** - Links the page to the issue and stops the flow

All intermediate results are stored internally, so tools don't require parameters. The bot automatically uses stored context between steps.

## License

MIT
