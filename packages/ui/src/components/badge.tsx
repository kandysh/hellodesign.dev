import { cn } from "../lib/utils.js"
import type { Difficulty } from "@sysdesign/types"

interface BadgeProps {
  children: React.ReactNode
  className?: string
  variant?: "default" | "outline" | "secondary"
}

export function Badge({ children, className, variant = "default" }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        variant === "default" && "bg-primary text-primary-foreground",
        variant === "outline" && "border border-current",
        variant === "secondary" && "bg-secondary text-secondary-foreground",
        className,
      )}
    >
      {children}
    </span>
  )
}

const difficultyColors: Record<Difficulty, string> = {
  easy: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  hard: "bg-red-100 text-red-800",
}

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
        difficultyColors[difficulty],
      )}
    >
      {difficulty}
    </span>
  )
}
