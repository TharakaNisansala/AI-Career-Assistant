import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ScoreGauge } from "@/components/ui/ScoreGauge";
import { ScoreBar } from "@/components/ui/ScoreBar";
import { formatDateTime } from "@/lib/format";
import type { ResumeAnalysis } from "@/types/api";

interface AnalysisDetailProps {
  analysis: ResumeAnalysis;
}

function ListSection({ title, items, variant }: { title: string; items: string[]; variant: "success" | "danger" | "info" }) {
  if (items.length === 0) return null;
  const dotClass = {
    success: "bg-emerald-500",
    danger: "bg-red-500",
    info: "bg-indigo-500",
  }[variant];

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      <ul className="mt-2 space-y-1.5">
        {items.map((item, index) => (
          <li key={index} className="flex items-start gap-2 text-sm text-slate-600">
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dotClass}`} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AnalysisDetail({ analysis }: AnalysisDetailProps) {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          <ScoreGauge score={analysis.atsScore} label="ATS Score" />
          <div className="flex-1">
            <p className="text-xs text-slate-400">Analyzed {formatDateTime(analysis.createdAt)}</p>
            {analysis.summary && <p className="mt-2 text-sm text-slate-700">{analysis.summary}</p>}
            {analysis.scoreBreakdown.length > 0 && (
              <div className="mt-4 flex flex-col gap-3">
                {analysis.scoreBreakdown.map((item) => (
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
          <ListSection title="Strengths" items={analysis.strengths} variant="success" />
        </Card>
        <Card>
          <ListSection title="Weaknesses" items={analysis.weaknesses} variant="danger" />
        </Card>
      </div>

      <Card>
        <CardHeader title="Skills Detected" />
        {analysis.skills.length === 0 ? (
          <p className="text-sm text-slate-500">No skills were detected on this resume.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {analysis.skills.map((skill) => (
              <Badge key={skill} variant="info">
                {skill}
              </Badge>
            ))}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader title="Education" />
          {analysis.education.length === 0 ? (
            <p className="text-sm text-slate-500">No education entries were detected.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {analysis.education.map((entry, index) => (
                <li key={index} className="rounded-md border border-slate-100 p-3">
                  <p className="text-sm font-medium text-slate-800">
                    {entry.degree}
                    {entry.field ? `, ${entry.field}` : ""}
                  </p>
                  <p className="text-xs text-slate-500">
                    {[entry.institution, entry.graduationYear].filter(Boolean).join(" · ")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Experience" />
          {analysis.experience.length === 0 ? (
            <p className="text-sm text-slate-500">No experience entries were detected.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {analysis.experience.map((entry, index) => (
                <li key={index} className="rounded-md border border-slate-100 p-3">
                  <p className="text-sm font-medium text-slate-800">{entry.title}</p>
                  <p className="text-xs text-slate-500">
                    {[entry.company, [entry.startDate, entry.endDate].filter(Boolean).join(" - ")]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {entry.description && (
                    <p className="mt-1 text-xs text-slate-600">{entry.description}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <ListSection title="Recommendations" items={analysis.recommendations} variant="info" />
      </Card>
    </div>
  );
}
