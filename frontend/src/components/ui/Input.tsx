import type { InputHTMLAttributes, ReactNode } from "react";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  /** Rendered under the input, e.g. "At least 6 characters." */
  hint?: ReactNode;
}

/**
 * Labelled text input. The <label> wraps the control, so the association
 * holds without needing matching htmlFor/id pairs — but the ids the existing
 * pages pass through are preserved, since the E2E tests select on them.
 */
export function Field({ label, hint, className = "", ...rest }: FieldProps) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-xs uppercase tracking-wide text-ink-faint">
        {label}
      </span>
      <input
        className={
          "rounded-sm border border-border bg-surface px-3 py-2.5 text-sm text-ink " +
          "outline-none transition-colors placeholder:text-ink-faint focus:border-accent " +
          className
        }
        {...rest}
      />
      {hint && <span className="text-xs text-ink-faint">{hint}</span>}
    </label>
  );
}
