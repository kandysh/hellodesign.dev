interface ScoreRingProps {
  score: number // 0-100
  size?: number
  label?: string
}

function getScoreColor(score: number): string {
  if (score >= 75) return "#4ade80"  // success green
  if (score >= 50) return "#fbbf24"  // warning amber
  return "#f87171"                    // error red
}

export function ScoreRing({ score, size = 80, label }: ScoreRingProps) {
  const radius = (size - 10) / 2
  const circumference = 2 * Math.PI * radius
  const normalized = Math.max(0, Math.min(100, score))
  const offset = circumference - (normalized / 100) * circumference
  const color = getScoreColor(normalized)

  return (
    <div
      className="flex flex-col items-center gap-1"
      role="img"
      aria-label={`Score: ${Math.round(normalized)} out of 100`}
    >
      <svg width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={7}
          className="text-base-300/60"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={7}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
        <text
          x={size / 2}
          y={size / 2 + 4}
          textAnchor="middle"
          fontSize={size * 0.22}
          fontWeight="bold"
          fill={color}
        >
          {Math.round(normalized)}
        </text>
      </svg>
      {label && (
        <span className="text-xs text-base-content/50">{label}</span>
      )}
    </div>
  )
}
