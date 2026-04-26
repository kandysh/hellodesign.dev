import { config } from "dotenv"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"

const dir = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(dir, "../../../.env"), override: false })
