import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(() => ({
  // react: fast-refresh JSX transforms; tailwindcss: Tailwind v4 CSS pipeline; cloudflare: Workers dev server & build.
  plugins: [react(), tailwindcss(), cloudflare()],
  resolve: {
    alias: {
      // Map the "@/" import alias used across src/ to the repo's src directory.
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    port: 3000,
  },
  build: {
    target: "es2022",
    rollupOptions: {
      output: {
        // Split vendor libraries into stable chunks so browser caches survive app-only rebuilds.
        manualChunks(id: string) {
          if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/")) {
            return "vendor-react";
          }
          if (id.includes("node_modules/react-router")) {
            return "vendor-router";
          }
          if (id.includes("node_modules/recharts/")) {
            return "charts";
          }
          if (id.includes("node_modules/@tanstack/react-query/")) {
            return "query";
          }
          if (id.includes("node_modules/lucide-react/")) {
            return "icons";
          }
          if (id.includes("node_modules/zustand/")) {
            return "state";
          }
        },
      },
    },
  },
}));