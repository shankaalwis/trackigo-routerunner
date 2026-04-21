import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";

export default defineConfig({
  plugins: [
    tsConfigPaths(),
    tailwindcss(),
    TanStackRouterVite({ autoCodeSplitting: true }),
    react(),
  ],
  server: {
    port: 8080,
    strictPort: false,
  },
  resolve: {
    dedupe: ["react", "react-dom", "@tanstack/react-router"],
  },
});
