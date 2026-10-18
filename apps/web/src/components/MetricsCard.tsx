import type React from "react"

interface MetricsCardProps {
  label: string
  value: string | number
  unit?: string
  icon: React.ReactNode
  iconColor?: string
  progress?: number
  description?: string
  accentColor?: "tertiary" | "secondary" | "primary"
}

export function MetricsCard({
  label,
  value,
  unit,
  icon,
  iconColor = "var(--app-green)",
  progress,
  description,
  accentColor = "tertiary",
}: MetricsCardProps) {
  const accentColors = {
    tertiary: {
      bg: "var(--app-green)",
      light: "rgba(78,222,163,0.1)",
      darker: "rgba(78,222,163,0.2)",
    },
    secondary: { bg: "#b9c8de", light: "rgba(185,200,222,0.1)", darker: "rgba(185,200,222,0.2)" },
    primary: {
      bg: "var(--app-indigo-pale)",
      light: "rgba(192,193,255,0.1)",
      darker: "var(--app-indigo-20)",
    },
  }

  const accent = accentColors[accentColor]

  return (
    <div
      className="surface-card flex min-h-40 flex-col gap-4 p-5 relative overflow-hidden"
      style={{
        background: "var(--app-card-gradient), var(--app-card-bg)",
      }}
    >
      <div className="relative z-10 flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold tracking-wide" style={{ color: "var(--app-subtle)" }}>
          {label}
        </h3>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ background: accent.light, color: iconColor }}
        >
          {icon}
        </div>
      </div>

      <div className="relative z-10 flex items-baseline gap-2">
        <span
          className="text-3xl font-semibold tabular-nums"
          style={{ color: "var(--app-fg)", letterSpacing: "-0.045em" }}
        >
          {value}
        </span>
        {unit && (
          <span className="text-sm" style={{ color: "var(--app-subtle)" }}>
            {unit}
          </span>
        )}
      </div>

      {/* Progress bar */}
      {progress !== undefined && (
        <div
          className="relative z-10 mt-auto h-1.5 w-full overflow-hidden rounded-full"
          style={{ background: "var(--app-surface-4)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              background: accent.bg,
              width: `${progress}%`,
            }}
          />
        </div>
      )}

      {/* Description */}
      {description && (
        <p className="relative z-10 text-xs leading-relaxed" style={{ color: "var(--app-subtle)" }}>
          {description}
        </p>
      )}
    </div>
  )
}
