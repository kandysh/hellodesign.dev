import React, { useEffect, useState } from "react"
import { AlertTriangle, RotateCcw } from "lucide-react"

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, _errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div
            className="flex flex-col items-center justify-center gap-4 p-8 rounded-xl border border-error/30 bg-error/10 min-h-[200px]"
            role="alert"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-error/20 text-error">
              <AlertTriangle size={24} />
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-base-content mb-1">Something went wrong</h3>
              <p className="text-sm text-base-content/60 mb-4">
                {this.state.error?.message || "An unexpected error occurred"}
              </p>
              <button
                onClick={this.handleReset}
                className="btn btn-sm btn-outline gap-2 rounded-lg"
              >
                <RotateCcw size={14} />
                Try again
              </button>
            </div>
          </div>
        )
      )
    }

    return this.props.children
  }
}

// ── Offline Detection Indicator ────────────────────────────────────────────

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  if (isOnline) return null

  return (
    <div className="fixed bottom-4 left-4 flex items-center gap-2 px-4 py-3 rounded-lg bg-warning/10 border border-warning/30 text-warning text-sm animate-in slide-in-from-bottom-2 z-40">
      <div className="w-2 h-2 rounded-full bg-warning animate-pulse" />
      <span>You're offline. Changes will sync when reconnected.</span>
    </div>
  )
}

// ── Network Error Handler (hook) ───────────────────────────────────────────

export function useNetworkError() {
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const handleNetworkError = (event: Event) => {
      const err = event instanceof ErrorEvent ? new Error(event.message) : new Error("Network error")
      setError(err)
    }

    window.addEventListener("error", handleNetworkError)
    return () => window.removeEventListener("error", handleNetworkError)
  }, [])

  const clear = () => setError(null)

  return { error, clear }
}
