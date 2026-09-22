import type { ReactNode } from "react";

interface AuthShellProps {
  eyebrow: string;
  title: string;
  children: ReactNode;
}

/** Centred card used by both auth pages so they stay identical. */
export function AuthShell({ eyebrow, title, children }: AuthShellProps) {
  return (
    <div className="flex min-h-[calc(100vh-200px)] items-center justify-center px-6 py-12">
      {/* No product mark here — the navbar directly above already carries it. */}
      <div className="w-full max-w-md">
        <div className="rounded-sm border border-border bg-surface p-8 shadow-panel">
          <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-ink-faint">
            {eyebrow}
          </p>
          <h1 className="mb-8 text-2xl font-medium tracking-tight text-ink">{title}</h1>
          {children}
        </div>
      </div>
    </div>
  );
}
