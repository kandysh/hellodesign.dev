import { cn } from "@/lib/utils"

type Difficulty = "easy" | "medium" | "hard"

interface DifficultyBadgeProps {
  difficulty: Difficulty
  solid?: boolean
  className?: string
}

const config: Record<Difficulty, { label: string; classes: string; solidClasses: string }> = {
  easy: {
    label: "Easy",
    classes: "badge-success badge-outline",
    solidClasses: "badge-success",
  },
  medium: {
    label: "Medium",
    classes: "badge-warning badge-outline",
    solidClasses: "badge-warning",
  },
  hard: {
    label: "Hard",
    classes: "badge-error badge-outline",
    solidClasses: "badge-error",
  },
}

export function DifficultyBadge({ difficulty, solid = false, className }: DifficultyBadgeProps) {
  const { label, classes, solidClasses } = config[difficulty] ?? config.medium
  return (
    <span
      className={cn(
        "badge badge-sm font-medium",
        solid ? solidClasses : classes,
        className,
      )}
    >
      {label}
    </span>
  )
}
