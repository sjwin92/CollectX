/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

// MCP tool files under src/lib/mcp/ are bundled into a Deno edge function.
// `process.env` exists in that runtime; declare it so the browser typecheck passes.
declare const process: { env: Record<string, string | undefined> };
