import { useState, useEffect, useCallback, createContext, useContext } from "react"
import { cn } from "@/lib/utils"
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react"

// ── Types ──────────────────────────────────────────────────────────────────

type ToastType = "success" | "error" | "info" | "warning"

interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
}

// ── Context ────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue>({
  toast: () => {},
})

export function useToast() {
  return useContext(ToastContext)
}

// ── Provider ───────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3000)
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="toast toast-top toast-end z-[100]" aria-live="polite">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// ── Item ───────────────────────────────────────────────────────────────────

const toastConfig: Record<ToastType, { classes: string; Icon: typeof CheckCircle }> = {
  success: { classes: "alert-success", Icon: CheckCircle },
  error:   { classes: "alert-error",   Icon: AlertCircle },
  info:    { classes: "alert-info",    Icon: Info },
  warning: { classes: "alert-warning", Icon: AlertTriangle },
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const { classes, Icon } = toastConfig[toast.type]

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 3000)
    return () => clearTimeout(timer)
  }, [toast.id, onDismiss])

  return (
    <div
      role="alert"
      className={cn(
        "alert shadow-lg shadow-indigo-950/40 rounded-xl text-sm flex items-center gap-2 animate-in slide-in-from-right-4 duration-200",
        classes,
      )}
    >
      <Icon size={15} className="shrink-0" />
      <span>{toast.message}</span>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="ml-1 rounded p-0.5 hover:opacity-70"
        aria-label="Dismiss"
      >
        <X size={13} />
      </button>
    </div>
  )
}
