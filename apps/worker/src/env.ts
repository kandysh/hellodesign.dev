import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { config } from "dotenv"

const dir = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(dir, "../../../.env"), override: false })
const { assertSecurityEnvironment } = await import("@sysdesign/db")
assertSecurityEnvironment({ requireAuthSecret: true })
