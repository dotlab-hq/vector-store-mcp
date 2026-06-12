/**
 * Barrel export for all MCP tool registrations.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerVectorStoreTools } from "./vector-stores.js";
import { registerFileTools } from "./files.js";
import { registerVectorStoreFileTools } from "./vs-files.js";
import { registerVectorStoreFileBatchTools } from "./vs-file-batches.js";
import { registerUploadFileTool } from "./upload-file.js";

/**
 * Register all OpenAI Vector Store tools on the given MCP server.
 *
 * Tools provided (17 total):
 *
 * Vector Stores:
 *   - openai_create_vector_store
 *   - openai_retrieve_vector_store
 *   - openai_update_vector_store
 *   - openai_delete_vector_store
 *   - openai_list_vector_stores
 *   - openai_search_vector_store
 *
 * Files (global):
 *   - openai_upload_file
 *   - openai_list_files
 *   - openai_retrieve_file
 *   - openai_delete_file
 *   - openai_retrieve_file_content
 *
 * Vector Store Files:
 *   - openai_attach_file_to_vector_store
 *   - openai_list_vector_store_files
 *   - openai_retrieve_vector_store_file
 *   - openai_delete_vector_store_file
 *   - openai_retrieve_vector_store_file_content
 *   - openai_update_vector_store_file_attributes
 *
 * Vector Store File Batches:
 *   - openai_create_vector_store_file_batch
 *   - openai_retrieve_vector_store_file_batch
 *   - openai_cancel_vector_store_file_batch
 *   - openai_list_vector_store_file_batch_files
 */
export function registerAllTools(server: McpServer): void {
  registerVectorStoreTools(server);
  registerFileTools(server);
  registerVectorStoreFileTools(server);
  registerVectorStoreFileBatchTools(server);
  registerUploadFileTool(server);
}
