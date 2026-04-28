import { config } from "dotenv"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"

const dir = dirname(fileURLToPath(import.meta.url))
// Resolve upward: src/ → api/ → apps/ → repo root
config({ path: resolve(dir, "../../../.env"), override: false })
