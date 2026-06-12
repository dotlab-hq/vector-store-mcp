#!/usr/bin/env node
/**
 * Vector Store MCP Server — stdio transport (local, no server).
 *
 * This entry point is used when running as a local MCP server via stdio,
 * e.g. as a subprocess of Claude Desktop, VS Code Copilot, or any
 * MCP-compatible client.
 *
 * Environment variables:
 *   OPENAI_API_KEY  (required) — Your OpenAI API key.
 *   OPENAI_API_BASE (optional) — Custom OpenAI-compatible base URL.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAllTools } from "./tools/index.js";

async function main(): Promise<void> {
  const server = new McpServer({
    name: "vector-store-mcp",
    version: "1.0.0",
  });

  registerAllTools(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  process.stderr.write("[vector-store-mcp] Server started via stdio transport.\n");
}

main().catch((error) => {
  process.stderr.write(`[vector-store-mcp] Fatal error: ${error}\n`);
  process.exit(1);
});
