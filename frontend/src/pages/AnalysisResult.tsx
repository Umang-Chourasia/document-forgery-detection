import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { getAnalysis } from "../api/analysis";
import { HeatmapViewer } from "../components/evidence/HeatmapViewer";
import { ProcessingTimeline } from "../components/evidence/ProcessingTimeline";
import { RiskBadge } from "../components/evidence/RiskBadge";
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
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[1fr_320px]">
          <HeatmapViewer page={page} />

          <aside className="flex flex-col gap-6">
            {/* ---- Tampering Risk: deterministic, rule-based ---- */}
            {analysis.risk && (
              <div className="rounded-sm border border-border bg-surface p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="font-mono text-xs uppercase tracking-wide text-ink-faint">
                    Tampering Risk
                  </h2>
                  <RiskBadge level={analysis.risk.level} />
                </div>
                <p className="text-sm leading-relaxed text-ink-muted">
                  {analysis.risk.rationale}
                </p>
                <p className="mt-2 font-mono text-[11px] leading-relaxed text-ink-faint">
                  Determined by a fixed rule over the measurements below — not by the
                  language model, and not a CAT-Net confidence value.
                </p>
              </div>
            )}

            {/* ---- Measured evidence: deterministic ---- */}
            {analysis.metrics && (
              <div className="rounded-sm border border-border bg-surface p-5">
                <h2 className="mb-1 font-mono text-xs uppercase tracking-wide text-ink-faint">
                  Measured Evidence
                </h2>
                <p className="mb-3 text-[11px] leading-relaxed text-ink-faint">
                  Derived from the rendered heatmap. Measurements, not model output.
                </p>
                <dl className="flex flex-col gap-2 font-mono text-xs">
                  <Metric
                    label="Flagged area"
                    value={`${(analysis.metrics.evidenceAreaFraction * 100).toFixed(2)}%`}
                  />
                  <Metric
                    label="Peak intensity"
                    value={analysis.metrics.maxIntensity.toFixed(2)}
                  />
                  <Metric
                    label="Mean (flagged)"
                    value={analysis.metrics.meanEvidenceIntensity.toFixed(2)}
                  />
                  <Metric label="Regions" value={String(analysis.metrics.regionCount)} />
                  <Metric
                    label="Largest region"
                    value={`${(analysis.metrics.largestRegionFraction * 100).toFixed(2)}% of image`}
                  />
                  <Metric
                    label="Concentration"
                    value={`${(analysis.metrics.largestRegionShare * 100).toFixed(0)}% in largest`}
                  />
                </dl>
              </div>
            )}

            {analysis.narrativeError && (
              <div className="rounded-sm border border-caution/30 bg-surface p-5">
                <h2 className="mb-2 font-mono text-xs uppercase tracking-wide text-caution">
                  Interpretation Unavailable
                </h2>
                <p className="text-sm leading-relaxed text-ink-muted">
                  {analysis.narrativeError}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-ink-faint">
                  The heatmap, measurements and risk level above are unaffected — only the
                  written interpretation is missing.
                </p>
              </div>
            )}

            {/* ---- LLM interpretation: clearly separated from the above ---- */}
            {analysis.narrative && (
              <div className="rounded-sm border border-border bg-surface p-5">
                <h2 className="mb-1 font-mono text-xs uppercase tracking-wide text-ink-faint">
                  AI Interpretation
                </h2>
                <p className="mb-3 text-[11px] leading-relaxed text-ink-faint">
                  Generated from the evidence above. Interpretation, not measurement.
                </p>

                {analysis.narrative.summary && (
                  <p className="text-sm leading-relaxed text-ink-muted">
                    {analysis.narrative.summary}
                  </p>
                )}

                <div className="flex flex-col gap-3">
                  <NarrativeField label="What the heatmap shows" value={analysis.narrative.observed_evidence} />
                  <NarrativeField label="Where" value={analysis.narrative.location_description} />
                  <NarrativeField label="What it means" value={analysis.narrative.plain_language_meaning} />
                  {analysis.narrative.possible_pattern && (
                    <div>
                      <p className="mb-1 font-mono text-[10px] uppercase tracking-wide text-ink-faint">
                        Possible pattern
                        {analysis.narrative.pattern_confidence
                          ? ` · ${analysis.narrative.pattern_confidence} confidence`
                          : ""}
                      </p>
                      <p className="text-sm leading-relaxed text-ink">
                        {analysis.narrative.possible_pattern}
                      </p>
                      {analysis.narrative.pattern_reasoning && (
                        <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                          {analysis.narrative.pattern_reasoning}
                        </p>
                      )}
                    </div>
                  )}
                  <NarrativeField label="Caveats" value={analysis.narrative.caveats} />
                </div>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-ink-faint">{label}</dt>
      <dd className="text-ink tabular-nums">{value}</dd>
    </div>
  );
}

function NarrativeField({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <p className="mb-1 font-mono text-[10px] uppercase tracking-wide text-ink-faint">{label}</p>
      <p className="text-sm leading-relaxed text-ink-muted">{value}</p>
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
