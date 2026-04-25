import { HeadContent, Scripts, createRootRouteWithContext, Outlet } from "@tanstack/react-router"
import type { QueryClient } from "@tanstack/react-query"
import Header from "../components/Header"
import appCss from "../styles.css?url"

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "SysDesign Prep — Ace System Design Interviews" },
      { name: "description", content: "Practice system design questions with AI-powered multi-dimensional feedback." },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Header />
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
        <Scripts />
      </body>
    </html>
  )
}
