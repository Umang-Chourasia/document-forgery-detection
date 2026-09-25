import type { ReactNode } from "react";

interface AuthShellProps {
  eyebrow: string;
  title: string;
  children: ReactNode;
}

/**
 * Two-column editorial split rather than a centred card: a quiet statement
 * on the left against the deeper canvas, the form on the right. Below `lg`
 * the statement drops away and the form takes the column on its own.
 */
export function AuthShell({ eyebrow, title, children }: AuthShellProps) {
  return (
    <div className="grid min-h-[calc(100svh-4.25rem)] grid-cols-1 lg:grid-cols-12">
      <aside className="hidden border-r border-hairline bg-canvas-deep px-12 py-16 lg:col-span-5 lg:flex lg:flex-col lg:justify-between xl:px-16">
        <p className="label text-ink-faint">Document Forensics</p>
        <div>
          <p className="max-w-sm text-title font-medium leading-snug tracking-tight text-ink">
            Evidence you can inspect, not a score you have to trust.
          </p>
          <p className="mt-5 max-w-sm text-body leading-relaxed text-ink-muted">
            Every result is a localization you can open, zoom into and read for
            yourself.
          </p>
        </div>
        <p className="label text-ink-faint">Localization only</p>
      </aside>

      <div className="flex items-center px-6 py-16 sm:px-10 lg:col-span-7 lg:px-16 xl:px-24">
        <div className="w-full max-w-sm">
          <p className="label mb-3 text-ink-faint">{eyebrow}</p>
          <h1 className="mb-10 text-title font-medium tracking-tight text-ink">{title}</h1>
          {children}
        </div>
      </div>
    </div>
  );
}
