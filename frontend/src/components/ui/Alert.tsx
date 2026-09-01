import type { ReactNode } from "react";

type Variant = "error" | "success" | "info" | "warning";

const VARIANT_CLASSES: Record<Variant, string> = {
  error: "bg-red-50 text-red-800 border-red-200",
  success: "bg-emerald-50 text-emerald-800 border-emerald-200",
  info: "bg-blue-50 text-blue-800 border-blue-200",
  warning: "bg-amber-50 text-amber-800 border-amber-200",
};

interface AlertProps {
  variant?: Variant;
  title?: string;
  children: ReactNode;
}

export function Alert({ variant = "info", title, children }: AlertProps) {
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={`rounded-md border px-4 py-3 text-sm ${VARIANT_CLASSES[variant]}`}
    >
      {title && <p className="font-medium">{title}</p>}
      <div className={title ? "mt-1" : ""}>{children}</div>
    </div>
  );
}
