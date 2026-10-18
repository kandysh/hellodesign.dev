import type { auth } from "@sysdesign/auth"

declare module "fastify" {
  interface FastifyRequest {
    user: typeof auth.$Infer.Session.user | null
    authSession: typeof auth.$Infer.Session.session | null
    sessionId: string
  }
}
