import type { QueryClient } from "@tanstack/react-query"
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
  useLocation,
} from "@tanstack/react-router"
import { Footer } from "../components/Footer"
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
      {
        name: "description",
        content: "Practice system design questions with AI-powered multi-dimensional feedback.",
      },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootDocument,
  component: RootLayout,
})

function RootLayout() {
  const { pathname } = useLocation()
  // Auth pages render their own full-screen layout — no chrome needed.
  const isAuthPage = pathname.startsWith("/auth")
  // Workspace + interview pages are full-screen; the footer would bleed below
  // them and create an unwanted scroll, so we suppress it there too.
  const isFullScreenWorkspace = !isAuthPage && /^\/questions\/[^/]+(\/interview)?$/.test(pathname)

  return (
    <ToastProvider>
      {!isAuthPage && <Header />}
      <main className={isAuthPage ? "" : "pt-16"}>
        <Outlet />
      </main>
      {!isAuthPage && !isFullScreenWorkspace && <Footer />}
    </ToastProvider>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="sysdesign" className="dark">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-base-100 text-base-content antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  )
}
