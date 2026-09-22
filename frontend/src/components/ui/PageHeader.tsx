import type { ReactNode } from "react";

interface PageHeaderProps {
  /** Small uppercase label above the title. */
  eyebrow: string;
  title: string;
  description?: ReactNode;
  right?: ReactNode;
  /** Draws the separator rule used on the result page. */
  bordered?: boolean;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  right,
  bordered = false,
}: PageHeaderProps) {
  return (
    <header
      className={`mb-8 flex flex-wrap items-start justify-between gap-4 ${
        bordered ? "border-b border-border pb-6" : ""
      }`}
    >
      <div className="min-w-0">
        <p className="mb-1 font-mono text-xs uppercase tracking-[0.2em] text-ink-faint">
          {eyebrow}
        </p>
        <h1 className="break-words text-2xl font-medium tracking-tight text-ink">
          {title}
        </h1>
        {description && (
          <div className="mt-2 max-w-xl text-sm leading-relaxed text-ink-muted">
            {description}
          </div>
        )}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </header>
  );
}
