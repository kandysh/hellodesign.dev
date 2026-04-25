interface ScoreRingProps {
  score: number // 0-10
  size?: number
  label?: string
}

function getScoreColor(score: number): string {
  if (score >= 8) return "#22c55e" // green
  if (score >= 6) return "#eab308" // yellow
  if (score >= 4) return "#f97316" // orange
  return "#ef4444" // red
}

export function ScoreRing({ score, size = 80, label }: ScoreRingProps) {
  const radius = (size - 10) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 10) * circumference
  const color = getScoreColor(score)

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={8}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
        <text
          x={size / 2}
          y={size / 2 + 5}
          textAnchor="middle"
          fontSize={size * 0.22}
          fontWeight="bold"
          fill={color}
        >
          {score.toFixed(1)}
        </text>
      </svg>
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
    </div>
  )
}
