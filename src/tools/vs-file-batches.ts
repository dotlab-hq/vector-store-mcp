/**
 * OpenAI Vector Store File Batch tools for MCP.
 *
 * Covers: create batch, retrieve batch, cancel batch, list batch files.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getClient } from "../client.js";
import {
  CreateVectorStoreFileBatchSchema,
  RetrieveVectorStoreFileBatchSchema,
  CancelVectorStoreFileBatchSchema,
  ListVectorStoreFileBatchFilesSchema,
  type ResponseFormat,
} from "../schemas/index.js";

function formatBatch(b: Record<string, unknown>, format: ResponseFormat): string {
  if (format === "json") return JSON.stringify(b, null, 2);
  const lines: string[] = [
    `### File Batch: ${b.id}`,
    "",
    `- **Created**: ${new Date((b.created_at as number) * 1000).toISOString()}`,
    `- **Status**: ${b.status ?? "unknown"}`,
  ];
  const fc = b.file_counts as Record<string, number> | undefined;
  if (fc) {
    lines.push(
      `- **Files**: ${fc.total} total (${fc.completed} completed, ${fc.in_progress} in progress, ${fc.failed} failed, ${fc.cancelled} cancelled)`
    );
  }
  if (b.metadata && Object.keys(b.metadata).length > 0) {
    lines.push(`- **Metadata**: \`${JSON.stringify(b.metadata)}\``);
  }
  lines.push("");
  return lines.join("\n");
}

export function registerVectorStoreFileBatchTools(server: McpServer): void {
  server.registerTool(
    "openai_create_vector_store_file_batch",
    {
      title: "Create Vector Store File Batch",
      description: `Create a batch of files to attach to a vector store.

This is the recommended way to attach multiple files at once — it minimizes per-vector-store write requests and is more efficient than attaching files one by one.`,
      inputSchema: CreateVectorStoreFileBatchSchema.shape,
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
        const result = await client.vectorStores.fileBatches.create(params.vector_store_id, {
          file_ids: params.file_ids,
          attributes: params.attributes as Record<string, string | number | boolean>,
          chunking_strategy: params.chunking_strategy as never,
        });
        return {
          content: [{ type: "text", text: formatBatch(result as unknown as Record<string, unknown>, "json") }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error creating file batch: ${error instanceof Error ? error.message : String(error)}` }],
        };
      }
    }
  );

  server.registerTool(
    "openai_retrieve_vector_store_file_batch",
    {
      title: "Retrieve Vector Store File Batch",
      description: `Retrieve the status and details of a file batch, including file counts by status.`,
      inputSchema: RetrieveVectorStoreFileBatchSchema.shape,
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
        const result = await client.vectorStores.fileBatches.retrieve(
          params.vector_store_id,
          params.batch_id
        );
        return {
          content: [{ type: "text", text: formatBatch(result as unknown as Record<string, unknown>, "json") }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error retrieving file batch: ${error instanceof Error ? error.message : String(error)}` }],
        };
      }
    }
  );

  server.registerTool(
    "openai_cancel_vector_store_file_batch",
    {
      title: "Cancel Vector Store File Batch",
      description: `Cancel processing of a file batch as soon as possible.

Use this to stop ingestion of files that are still being processed. Already-processed files will remain attached.`,
      inputSchema: CancelVectorStoreFileBatchSchema.shape,
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
        const result = await client.vectorStores.fileBatches.cancel(
          params.vector_store_id,
          params.batch_id
        );
        return {
          content: [{ type: "text", text: formatBatch(result as unknown as Record<string, unknown>, "json") }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error cancelling file batch: ${error instanceof Error ? error.message : String(error)}` }],
        };
      }
    }
  );

  server.registerTool(
    "openai_list_vector_store_file_batch_files",
    {
      title: "List Vector Store File Batch Files",
      description: `List all files in a specific file batch with pagination and optional status filter.

Use this to inspect which files in a batch have been processed, are still in progress, or have failed.`,
      inputSchema: ListVectorStoreFileBatchFilesSchema.shape,
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
        const page = await client.vectorStores.fileBatches.listFiles(
          params.vector_store_id,
          params.batch_id,
          {
            after: params.after,
            before: params.before,
            filter: params.filter,
            limit: params.limit,
            order: params.order,
          }
        );
        const data = page.data;

        if (format === "json") {
          return {
            content: [{ type: "text", text: JSON.stringify({ total: data.length, files: data }, null, 2) }],
          };
        }

        const lines: string[] = [
          `# Batch Files (${data.length} results)`,
          "",
        ];
        for (const f of data) {
          lines.push(`- **\`${f.id}\`** — Status: ${f.status ?? "unknown"}`);
          const err = (f as unknown as Record<string, unknown>).last_error as Record<string, string> | undefined;
          if (err) {
            lines.push(`  - Error: ${err.code} — ${err.message}`);
          }
        }
        lines.push("");
        return { content: [{ type: "text", text: lines.join("\n") }] };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error listing batch files: ${error instanceof Error ? error.message : String(error)}` }],
        };
      }
    }
  );
}
