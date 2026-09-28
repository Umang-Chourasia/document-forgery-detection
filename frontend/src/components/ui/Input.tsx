import type { InputHTMLAttributes, ReactNode } from "react";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  /** Rendered under the input, e.g. "At least 6 characters." */
  hint?: ReactNode;
}

/**
 * A soft filled field: rounded well, hairline border that brightens on focus,
 * label above.
 *
 * The <label> wraps the control so the association holds without needing
 * matching htmlFor/id pairs, but any `id` passed through is preserved: the
 * auth pages set login-email / signup-consent and tests select on them.
 */
export function Field({ label, hint, className = "", ...rest }: FieldProps) {
  return (
    <label className="flex flex-col gap-2.5">
      <span className="text-small text-ink-muted">{label}</span>
      <input
        className={
          "w-full rounded-control border border-border bg-surface px-5 py-4 text-body " +
          "text-ink outline-none transition-colors placeholder:text-ink-dim " +
          "hover:border-border-strong focus:border-ink/50 " +
          className
        }
        {...rest}
      />
      {hint && <span className="text-small text-ink-faint">{hint}</span>}
    </label>
  );
}
