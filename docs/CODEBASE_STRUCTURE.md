# Codebase Structure Guide

This document explains how to structure your codebase following best practices with Hono + OpenAPI (Zod).

## 📁 Directory Structure

```
src/
├── config/           # Configuration files (database, redis, s3, auth, etc.)
├── constants/        # App-wide constants
├── controllers/      # Business logic and route handlers
│   └── _homepage/
│       └── visitors.controller.ts
├── db/              # Database setup and schemas
│   ├── index.ts
│   └── schema/
│       └── _homepage/
│           └── home-visitors.ts
├── middlewares/     # Custom middleware functions
├── routes/          # Route definitions and registration
│   └── _homepage/
│       ├── index.ts
│       └── visitors.routes.ts
├── seeders/         # Database seed files
│   └── _homepage/
│       └── visitors.ts
├── types/           # TypeScript type definitions
├── utils/           # Utility functions and helpers
├── app.ts           # Main application setup with middleware
└── server.ts        # Server entry point
```

## 🔄 Data Flow

```
Request → Middleware → Router → Controller → Database
                                    ↓
Response ← JSON ← Handler ← Controller ← Query Result
```

## 📝 File Responsibilities

### 1. **Controllers** (`src/controllers/`)
Controllers contain:
- **OpenAPI route definitions** using `createRoute()` from `@hono/zod-openapi`
- **Business logic** (the actual handler functions)
- **Database operations**
- **Validation schemas** using Zod

**Example Structure:**
```typescript
import { createRoute, z } from "@hono/zod-openapi";
import type { Context } from "hono";

// 1. Define Zod schemas for request/response
const ResponseSchema = z.object({
  data: z.string(),
});

// 2. Define the OpenAPI route
export const myRoute = createRoute({
  method: "get",
  path: "/api/resource/action",
  tags: ["Resource"],
  summary: "Action description",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ResponseSchema,
        },
      },
      description: "Success message",
    },
  },
});

// 3. Implement the handler
export async function myHandler(c: Context) {
  // Your business logic here
  return c.json({ data: "result" }, 200);
}
```

### 2. **Routes** (`src/routes/`)
Routes files register controllers with routers.

**Structure:**
- `index.ts` - Main router for the module
- `[feature].routes.ts` - Individual feature routes

**Example (`visitors.routes.ts`):**
```typescript
import { OpenAPIHono } from "@hono/zod-openapi";
import type { Env } from "hono";
import { myRoute, myHandler } from "#src/controllers/...";

const myRouter = new OpenAPIHono<{ Bindings: Env }>();

// Register routes
myRouter.openapi(myRoute, myHandler);

export { myRouter };
```

**Example (`index.ts` - Router aggregator):**
```typescript
import { OpenAPIHono } from "@hono/zod-openapi";
import type { Env } from "hono";
import { visitorsRouter } from "./visitors.routes.ts";
import { otherRouter } from "./other.routes.ts";

const homePageRouter = new OpenAPIHono<{ Bindings: Env }>();

// Mount sub-routes
homePageRouter.route("/", visitorsRouter);
homePageRouter.route("/", otherRouter);

export { homePageRouter };
```

### 3. **Main App** (`src/app.ts`)
The main application file that:
- Creates the OpenAPIHono instance
- Registers global middleware
- Mounts module routers
- Configures OpenAPI documentation

**Example:**
```typescript
import { OpenAPIHono } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import { homePageRouter } from "#src/routes/_homepage/index.ts";

const app = new OpenAPIHono({ strict: true });

// Global middleware
app.use(logger());
app.use(cors({ origin: Origins }));

// Register module routers with path prefix
app.route("/api/homepage", homePageRouter);
app.route("/api/users", usersRouter);

// OpenAPI documentation
app.doc("/openapi_docs", {
  openapi: "3.0.0",
  info: {
    version: "1.0.0",
    title: "My API",
  },
});

app.get("/swagger", swaggerUI({ url: "/openapi_docs" }));

export { app };
```

### 4. **Server** (`src/server.ts`)
Entry point that:
- Imports the app
- Starts the HTTP server
- Handles graceful shutdown
- Initializes connections (Redis, DB, etc.)

### 5. **Database Schema** (`src/db/schema/`)
Drizzle ORM table definitions organized by feature.

### 6. **Seeders** (`src/seeders/`)
Scripts to populate the database with initial data.

## 🎯 Key Concepts

### OpenAPI Route Definition
```typescript
export const routeName = createRoute({
  method: "get" | "post" | "put" | "delete" | "patch",
  path: "/api/module/resource",
  tags: ["ModuleName"],           // For documentation grouping
  summary: "Short description",
  description: "Detailed description",
  request: {
    params: z.object({ id: z.string() }),  // Path params
    query: z.object({ page: z.number() }), // Query params
    body: {
      content: {
        "application/json": {
          schema: RequestBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ResponseSchema,
        },
      },
      description: "Success",
    },
    400: {
      description: "Bad Request",
    },
  },
});
```

### Registering Routes
```typescript
// In routes file
router.openapi(routeDefinition, handlerFunction);

// In app.ts
app.route("/api/prefix", moduleRouter);
```

### Path Structure
- Full path in controller: `/api/homepage/visitors/count`
- Router mounted at: `/api/homepage`
- Route path in controller: `/api/homepage/visitors/count`

**OR** alternatively:
- Mount router: `app.route("/api/homepage", homePageRouter)`
- Route path: `/visitors/count`
- Final URL: `/api/homepage/visitors/count`

## 🚀 Adding a New Feature

1. **Create database schema** in `src/db/schema/[module]/[feature].ts`
2. **Create controller** in `src/controllers/[module]/[feature].controller.ts`
   - Define Zod schemas
   - Create route with `createRoute()`
   - Implement handler function
3. **Create route file** in `src/routes/[module]/[feature].routes.ts`
   - Import controller route + handler
   - Register with `router.openapi(route, handler)`
4. **Update module router** in `src/routes/[module]/index.ts`
   - Import new feature router
   - Mount with `router.route("/", featureRouter)`
5. **Register in app** (if new module) in `src/app.ts`
   - Import module router
   - Mount with `app.route("/api/[module]", moduleRouter)`

## 📚 Best Practices

1. **Separation of Concerns**
   - Controllers: Business logic + OpenAPI definitions
   - Routes: Registration only
   - App: Global setup + module mounting

2. **Naming Conventions**
   - Controllers: `[feature].controller.ts`
   - Routes: `[feature].routes.ts`
   - Route exports: `get[Feature]Route`, `[feature]Handler`
   - Router exports: `[feature]Router`

3. **Path Aliases**
   - Use `#src/`, `#config/`, `#db/`, etc.
   - Configured in `tsconfig.json`

4. **Type Safety**
   - Use Zod for all request/response validation
   - Use `Context` type from Hono for handlers
   - Export route types from controllers

5. **Documentation**
   - Add `tags` for grouping in Swagger
   - Write clear `summary` and `description`
   - Document all parameters and responses

## 🔍 Example: Current Visitors Feature

```
Flow:
GET /api/homepage/visitors/count
  ↓
app.ts routes to homePageRouter at /api/homepage
  ↓
homePageRouter mounts visitorsRouter at /
  ↓
visitorsRouter handles /api/homepage/visitors/count
  ↓
Executes getVisitorCountHandler from controller
  ↓
Returns JSON response
```

## 🛠️ Troubleshooting

- **Route not found**: Check path in `createRoute()` matches mount points
- **OpenAPI not generating**: Ensure using `OpenAPIHono` and `.openapi()` method
- **Type errors**: Verify Zod schema matches handler response
- **Import errors**: Check path aliases in `tsconfig.json`

## 📖 Resources

- [Hono Documentation](https://hono.dev/)
- [Zod OpenAPI Documentation](https://github.com/honojs/middleware/tree/main/packages/zod-openapi)
- [Drizzle ORM](https://orm.drizzle.team/)