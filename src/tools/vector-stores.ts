/**
 * OpenAI Vector Store tools for MCP.
 *
 * Covers: create, retrieve, update, delete, list, search vector stores.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getClient } from "../client.js";
import {
  CreateVectorStoreSchema,
  UpdateVectorStoreSchema,
  RetrieveVectorStoreSchema,
  DeleteVectorStoreSchema,
  ListVectorStoresSchema,
  SearchVectorStoreSchema,
  type ResponseFormat,
} from "../schemas/index.js";

function formatVectorStore(
  vs: Record<string, unknown>,
  format: ResponseFormat
): string {
  if (format === "json") return JSON.stringify(vs, null, 2);
  const lines: string[] = [
    `### Vector Store: ${vs.name ?? "Untitled"}`,
    "",
    `- **ID**: \`${vs.id}\``,
    `- **Created**: ${new Date((vs.created_at as number) * 1000).toISOString()}`,
  ];
  const fc = vs.file_counts as Record<string, number> | undefined;
  if (fc) {
    lines.push(
      `- **Files**: ${fc.total} total (${fc.completed} completed, ${fc.in_progress} in progress, ${fc.failed} failed, ${fc.cancelled} cancelled)`
    );
  }
  if (vs.last_active_at) {
    lines.push(
      `- **Last Active**: ${new Date((vs.last_active_at as number) * 1000).toISOString()}`
    );
  }
  if (vs.metadata && Object.keys(vs.metadata).length > 0) {
    lines.push(`- **Metadata**: \`${JSON.stringify(vs.metadata)}\``);
  }
  lines.push("");
  return lines.join("\n");
}

export function registerVectorStoreTools(server: McpServer): void {
  server.registerTool(
    "openai_create_vector_store",
    {
      title: "Create Vector Store",
      description: `Create a new OpenAI vector store — a collection of processed files that can be used with the \`file_search\` tool.

Use this when you need a new vector store to hold uploaded documents for semantic search or retrieval-augmented generation (RAG).

You can optionally provide file_ids to attach already-uploaded files, a chunking strategy, and metadata (up to 16 key-value pairs).`,
      inputSchema: CreateVectorStoreSchema.shape,
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
        const vs = await client.vectorStores.create({
          name: params.name,
          file_ids: params.file_ids,
          expires_after: params.expires_after as never,
          metadata: params.metadata as Record<string, string>,
          chunking_strategy: params.chunking_strategy as never,
        });
        return {
          content: [{ type: "text", text: formatVectorStore(vs as unknown as Record<string, unknown>, "json") }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error creating vector store: ${error instanceof Error ? error.message : String(error)}` }],
        };
      }
    }
  );

  server.registerTool(
    "openai_retrieve_vector_store",
    {
      title: "Retrieve Vector Store",
      description: `Retrieve details of a specific OpenAI vector store by its ID.

Use this to check the status, file counts, metadata, and other properties of an existing vector store.`,
      inputSchema: RetrieveVectorStoreSchema.shape,
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
        const vs = await client.vectorStores.retrieve(params.vector_store_id);
        return {
          content: [{ type: "text", text: formatVectorStore(vs as unknown as Record<string, unknown>, "json") }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error retrieving vector store: ${error instanceof Error ? error.message : String(error)}` }],
        };
      }
    }
  );

  server.registerTool(
    "openai_update_vector_store",
    {
      title: "Update Vector Store",
      description: `Modify an existing OpenAI vector store — rename it, update metadata, or change the expiration policy.

Use this when you need to update properties of an existing vector store without recreating it.`,
      inputSchema: UpdateVectorStoreSchema.shape,
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
        const { vector_store_id, ...body } = params;
        const vs = await client.vectorStores.update(vector_store_id, {
          name: body.name,
          expires_after: body.expires_after as never,
          metadata: body.metadata as Record<string, string>,
        });
        return {
          content: [{ type: "text", text: formatVectorStore(vs as unknown as Record<string, unknown>, "json") }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error updating vector store: ${error instanceof Error ? error.message : String(error)}` }],
        };
      }
    }
  );

  server.registerTool(
    "openai_delete_vector_store",
    {
      title: "Delete Vector Store",
      description: `Permanently delete an OpenAI vector store by its ID.

This will remove the vector store and all its associated files. This action cannot be undone.`,
      inputSchema: DeleteVectorStoreSchema.shape,
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
        const result = await client.vectorStores.del(params.vector_store_id);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error deleting vector store: ${error instanceof Error ? error.message : String(error)}` }],
        };
      }
    }
  );

  server.registerTool(
    "openai_list_vector_stores",
    {
      title: "List Vector Stores",
      description: `List all OpenAI vector stores with pagination support.

Returns a paginated list of vector stores in your project. Use 'after' or 'before' cursors to navigate pages.`,
      inputSchema: ListVectorStoresSchema.shape,
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
        const page = await client.vectorStores.list({
          after: params.after,
          before: params.before,
          limit: params.limit,
          order: params.order,
        });
        const data = page.data;
        const format = params.response_format;

        if (format === "json") {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  { total: data.length, stores: data },
                  null,
                  2
                ),
              },
            ],
          };
        }

        const lines: string[] = [
          `# Vector Stores (${data.length} results)`,
          "",
        ];
        for (const vs of data) {
          lines.push(formatVectorStore(vs as unknown as Record<string, unknown>, "markdown"));
        }
        return { content: [{ type: "text", text: lines.join("\n") }] };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error listing vector stores: ${error instanceof Error ? error.message : String(error)}` }],
        };
      }
    }
  );

  server.registerTool(
    "openai_search_vector_store",
    {
      title: "Search Vector Store",
      description: `Search an OpenAI vector store for relevant chunks based on a query and optional file-attribute filters.

Use this to perform semantic search across the documents in a vector store. You can provide a single query string or an array of queries, and optionally filter by file attributes (e.g., department = "engineering").

Results include ranked search hits with content snippets, file IDs, and relevance scores.`,
      inputSchema: SearchVectorStoreSchema.shape,
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
        const { vector_store_id, query, max_num_results, rewrite_query, filters, response_format: _fmt, ...rest } = params;

        const searchBody: Record<string, unknown> = {
          query,
          max_num_results,
          rewrite_query,
        };
        if (filters) {
          searchBody.filters = {
            type: "comparison",
            key: filters.key,
            comparison: filters.type,
            value: filters.value,
          };
        }

        const page = await client.vectorStores.search(vector_store_id, searchBody as never);
        const data = page.data;

        if (format === "json") {
          return {
            content: [{ type: "text", text: JSON.stringify({ total: data.length, results: data }, null, 2) }],
          };
        }

        const lines: string[] = [
          `# Search Results for vector store \`${vector_store_id}\``,
          "",
          `Found **${data.length}** result(s).`,
          "",
        ];
        for (const [i, r] of data.entries()) {
          lines.push(`## ${i + 1}. ${r.file_id ?? "Unknown File"}`);
          if (r.filename) lines.push(`- **Filename**: ${r.filename}`);
          if ((r as unknown as Record<string, unknown>).score !== undefined) {
            lines.push(`- **Score**: ${String((r as unknown as Record<string, unknown>).score)}`);
          }
          const content = (r as unknown as Record<string, unknown>).content as Array<{ type: string; text: string }> | undefined;
          if (content && Array.isArray(content)) {
            for (const c of content) {
              if (c.text) lines.push(`\n> ${c.text.substring(0, 500)}${c.text.length > 500 ? "…" : ""}`);
            }
          }
          lines.push("");
        }
        return { content: [{ type: "text", text: lines.join("\n") }] };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error searching vector store: ${error instanceof Error ? error.message : String(error)}` }],
        };
      }
    }
  );
}
