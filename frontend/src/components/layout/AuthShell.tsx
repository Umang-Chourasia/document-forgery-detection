import type { ReactNode } from "react";

interface AuthShellProps {
  eyebrow: string;
  title: string;
  children: ReactNode;
}

/**
 * Two panels rather than a centred card: a statement panel on the dot grid
 * on the left, the form on the right. Below `lg` the statement drops away and
 * the form takes the column on its own.
 */
export function AuthShell({ eyebrow, title, children }: AuthShellProps) {
  return (
    <div className="grid min-h-[calc(100svh-var(--spacing-nav))] grid-cols-1 gap-6 px-4 pb-4 sm:px-6 sm:pb-6 lg:grid-cols-2">
      <aside className="dots hidden flex-col justify-between rounded-hero border border-hairline bg-well p-12 lg:flex xl:p-16">
        <span className="self-start rounded-full border border-border px-4 py-1.5 text-small text-ink-muted">
          Document Forensics
        </span>
        <div>
          <p className="max-w-lg text-[3.5rem] font-medium leading-[0.98] tracking-[-0.045em] text-ink xl:text-[4.5rem]">
            Evidence you can inspect.
          </p>
          <p className="mt-6 max-w-md text-lead leading-relaxed text-ink-muted">
            Not a score you have to trust. Every result is a localization you
            can open, zoom into and read for yourself.
          </p>
        </div>
        <p className="text-small text-ink-dim">Evidence for review — not a verdict.</p>
      </aside>

      <div className="flex items-center justify-center py-12">
        <div className="w-full max-w-md">
          <span className="rounded-full border border-border px-4 py-1.5 text-small text-ink-muted">
            {eyebrow}
          </span>
          <h1 className="mb-10 mt-6 text-[3rem] font-medium leading-none tracking-[-0.04em] text-ink sm:text-[3.5rem]">
            {title}
          </h1>
          {children}
        </div>
      </div>
    </div>
  );
}
