export type ScoreLevel = "high" | "medium" | "low";

export function getScoreLevel(score: number): ScoreLevel {
  if (score >= 80) return "high";
  if (score >= 50) return "medium";
  return "low";
}

export const SCORE_TEXT_CLASSES: Record<ScoreLevel, string> = {
  high: "text-emerald-600",
  medium: "text-amber-600",
  low: "text-red-600",
};

export const SCORE_BAR_CLASSES: Record<ScoreLevel, string> = {
  high: "bg-emerald-500",
  medium: "bg-amber-500",
  low: "bg-red-500",
};

export const SCORE_STROKE_COLORS: Record<ScoreLevel, string> = {
  high: "#10b981",
  medium: "#f59e0b",
  low: "#ef4444",
};
