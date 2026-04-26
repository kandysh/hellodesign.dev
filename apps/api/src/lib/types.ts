import type { auth } from "@sysdesign/auth"

export type AppEnv = {
  Variables: {
    user: typeof auth.$Infer.Session.user | null
    session: typeof auth.$Infer.Session.session | null
    sessionId: string
  }
}
