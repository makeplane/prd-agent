# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PRD Agent is a Cloudflare Worker that integrates with Plane to automatically generate Product Requirements Documents (PRDs). When users mention the bot in issue comments, it generates a comprehensive PRD using OpenAI and creates a linked page in Plane.

## Commands

```bash
npm run dev          # Start local development server (wrangler dev)
npm run deploy       # Deploy to Cloudflare (wrangler deploy --minify)
npm run cf-typegen   # Generate TypeScript types for Cloudflare bindings
npm run lint         # Run ESLint on src/
npm run lint:fix     # Run ESLint with auto-fix
```

## Architecture

### Request Flow

1. **Webhook Entry** (`src/index.ts`): Routes `/webhook` POST requests to the webhook handler
2. **Webhook Handler** (`src/lib/webhook-handler.ts`): Validates `agent_run_activity` events and initializes the AgentClient
3. **Agent Loop** (`src/lib/agent/agentClient.ts`): Core agentic loop that orchestrates LLM calls and tool execution
4. **Tools** (`src/lib/agent/tools.ts`): Individual tool implementations for Plane API and OpenAI interactions

### Agent Loop Pattern

The `AgentClient` implements a ReAct-style loop:
- LLM responses are parsed for prefixes: `THINKING:`, `ACTION:`, `RESPONSE:`, `ELICITATION:`, `ERROR:`
- Actions are parsed as `ACTION: toolName(parameters)` and executed
- Tool results are stored on the class instance (`issueDetails`, `prdContent`, `pageInfo`) for use by subsequent tools
- Loop terminates on: response/error/elicitation activities, `attachPageToIssue` completion, or max iterations (10)

### Tool Chain

Tools are designed to execute in sequence, using stored state from previous tools:
1. `getIssueDetails()` → stores `issueDetails`
2. `createPRD()` → uses `issueDetails`, stores `prdContent`
3. `createPage()` → uses `prdContent`, stores `pageInfo`
4. `attachPageToIssue()` → uses `pageInfo`, terminates the flow

### Key Files

- `src/lib/agent/prompt.ts` - System prompt defining agent behavior and available tools
- `src/lib/store.ts` - KV storage operations for OAuth credentials
- `src/lib/helpers.ts` - OAuth configuration and API helpers
- `src/lib/types.ts` - TypeScript types including `ToolName` union and webhook payloads

## Environment

Required secrets (set via `wrangler secret put`):
- `PLANE_CLIENT_SECRET`
- `OPENAI_API_KEY`

Configuration vars in `wrangler.jsonc`:
- `PLANE_CLIENT_ID`, `PLANE_BASE_URL`, `PLANE_BASE_APP_URL`, `SERVER_URL`

KV namespace `CREDENTIALS_KV` stores OAuth tokens keyed by workspace ID.

## Testing Locally

The wrangler.jsonc has localhost URLs configured for local development against a local Plane instance. For production, update the URLs and use `wrangler secret put` for sensitive values.
