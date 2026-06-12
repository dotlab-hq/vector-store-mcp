/**
 * Vector Store MCP Server — Streamable HTTP transport.
 *
 * This entry point starts an HTTP server that exposes the MCP tools
 * over the Streamable HTTP protocol (stateless JSON mode).
 *
 * Environment variables:
 *   OPENAI_API_KEY  (required) — Your OpenAI API key.
 *   OPENAI_API_BASE (optional) — Custom OpenAI-compatible base URL.
 *   PORT            (optional) — HTTP port (default: 3000).
 *   HOST            (optional) — Bind host (default: 127.0.0.1).
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { registerAllTools } from "./tools/index.js";
import http from "node:http";

const PORT = Number(process.env["PORT"] ?? 3000);
const HOST = process.env["HOST"] ?? "127.0.0.1";

function readBody(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString();
      if (!raw) {
        resolve(undefined);
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve(undefined);
      }
    });
    req.on("error", reject);
  });
}

async function main(): Promise<void> {
  const server = http.createServer(async (req, res) => {
    // CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept, Mcp-Session-Id");
    res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    // Health check
    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", service: "@dotlab-hq/vector-store-mcp" }));
      return;
    }

    // MCP endpoint
    if (req.url === "/mcp") {
      const mcpServer = new McpServer({
        name: "@dotlab-hq/vector-store-mcp",
        version: "1.0.0",
      });
      registerAllTools(mcpServer);

      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined, // stateless mode
        enableJsonResponse: true,
      });

      res.on("close", () => {
        transport.close().catch(() => {});
        mcpServer.close().catch(() => {});
      });

      try {
        await mcpServer.connect(transport);
        const body = await readBody(req);
        await transport.handleRequest(req, res, body);
      } catch (error) {
        if (!res.headersSent) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: String(error) }));
        }
      }
      return;
    }

    // 404
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found. Use POST /mcp or GET /health" }));
  });

  server.listen(PORT, HOST, () => {
    console.log(`[@dotlab-hq/vector-store-mcp] HTTP server listening on http://${HOST}:${PORT}`);
    console.log(`[@dotlab-hq/vector-store-mcp] MCP endpoint: http://${HOST}:${PORT}/mcp`);
    console.log(`[@dotlab-hq/vector-store-mcp] Health check:  http://${HOST}:${PORT}/health`);
  });
}

main().catch((error) => {
  console.error(`[@dotlab-hq/vector-store-mcp] Fatal error:`, error);
  process.exit(1);
});
