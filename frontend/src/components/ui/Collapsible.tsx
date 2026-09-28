import { useId, useState } from "react";
import type { ReactNode } from "react";

interface CollapsibleProps {
  title: string;
  titleClass?: string;
  /** Replaces the mono label with a full heading (icon, larger type). */
  heading?: ReactNode;
  /** Rendered opposite the title, e.g. a count. Hidden while closed is fine. */
  right?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}

/**
 * A disclosure panel. Used in the rail so risk, interpretation and evidence
 * read as separate soft panels without becoming an endless scroll.
 */
export function Collapsible({
  title,
  titleClass = "text-ink-faint",
  heading,
  right,
  defaultOpen = true,
  children,
}: CollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();

  return (
    <section className="rounded-card border border-hairline bg-surface">
      <h2>
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={id}
          aria-label={heading ? title : undefined}
          className={`flex w-full items-center justify-between gap-3 rounded-card px-7 py-6 transition-colors hover:text-ink ${
            heading ? "text-ink" : `label ${titleClass}`
          }`}
        >
          {heading ?? <span>{title}</span>}
          <span className="flex items-center gap-2.5">
            {right}
            <Chevron open={open} />
          </span>
        </button>
      </h2>
      {open && (
        <div id={id} className="px-7 pb-7">
          {children}
        </div>
      )}
    </section>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
      className={`h-3 w-3 shrink-0 transition-transform ${open ? "" : "-rotate-90"}`}
    >
      <path d="M2 4.5L6 8.5L10 4.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}
