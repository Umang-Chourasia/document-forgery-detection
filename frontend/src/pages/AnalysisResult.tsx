import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getAnalysis } from "../api/analysis";
import { HeatmapViewer } from "../components/evidence/HeatmapViewer";
import { MeasuredEvidence } from "../components/evidence/MeasuredEvidence";
import { NarrativePanel } from "../components/evidence/NarrativePanel";
import { ProcessingTimeline } from "../components/evidence/ProcessingTimeline";
import { RiskCard } from "../components/evidence/RiskCard";
import { StatusBadge } from "../components/evidence/StatusBadge";
import { ButtonLink } from "../components/ui/Button";
import { Card, CardHeader } from "../components/ui/Card";
import { Skeleton } from "../components/ui/Skeleton";
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
        <Card tone="evidence" className="px-4 py-3">
          <p className="text-sm text-evidence">{error}</p>
        </Card>
        <ButtonLink to="/history" variant="secondary" size="sm" className="mt-6">
          Back to history
        </ButtonLink>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-8 flex flex-col gap-2 border-b border-border pb-6">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-6 w-64" />
        </div>
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Skeleton className="h-[62vh] min-h-[360px] w-full" />
          <div className="flex flex-col gap-6">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  const isProcessing = analysis.status === "QUEUED" || analysis.status === "PROCESSING";
  const page = analysis.pages[0];

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
        <div className="min-w-0">
          <p className="mb-1 font-mono text-xs uppercase tracking-[0.2em] text-ink-faint">
            Analysis
          </p>
          <h1 className="break-words text-xl font-medium text-ink">
            {analysis.documentName}
          </h1>
          <p className="mt-1 font-mono text-xs text-ink-muted">
            {analysis.pageCount} page · {analysis.documentType || "image"} ·{" "}
            {new Date(analysis.createdAt).toLocaleString()}
          </p>
        </div>
        <StatusBadge status={analysis.status} />
      </header>

      {isProcessing && (
        <Card className="p-8">
          <ProcessingTimeline
            status={analysis.status}
            currentStage={analysis.stage}
            startedAt={analysis.createdAt}
          />
        </Card>
      )}

      {analysis.status === "FAILED" && (
        <Card tone="evidence" className="p-6">
          <p className="text-sm leading-relaxed text-evidence">
            Analysis failed{analysis.error ? `: ${analysis.error}` : "."} Try uploading
            the image again.
          </p>
          <ButtonLink to="/analyze" variant="secondary" size="sm" className="mt-4">
            New analysis
          </ButtonLink>
        </Card>
      )}

      {analysis.status === "COMPLETED" && page && (
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* ---- Layer 1: CAT-Net localization ---- */}
          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="font-mono text-xs uppercase tracking-wide text-ink-faint">
                CAT-Net Localization
              </h2>
              <span className="font-mono text-[10px] uppercase tracking-wide text-ink-faint">
                Model output · unmodified
              </span>
            </div>
            <HeatmapViewer
              page={page}
              evidenceThreshold={analysis.metrics?.evidenceThreshold}
            />
          </section>

          <aside className="flex flex-col gap-6">
            {/* ---- Layer 2: Tampering Risk (deterministic rule) ---- */}
            {analysis.risk && <RiskCard risk={analysis.risk} />}

            {/* ---- Layer 3: Measured evidence (deterministic) ---- */}
            {analysis.metrics && (
              <MeasuredEvidence metrics={analysis.metrics} risk={analysis.risk} />
            )}

            {analysis.narrativeError && (
              <Card tone="caution" className="p-5">
                <CardHeader
                  title="Interpretation Unavailable"
                  titleClass="text-caution"
                />
                <p className="text-sm leading-relaxed text-ink-muted">
                  {analysis.narrativeError}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-ink-faint">
                  The heatmap, measurements and risk level above are unaffected — only
                  the written interpretation is missing.
                </p>
              </Card>
            )}

            {/* ---- Layer 4: AI interpretation ---- */}
            {analysis.narrative && <NarrativePanel narrative={analysis.narrative} />}

            <Link
              to="/history"
              className="font-mono text-xs text-ink-faint transition-colors hover:text-ink"
            >
              ← All analyses
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
