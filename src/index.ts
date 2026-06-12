/**
 * vector-store-mcp — programmatic API entry point.
 *
 * Import this module to use the MCP server in your own code,
 * or re-export for custom integrations.
 */
export { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
export { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
export { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
export { registerAllTools } from "./tools/index.js";
export { getClient, resetClient } from "./client.js";
export * from "./schemas/index.js";
