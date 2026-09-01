import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ScoreGauge } from "@/components/ui/ScoreGauge";
import { ScoreBar } from "@/components/ui/ScoreBar";
import { formatDateTime } from "@/lib/format";
import type { JobMatch } from "@/types/api";

export function JobMatchResultCard({ match }: { match: JobMatch }) {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          <ScoreGauge score={match.matchPercentage} label="Match Score" />
          <div className="flex-1">
            <p className="text-xs text-slate-400">Matched {formatDateTime(match.createdAt)}</p>
            {match.scoreBreakdown.length > 0 && (
              <div className="mt-4 flex flex-col gap-3">
                {match.scoreBreakdown.map((item) => (
                  <ScoreBar
                    key={item.key}
                    label={item.label}
                    score={item.score}
                    explanation={item.explanation}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader title="Matched Skills" />
          {match.matchedSkills.length === 0 ? (
            <p className="text-sm text-slate-500">No matched skills found.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {match.matchedSkills.map((skill) => (
                <Badge key={skill} variant="success">
                  {skill}
                </Badge>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Missing Skills" />
          {match.missingSkills.length === 0 ? (
            <p className="text-sm text-slate-500">No skill gaps identified.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {match.missingSkills.map((skill) => (
                <Badge key={skill} variant="danger">
                  {skill}
                </Badge>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader title="Strengths" />
        <ul className="space-y-1.5">
          {match.strengths.map((item, index) => (
            <li key={index} className="flex items-start gap-2 text-sm text-slate-600">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
              {item}
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardHeader title="Recommendations" />
        <ul className="space-y-1.5">
          {match.recommendations.map((item, index) => (
            <li key={index} className="flex items-start gap-2 text-sm text-slate-600">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
              {item}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
