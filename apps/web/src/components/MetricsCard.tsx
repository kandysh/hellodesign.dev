import React from "react"

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
    tertiary: { bg: "var(--app-green)", light: "rgba(78,222,163,0.1)", darker: "rgba(78,222,163,0.2)" },
    secondary: { bg: "#b9c8de", light: "rgba(185,200,222,0.1)", darker: "rgba(185,200,222,0.2)" },
    primary: { bg: "var(--app-indigo-pale)", light: "rgba(192,193,255,0.1)", darker: "var(--app-indigo-20)" },
  }

  const accent = accentColors[accentColor]

  return (
    <div
      className="rounded-xl p-6 flex flex-col gap-4 relative overflow-hidden group"
      style={{
        background: "var(--app-surface-2)",
        border: "1px solid var(--app-border)",
      }}
    >
      {/* Gradient blur circles */}
      <div
        className="absolute -right-8 -top-8 w-32 h-32 rounded-full blur-2xl group-hover:opacity-100 opacity-70 transition-all duration-500"
        style={{
          background: accent.light,
        }}
      />

      {/* Header: label + icon */}
      <div className="flex items-center justify-between relative z-10">
        <h3
          className="uppercase tracking-wider text-xs font-bold"
          style={{ color: "var(--app-subtle)" }}
        >
          {label}
        </h3>
        <div style={{ color: iconColor }}>{icon}</div>
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-2 relative z-10">
        <span
          className="text-5xl font-extrabold"
          style={{ color: "var(--app-fg)", letterSpacing: "-0.02em" }}
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
        <div className="w-full bg-surface-container-highest rounded-full h-1 mt-2 relative z-10">
          <div
            className="h-1 rounded-full transition-all duration-500"
            style={{
              background: accent.bg,
              width: `${progress}%`,
            }}
          />
        </div>
      )}

      {/* Description */}
      {description && (
        <p className="text-sm mt-2 relative z-10" style={{ color: "var(--app-subtle)" }}>
          {description}
        </p>
      )}
    </div>
  )
}
