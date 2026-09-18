import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { getAnalysis } from "../api/analysis";
import { HeatmapViewer } from "../components/evidence/HeatmapViewer";
import { ProcessingTimeline } from "../components/evidence/ProcessingTimeline";
import type { Analysis } from "../types/analysis";

const POLL_INTERVAL_MS = 800;

export function AnalysisResult() {
  const { id } = useParams<{ id: string }>();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    const poll = async () => {
      try {
        const result = await getAnalysis(id);
        if (cancelled) return;
        setAnalysis(result);
        setError(null);
        if (result.status === "COMPLETED" || result.status === "FAILED") {
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error
            ? err.message
            : "Could not load this analysis. The server may be unreachable.",
        );
        if (pollRef.current) clearInterval(pollRef.current);
      }
    };

    poll();
    pollRef.current = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [id]);

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <p className="rounded-sm border border-evidence/30 bg-evidence-soft px-4 py-3 text-sm text-evidence">
          {error}
        </p>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center font-mono text-sm text-ink-muted">
        Loading analysis…
      </div>
    );
  }

  const isProcessing = analysis.status === "QUEUED" || analysis.status === "PROCESSING";
  const page = analysis.pages[0];

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <header className="mb-8 flex items-start justify-between border-b border-border pb-6">
        <div>
          <p className="mb-1 font-mono text-xs uppercase tracking-[0.2em] text-ink-faint">
            Analysis
          </p>
          <h1 className="truncate text-xl font-medium text-ink">{analysis.documentName}</h1>
          <p className="mt-1 font-mono text-xs text-ink-muted">
            {analysis.pageCount} page · {analysis.documentType || "image"}
          </p>
        </div>
        <StatusBadge status={analysis.status} />
      </header>

      {isProcessing && (
        <div className="rounded-sm border border-border bg-surface p-8">
          <ProcessingTimeline status={analysis.status} currentStage={analysis.stage} />
        </div>
      )}

      {analysis.status === "FAILED" && (
        <div className="rounded-sm border border-evidence/30 bg-evidence-soft p-6 text-sm text-evidence">
          Analysis failed{analysis.error ? `: ${analysis.error}` : "."} Try uploading the
          image again.
        </div>
      )}

      {analysis.status === "COMPLETED" && page && (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
          <HeatmapViewer page={page} />

          <aside className="flex flex-col gap-6">
            <div className="rounded-sm border border-border bg-surface p-5">
              <h2 className="mb-2 font-mono text-xs uppercase tracking-wide text-ink-faint">
                CAT-Net Evidence
              </h2>
              <p className="text-sm text-ink">
                {page.catnet.hasEvidence === undefined
                  ? "Localization complete — review the heatmap for any highlighted regions."
                  : page.catnet.hasEvidence
                    ? "Localized evidence detected on this page."
                    : "No localized evidence detected on this page."}
              </p>
            </div>

            {analysis.narrativeError && (
              <div className="rounded-sm border border-caution/30 bg-surface p-5">
                <h2 className="mb-2 font-mono text-xs uppercase tracking-wide text-caution">
                  Narrative Unavailable
                </h2>
                <p className="text-sm leading-relaxed text-ink-muted">
                  {analysis.narrativeError}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-ink-faint">
                  The CAT-Net localization above is unaffected — only the written
                  interpretation is missing.
                </p>
              </div>
            )}

            {analysis.narrative && (
              <div className="rounded-sm border border-border bg-surface p-5">
                <h2 className="mb-2 font-mono text-xs uppercase tracking-wide text-ink-faint">
                  Narrative Interpretation
                </h2>
                <p className="text-sm leading-relaxed text-ink-muted">
                  {analysis.narrative.summary}
                </p>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: Analysis["status"] }) {
  const styles: Record<Analysis["status"], string> = {
    QUEUED: "border-ink-faint/40 text-ink-muted",
    PROCESSING: "border-accent/40 text-accent",
    COMPLETED: "border-accent/40 bg-accent-soft text-accent",
    FAILED: "border-evidence/40 bg-evidence-soft text-evidence",
  };

  return (
    <span
      className={`shrink-0 rounded-sm border px-2.5 py-1 font-mono text-[11px] uppercase tracking-wide ${styles[status]}`}
    >
      {status}
    </span>
  );
}
