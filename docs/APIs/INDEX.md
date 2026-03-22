# Jarvis Representative Agent APIs

Phase 1 documents three representative agent surfaces generated from tsoa
controllers:

- **Dialogue** - conversational responses and health/metrics probes
- **Web** - real-time search plus health/metrics probes
- **Knowledge** - research, fact-checking, summarization, and diagnostics

## Generated artifacts

- `openapi.json` - generated OpenAPI document normalized to 3.1
- `generated/routes.ts` - generated tsoa Express routes for the representative
  controllers
- `index.html` - static Swagger UI shell that loads `openapi.json`

## Source of truth

The OpenAPI document is generated from:

- `src/api/controllers/dialogue-agent-controller.ts`
- `src/api/controllers/web-agent-controller.ts`
- `src/api/controllers/knowledge-agent-controller.ts`

No hand-written YAML specification is maintained in this folder.

## Local preview

1. Generate the spec and routes:

   ```bash
   npm run docs:openapi
   ```

2. Serve the docs bundle:

   ```bash
   npm run docs:serve
   ```

3. Open:
   - TypeDoc site: `http://127.0.0.1:8080/API-REFERENCE/index.html`
   - Swagger UI: `http://127.0.0.1:8080/APIs/index.html`
