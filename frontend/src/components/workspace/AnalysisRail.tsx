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

      {processing && !analysis.risk && <ProcessingStatus stage={analysis.stage} />}

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

/** Stage captions, matching the pipeline's own stage identifiers. */
const STAGE_COPY: Record<string, string> = {
  UPLOAD: "Storing the document",
  PREPROCESSING: "Preparing the document",
  CATNET: "Analyzing evidence",
  NARRATIVE: "Measuring and interpreting",
  REPORT: "Assembling the result",
};

function ProcessingStatus({ stage }: { stage?: string }) {
  return (
    <section className="pb-7" aria-live="polite">
      <h2 className="label mb-4 text-ink-faint">Analysis</h2>
      <p className="flex items-center gap-2.5 text-body text-ink">
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-accent motion-reduce:animate-none"
        />
        Processing document
      </p>
      <p className="mt-2 text-small leading-relaxed text-ink-muted">
        {(stage && STAGE_COPY[stage]) ?? "Analyzing evidence"}…
      </p>
    </section>
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
