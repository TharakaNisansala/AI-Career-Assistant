import { getScoreLevel, SCORE_STROKE_COLORS, SCORE_TEXT_CLASSES } from "@/lib/score";

interface ScoreGaugeProps {
  score: number;
  label?: string;
  size?: number;
}

export function ScoreGauge({ score, label, size = 128 }: ScoreGaugeProps) {
  const clamped = Math.max(0, Math.min(100, score));
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);
  const level = getScoreLevel(clamped);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Decorative: the score is already rendered as text below, so screen
            readers shouldn't announce the ring's geometry separately. */}
        <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={10}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={SCORE_STROKE_COLORS[level]}
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.5s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-bold ${SCORE_TEXT_CLASSES[level]}`}>
            {Math.round(clamped)}
          </span>
          <span className="text-xs text-slate-400">/ 100</span>
        </div>
      </div>
      {label && <p className="text-sm font-medium text-slate-600">{label}</p>}
    </div>
  );
}
