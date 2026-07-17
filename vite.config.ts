import { defineConfig } from "vite";

// Dev port 5179 — 5173/5174/5178 are claimed by other local projects (see RUNBOOK.md).
export default defineConfig({
  server: {
    port: 5179,
    strictPort: true,
  },
});
