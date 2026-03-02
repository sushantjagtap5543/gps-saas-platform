import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/admin/",   // CRITICAL: admin is served at /admin/ via nginx
  build: {
    outDir: "dist",
    sourcemap: false
  }
});
