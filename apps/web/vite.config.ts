import tailwindcss from "@tailwindcss/vite"
import { TanStackRouterVite } from "@tanstack/router-plugin/vite"
import { defineConfig } from "vite"
import viteTsConfigPaths from "vite-tsconfig-paths"

export default defineConfig({
  plugins: [
    tailwindcss(),
    viteTsConfigPaths({ projects: ["./tsconfig.json"] }),
    TanStackRouterVite({
      routesDirectory: "./src/routes",
      generatedRouteTree: "./src/routeTree.gen.ts",
      autoCodeSplitting: true,
    }),
  ],
  preview: {
    allowedHosts: true,
    proxy: {
      "/api": { target: "http://localhost:3001", changeOrigin: true, ws: true },
    },
  },
  server: {
    proxy: {
      "/api": { target: "http://localhost:3001", changeOrigin: true, ws: true },
    },
  },
})
