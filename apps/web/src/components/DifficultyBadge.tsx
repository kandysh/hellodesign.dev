import { cn } from "@/lib/utils"

type Difficulty = "easy" | "medium" | "hard"

interface DifficultyBadgeProps {
  difficulty: Difficulty
  solid?: boolean
  className?: string
}

const config: Record<Difficulty, { label: string; bg: string; border: string; text: string }> = {
  easy: {
    label: "Easy",
    bg: "rgba(78,222,163,0.1)",
    border: "rgba(78,222,163,0.35)",
    text: "#4edea3",
  },
  medium: {
    label: "Medium",
    bg: "rgba(251,191,36,0.1)",
    border: "rgba(251,191,36,0.35)",
    text: "#fbbf24",
  },
  hard: {
    label: "Hard",
    bg: "rgba(255,180,171,0.1)",
    border: "rgba(255,180,171,0.35)",
    text: "#ffb4ab",
  },
}

export function DifficultyBadge({ difficulty, solid = false, className }: DifficultyBadgeProps) {
  const { label, bg, border, text } = config[difficulty] ?? config.medium
  return (
    <span
      className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold", className)}
      style={{
        background: solid ? bg.replace("0.1", "0.25") : bg,
        border: `1px solid ${border}`,
        color: text,
        fontFamily: "'Space Grotesk', monospace",
        letterSpacing: "0.02em",
      }}
    >
      {label}
    </span>
  )
}
