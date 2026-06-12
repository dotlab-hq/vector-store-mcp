/**
 * OpenAI File tools for MCP (global file management).
 *
 * Covers: list, retrieve, delete files, and retrieve file content.
 * Note: Upload (create) requires multipart — see file creation tool in VS files module.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getClient } from "../client.js";
import {
  ListFilesSchema,
  RetrieveFileSchema,
  DeleteFileSchema,
  RetrieveFileContentSchema,
  type ResponseFormat,
} from "../schemas/index.js";

function formatFile(f: Record<string, unknown>, format: ResponseFormat): string {
  if (format === "json") return JSON.stringify(f, null, 2);
  const lines: string[] = [
    `### File: ${f.filename ?? "Unknown"}`,
    "",
    `- **ID**: \`${f.id}\``,
    `- **Object**: ${f.object}`,
    `- **Bytes**: ${f.bytes}`,
    `- **Purpose**: ${f.purpose}`,
    `- **Created**: ${new Date((f.created_at as number) * 1000).toISOString()}`,
  ];
  if (f.status) lines.push(`- **Status**: ${f.status}`);
  if (f.status_details) lines.push(`- **Status Details**: ${f.status_details}`);
  lines.push("");
  return lines.join("\n");
}

export function registerFileTools(server: McpServer): void {
  server.registerTool(
    "openai_list_files",
    {
      title: "List Files",
      description: `List all files in your OpenAI project with pagination and optional purpose filter.

Returns metadata about each uploaded file including its ID, filename, size, purpose, and creation timestamp. Use the 'purpose' parameter to filter by type (e.g., "assistants", "fine-tune", "batch").`,
      inputSchema: ListFilesSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const client = getClient();
        const page = await client.files.list({
          after: params.after,
          limit: params.limit,
          order: params.order,
          purpose: params.purpose as never,
        });
        const data = page.data;
        const format = params.response_format;

        if (format === "json") {
          return {
            content: [{ type: "text", text: JSON.stringify({ total: data.length, files: data }, null, 2) }],
          };
        }

        const lines: string[] = [
          `# Files (${data.length} results)`,
          "",
        ];
        for (const f of data) {
          lines.push(formatFile(f as unknown as Record<string, unknown>, "markdown"));
        }
        return { content: [{ type: "text", text: lines.join("\n") }] };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error listing files: ${error instanceof Error ? error.message : String(error)}` }],
        };
      }
    }
  );

  server.registerTool(
    "openai_retrieve_file",
    {
      title: "Retrieve File",
      description: `Retrieve metadata about a specific file by its ID, including filename, size, purpose, and status.`,
      inputSchema: RetrieveFileSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const client = getClient();
        const file = await client.files.retrieve(params.file_id);
        return {
          content: [{ type: "text", text: formatFile(file as unknown as Record<string, unknown>, "json") }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error retrieving file: ${error instanceof Error ? error.message : String(error)}` }],
        };
      }
    }
  );

  server.registerTool(
    "openai_delete_file",
    {
      title: "Delete File",
      description: `Permanently delete a file and remove it from all vector stores.

This action cannot be undone. The file will be deleted from OpenAI's storage.`,
      inputSchema: DeleteFileSchema.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const client = getClient();
        const result = await client.files.del(params.file_id);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error deleting file: ${error instanceof Error ? error.message : String(error)}` }],
        };
      }
    }
  );

  server.registerTool(
    "openai_retrieve_file_content",
    {
      title: "Retrieve File Content",
      description: `Retrieve the raw content of a file by its ID.

Returns the file content as-is (text, JSON, JSONL, etc. depending on the file type). For large files, consider using the file's metadata first to check its size.`,
      inputSchema: RetrieveFileContentSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const client = getClient();
        const response = await client.files.content(params.file_id);
        const text = await response.text();
        // Truncate if very large
        const maxLen = 50000;
        const display = text.length > maxLen
          ? text.substring(0, maxLen) + `\n\n... [truncated, ${text.length} total chars]`
          : text;
        return {
          content: [{ type: "text", text: display }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error retrieving file content: ${error instanceof Error ? error.message : String(error)}` }],
        };
      }
    }
  );
}
