import { useWorkspace } from "../../contexts/WorkspaceContext";
import { MeasuredEvidence } from "../evidence/MeasuredEvidence";
import { NarrativePanel } from "../evidence/NarrativePanel";
import { RiskCard } from "../evidence/RiskCard";
import { Collapsible } from "../ui/Collapsible";
import { Button } from "../ui/Button";
import { Skeleton } from "../ui/Skeleton";

/**
 * The reading of the analysis on the stage: risk, then interpretation, then
 * measured evidence, as a stack of soft panels. Starting a new analysis
 * lives in the top bar, so the rail carries only the reading.
 */
export function AnalysisRail() {
  const { activeId, clear, analysis, analysisError: error } = useWorkspace();

  if (!activeId) return <UploadGuidance />;

  if (error) {
    return (
      <p className="rounded-card bg-evidence-soft px-6 py-5 text-small leading-relaxed text-evidence">
        {error}
      </p>
    );
  }

  if (!analysis) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <Skeleton className="h-44 w-full rounded-card" />
        <Skeleton className="h-64 w-full rounded-card" />
        <Skeleton className="h-20 w-full rounded-card" />
      </div>
    );
  }

  const processing = analysis.status === "QUEUED" || analysis.status === "PROCESSING";

  return (
    // Keyed by analysis so every result opens with its panels expanded,
    // rather than inheriting whatever was collapsed on the previous document.
    <div key={analysis.id} className="flex flex-col gap-4">
      {analysis.risk && <RiskCard risk={analysis.risk} />}

      {processing && !analysis.risk && (
        <ProcessingStatus
          stage={analysis.stage}
          // The heatmap URL is empty until catnetServer fetches the result and
          // patches `pages` — the same signal the stage uses to decide whether
          // to show the document, so the two can never disagree.
          hasEvidenceMap={Boolean(analysis.pages[0]?.catnet.heatmapUrl)}
        />
      )}

      {analysis.status === "FAILED" && (
        <div className="rounded-card border border-hairline bg-surface px-7 py-7">
          <p className="label text-evidence">Analysis failed</p>
          <p className="mt-3 text-small leading-relaxed text-ink-muted">
            {analysis.error ?? "The analysis could not be completed."}
          </p>
          <Button variant="secondary" size="sm" onClick={clear} className="mt-5">
            New analysis
          </Button>
        </div>
      )}

      {analysis.narrativeError && (
        <Collapsible title="Interpretation" titleClass="text-caution">
          <p className="text-body leading-relaxed text-ink-muted">
            {analysis.narrativeError}
          </p>
          <p className="mt-3 text-small leading-relaxed text-ink-faint">
            The document, measurements and risk level are unaffected — only the
            written interpretation is missing.
          </p>
        </Collapsible>
      )}

      {analysis.narrative && <NarrativePanel narrative={analysis.narrative} />}

      {analysis.metrics && (
        <MeasuredEvidence metrics={analysis.metrics} risk={analysis.risk} />
      )}
    </div>
  );
}

/** Captions for the stages that run before the evidence map exists. */
const STAGE_COPY: Record<string, string> = {
  UPLOAD: "Storing the document",
  PREPROCESSING: "Preparing the document",
  CATNET: "Analyzing evidence",
};

/**
 * The run has two phases a reviewer can actually see, so it reads as two.
 *
 * Until the heatmap exists the document is genuinely still being analyzed.
 * Once it exists the evidence is on screen and only the written
 * interpretation is outstanding — saying "processing document" then would
 * contradict what the reviewer is already looking at.
 *
 * Both phases are derived from existing state; no new status was added.
 */
function ProcessingStatus({
  stage,
  hasEvidenceMap,
}: {
  stage?: string;
  hasEvidenceMap: boolean;
}) {
  if (!hasEvidenceMap) {
    return (
      <section className="rounded-card border border-hairline bg-surface px-7 py-7" aria-live="polite">
        <h2 className="label mb-5 text-ink-faint">Analysis</h2>
        <p className="flex items-center gap-3 text-[1.5rem] font-medium tracking-[-0.02em] text-ink">
          <Pulse />
          Processing document
        </p>
        <p className="mt-2 text-body leading-relaxed text-ink-muted">
          {(stage && STAGE_COPY[stage]) ?? "Analyzing evidence"}…
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-card border border-hairline bg-surface px-7 py-7" aria-live="polite">
      <h2 className="label mb-5 text-ink-faint">Analysis</h2>

      <p className="label flex items-center gap-2.5 text-accent">
        <Tick />
        Evidence map ready
      </p>
      <p className="mt-2 text-body leading-relaxed text-ink-muted">
        Heatmap generated successfully.
      </p>

      <p className="mt-6 flex items-center gap-3 border-t border-border pt-6 text-[1.5rem] font-medium tracking-[-0.02em] text-ink">
        <Pulse />
        Generating interpretation…
      </p>
    </section>
  );
}

function Pulse() {
  return (
    <span
      aria-hidden="true"
      className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-accent motion-reduce:animate-none"
    />
  );
}

function Tick() {
  return (
    <svg viewBox="0 0 12 12" fill="none" aria-hidden="true" className="h-3 w-3 shrink-0">
      <path d="M2 6.4L4.6 9 10 3.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const PIPELINE_STEPS = [
  {
    label: "Localization",
    body: "The document is analyzed to identify regions showing unusual visual evidence.",
  },
  {
    label: "Measured evidence",
    body: "Quantitative measurements are calculated from the detected evidence.",
  },
  {
    label: "Interpretation",
    body: "The measured evidence is summarized in concise, human-readable points.",
  },
];

function UploadGuidance() {
  return (
    <div className="flex flex-col">
      <p className="label mb-5 text-ink-faint">What happens next</p>
      <ol className="flex flex-col gap-3">
        {PIPELINE_STEPS.map((step, i) => (
          <li
            key={step.label}
            className="rounded-card border border-hairline bg-surface px-7 py-6"
          >
            <p className="mb-2 flex items-baseline justify-between gap-3">
              <span className="text-[1.375rem] font-medium tracking-[-0.02em] text-ink">
                {step.label}
              </span>
              <span className="font-mono text-small text-ink-dim">
                {String(i + 1).padStart(2, "0")}
              </span>
            </p>
            <p className="text-small leading-relaxed text-ink-muted">{step.body}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
