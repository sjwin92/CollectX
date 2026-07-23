// MCP tool files are bundled into a Deno edge function at build time.
// `process.env` is available in that runtime; declare it so the Vite/browser
// TypeScript pass (which doesn't have @types/node) can typecheck the sources.
declare const process: { env: Record<string, string | undefined> };
