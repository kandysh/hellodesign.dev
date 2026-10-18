import { cn } from "@/lib/utils"

type Difficulty = "easy" | "medium" | "hard"

interface DifficultyBadgeProps {
  difficulty: Difficulty
  solid?: boolean
  className?: string
}

const config: Record<Difficulty, { label: string; color: string }> = {
  easy: {
    label: "Easy",
    color: "var(--app-green)",
  },
  medium: {
    label: "Medium",
    color: "var(--app-amber)",
  },
  hard: {
    label: "Hard",
    color: "var(--app-red)",
  },
}

export function DifficultyBadge({ difficulty, solid = false, className }: DifficultyBadgeProps) {
  const { label, color } = config[difficulty] ?? config.medium
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold",
        className,
      )}
      style={{
        background: `color-mix(in srgb, ${color} ${solid ? "20%" : "10%"}, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 28%, transparent)`,
        color,
      }}
    >
      {label}
    </span>
  )
}
