import { getScoreLevel, SCORE_BAR_CLASSES } from "@/lib/score";

interface ScoreBarProps {
  label: string;
  score: number;
  explanation?: string;
}

export function ScoreBar({ label, score, explanation }: ScoreBarProps) {
  const clamped = Math.max(0, Math.min(100, score));
  const level = getScoreLevel(clamped);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="text-slate-500">{Math.round(clamped)}%</span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className={`h-full rounded-full ${SCORE_BAR_CLASSES[level]}`}
          style={{ width: `${clamped}%`, transition: "width 0.5s ease" }}
        />
      </div>
      {explanation && <p className="mt-1 text-xs text-slate-500">{explanation}</p>}
    </div>
  );
}
