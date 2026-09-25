import type { InputHTMLAttributes, ReactNode } from "react";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  /** Rendered under the input, e.g. "At least 6 characters." */
  hint?: ReactNode;
}

/**
 * Underline field: a bottom hairline that lights on focus, with the label
 * above in mono micro-type. No box, no fill — the form reads as a document
 * being filled in rather than a stack of widgets.
 *
 * The <label> wraps the control so the association holds without needing
 * matching htmlFor/id pairs, but any `id` passed through is preserved: the
 * auth pages set login-email / signup-consent and tests select on them.
 */
export function Field({ label, hint, className = "", ...rest }: FieldProps) {
  return (
    <label className="flex flex-col gap-2">
      <span className="label text-ink-faint">{label}</span>
      <input
        className={
          "w-full border-0 border-b border-hairline bg-transparent pb-2 text-body " +
          "text-ink outline-none transition-colors placeholder:text-ink-faint " +
          "focus:border-accent " +
          className
        }
        {...rest}
      />
      {hint && <span className="text-small text-ink-faint">{hint}</span>}
    </label>
  );
}
