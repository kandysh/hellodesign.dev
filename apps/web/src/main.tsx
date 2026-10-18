import { QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider } from "@tanstack/react-router"
import React from "react"
import ReactDOM from "react-dom/client"
import { initTheme } from "./lib/theme"
import { queryClient, router } from "./router"
import "@excalidraw/excalidraw/index.css"
import "./styles.css"

// A long-lived tab can keep an older entry bundle across a deployment. If that
// bundle later requests a removed hashed chunk, reload once for that build.
const preloadRecoveryKey = "hellodesign:preload-recovery"
window.addEventListener("vite:preloadError", (event) => {
  const entryBundle = document.querySelector<HTMLScriptElement>('script[type="module"][src]')?.src
  if (!entryBundle) return

  try {
    if (sessionStorage.getItem(preloadRecoveryKey) === entryBundle) return
    sessionStorage.setItem(preloadRecoveryKey, entryBundle)
    event.preventDefault()
    window.location.reload()
  } catch {
    // Keep the import error visible when session storage is unavailable.
  }
})

// Apply saved or OS-preferred theme before first paint
initTheme()

// biome-ignore lint/style/noNonNullAssertion: root element is always present in index.html
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>,
)
