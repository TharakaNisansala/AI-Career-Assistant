import type { ReactNode } from "react";

type Variant = "neutral" | "success" | "danger" | "info" | "warning";

const VARIANT_CLASSES: Record<Variant, string> = {
  neutral: "bg-slate-100 text-slate-700",
  success: "bg-emerald-100 text-emerald-700",
  danger: "bg-red-100 text-red-700",
  info: "bg-blue-100 text-blue-700",
  warning: "bg-amber-100 text-amber-700",
};

interface BadgeProps {
  variant?: Variant;
  children: ReactNode;
}

export function Badge({ variant = "neutral", children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${VARIANT_CLASSES[variant]}`}
    >
      {children}
    </span>
  );
}
