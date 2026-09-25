import { useId, useState } from "react";
import type { ReactNode } from "react";

interface CollapsibleProps {
  title: string;
  titleClass?: string;
  /** Rendered opposite the title, e.g. a count. Hidden while closed is fine. */
  right?: ReactNode;
  defaultOpen?: boolean;
  /** Draws the rule above. Off for the first section in a column. */
  bordered?: boolean;
  children: ReactNode;
}

/**
 * A disclosure separated by a hairline rather than enclosed in a card. Used
 * in the rail so risk, interpretation and evidence can share a narrow column
 * without becoming an endless scroll.
 */
export function Collapsible({
  title,
  titleClass = "text-ink-faint",
  right,
  defaultOpen = true,
  bordered = true,
  children,
}: CollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();

  return (
    <section className={bordered ? "border-t border-hairline" : ""}>
      <h2>
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={id}
          className={`label flex w-full items-center justify-between gap-3 py-4 transition-colors hover:text-ink ${titleClass}`}
        >
          <span>{title}</span>
          <span className="flex items-center gap-2.5">
            {right}
            <Chevron open={open} />
          </span>
        </button>
      </h2>
      {open && (
        <div id={id} className="pb-6">
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
      className={`h-2.5 w-2.5 shrink-0 transition-transform ${open ? "" : "-rotate-90"}`}
    >
      <path d="M2 4.5L6 8.5L10 4.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}
