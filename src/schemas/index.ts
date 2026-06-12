import { z } from "zod";

// ──────────────────────────────────────────────
//  Shared Enums
// ──────────────────────────────────────────────

export const ResponseFormat = {
  MARKDOWN: "markdown",
  JSON: "json",
} as const;

export type ResponseFormat = (typeof ResponseFormat)[keyof typeof ResponseFormat];

export const SortOrder = {
  ASC: "asc",
  DESC: "desc",
} as const;

export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder];

export const FileStatus = {
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELLED: "cancelled",
} as const;

export type FileStatus = (typeof FileStatus)[keyof typeof FileStatus];

// ──────────────────────────────────────────────
//  Vector Store Schemas
// ──────────────────────────────────────────────

export const CreateVectorStoreSchema = z.object({
  name: z.string().min(1).max(256).describe("The name of the vector store."),
  file_ids: z
    .array(z.string())
    .optional()
    .describe(
      "A list of File IDs that the vector store should use. Useful for tools like `file_search`."
    ),
  expires_after: z
    .object({
      anchor: z.literal("last_active_at"),
      days: z.number().int().min(1).max(365),
    })
    .optional()
    .describe("The expiration policy for the vector store."),
  metadata: z
    .record(z.union([z.string(), z.number(), z.boolean()]))
    .optional()
    .describe(
      "Set of 16 key-value pairs attached to the object. Keys max 64 chars, values max 512 chars."
    ),
  chunking_strategy: z
    .object({
      type: z.union([z.literal("auto"), z.literal("static")]),
      static: z
        .object({
          max_chunk_size_tokens: z.number().int().min(100).max(4096).default(800),
          chunk_overlap_tokens: z.number().int().min(0).default(400),
        })
        .optional(),
    })
    .optional()
    .describe(
      "Chunking strategy for files. Default is auto (800 tokens, 400 overlap)."
    ),
});

export const UpdateVectorStoreSchema = z.object({
  vector_store_id: z.string().describe("The ID of the vector store to modify."),
  name: z.string().min(1).max(256).optional().describe("The new name of the vector store."),
  expires_after: z
    .object({
      anchor: z.literal("last_active_at"),
      days: z.number().int().min(1).max(365),
    })
    .optional()
    .describe("New expiration policy for the vector store."),
  metadata: z
    .record(z.union([z.string(), z.number(), z.boolean()]))
    .optional()
    .describe("Updated set of 16 key-value pairs attached to the object."),
});

export const RetrieveVectorStoreSchema = z.object({
  vector_store_id: z.string().describe("The ID of the vector store to retrieve."),
});

export const DeleteVectorStoreSchema = z.object({
  vector_store_id: z.string().describe("The ID of the vector store to delete."),
});

export const ListVectorStoresSchema = z
  .object({
    after: z
      .string()
      .optional()
      .describe("Cursor for pagination. Pass the ID of the last object."),
    before: z
      .string()
      .optional()
      .describe("Cursor for pagination. Pass the ID of the first object."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .default(20)
      .describe("Maximum number of vector stores to return (1–100, default 20)."),
    order: z
      .nativeEnum(SortOrder)
      .default(SortOrder.DESC)
      .describe("Sort order by created_at timestamp."),
    response_format: z
      .nativeEnum(ResponseFormat)
      .default(ResponseFormat.MARKDOWN)
      .describe("Output format: 'markdown' for human-readable or 'json' for machine-readable."),
  })
  .strict();

export const SearchVectorStoreSchema = z.object({
  vector_store_id: z.string().describe("The ID of the vector store to search."),
  query: z
    .union([z.string(), z.array(z.string())])
    .describe("A query string or array of query strings for search."),
  max_num_results: z
    .number()
    .int()
    .min(1)
    .max(50)
    .default(10)
    .describe("Maximum number of results to return (1–50, default 10)."),
  rewrite_query: z
    .boolean()
    .default(false)
    .describe("Whether to rewrite the query for better search results."),
  filters: z
    .object({
      type: z.union([
        z.literal("eq"),
        z.literal("ne"),
        z.literal("gt"),
        z.literal("gte"),
        z.literal("lt"),
        z.literal("lte"),
        z.literal("in"),
        z.literal("nin"),
      ]),
      key: z.string().describe("Attribute key to compare."),
      value: z
        .union([z.string(), z.number(), z.boolean(), z.array(z.string())])
        .describe("Value to compare against."),
    })
    .optional()
    .describe("Filter to apply based on file attributes."),
  response_format: z
    .nativeEnum(ResponseFormat)
    .default(ResponseFormat.MARKDOWN)
    .describe("Output format: 'markdown' for human-readable or 'json' for machine-readable."),
});

// ──────────────────────────────────────────────
//  File Schemas (Global)
// ──────────────────────────────────────────────

export const ListFilesSchema = z
  .object({
    after: z.string().optional().describe("Cursor for pagination."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(10000)
      .default(10000)
      .describe("Maximum number of files to return (1–10000, default 10000)."),
    order: z
      .nativeEnum(SortOrder)
      .default(SortOrder.DESC)
      .describe("Sort order by created_at timestamp."),
    purpose: z.string().optional().describe("Only return files with the given purpose."),
    response_format: z
      .nativeEnum(ResponseFormat)
      .default(ResponseFormat.MARKDOWN)
      .describe("Output format: 'markdown' for human-readable or 'json' for machine-readable."),
  })
  .strict();

export const RetrieveFileSchema = z.object({
  file_id: z.string().describe("The ID of the file to retrieve."),
});

export const DeleteFileSchema = z.object({
  file_id: z.string().describe("The ID of the file to delete."),
});

export const RetrieveFileContentSchema = z.object({
  file_id: z.string().describe("The ID of the file whose content to retrieve."),
});

// ──────────────────────────────────────────────
//  Vector Store File Schemas
// ──────────────────────────────────────────────

export const CreateVectorStoreFileSchema = z.object({
  vector_store_id: z.string().describe("The ID of the vector store to attach the file to."),
  file_id: z.string().describe("The ID of the previously uploaded file."),
  attributes: z
    .record(z.union([z.string(), z.number(), z.boolean()]))
    .optional()
    .describe("Up to 16 key-value pairs for filtering and search."),
  chunking_strategy: z
    .object({
      type: z.union([z.literal("auto"), z.literal("static")]),
      static: z
        .object({
          max_chunk_size_tokens: z.number().int().min(100).max(4096).default(800),
          chunk_overlap_tokens: z.number().int().min(0).default(400),
        })
        .optional(),
    })
    .optional()
    .describe("Chunking strategy for the file."),
});

export const ListVectorStoreFilesSchema = z
  .object({
    vector_store_id: z.string().describe("The ID of the vector store."),
    after: z.string().optional().describe("Cursor for pagination."),
    before: z.string().optional().describe("Cursor for pagination."),
    filter: z
      .nativeEnum(FileStatus)
      .optional()
      .describe("Filter by file status."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .default(20)
      .describe("Maximum number of files to return (1–100, default 20)."),
    order: z
      .nativeEnum(SortOrder)
      .default(SortOrder.DESC)
      .describe("Sort order by created_at timestamp."),
    response_format: z
      .nativeEnum(ResponseFormat)
      .default(ResponseFormat.MARKDOWN)
      .describe("Output format: 'markdown' for human-readable or 'json' for machine-readable."),
  })
  .strict();

export const RetrieveVectorStoreFileSchema = z.object({
  vector_store_id: z.string().describe("The ID of the vector store."),
  file_id: z.string().describe("The ID of the vector store file to retrieve."),
});

export const DeleteVectorStoreFileSchema = z.object({
  vector_store_id: z.string().describe("The ID of the vector store."),
  file_id: z.string().describe("The ID of the vector store file to delete."),
});

export const RetrieveVectorStoreFileContentSchema = z.object({
  vector_store_id: z.string().describe("The ID of the vector store."),
  file_id: z.string().describe("The ID of the vector store file whose content to retrieve."),
});

export const UpdateVectorStoreFileAttributesSchema = z.object({
  vector_store_id: z.string().describe("The ID of the vector store."),
  file_id: z.string().describe("The ID of the vector store file to update."),
  attributes: z
    .record(z.union([z.string(), z.number(), z.boolean()]))
    .nullable()
    .describe("Updated set of up to 16 key-value pairs, or null to clear attributes."),
});

// ──────────────────────────────────────────────
//  Vector Store File Batch Schemas
// ──────────────────────────────────────────────

export const CreateVectorStoreFileBatchSchema = z.object({
  vector_store_id: z.string().describe("The ID of the vector store."),
  file_ids: z.array(z.string()).min(1).describe("A list of File IDs to attach."),
  attributes: z
    .record(z.union([z.string(), z.number(), z.boolean()]))
    .optional()
    .describe("Up to 16 key-value pairs for filtering and search."),
  chunking_strategy: z
    .object({
      type: z.union([z.literal("auto"), z.literal("static")]),
      static: z
        .object({
          max_chunk_size_tokens: z.number().int().min(100).max(4096).default(800),
          chunk_overlap_tokens: z.number().int().min(0).default(400),
        })
        .optional(),
    })
    .optional()
    .describe("Chunking strategy for the files."),
});

export const RetrieveVectorStoreFileBatchSchema = z.object({
  vector_store_id: z.string().describe("The ID of the vector store."),
  batch_id: z.string().describe("The ID of the file batch to retrieve."),
});

export const CancelVectorStoreFileBatchSchema = z.object({
  vector_store_id: z.string().describe("The ID of the vector store."),
  batch_id: z.string().describe("The ID of the file batch to cancel."),
});

export const ListVectorStoreFileBatchFilesSchema = z
  .object({
    vector_store_id: z.string().describe("The ID of the vector store."),
    batch_id: z.string().describe("The ID of the file batch."),
    after: z.string().optional().describe("Cursor for pagination."),
    before: z.string().optional().describe("Cursor for pagination."),
    filter: z
      .nativeEnum(FileStatus)
      .optional()
      .describe("Filter by file status."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .default(20)
      .describe("Maximum number of files to return (1–100, default 20)."),
    order: z
      .nativeEnum(SortOrder)
      .default(SortOrder.DESC)
      .describe("Sort order by created_at timestamp."),
    response_format: z
      .nativeEnum(ResponseFormat)
      .default(ResponseFormat.MARKDOWN)
      .describe("Output format: 'markdown' for human-readable or 'json' for machine-readable."),
  })
  .strict();
