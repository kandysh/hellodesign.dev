import type { QueryClient } from "@tanstack/react-query"
import { createRootRouteWithContext, Outlet, useLocation } from "@tanstack/react-router"
import { Footer } from "../components/Footer"
import Header from "../components/Header"
import { ToastProvider } from "../components/Toast"

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
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
