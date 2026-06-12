/**
 * OpenAI Vector Store File tools for MCP.
 *
 * Covers: attach file to VS, list VS files, retrieve, delete, retrieve content, update attributes.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getClient } from "../client.js";
import {
  CreateVectorStoreFileSchema,
  ListVectorStoreFilesSchema,
  RetrieveVectorStoreFileSchema,
  DeleteVectorStoreFileSchema,
  RetrieveVectorStoreFileContentSchema,
  UpdateVectorStoreFileAttributesSchema,
  type ResponseFormat,
} from "../schemas/index.js";

function formatVSFile(f: Record<string, unknown>, format: ResponseFormat): string {
  if (format === "json") return JSON.stringify(f, null, 2);
  const lines: string[] = [
    `### Vector Store File`,
    "",
    `- **ID**: \`${f.id}\``,
    `- **Created**: ${new Date((f.created_at as number) * 1000).toISOString()}`,
  ];
  if (f.status) lines.push(`- **Status**: ${f.status}`);
  if (f.last_error) {
    const err = f.last_error as Record<string, string>;
    lines.push(`- **Last Error**: ${err.code} — ${err.message}`);
  }
  if (f.attributes && Object.keys(f.attributes).length > 0) {
    lines.push(`- **Attributes**: \`${JSON.stringify(f.attributes)}\``);
  }
  lines.push("");
  return lines.join("\n");
}

export function registerVectorStoreFileTools(server: McpServer): void {
  server.registerTool(
    "openai_attach_file_to_vector_store",
    {
      title: "Attach File to Vector Store",
      description: `Attach a previously uploaded file to a vector store.

The file must already exist in your OpenAI project (use openai_upload_file to upload first). Once attached, the file will be chunked and indexed for semantic search.

For multi-file ingestion, prefer openai_create_vector_store_file_batch to minimize per-vector-store write requests.`,
      inputSchema: CreateVectorStoreFileSchema.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const client = getClient();
        const result = await client.vectorStores.files.create(params.vector_store_id, {
          file_id: params.file_id,
          attributes: params.attributes as Record<string, string | number | boolean>,
          chunking_strategy: params.chunking_strategy as never,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error attaching file: ${error instanceof Error ? error.message : String(error)}` }],
        };
      }
    }
  );

  server.registerTool(
    "openai_list_vector_store_files",
    {
      title: "List Vector Store Files",
      description: `List all files attached to a vector store with pagination and optional status filter.

Shows each file's processing status (in_progress, completed, failed, cancelled) so you can monitor ingestion progress.`,
      inputSchema: ListVectorStoreFilesSchema.shape,
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
        const format = params.response_format;
        const page = await client.vectorStores.files.list(params.vector_store_id, {
          after: params.after,
          before: params.before,
          filter: params.filter,
          limit: params.limit,
          order: params.order,
        });
        const data = page.data;

        if (format === "json") {
          return {
            content: [{ type: "text", text: JSON.stringify({ total: data.length, files: data }, null, 2) }],
          };
        }

        const lines: string[] = [
          `# Vector Store Files (${data.length} results)`,
          "",
        ];
        for (const f of data) {
          lines.push(formatVSFile(f as unknown as Record<string, unknown>, "markdown"));
        }
        return { content: [{ type: "text", text: lines.join("\n") }] };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error listing vector store files: ${error instanceof Error ? error.message : String(error)}` }],
        };
      }
    }
  );

  server.registerTool(
    "openai_retrieve_vector_store_file",
    {
      title: "Retrieve Vector Store File",
      description: `Retrieve details of a specific file attached to a vector store, including its processing status and any errors.`,
      inputSchema: RetrieveVectorStoreFileSchema.shape,
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
        const result = await client.vectorStores.files.retrieve(params.vector_store_id, params.file_id);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error retrieving vector store file: ${error instanceof Error ? error.message : String(error)}` }],
        };
      }
    }
  );

  server.registerTool(
    "openai_delete_vector_store_file",
    {
      title: "Delete Vector Store File",
      description: `Remove a file from a vector store (does NOT delete the underlying OpenAI file).

After removal, the file will no longer be searchable in this vector store. To delete the file entirely, use openai_delete_file.`,
      inputSchema: DeleteVectorStoreFileSchema.shape,
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
        const result = await client.vectorStores.files.del(params.vector_store_id, params.file_id);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error deleting vector store file: ${error instanceof Error ? error.message : String(error)}` }],
        };
      }
    }
  );

  server.registerTool(
    "openai_retrieve_vector_store_file_content",
    {
      title: "Retrieve Vector Store File Content",
      description: `Retrieve the parsed text content of a vector store file.

Returns the chunks of text that were extracted from the file and indexed in the vector store. Useful for inspecting what content is available for search.`,
      inputSchema: RetrieveVectorStoreFileContentSchema.shape,
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
        const contentPages: string[] = [];
        for await (const chunk of client.vectorStores.files.content(params.vector_store_id, params.file_id)) {
          if ((chunk as Record<string, unknown>).text) {
            contentPages.push((chunk as Record<string, unknown>).text as string);
          }
        }
        const fullText = contentPages.join("\n");
        const maxLen = 50000;
        const display = fullText.length > maxLen
          ? fullText.substring(0, maxLen) + `\n\n... [truncated, ${fullText.length} total chars]`
          : fullText;
        return {
          content: [{ type: "text", text: display || "No content available." }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error retrieving file content: ${error instanceof Error ? error.message : String(error)}` }],
        };
      }
    }
  );

  server.registerTool(
    "openai_update_vector_store_file_attributes",
    {
      title: "Update Vector Store File Attributes",
      description: `Update or clear the attributes (up to 16 key-value pairs) on a vector store file.

Attributes can be used to filter and organize files within a vector store. Pass null to clear all attributes.`,
      inputSchema: UpdateVectorStoreFileAttributesSchema.shape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const client = getClient();
        const result = await client.vectorStores.files.update(
          params.vector_store_id,
          params.file_id,
          {
            attributes: params.attributes as Record<string, string> | null,
          }
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error updating file attributes: ${error instanceof Error ? error.message : String(error)}` }],
        };
      }
    }
  );
}
