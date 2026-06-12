/**
 * Vector Store Upload File tool for MCP.
 *
 * Uses OpenAI SDK's file upload (multipart/form-data).
 * This is a standalone tool since upload requires file handling.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getClient } from "../client.js";
import { z } from "zod";
import * as fs from "node:fs";
import * as path from "node:path";

export const UploadFileSchema = z.object({
  file_path: z.string().describe("Absolute or relative path to the local file to upload."),
  purpose: z
    .enum(["assistants", "batch", "fine-tune", "vision", "user_data", "evals"])
    .describe("The intended purpose of the uploaded file."),
});

export function registerUploadFileTool(server: McpServer): void {
  server.registerTool(
    "openai_upload_file",
    {
      title: "Upload File",
      description: `Upload a local file to OpenAI.

The file is uploaded using multipart/form-data. Once uploaded, you can attach the returned file ID to a vector store using openai_attach_file_to_vector_store.

Supported purposes:
- **assistants**: Used in the Assistants API
- **batch**: Used in the Batch API
- **fine-tune**: Used for fine-tuning
- **vision**: Images for vision fine-tuning
- **user_data**: Flexible file type for any purpose
- **evals**: Used for eval data sets

Individual files can be up to 512 MB.`,
      inputSchema: UploadFileSchema.shape,
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
        const filePath = path.resolve(params.file_path);

        if (!fs.existsSync(filePath)) {
          return {
            isError: true,
            content: [{ type: "text", text: `Error: File not found at path: ${filePath}` }],
          };
        }

        const file = await client.files.create({
          file: fs.createReadStream(filePath),
          purpose: params.purpose as "assistants" | "batch" | "fine-tune" | "vision" | "user_data" | "evals",
        });

        return {
          content: [{ type: "text", text: JSON.stringify(file, null, 2) }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error uploading file: ${error instanceof Error ? error.message : String(error)}` }],
        };
      }
    }
  );
}
