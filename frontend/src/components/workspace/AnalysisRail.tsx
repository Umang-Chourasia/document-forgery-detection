import { useWorkspace } from "../../contexts/WorkspaceContext";
import { MeasuredEvidence } from "../evidence/MeasuredEvidence";
import { NarrativePanel } from "../evidence/NarrativePanel";
import { RiskCard } from "../evidence/RiskCard";
import { Collapsible } from "../ui/Collapsible";
import { Button } from "../ui/Button";
import { Skeleton } from "../ui/Skeleton";

/**
 * The reading of the analysis on the stage: risk, then interpretation, then
 * measured evidence. Sections are hairline-separated disclosures, not cards.
 */
export function AnalysisRail() {
  const { activeId, clear, analysis, analysisError: error } = useWorkspace();

  if (!activeId) return <UploadGuidance />;

  if (error) {
    return (
      <p className="border-l border-evidence pl-3 text-small leading-relaxed text-evidence">
        {error}
      </p>
    );
  }

  if (!analysis) {
    return (
      <div className="flex flex-col gap-6" aria-busy="true">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const processing = analysis.status === "QUEUED" || analysis.status === "PROCESSING";

  return (
    <div className="flex flex-col">
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
        <div className="pb-7">
          <p className="border-l border-evidence pl-3 text-small leading-relaxed text-evidence">
            Analysis failed{analysis.error ? `: ${analysis.error}` : "."}
          </p>
          <Button variant="secondary" size="sm" onClick={clear} className="mt-4">
            New analysis
          </Button>
        </div>
      )}

      {analysis.narrativeError && (
        <Collapsible title="Interpretation" titleClass="text-caution">
          <p className="text-small leading-relaxed text-ink-muted">
            {analysis.narrativeError}
          </p>
          <p className="mt-2.5 text-small leading-relaxed text-ink-faint">
            The document, measurements and risk level are unaffected — only the
            written interpretation is missing.
          </p>
        </Collapsible>
      )}

      {analysis.narrative && <NarrativePanel narrative={analysis.narrative} />}

      {analysis.metrics && (
        <MeasuredEvidence metrics={analysis.metrics} risk={analysis.risk} />
      )}

      {!processing && (
        <div className="border-t border-hairline pt-5">
          <Button variant="secondary" size="sm" onClick={clear}>
            New analysis
          </Button>
        </div>
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
      <section className="pb-7" aria-live="polite">
        <h2 className="label mb-4 text-ink-faint">Analysis</h2>
        <p className="flex items-center gap-2.5 text-body text-ink">
          <Pulse />
          Processing document
        </p>
        <p className="mt-2 text-small leading-relaxed text-ink-muted">
          {(stage && STAGE_COPY[stage]) ?? "Analyzing evidence"}…
        </p>
      </section>
    );
  }

  return (
    <section className="pb-7" aria-live="polite">
      <h2 className="label mb-4 text-ink-faint">Analysis</h2>

      <p className="label flex items-center gap-2.5 text-accent">
        <Tick />
        Evidence map ready
      </p>
      <p className="mt-2 text-small leading-relaxed text-ink-muted">
        Heatmap generated successfully.
      </p>

      <p className="mt-5 flex items-center gap-2.5 text-body text-ink">
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
      className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-accent motion-reduce:animate-none"
    />
  );
}

function Tick() {
  return (
    <svg viewBox="0 0 12 12" fill="none" aria-hidden="true" className="h-2.5 w-2.5 shrink-0">
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
      <p className="label mb-4 text-ink-faint">What happens next</p>
      <ol>
        {PIPELINE_STEPS.map((step, i) => (
          <li key={step.label} className="border-t border-hairline py-5">
            <p className="label mb-2 flex items-baseline gap-3 text-accent">
              <span className="text-ink-faint">{String(i + 1).padStart(2, "0")}</span>
              {step.label}
            </p>
            <p className="text-small leading-relaxed text-ink-muted">{step.body}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
