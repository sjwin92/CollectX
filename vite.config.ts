import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { readFileSync } from "fs";

const pkg = JSON.parse(readFileSync("./package.json", "utf-8"));
const buildDate = new Date().toISOString().slice(0, 10);
const appVersion = `${pkg.version}-${buildDate}`;

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  esbuild: {
    // Strip console.* and debugger statements from production bundles.
    // Keep them in dev so logs still surface during development.
    drop: mode === "production" ? ["console", "debugger"] : [],
  },
  build: {
    target: "es2020",
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes("node_modules")) return;
          if (id.includes("react-dom") || id.includes("scheduler") || /node_modules\/react\//.test(id)) {
            return "react-vendor";
          }
          if (id.includes("@supabase")) return "supabase-vendor";
          if (id.includes("@radix-ui")) return "radix-vendor";
          if (id.includes("@tanstack")) return "query-vendor";
          if (id.includes("recharts") || id.includes("d3-")) return "charts-vendor";
          if (id.includes("framer-motion")) return "motion-vendor";
          if (id.includes("date-fns") || id.includes("dayjs")) return "date-vendor";
          if (id.includes("lucide-react")) return "icons-vendor";
        },
      },
    },
  },
}));

