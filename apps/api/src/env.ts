import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { config } from "dotenv"

const dir = dirname(fileURLToPath(import.meta.url))
// Resolve upward: src/ → api/ → apps/ → repo root
config({ path: resolve(dir, "../../../.env"), override: false })
