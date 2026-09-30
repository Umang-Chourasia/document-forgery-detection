import { useEffect, useState } from "react";
import type { Analysis } from "../../types/analysis";

interface DownloadReportButtonProps {
  analysis: Analysis;
  /** "pill" for the top bar, "menu" for the mobile menu row. */
  variant?: "pill" | "menu";
  onDone?: () => void;
}

/**
 * Builds and downloads the PDF report of the analysis on screen. The report
 * code (and pdf-lib) is only fetched on the first click.
 *
 * Rendered by the caller only once the analysis is final — see
 * `isReportReady` — so it never appears while the interpretation is still
 * being written.
 */
export function DownloadReportButton({ analysis, variant = "pill", onDone }: DownloadReportButtonProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A failure note is transient; it clears itself.
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 6000);
    return () => clearTimeout(timer);
  }, [error]);

  const handleClick = async () => {
    setBusy(true);
    setError(null);
    try {
      const { downloadReport } = await import("../../report/downloadReport");
      await downloadReport(analysis);
      onDone?.();
    } catch {
      setError("The report could not be created. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const label = busy ? "Preparing report…" : "Download Report";

  if (variant === "menu") {
    return (
      <>
        <button
          onClick={handleClick}
          disabled={busy}
          className="rounded-control px-4 py-3.5 text-left text-body text-ink transition-colors hover:bg-surface-raised disabled:opacity-50"
        >
          {label}
        </button>
        {error && (
          <p role="alert" className="px-4 pb-2 text-small text-evidence">
            {error}
          </p>
        )}
      </>
    );
  }

  return (
    <span className="relative hidden md:inline-flex">
      <button
        onClick={handleClick}
        disabled={busy}
        aria-busy={busy}
        className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-small font-medium text-ink transition-colors hover:border-border-strong hover:bg-surface disabled:cursor-wait disabled:opacity-60"
      >
        <DownloadGlyph />
        {label}
      </button>
      {error && (
        <span
          role="alert"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-30 w-64 rounded-control border border-border bg-surface px-4 py-3 text-small text-evidence shadow-[0_24px_60px_-20px_rgba(0,0,0,0.8)]"
        >
          {error}
        </span>
      )}
    </span>
  );
}

function DownloadGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
      <path
        d="M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M5 19h14"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
