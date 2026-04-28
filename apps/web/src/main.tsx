import React from "react"
import ReactDOM from "react-dom/client"
import { RouterProvider } from "@tanstack/react-router"
import { QueryClientProvider } from "@tanstack/react-query"
import { router, queryClient } from "./router"
import "./styles.css"

// biome-ignore lint/style/noNonNullAssertion: root element is always present in index.html
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>,
)
