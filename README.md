# @dotlab-hq/vector-store-mcp

MCP (Model Context Protocol) server for the **OpenAI Vector Store API**. Manage vector stores, files, file batches, and perform semantic search — all through a single MCP server.

Supports **two transports**:

- **stdio** — for local use with Claude Desktop, VS Code Copilot, or any MCP-compatible client
- **HTTP (Streamable)** — for deployment as a web service

## Features

- **21 tools** covering the full OpenAI Vector Store API
- Fully typed with TypeScript + Zod schema validation
- Uses the official [OpenAI Node SDK](https://github.com/openai/openai-node)
- Two entry points: local stdio and HTTP server
- Zero-config for local development

## Installation

```bash
# Clone and install
git clone <repo-url>
cd vector-store-mcp
npm install

# Build
npm run build
```

## Environment Variables

| Variable          | Required | Description                                              |
| ----------------- | -------- | -------------------------------------------------------- |
| `OPENAI_API_KEY`  | **Yes**  | Your OpenAI API key                                      |
| `OPENAI_API_BASE` | No       | Custom OpenAI API base URL (for proxies/compatible APIs) |
| `PORT`            | No       | HTTP server port (default: `3000`)                       |
| `HOST`            | No       | HTTP server host (default: `127.0.0.1`)                  |

## Usage

### Local (stdio) — Recommended for Desktop Clients

```bash
# Run directly
npm start

# Or with dev watch mode
npm run dev
```

### HTTP Server — For Deployment

```bash
# Start the HTTP server
npm run start:http

# Or with dev watch mode
npm run dev:http
```

The HTTP server exposes:

- `GET /health` — Health check
- `POST /mcp` — MCP Streamable HTTP endpoint
- CORS enabled for all origins in development

## Client Configuration

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "vector-store": {
      "command": "npx",
      "args": ["-y", "@dotlab-hq/vector-store-mcp"],
      "env": {
        "OPENAI_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### VS Code (GitHub Copilot)

Add to `.vscode/mcp.json` in your workspace root:

```json
{
  "servers": {
    "vector-store": {
      "command": "npx",
      "args": ["-y", "@dotlab-hq/vector-store-mcp"],
      "env": {
        "OPENAI_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

> **Windows users:** `npx` may fail with `'vector-store-mcp' is not recognized` due to a known Windows shim resolution issue. To fix this, link the package globally once:
>
> ```bash
> npm link @dotlab-hq/vector-store-mcp
> ```
>
> Then use the direct command in `.vscode/mcp.json`:
>
> ```json
> {
>   "servers": {
>     "vector-store": {
>       "command": "vector-store-mcp",
>       "args": [],
>       "env": {
>         "OPENAI_API_KEY": "your-api-key-here"
>       }
>     }
>   }
> }
> ```

### HTTP/Web Clients

With HTTP-based MCP, the **server holds the credentials** — the client only needs the URL. The API key and base URL are passed as environment variables when **starting the server**, not in the client config.

**1. Start the server with your credentials:**

```bash
# Pass env vars directly
OPENAI_API_KEY=sk-... npm run start:http

# Or use a .env file / shell profile to set them
export OPENAI_API_KEY=sk-...
export OPENAI_API_BASE=https://your-proxy.example.com/v1  # optional
npm run start:http
# Server running at http://127.0.0.1:3000/mcp
```

**2. Connect from your MCP client — just the URL, no keys needed:**

VS Code `.vscode/mcp.json`:

```json
{
  "servers": {
    "vector-store": {
      "url": "http://127.0.0.1:3000/mcp",
      "type": "http"
    }
  }
}
```

Any MCP-compatible HTTP client:

```http
POST http://127.0.0.1:3000/mcp
Content-Type: application/json
```

> **How it works:** The server process reads `OPENAI_API_KEY` from its own environment and uses it for all OpenAI API calls. The MCP client never sees or transmits the key — it just sends tool requests to the server URL. This means you can run the server anywhere (local, cloud, Docker) and point multiple clients at it.

## Programmatic API

You can also use this as a library:

```typescript
import {
  McpServer,
  registerAllTools,
  getClient,
  resetClient,
} from "@dotlab-hq/vector-store-mcp";

const server = new McpServer({ name: "my-server", version: "1.0.0" });
registerAllTools(server);
```

## Tools (21)

### Vector Stores (6)

| Tool                           | Description                                                    |
| ------------------------------ | -------------------------------------------------------------- |
| `openai_create_vector_store`   | Create a new vector store                                      |
| `openai_retrieve_vector_store` | Retrieve a vector store by ID                                  |
| `openai_update_vector_store`   | Update a vector store's name or metadata                       |
| `openai_delete_vector_store`   | Delete a vector store                                          |
| `openai_list_vector_stores`    | List all vector stores with pagination and filtering           |
| `openai_search_vector_store`   | Search a vector store with a query string and optional filters |

### Files (4)

| Tool                           | Description                                                  |
| ------------------------------ | ------------------------------------------------------------ |
| `openai_list_files`            | List files with filtering by purpose, status, and pagination |
| `openai_retrieve_file`         | Retrieve file metadata by ID                                 |
| `openai_delete_file`           | Delete a file by ID                                          |
| `openai_retrieve_file_content` | Download the content of a file by ID                         |

### Vector Store Files (6)

| Tool                                         | Description                                                |
| -------------------------------------------- | ---------------------------------------------------------- |
| `openai_attach_file_to_vector_store`         | Attach a file to a vector store with optional attributes   |
| `openai_list_vector_store_files`             | List files in a vector store with filtering and pagination |
| `openai_retrieve_vector_store_file`          | Retrieve a specific file in a vector store                 |
| `openai_delete_vector_store_file`            | Remove a file from a vector store                          |
| `openai_retrieve_vector_store_file_content`  | Download file content from a vector store                  |
| `openai_update_vector_store_file_attributes` | Update attributes on a vector store file                   |

### File Batches (4)

| Tool                                        | Description                                |
| ------------------------------------------- | ------------------------------------------ |
| `openai_create_vector_store_file_batch`     | Create a batch of files for a vector store |
| `openai_retrieve_vector_store_file_batch`   | Retrieve batch status and details          |
| `openai_cancel_vector_store_file_batch`     | Cancel an in-progress batch                |
| `openai_list_vector_store_file_batch_files` | List files in a specific batch             |

### Upload (1)

| Tool                 | Description                                          |
| -------------------- | ---------------------------------------------------- |
| `openai_upload_file` | Upload a file to OpenAI (for use with vector stores) |

## npm Scripts

| Script               | Description                     |
| -------------------- | ------------------------------- |
| `npm start`          | Run stdio transport (local)     |
| `npm run start:http` | Run HTTP transport (deployment) |
| `npm run dev`        | Dev mode with watch (stdio)     |
| `npm run dev:http`   | Dev mode with watch (HTTP)      |
| `npm run build`      | Compile TypeScript              |
| `npm run clean`      | Remove dist/                    |

## License

MIT
