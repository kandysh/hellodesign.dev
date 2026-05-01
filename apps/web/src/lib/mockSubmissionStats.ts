import type { SubmissionStats } from "@sysdesign/types"

/**
 * Generate mock submission stats for frontend development.
 * Replace with real API call when backend stats endpoint is available.
 */
export function generateMockSubmissionStats(
  overallScore: number,
  questionId: string,
): SubmissionStats {
  // Calculate percentile: normally this comes from backend comparing user's score
  // to all submissions on this question. For now, mock a realistic distribution.
  const mockPercentile = Math.min(95, Math.max(10, Math.round((overallScore / 100) * 85 + Math.random() * 10)))

  // Mock dimension scores (these normally come from the rubric evaluation)
  const dimensions = [
    { id: "requirements", label: "Requirements Analysis" },
    { id: "scalability", label: "Scalability Design" },
    { id: "db_design", label: "Database Design" },
    { id: "fault_tolerance", label: "Fault Tolerance" },
    { id: "api_design", label: "API Design" },
    { id: "caching", label: "Caching Strategy" },
    { id: "trade_offs", label: "Trade-offs Analysis" },
    { id: "observability", label: "Observability & Monitoring" },
  ]

  // Generate dimension scores that average to overallScore
  const dimensionScores = dimensions.map((dim) => ({
    id: dim.id,
    label: dim.label,
    score: Math.min(100, Math.max(20, overallScore + (Math.random() * 30 - 15))),
  }))

  // Sort by score to find weak areas
  const weakAreas = [...dimensionScores]
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map((dim) => ({
      dimensionId: dim.id,
      label: dim.label,
      score: dim.score,
      suggestion: getSuggestionForDimension(dim.id, dim.score),
    }))

  // Mock historical submissions (user's past attempts on same question)
  const submissionHistory = Array.from({ length: Math.random() > 0.6 ? 3 : 1 }, (_, i) => ({
    submissionId: `sub-${i}`,
    score: Math.max(20, overallScore - Math.random() * 40),
    createdAt: new Date(Date.now() - (2 - i) * 86400000),
  })).reverse()

  // Expert reference: typically high score (80-95)
  const expertScore = Math.round(80 + Math.random() * 15)

  const feedbackSummary =
    overallScore >= 75
      ? "Strong design with solid understanding of scalability fundamentals."
      : overallScore >= 50
        ? "Good foundation with room for improvement in bottleneck analysis."
        : "Consider revisiting capacity estimation and fault tolerance planning."

  return {
    overallScore,
    percentileRank: mockPercentile,
    dimensionScores,
    weakAreas,
    submissionHistory,
    expertScore,
    feedbackSummary,
  }
}

function getSuggestionForDimension(dimensionId: string, score: number): string {
  const suggestions: Record<string, string> = {
    requirements: "Expand your functional requirements and add more specific non-functional goals.",
    scalability: "Discuss horizontal scaling strategies and potential bottlenecks.",
    db_design: "Consider trade-offs between SQL, NoSQL, and distributed databases.",
    fault_tolerance: "Add redundancy, failover mechanisms, and circuit breakers.",
    api_design: "Review API versioning, rate limiting, and error handling.",
    caching: "Explore cache invalidation strategies and cache-aside patterns.",
    trade_offs: "Explicitly discuss trade-offs (e.g., consistency vs. availability).",
    observability: "Add monitoring, logging, alerting, and metrics collection.",
  }

  return suggestions[dimensionId] || "Review this dimension and seek feedback."
}
