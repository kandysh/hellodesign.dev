import { assertSecurityEnvironment, db } from "@sysdesign/db"
import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"

assertSecurityEnvironment({ requireAuthSecret: true })

const resendApiKey = process.env.RESEND_API_KEY
const authEmailFrom = process.env.AUTH_EMAIL_FROM
if (process.env.NODE_ENV === "production" && (!resendApiKey || !authEmailFrom)) {
  throw new Error(
    "RESEND_API_KEY and AUTH_EMAIL_FROM are required in production for account verification and password reset",
  )
}

function escapeHtml(value: string): string {
  const entities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }
  return value.replace(/[&<>"']/g, (character) => entities[character] ?? character)
}

async function sendAccountEmail(to: string, subject: string, action: string, url: string) {
  if (!resendApiKey || !authEmailFrom) {
    throw new Error("Email delivery is not configured")
  }
  const safeUrl = escapeHtml(url)
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: authEmailFrom,
      to: [to],
      subject,
      html: `<p>${action}</p><p><a href="${safeUrl}">${action}</a></p><p>If you did not request this, you can ignore this email.</p>`,
      text: `${action}: ${url}\n\nIf you did not request this, you can ignore this email.`,
    }),
  })
  if (!response.ok) throw new Error(`Account email delivery failed with status ${response.status}`)
}

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3001",
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      await sendAccountEmail(
        user.email,
        "Reset your Hello Design password",
        "Reset your password",
        url,
      )
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendAccountEmail(
        user.email,
        "Verify your Hello Design email",
        "Verify your email address",
        url,
      )
    },
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: {
      "/sign-up/email": { window: 60, max: 5 },
      "/sign-in/email": { window: 60, max: 10 },
      "/request-password-reset": { window: 600, max: 3 },
      "/send-verification-email": { window: 600, max: 3 },
    },
  },
  user: {
    additionalFields: {
      isAdmin: { type: "boolean", required: false, defaultValue: false, input: false },
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID ?? "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
    },
  },
  trustedOrigins: [process.env.WEB_URL ?? "http://localhost:3000"],
})

export type Auth = typeof auth
