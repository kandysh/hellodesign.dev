import { HeadContent, Scripts, createRootRouteWithContext, Outlet } from "@tanstack/react-router"
import type { QueryClient } from "@tanstack/react-query"
import Header from "../components/Header"
import { ToastProvider } from "../components/Toast"
import appCss from "../styles.css?url"

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "sysdesign — AI-powered system design interview prep" },
      { name: "description", content: "Practice system design questions with AI-powered multi-dimensional feedback." },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="sysdesign">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-base-100 text-base-content antialiased">
        <ToastProvider>
          <Header />
          <main>{children}</main>
        </ToastProvider>
        <Scripts />
      </body>
    </html>
  )
}
