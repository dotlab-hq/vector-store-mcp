# Quick Reference: How to Add a New API Endpoint

## Step-by-Step Guide

### 1. Create Controller (`src/controllers/[module]/[feature].controller.ts`)

```typescript
import { createRoute, z } from "@hono/zod-openapi";
import type { Context } from "hono";

// Define response schema
const MyResponseSchema = z.object({
  message: z.string(),
  data: z.any(),
});

// Define the route
export const myRoute = createRoute({
  method: "get",
  path: "/api/[module]/[feature]/[action]",
  tags: ["ModuleName"],
  summary: "What this endpoint does",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: MyResponseSchema,
        },
      },
      description: "Success",
    },
  },
});

// Create handler
export async function myHandler(c: Context) {
  // Your logic here
  return c.json({ message: "Success", data: {} }, 200);
}
```

### 2. Create Router (`src/routes/[module]/[feature].routes.ts`)

```typescript
import { OpenAPIHono } from "@hono/zod-openapi";
import type { Env } from "hono";
import { myRoute, myHandler } from "#src/controllers/[module]/[feature].controller.ts";

const myRouter = new OpenAPIHono<{ Bindings: Env }>();

// Register the route
myRouter.openapi(myRoute, myHandler);

export { myRouter };
```

### 3. Update Module Index (`src/routes/[module]/index.ts`)

```typescript
import { OpenAPIHono } from "@hono/zod-openapi";
import type { Env } from "hono";
import { myRouter } from "./[feature].routes.ts";

const moduleRouter = new OpenAPIHono<{ Bindings: Env }>();

// Mount the feature router
moduleRouter.route("/", myRouter);

export { moduleRouter };
```

### 4. Register in App (`src/app.ts`)

```typescript
import { moduleRouter } from "#src/routes/[module]/index.ts";

// ... existing code ...

// Register the module router
app.route("/api/[module]", moduleRouter);

// ... rest of the code ...
```

---

## Path Resolution Example

If you have:
- **Controller path**: `/api/homepage/visitors/count`
- **App mounts at**: `app.route("/api/homepage", homePageRouter)`
- **Router internally**: No additional nesting

Then:
- The controller path should be: `/api/homepage/visitors/count` (full path)
- Final accessible URL: `GET http://localhost:3000/api/homepage/visitors/count`

**Alternative approach:**
- **Controller path**: `/visitors/count` (relative)
- **App mounts at**: `app.route("/api/homepage", homePageRouter)`
- Final accessible URL: `GET http://localhost:3000/api/homepage/visitors/count`

---

## File Structure at a Glance

```
Your Feature
│
├── Database Schema
│   └── src/db/schema/_homepage/home-visitors.ts
│
├── Controller (Logic + OpenAPI)
│   └── src/controllers/_homepage/visitors.controller.ts
│       ├── Zod Schemas
│       ├── Route Definition (createRoute)
│       └── Handler Function
│
├── Routes (Registration)
│   ├── src/routes/_homepage/visitors.routes.ts (registers controller)
│   └── src/routes/_homepage/index.ts (combines all routes)
│
└── App (Main Entry)
    └── src/app.ts (mounts all modules)
```

---

## Common Patterns

### GET with Query Parameters
```typescript
const getItemsRoute = createRoute({
  method: "get",
  path: "/api/items",
  request: {
    query: z.object({
      page: z.string().optional(),
      limit: z.string().optional(),
    }),
  },
  responses: { /* ... */ },
});

export async function getItemsHandler(c: Context) {
  const { page, limit } = c.req.query();
  // Use page and limit
}
```

### POST with Body
```typescript
const CreateSchema = z.object({
  name: z.string(),
  email: z.string().email(),
});

const createRoute = createRoute({
  method: "post",
  path: "/api/users",
  request: {
    body: {
      content: {
        "application/json": {
          schema: CreateSchema,
        },
      },
    },
  },
  responses: { /* ... */ },
});

export async function createHandler(c: Context) {
  const body = await c.req.json();
  const validated = CreateSchema.parse(body);
  // Use validated data
}
```

### GET with Path Parameters
```typescript
const getByIdRoute = createRoute({
  method: "get",
  path: "/api/users/:id",
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  responses: { /* ... */ },
});

export async function getByIdHandler(c: Context) {
  const { id } = c.req.param();
  // Use id
}
```

---

## Your Current Setup

✅ **Homepage Visitors Feature**

```
GET /api/homepage/visitors/count

Flow:
Request
  → app.ts (routes to /api/homepage → homePageRouter)
  → routes/_homepage/index.ts (mounts visitorsRouter)
  → routes/_homepage/visitors.routes.ts (registers route)
  → controllers/_homepage/visitors.controller.ts (handles logic)
  → Returns: { "count": 123 }
```

---

## Testing Your API

1. **Start the server:**
   ```bash
   bun run dev
   ```

2. **Access Swagger UI:**
   - Open: http://localhost:3000/swagger
   - Or: http://localhost:3000/openapi_docs (raw JSON)

3. **Test the endpoint:**
   ```bash
   curl http://localhost:3000/api/homepage/visitors/count
   ```

---

## Next Steps

To add more features to the homepage module:

1. Create new controller: `src/controllers/_homepage/[new-feature].controller.ts`
2. Create new routes: `src/routes/_homepage/[new-feature].routes.ts`
3. Import in `src/routes/_homepage/index.ts`:
   ```typescript
   import { newFeatureRouter } from "./[new-feature].routes.ts";
   homePageRouter.route("/", newFeatureRouter);
   ```

That's it! The new routes will automatically appear in the OpenAPI docs.