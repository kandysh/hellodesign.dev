import { createAuthClient } from "better-auth/react"
import { API_BASE_URL } from "./api-client"

export const authClient = createAuthClient({
  ...(API_BASE_URL ? { baseURL: API_BASE_URL } : {}),
})

export const { signIn, signUp, signOut, useSession, getSession } = authClient
