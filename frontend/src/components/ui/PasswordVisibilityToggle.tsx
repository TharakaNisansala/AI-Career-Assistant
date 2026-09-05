import { Eye, EyeOff } from "lucide-react";

interface PasswordVisibilityToggleProps {
  visible: boolean;
  onToggle: () => void;
}

export function PasswordVisibilityToggle({ visible, onToggle }: PasswordVisibilityToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={visible ? "Hide password" : "Show password"}
      className="text-slate-400 transition-colors hover:text-slate-600"
    >
      {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );
}
