import { createRouter } from '@tanstack/react-router'
import { QueryClient } from '@tanstack/react-query'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import { routeTree } from './routeTree.gen'

// getRouter is called once per request on the server and once on the client.
// A fresh QueryClient per call ensures no cross-request cache leakage on the server.
export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: false,
      },
    },
  })

  const router = createRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: 'intent',
  })

  // Injects QueryClientProvider via router.options.Wrap and wires up
  // dehydration (server) / hydration (client) automatically.
  setupRouterSsrQueryIntegration({ router, queryClient })

  return router
}
