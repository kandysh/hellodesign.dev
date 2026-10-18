import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { build } from "esbuild"

const appDir = dirname(fileURLToPath(import.meta.url))
const repoDir = resolve(appDir, "../..")

await build({
  entryPoints: [resolve(appDir, "src/index.ts")],
  outfile: resolve(appDir, "dist/index.js"),
  bundle: true,
  packages: "external",
  platform: "node",
  format: "esm",
  target: "node20",
  sourcemap: true,
  alias: {
    "@sysdesign/ai": resolve(repoDir, "packages/ai/src/index.ts"),
    "@sysdesign/auth": resolve(repoDir, "packages/auth/src/index.ts"),
    "@sysdesign/db": resolve(repoDir, "packages/db/src/index.ts"),
    "@sysdesign/queue": resolve(repoDir, "packages/queue/src/index.ts"),
    "@sysdesign/shared": resolve(repoDir, "packages/shared/src/index.ts"),
  },
})
